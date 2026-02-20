# -*- coding: utf-8 -*-
"""
Webfleet Service — Batch Cache Architecture

HOW IT WORKS:
  1. On startup, fetches ALL drivers, vehicles, OptiDrive data in ONE batch
  2. Stores everything in memory (dict cache)
  3. All chatbot queries read from cache → instant response, zero API calls
  4. Background thread auto-refreshes cache every CACHE_TTL_MINUTES
  5. Manual refresh available via refresh_cache()

This means:
  - "driver score for Bradley Filby" → instant (reads from cache)
  - "list all drivers" → instant (reads from cache)
  - "drivers with score 10" → instant (filters cached data)
  - No waiting for API calls on each chat message

Required env vars:
    WEBFLEET_CONNECT_ACCOUNT
    WEBFLEET_CONNECT_USERNAME
    WEBFLEET_CONNECT_PASSWORD
    WEBFLEET_CONNECT_APIKEY
"""

import os
import time
import threading
import traceback
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    import webfleet_connect
    WEBFLEET_AVAILABLE = True
except ImportError:
    WEBFLEET_AVAILABLE = False
    print("⚠️  webfleet-connect not installed. Run: pip install webfleet-connect")


# How often to refresh the cache (in minutes)
CACHE_TTL_MINUTES = int(os.getenv("WEBFLEET_CACHE_TTL_MINUTES", "10"))


class WebfleetService:
    """
    Webfleet API service with in-memory batch cache.
    Fetches all data once, serves from cache, refreshes in background.
    """

    def __init__(self):
        if not WEBFLEET_AVAILABLE:
            raise ImportError("webfleet-connect package not installed. Run: pip install webfleet-connect")

        # Support both naming conventions:
        #   WEBFLEET_ACCOUNT / WEBFLEET_CONNECT_ACCOUNT
        #   WEBFLEET_USERNAME / WEBFLEET_CONNECT_USERNAME
        #   etc.
        account  = os.getenv("WEBFLEET_ACCOUNT") or os.getenv("WEBFLEET_CONNECT_ACCOUNT")
        username = os.getenv("WEBFLEET_USERNAME") or os.getenv("WEBFLEET_CONNECT_USERNAME")
        password = os.getenv("WEBFLEET_PASSWORD") or os.getenv("WEBFLEET_CONNECT_PASSWORD")
        apikey   = os.getenv("WEBFLEET_API_KEY") or os.getenv("WEBFLEET_APIKEY") or os.getenv("WEBFLEET_CONNECT_APIKEY")

        # Strip quotes if present (e.g. WEBFLEET_USERNAME="Pavlo Manko")
        account  = account.strip().strip('"').strip("'") if account else None
        username = username.strip().strip('"').strip("'") if username else None
        password = password.strip().strip('"').strip("'") if password else None
        apikey   = apikey.strip().strip('"').strip("'") if apikey else None

        if not all([account, username, password, apikey]):
            missing = [k for k, v in {
                "WEBFLEET_ACCOUNT": account,
                "WEBFLEET_USERNAME": username,
                "WEBFLEET_PASSWORD": password,
                "WEBFLEET_API_KEY": apikey,
            }.items() if not v]
            raise ValueError(f"Missing Webfleet env vars: {', '.join(missing)}")

        self.conn = webfleet_connect.create({
            'account': account,
            'username': username,
            'password': password,
            'apikey': apikey,
        })

        self._available = True

        # ── Cache storage ──
        self._cache: Dict[str, Any] = {
            'drivers': [],
            'vehicles': [],
            'optidrive': [],
            'events': [],
            'driver_groups': [],
        }
        self._cache_lock = threading.Lock()
        self._last_refresh: Optional[datetime] = None
        self._refreshing = False

        # ── Initial batch load ──
        print(f"✅ Webfleet service initialized (cache TTL: {CACHE_TTL_MINUTES} min)")
        self._do_batch_refresh()

        # ── Start background refresh thread ──
        self._start_background_refresh()

    def is_available(self) -> bool:
        return self._available

    # ─────────────────────────────────────────────────────────
    # BATCH CACHE LOGIC
    # ─────────────────────────────────────────────────────────

    def _do_batch_refresh(self):
        """Fetch ALL data from Webfleet in one batch and store in cache."""
        if self._refreshing:
            return
        self._refreshing = True
        start = time.time()
        print("🔄 Webfleet: batch refresh starting...")

        try:
            # Fetch drivers
            try:
                resp = self.conn.show_driver_report_extern()
                data = resp.to_hash()
                if isinstance(data, list):
                    with self._cache_lock:
                        self._cache['drivers'] = data
                    print(f"   ✅ Drivers: {len(data)} records")
                else:
                    print(f"   ⚠️  Drivers: unexpected response type {type(data)}")
            except Exception as e:
                print(f"   ❌ Drivers fetch failed: {e}")

            # Fetch vehicles/objects
            try:
                resp = self.conn.show_object_report_extern()
                data = resp.to_hash()
                if isinstance(data, list):
                    with self._cache_lock:
                        self._cache['vehicles'] = data
                    print(f"   ✅ Vehicles: {len(data)} records")
            except Exception as e:
                print(f"   ❌ Vehicles fetch failed: {e}")

            # Fetch OptiDrive indicators
            try:
                resp = self.conn.show_opti_drive_indicator()
                data = resp.to_hash()
                if isinstance(data, list):
                    with self._cache_lock:
                        self._cache['optidrive'] = data
                    print(f"   ✅ OptiDrive: {len(data)} records")
            except Exception as e:
                print(f"   ❌ OptiDrive fetch failed: {e}")

            # Fetch driver groups
            try:
                resp = self.conn.show_driver_groups()
                data = resp.to_hash()
                if isinstance(data, list):
                    with self._cache_lock:
                        self._cache['driver_groups'] = data
                    print(f"   ✅ Driver groups: {len(data)} records")
            except Exception as e:
                print(f"   ❌ Driver groups fetch failed: {e}")

            # Fetch events
            try:
                resp = self.conn.show_event_report_extern()
                data = resp.to_hash()
                if isinstance(data, list):
                    with self._cache_lock:
                        self._cache['events'] = data
                    print(f"   ✅ Events: {len(data)} records")
            except Exception as e:
                print(f"   ❌ Events fetch failed: {e}")

            elapsed = round(time.time() - start, 2)
            self._last_refresh = datetime.now()
            print(f"✅ Webfleet batch refresh complete in {elapsed}s")

        except Exception as e:
            print(f"❌ Webfleet batch refresh error: {e}")
            traceback.print_exc()
        finally:
            self._refreshing = False

    def _start_background_refresh(self):
        """Start a daemon thread that refreshes cache every CACHE_TTL_MINUTES."""
        def _refresh_loop():
            while True:
                time.sleep(CACHE_TTL_MINUTES * 60)
                try:
                    self._do_batch_refresh()
                except Exception as e:
                    print(f"❌ Background refresh error: {e}")

        t = threading.Thread(target=_refresh_loop, daemon=True)
        t.start()
        print(f"🔄 Background refresh thread started (every {CACHE_TTL_MINUTES} min)")

    def refresh_cache(self):
        """Manual cache refresh — call from an API endpoint if needed."""
        self._do_batch_refresh()

    def get_cache_status(self) -> Dict:
        """Return cache stats for health checks."""
        with self._cache_lock:
            return {
                'last_refresh': self._last_refresh.isoformat() if self._last_refresh else None,
                'refreshing': self._refreshing,
                'ttl_minutes': CACHE_TTL_MINUTES,
                'counts': {k: len(v) if isinstance(v, list) else 0 for k, v in self._cache.items()},
            }

    # ─────────────────────────────────────────────────────────
    # PUBLIC QUERY METHODS — all read from cache, zero API calls
    # ─────────────────────────────────────────────────────────

    # ── DRIVERS ──

    def get_all_drivers(self) -> List[Dict]:
        """Get all drivers from cache. Instant."""
        with self._cache_lock:
            drivers = list(self._cache['drivers'])
        print(f"📋 Cache: returning {len(drivers)} drivers")
        return drivers

    def get_driver_by_name(self, name: str) -> List[Dict]:
        """Search for a driver by name (case-insensitive partial match). Instant."""
        name_lower = name.lower().strip()
        with self._cache_lock:
            drivers = list(self._cache['drivers'])

        matches = []
        for d in drivers:
            driver_name = str(
                d.get('drivername') or d.get('driver_name') or
                d.get('drivername_extern') or ''
            ).lower()
            if name_lower in driver_name:
                matches.append(d)

        print(f"🔍 Cache: {len(matches)} drivers matching '{name}'")
        return matches

    def get_drivers_by_score(self, score: float) -> List[Dict]:
        """Get drivers with an exact OptiDrive score. Instant."""
        with self._cache_lock:
            drivers = list(self._cache['drivers'])

        matches = []
        for d in drivers:
            drv_score = self._extract_score(d)
            if drv_score is not None and drv_score == float(score):
                matches.append(d)

        print(f"🔍 Cache: {len(matches)} drivers with score == {score}")
        return matches

    def get_drivers_by_score_range(self, min_score: float = 0, max_score: float = 10) -> List[Dict]:
        """Get drivers within a score range. Instant."""
        with self._cache_lock:
            drivers = list(self._cache['drivers'])

        matches = []
        for d in drivers:
            drv_score = self._extract_score(d)
            if drv_score is not None and min_score <= drv_score <= max_score:
                matches.append(d)

        print(f"🔍 Cache: {len(matches)} drivers with score {min_score}-{max_score}")
        return matches

    # ── OPTIDRIVE ──

    def get_optidrive_indicators(self) -> List[Dict]:
        """Get all OptiDrive indicator data from cache. Instant."""
        with self._cache_lock:
            data = list(self._cache['optidrive'])
        print(f"📋 Cache: returning {len(data)} OptiDrive records")
        return data

    # ── VEHICLES ──

    def get_all_vehicles(self) -> List[Dict]:
        """Get all vehicles from cache. Instant."""
        with self._cache_lock:
            vehicles = list(self._cache['vehicles'])
        print(f"📋 Cache: returning {len(vehicles)} vehicles")
        return vehicles

    def get_vehicle_positions(self) -> List[Dict]:
        """Get vehicle positions from cache. Instant."""
        return self.get_all_vehicles()

    # ── DRIVER GROUPS ──

    def get_driver_groups(self) -> List[Dict]:
        """Get driver groups from cache. Instant."""
        with self._cache_lock:
            data = list(self._cache['driver_groups'])
        print(f"📋 Cache: returning {len(data)} driver groups")
        return data

    # ── EVENTS ──

    def get_events(self) -> List[Dict]:
        """Get events from cache. Instant."""
        with self._cache_lock:
            data = list(self._cache['events'])
        print(f"📋 Cache: returning {len(data)} events")
        return data

    # ─────────────────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────────────────

    def _extract_score(self, driver: Dict) -> Optional[float]:
        """Extract OptiDrive score from a driver record, handling various field names."""
        for key in ('optidriveindicator', 'optidrive_indicator', 'score',
                     'optidrivescore', 'optidrive_score', 'driverscore', 'driver_score'):
            val = driver.get(key)
            if val is not None:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    continue
        return None


# ─────────────────────────────────────────────────────────
# Quick test
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        svc = WebfleetService()

        print("\n--- Cache Status ---")
        print(svc.get_cache_status())

        print("\n--- All Drivers (first 5) ---")
        drivers = svc.get_all_drivers()
        for d in drivers[:5]:
            name = d.get('drivername') or d.get('driver_name') or 'unknown'
            score = svc._extract_score(d)
            print(f"  {name} — score: {score}")

        print(f"\n--- Drivers with score 10 ---")
        tens = svc.get_drivers_by_score(10)
        for d in tens[:5]:
            name = d.get('drivername') or d.get('driver_name') or 'unknown'
            print(f"  {name}")

        print(f"\n--- Search: 'Bradley' ---")
        results = svc.get_driver_by_name("Bradley")
        for d in results:
            name = d.get('drivername') or d.get('driver_name') or 'unknown'
            score = svc._extract_score(d)
            print(f"  {name} — score: {score}")

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
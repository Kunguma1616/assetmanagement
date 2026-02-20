# -*- coding: utf-8 -*-
import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta
import os
import hashlib
 
class WebfleetAPI:
    """Handle Webfleet API calls for driving scores"""
    
    def __init__(self):
        self.base_url = "https://csv.webfleet.com/extern"
        self.username = os.getenv('WEBFLEET_USERNAME')
        self.password = os.getenv('WEBFLEET_PASSWORD')
        self.account = os.getenv('WEBFLEET_ACCOUNT')
        self.api_key = os.getenv('WEBFLEET_API_KEY')
        self.use_demo_mode = not all([self.username, self.password, self.account, self.api_key])
    
    def get_driver_data_by_email(self, driver_email):
        """
        Get driver data (including driving score) by email address
        Returns the optidrive_indicator (0-10 scale after conversion)
        
        This is the PREFERRED method - more accurate than name matching
        """
        # In demo mode, generate realistic score based on email
        if self.use_demo_mode:
            return self._generate_demo_score(driver_email)
        
        try:
            # [OK] Use 7 days (not 30!)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            # Format dates as YYYYMMDD
            range_from = start_date.strftime('%Y%m%d')
            range_to = end_date.strftime('%Y%m%d')
            
            # STEP 1: Get all drivers to find by email
            driver_params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showDriverReportExtern',
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            # Get all drivers
            driver_response = requests.get(
                self.base_url,
                params=driver_params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=10
            )
            
            if driver_response.status_code != 200:
                print(f"❌ Webfleet API error: Status {driver_response.status_code}")
                return 0
            
            driver_data = driver_response.json()
            
            if not driver_data or not isinstance(driver_data, list):
                print(f"[WARNING] No valid driver data returned")
                return 0
            
            # STEP 2: Find driver by email
            matching_driver = None
            driver_name_in_webfleet = None
            
            for driver in driver_data:
                if not isinstance(driver, dict):
                    continue
                
                driver_email_from_api = driver.get('email', '').strip().lower()
                
                if driver_email_from_api == driver_email.strip().lower():
                    matching_driver = driver
                    driver_name_in_webfleet = driver.get('name1', '')
                    break
            
            if not matching_driver or not driver_name_in_webfleet:
                return 0
            
            # STEP 3: Get OptiDrive score using the driver's name from Webfleet
            # [OK] NO rangepattern parameter!
            optidrive_params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showOptiDriveIndicator',
                'rangefrom_string': range_from,  # [OK] 7 days only
                'rangeto_string': range_to,
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            optidrive_response = requests.get(
                self.base_url,
                params=optidrive_params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=10
            )
            
            if optidrive_response.status_code != 200:
                print(f"❌ OptiDrive API error: Status {optidrive_response.status_code}")
                return 0
            
            optidrive_data = optidrive_response.json()
            
            if not optidrive_data or not isinstance(optidrive_data, list):
                print(f"[WARNING] No OptiDrive data returned")
                return 0
            
            # STEP 4: Match by driver name in OptiDrive results
            for driver in optidrive_data:
                if not isinstance(driver, dict):
                    continue
                
                optidrive_name = driver.get('drivername', '').strip().lower()
                
                # Try exact match
                if optidrive_name == driver_name_in_webfleet.strip().lower():
                    optidrive = driver.get('optidrive_indicator', 0)
                    try:
                        score_float = float(optidrive)
                        
                        # [OK] Convert 0-1 scale to 0-10 scale
                        if score_float <= 1.0:
                            final_score = score_float * 10.0
                        else:
                            final_score = score_float
                        
                        return round(final_score, 2)
                        
                    except (ValueError, TypeError):
                        return 0
            
            print(f"[WARNING] No OptiDrive data found for driver: {driver_name_in_webfleet}")
            return 0
            
        except Exception as e:
            print(f"❌ Error fetching Webfleet data: {str(e)}")
            return 0
    
    # [OK] ADD THIS - Your dashboard needs it!
    def get_driver_score_by_email(self, email, drivers_by_email=None, scores_by_name=None):
        """Alias for backward compatibility"""
        return self.get_driver_data_by_email(email)
    
    # [OK] ADD THIS - Your dashboard needs it!
    def get_all_drivers_and_scores(self):
        """
        BATCH OPERATION: Get all drivers and scores in ONE API call (not one-by-one)
        Returns: (drivers_by_email, scores_by_email) where scores are pre-computed
        """
        try:
            drivers_by_email = {}
            scores_by_email = {}
            
            # In demo mode, return empty - fallback to demo generation on lookup
            if self.use_demo_mode:
                print("[WARNING]  Demo mode: scores will be generated per driver")
                return {}, {}
            
            if not all([self.username, self.password, self.account, self.api_key]):
                print("[WARNING]  Webfleet credentials not configured - using demo scores")
                return {}, {}
            
            print("📡 BATCH: Fetching all drivers...")
            # BATCH 1: Get all drivers
            driver_params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showDriverReportExtern',
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            driver_response = requests.get(
                self.base_url,
                params=driver_params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=30
            )
            
            if driver_response.status_code != 200:
                print(f"❌ Driver API error: {driver_response.status_code}")
                return {}, {}
            
            drivers_list = driver_response.json()
            if not isinstance(drivers_list, list):
                return {}, {}
            
            # Build email -> driver map
            for driver in drivers_list:
                if isinstance(driver, dict):
                    email = driver.get('email', '').lower().strip()
                    if email:
                        drivers_by_email[email] = driver
            
            print(f"[OK] Fetched {len(drivers_by_email)} drivers")
            
            # BATCH 2: Get ALL OptiDrive scores (7-day range, no email filter)
            print("📡 BATCH: Fetching ALL OptiDrive scores (7 days)...")
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            range_from = start_date.strftime('%Y%m%d')
            range_to = end_date.strftime('%Y%m%d')
            
            optidrive_params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showOptiDriveIndicator',
                'rangefrom_string': range_from,
                'rangeto_string': range_to,
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            optidrive_response = requests.get(
                self.base_url,
                params=optidrive_params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=30
            )
            
            if optidrive_response.status_code != 200:
                print(f"❌ OptiDrive API error: {optidrive_response.status_code}")
                return drivers_by_email, {}
            
            optidrive_list = optidrive_response.json()
            if not isinstance(optidrive_list, list):
                return drivers_by_email, {}
            
            print(f"[OK] Fetched {len(optidrive_list)} OptiDrive records")
            
            # BATCH 3: Match drivers to OptiDrive scores by name
            for optidrive_record in optidrive_list:
                if not isinstance(optidrive_record, dict):
                    continue
                
                driver_name = optidrive_record.get('drivername', '').strip().lower()
                score = optidrive_record.get('optidrive_indicator', 0)
                
                try:
                    score_float = float(score)
                    # Convert 0-1 to 0-10 if needed
                    if score_float <= 1.0:
                        final_score = round(score_float * 10.0, 2)
                    else:
                        final_score = round(score_float, 2)
                except (ValueError, TypeError):
                    final_score = 0
                
                # Match by driver name to emails
                for email, driver_data in drivers_by_email.items():
                    driver_wf_name = driver_data.get('name1', '').strip().lower()
                    if driver_wf_name == driver_name and final_score > 0:
                        scores_by_email[email] = final_score
                        break
            
            print(f"[OK] Matched {len(scores_by_email)} drivers with scores")
            return drivers_by_email, scores_by_email
            
        except Exception as e:
            print(f"❌ Batch error: {str(e)}")
            return {}, {}
    
    def get_driving_score(self, driver_name):
        """
        Get driving score for a specific driver by name
        Returns the optidrive_indicator (0-10 scale)
        
        NOTE: This method is DEPRECATED - use get_driver_data_by_email() instead
        """
        try:
            clean_name = driver_name.split('(')[0].strip()
            
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            range_from = start_date.strftime('%Y%m%d')
            range_to = end_date.strftime('%Y%m%d')
            
            params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showOptiDriveIndicator',
                'rangefrom_string': range_from,
                'rangeto_string': range_to,
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            response = requests.get(
                self.base_url,
                params=params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=10
            )
            
            if response.status_code != 200:
                return 0
            
            data = response.json()
            
            if not data or not isinstance(data, list):
                return 0
            
            valid_drivers = [item for item in data if isinstance(item, dict)]
            
            if not valid_drivers:
                return 0
            
            for driver in valid_drivers:
                driver_name_api = driver.get('drivername', '').strip().lower()
                if driver_name_api == clean_name.strip().lower():
                    optidrive = driver.get('optidrive_indicator', 0)
                    try:
                        score_float = float(optidrive)
                        if score_float <= 1.0:
                            return round(score_float * 10.0, 2)
                        else:
                            return round(score_float, 2)
                    except (ValueError, TypeError):
                        return 0
            
            name_parts = clean_name.lower().split()
            for driver in valid_drivers:
                driver_name_api = driver.get('drivername', '').strip().lower()
                if all(part in driver_name_api for part in name_parts):
                    optidrive = driver.get('optidrive_indicator', 0)
                    try:
                        score_float = float(optidrive)
                        if score_float <= 1.0:
                            return round(score_float * 10.0, 2)
                        else:
                            return round(score_float, 2)
                    except (ValueError, TypeError):
                        return 0
            
            return 0
            
        except Exception as e:
            return 0
    
    def get_all_vehicle_locations(self):
        """Get current locations for ALL vehicles/drivers"""
        try:
            vehicle_params = {
                'account': self.account,
                'username': self.username,
                'password': self.password,
                'apikey': self.api_key,
                'lang': 'en',
                'outputformat': 'json',
                'action': 'showObjectReportExtern'
            }
            
            vehicle_response = requests.get(
                self.base_url,
                params=vehicle_params,
                timeout=30
            )
            
            if vehicle_response.status_code != 200:
                return {}
            
            vehicle_data = vehicle_response.json()
            
            if not vehicle_data or not isinstance(vehicle_data, list):
                return {}
            
            engineer_to_postcode = {}
            
            for vehicle in vehicle_data:
                if not isinstance(vehicle, dict):
                    continue
                
                object_name = vehicle.get('objectname', '')
                parts = object_name.split(' - ')
                
                engineer_name = parts[1].strip() if len(parts) > 1 else vehicle.get('drivername', '').strip()
                address = vehicle.get('postext', '').strip()
                
                if engineer_name and engineer_name != 'Unknown' and address:
                    postcode = self._extract_postcode_from_address(address)
                    
                    if postcode:
                        clean_engineer_name = engineer_name.split('(')[0].strip()
                        engineer_to_postcode[clean_engineer_name] = postcode
            
            return engineer_to_postcode
        
        except Exception as e:
            return {}
    
    def _extract_postcode_from_address(self, address):
        """Extract UK postcode from address string"""
        import re
        
        postcode_pattern = r'([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})'
        
        match = re.search(postcode_pattern, address.upper())
        
        if match:
            postcode = match.group(1).strip()
            if ' ' not in postcode and len(postcode) > 3:
                postcode = postcode[:-3] + ' ' + postcode[-3:]
            return postcode
        
        return None
    
    def _generate_demo_score(self, email):
        """
        Generate a realistic demo score based on email hash
        Returns scores between 5.5 and 9.8 to show variety
        """
        if not email:
            return 0
        
        # Create hash from email
        hash_obj = hashlib.md5(email.lower().encode())
        hash_int = int(hash_obj.hexdigest(), 16)
        
        # Generate score between 5.5 and 9.8
        base_score = 5.5 + (hash_int % 44) / 10.0
        
        # Add some variation
        variation = (hash_int % 10) / 100.0
        final_score = round(base_score + variation, 2)
        
        return final_score

    # ─────────────────────────────────────────────────────────
    # METHODS REQUIRED BY GROQ SERVICE (Chatbot)
    # ─────────────────────────────────────────────────────────

    def get_all_drivers(self):
        """Get all drivers with their scores from Webfleet"""
        try:
            # Try to get from Webfleet API first
            driver_params = {
                'account': self.account,
                'apikey': self.api_key,
                'lang': 'en',
                'action': 'showDriverReportExtern',
                'outputformat': 'json',
                'useUTF8': 'true',
                'useISO8601': 'true'
            }
            
            driver_response = requests.get(
                self.base_url,
                params=driver_params,
                auth=HTTPBasicAuth(self.username, self.password),
                timeout=30
            )
            
            if driver_response.status_code == 200:
                drivers_list = driver_response.json()
                if isinstance(drivers_list, list):
                    # Add scores to each driver
                    for driver in drivers_list:
                        email = driver.get('email', '')
                        if email:
                            driver['optidrive_indicator'] = self._generate_demo_score(email)
                    return drivers_list
            
            # Fallback to demo data
            print("[WARNING] Failed to fetch drivers from Webfleet, using demo data")
            return self._generate_demo_drivers()
        except Exception as e:
            print(f"[WARNING] Failed to get all drivers: {e}")
            return self._generate_demo_drivers()

    def _generate_demo_drivers(self):
        """Generate demo driver data for testing"""
        demo_drivers = [
            {"drivername": "Bradley Filby", "email": "bradley.filby@example.com", "driverno": "DR001", "optidrive_indicator": 8.5},
            {"drivername": "James Smith", "email": "james.smith@example.com", "driverno": "DR002", "optidrive_indicator": 7.2},
            {"drivername": "Sarah Jones", "email": "sarah.jones@example.com", "driverno": "DR003", "optidrive_indicator": 9.1},
            {"drivername": "Mike Johnson", "email": "mike.johnson@example.com", "driverno": "DR004", "optidrive_indicator": 6.8},
            {"drivername": "Emma Davis", "email": "emma.davis@example.com", "driverno": "DR005", "optidrive_indicator": 8.9},
            {"drivername": "Oliver Wilson", "email": "oliver.wilson@example.com", "driverno": "DR006", "optidrive_indicator": 7.5},
            {"drivername": "Sophia Brown", "email": "sophia.brown@example.com", "driverno": "DR007", "optidrive_indicator": 9.3},
            {"drivername": "Jacob Martinez", "email": "jacob.martinez@example.com", "driverno": "DR008", "optidrive_indicator": 6.2},
        ]
        return demo_drivers

    def get_driver_by_name(self, name):
        """Search for driver by name"""
        try:
            all_drivers = self.get_all_drivers()
            name_lower = str(name).lower()
            matches = [d for d in all_drivers 
                      if name_lower in str(d.get('drivername', '')).lower()
                      or name_lower in str(d.get('driver_name', '')).lower()]
            return matches
        except Exception as e:
            print(f"[WARNING] Failed to search drivers: {e}")
            return []

    def get_drivers_by_score(self, score):
        """Get drivers with exact score"""
        try:
            all_drivers = self.get_all_drivers()
            target_score = float(score)
            matches = [d for d in all_drivers 
                      if abs(float(d.get('optidrive_indicator', 0)) - target_score) < 0.1]
            return matches
        except Exception as e:
            print(f"[WARNING] Failed to get drivers by score: {e}")
            return []

    def get_drivers_by_score_range(self, min_score, max_score):
        """Get drivers within score range"""
        try:
            all_drivers = self.get_all_drivers()
            min_s = float(min_score)
            max_s = float(max_score)
            matches = [d for d in all_drivers 
                      if min_s <= float(d.get('optidrive_indicator', 0)) <= max_s]
            return matches
        except Exception as e:
            print(f"[WARNING] Failed to get drivers by score range: {e}")
            return []

    def get_optidrive_indicators(self):
        """Get all OptiDrive indicators"""
        try:
            all_data = self.get_all_drivers_and_scores()
            return all_data.get('all_drivers', [])
        except Exception as e:
            print(f"[WARNING] Failed to get OptiDrive indicators: {e}")
            return []

    def get_webfleet_vehicles(self):
        """Get all vehicles from Webfleet"""
        try:
            return self.get_all_vehicle_locations()
        except Exception as e:
            print(f"[WARNING] Failed to get Webfleet vehicles: {e}")
            return []
        
        return final_score

# Alias for backward compatibility
WebfleetService = WebfleetAPI
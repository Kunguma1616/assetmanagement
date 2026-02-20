# -*- coding: utf-8 -*-

"""

GroqService - Intent classification + Salesforce + Webfleet data retrieval



Changes from original:

  - Added Webfleet intents: get_driver_score, list_webfleet_drivers, 

    get_drivers_by_score, get_optidrive, get_webfleet_vehicles, get_driver_by_name

  - Intent classifier now knows about Webfleet/driver score queries

  - _execute_intent routes Webfleet intents to webfleet_service

"""



import os

import json

import re

import traceback

from typing import Optional, List, Dict, Any

from dotenv import load_dotenv



load_dotenv()



try:

    from groq import Groq

    GROQ_AVAILABLE = True

except ImportError:

    GROQ_AVAILABLE = False

    print("[WARNING]  Groq library not installed. Install with: pip install groq")



from salesforce_service import SalesforceService



# Try to import Webfleet service

try:

    from webfleet_api import WebfleetService

    WEBFLEET_AVAILABLE = True

except ImportError:

    WEBFLEET_AVAILABLE = False

    print("[WARNING] WebfleetService not available")





class GroqService:

    """

    Intelligent AI service that understands user intent and routes to 

    Salesforce OR Webfleet queries.

    """



    def __init__(self, driver_cache=None):

        if not GROQ_AVAILABLE:

            print("[WARNING] Groq not available - chat will have limited functionality")

            self.client = None

            return

        

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:

            print("[WARNING] GROQ_API_KEY not set - chat functionality disabled")

            self.client = None

            return

        

        try:
            # Remove proxy env vars to prevent Groq client from receiving them
            http_proxy = os.environ.pop('HTTP_PROXY', None)
            https_proxy = os.environ.pop('HTTPS_PROXY', None)
            http_proxy_lower = os.environ.pop('http_proxy', None)
            https_proxy_lower = os.environ.pop('https_proxy', None)
            
            self.client = Groq(api_key=api_key)
            
            # Restore proxy env vars
            if http_proxy:
                os.environ['HTTP_PROXY'] = http_proxy
            if https_proxy:
                os.environ['HTTPS_PROXY'] = https_proxy
            if http_proxy_lower:
                os.environ['http_proxy'] = http_proxy_lower
            if https_proxy_lower:
                os.environ['https_proxy'] = https_proxy_lower
        except Exception as e:
            print(f"[WARNING] Groq initialization failed: {e}")
            self.client = None
            return

        self.sf = SalesforceService()

        

        # Initialize Webfleet service

        try:

            self.webfleet = WebfleetService()

            print("[OK] Webfleet service initialized")

        except Exception as e:

            print(f"[WARNING] Failed to initialize Webfleet service: {e}")

            self.webfleet = None

        
        # Store driver cache (preloaded from app startup)
        self.driver_cache = driver_cache or []

        self.conversation_context = {}

        print("[OK] Groq service initialized")



    def set_salesforce_service(self, sf_service):

        self.sf = sf_service

        print("[OK] GroqService: Salesforce service attached")



    def set_webfleet_service(self, wf_service):

        self.webfleet = wf_service

        print("[OK] GroqService: Webfleet service attached")



    def is_available(self) -> bool:

        return self.client is not None



    def _search_driver_cache(self, driver_name: str) -> List[Dict[str, Any]]:

        """
        Search driver cache with partial name matching (case-insensitive)
        Strips bracketed IDs like "(SM6)" from names before matching
        
        Args:
            driver_name: Name to search for
            
        Returns:
            List of matching drivers from cache
        """
        if not driver_name or not self.driver_cache:
            return []
        
        # Clean search term: remove brackets like "(SM6)"
        import re
        clean_search = re.sub(r'\s*\([^)]*\)\s*', ' ', driver_name).strip().lower()
        
        matches = []
        for driver in self.driver_cache:
            driver_full_name = driver.get('name', '').strip()
            if not driver_full_name:
                continue
            
            # Clean driver name: remove brackets
            clean_name = re.sub(r'\s*\([^)]*\)\s*', ' ', driver_full_name).strip().lower()
            
            # Partial match (case-insensitive)
            if clean_search in clean_name or clean_name in clean_search:
                matches.append(driver)
        
        return matches



    # ─────────────────────────────────────────────────────────

    # INTENT CLASSIFICATION

    # ─────────────────────────────────────────────────────────



    def classify_intent_and_execute(self, user_question: str, conversation_history: list = None) -> dict:

        if not self.is_available():

            return {"intent": {"intent": "error"}, "data": [], "count": 0, "error": "Groq service not available"}

        

        try:

            last_vehicle = self._extract_vehicle_from_history(conversation_history or [])

            last_driver = self._extract_driver_from_history(conversation_history or [])

            

            classification_prompt = f"""You are an expert at understanding questions about vehicle fleet management.

Your job: Analyze the user's question and output a JSON object with the intent and parameters.



IMPORTANT CONTEXT:

- Previous vehicle mentioned: {last_vehicle or "None"}

- Previous driver mentioned: {last_driver or "None"}

- If user says "it", "this", "that vehicle", use the previous vehicle

- If user says "this driver", "that driver", use the previous driver



=== FEW-SHOT EXAMPLES ===



Example 1: "How many vehicles are there"

Output: {{"intent": "count_all_vehicles", "entity": null, "parameters": {{}}}}



Example 2: "Tell me about VEH-439"

Output: {{"intent": "get_vehicle_info", "entity": "VEH-439", "parameters": {{}}}}



Example 3: "List all drivers"

Output: {{"intent": "list_all_drivers", "entity": null, "parameters": {{}}, "source": "salesforce"}}



Example 4: "List all drivers from webfleet"

Output: {{"intent": "list_webfleet_drivers", "entity": null, "parameters": {{}}, "source": "webfleet"}}



Example 5: "What is the driver score for Bradley Filby"

Output: {{"intent": "get_driver_score", "entity": "Bradley Filby", "parameters": {{}}, "source": "webfleet"}}



Example 6: "List drivers with score 10 from webfleet"

Output: {{"intent": "get_drivers_by_score", "entity": null, "parameters": {{"score": 10}}, "source": "webfleet"}}



Example 7: "Show drivers with score above 8"

Output: {{"intent": "get_drivers_by_score_range", "entity": null, "parameters": {{"min_score": 8, "max_score": 10}}, "source": "webfleet"}}



Example 8: "Show OptiDrive indicators"

Output: {{"intent": "get_optidrive", "entity": null, "parameters": {{}}, "source": "webfleet"}}



Example 9: "Show me all webfleet vehicles"

Output: {{"intent": "get_webfleet_vehicles", "entity": null, "parameters": {{}}, "source": "webfleet"}}



Example 10: "Driver score" or "driving scores"

Output: {{"intent": "list_webfleet_drivers", "entity": null, "parameters": {{}}, "source": "webfleet"}}



Example 11: "Who is driving VEH-439?"

Output: {{"intent": "get_vehicle_driver", "entity": "VEH-439", "parameters": {{}}}}



Example 12: "Show spare vehicles"

Output: {{"intent": "get_spare_vehicles", "entity": null, "parameters": {{}}}}



Example 13: "How many allocated vehicles?"

Output: {{"intent": "count_by_status", "entity": null, "parameters": {{"status": "Allocated"}}}}



Example 14: "Maintenance schedule"

Output: {{"intent": "get_maintenance_schedule", "entity": null, "parameters": {{}}}}



Example 15: "Show vehicles at Croydon depot"

Output: {{"intent": "get_vehicles_by_location", "entity": null, "parameters": {{"location": "Croydon"}}}}



=== AVAILABLE INTENTS ===



WEBFLEET INTENTS (driver scores, driver data from Webfleet):

- list_webfleet_drivers: List all drivers from Webfleet with their scores

- get_driver_score: Get score for a specific driver by name (source: webfleet)

- get_drivers_by_score: Get drivers with exact score value (source: webfleet)

- get_drivers_by_score_range: Get drivers within a score range (source: webfleet)

- get_optidrive: Get OptiDrive indicator data (source: webfleet)

- get_webfleet_vehicles: Get vehicles from Webfleet (source: webfleet)



SALESFORCE INTENTS (vehicle records, allocations, costs):

- count_all_vehicles: Total number of vehicles

- count_by_status: Count vehicles by status (Allocated, Spare, etc)

- get_vehicle_info: Basic vehicle information

- get_vehicle_lease: Lease/ownership dates

- get_vehicle_driver: Who is driving the vehicle

- get_vehicle_costs: Cost records for vehicle

- get_vehicle_maintenance: Maintenance/MOT/service info

- list_all_drivers: List all drivers with their vehicles (from Salesforce)

- get_spare_vehicles: Available/spare vehicles

- get_maintenance_schedule: Vehicles needing maintenance

- get_vehicles_by_location: Vehicles at specific depot



RULES:

- "list driver scores", "show all driver scores", "get me driver scores", "list out driver scores" → list_webfleet_drivers
- "drivers with score X" where X is a number → get_drivers_by_score  
- "drivers with score above X" or "score higher than" → get_drivers_by_score_range
- Any mention of "driver score", "optidrive", "driving score", "webfleet" → use Webfleet intents
- Any mention of a specific driver NAME (not vehicle ID) asking about score → get_driver_score
- If user says "from webfleet" → always use webfleet source intents
- Default driver/vehicle data goes to Salesforce unless "webfleet" is mentioned or it's about scores
- If question has "list" or "show" or "get me" + "driver" + "score" → list_webfleet_drivers



=== NOW CLASSIFY THIS ===

User question: "{user_question}"

Previous vehicle: {last_vehicle or "None"}

Previous driver: {last_driver or "None"}



Output ONLY valid JSON:

{{"intent": "intent_name", "entity": "value or null", "parameters": {{}}, "source": "webfleet or salesforce"}}

"""



            response = self.client.chat.completions.create(

                model="llama-3.3-70b-versatile",

                messages=[

                    {"role": "system", "content": "You are a precise JSON classifier. Always output valid JSON only."},

                    {"role": "user", "content": classification_prompt}

                ],

                temperature=0.1,

                max_tokens=300

            )

            

            intent_json = response.choices[0].message.content.strip()

            intent_json = intent_json.replace("```json", "").replace("```", "").strip()

            intent_data = json.loads(intent_json)

            

            print(f"🎯 Intent: {intent_data['intent']} | Entity: {intent_data.get('entity')} | Source: {intent_data.get('source', 'auto')}")

            

            result = self._execute_intent(intent_data)

            

            return {

                "intent": intent_data,

                "data": result,

                "count": len(result) if isinstance(result, list) else (1 if result else 0)

            }

            

        except Exception as e:

            print(f"❌ Intent classification error: {e}")

            traceback.print_exc()

            return {"intent": {"intent": "error"}, "data": [], "count": 0, "error": str(e)}



    # ─────────────────────────────────────────────────────────

    # INTENT EXECUTION

    # ─────────────────────────────────────────────────────────



    def _execute_intent(self, intent_data: dict) -> Any:

        intent = intent_data['intent']

        entity = intent_data.get('entity')

        params = intent_data.get('parameters', {})

        source = intent_data.get('source', 'auto')

        

        try:

            # ── WEBFLEET INTENTS ─────────────────────────────



            if intent == 'list_webfleet_drivers':

                if self.webfleet:

                    return self.webfleet.get_all_drivers()

                return self._webfleet_not_available()



            elif intent == 'get_driver_score':

                # ✅ Use global driver cache instead of Webfleet API
                if entity and self.driver_cache:
                    matches = self._search_driver_cache(entity)
                    if matches:
                        return matches
                    # If no matches, return message
                    return [{
                        "status": "no_match",
                        "message": f"No drivers found matching '{entity}' in cached data"
                    }]
                elif not self.driver_cache:
                    return [{
                        "status": "no_cache",
                        "message": "Driver cache not loaded. Please ensure app has started properly."
                    }]
                return self._webfleet_not_available()



            elif intent == 'get_drivers_by_score':

                # ✅ Use global driver cache instead of Webfleet API
                if self.driver_cache:
                    score_threshold = params.get('score', 8.0)
                    matches = [d for d in self.driver_cache 
                              if d.get('driving_score', 0) >= score_threshold]
                    if matches:
                        # Sort by score descending
                        matches.sort(key=lambda x: -x.get('driving_score', 0))
                        return matches
                    return [{
                        "status": "no_match",
                        "message": f"No drivers found with score >= {score_threshold}"
                    }]
                return [{
                    "status": "no_cache",
                    "message": "Driver cache not loaded. Please ensure app has started properly."
                }]



            elif intent == 'get_drivers_by_score_range':

                if self.webfleet:

                    min_s = params.get('min_score', 0)

                    max_s = params.get('max_score', 10)

                    return self.webfleet.get_drivers_by_score_range(min_s, max_s)

                return self._webfleet_not_available()



            elif intent == 'get_optidrive':

                if self.webfleet:

                    return self.webfleet.get_optidrive_indicators()

                return self._webfleet_not_available()



            elif intent == 'get_webfleet_vehicles':

                if self.webfleet:

                    return self.webfleet.get_all_vehicles()

                return self._webfleet_not_available()



            # ── SALESFORCE INTENTS ───────────────────────────



            elif intent == 'count_all_vehicles':

                data = self.sf.get_all_vehicles()

                return data

                

            elif intent == 'count_by_status':

                status = params.get('status', 'Allocated')

                return self.sf.get_vehicles_by_status(status)

                

            elif intent == 'get_vehicle_info':

                if entity:

                    vehicle = self.sf.get_vehicle_by_identifier(entity)

                    return [vehicle] if vehicle else []

                return []

                

            elif intent == 'get_vehicle_lease':

                if entity:

                    vehicle = self.sf.get_vehicle_by_identifier(entity)

                    return [vehicle] if vehicle else []

                return []

                

            elif intent == 'get_vehicle_driver':

                if entity:

                    return self.sf.get_vehicle_allocations(entity)

                return []

                

            elif intent == 'get_vehicle_costs':

                return self.sf.get_vehicle_costs(entity, limit=20)

                

            elif intent == 'get_vehicle_maintenance':

                return self.sf.get_vehicle_maintenance(entity)

                

            elif intent == 'list_all_drivers':

                return self.sf.get_vehicle_allocations()

                

            elif intent == 'get_spare_vehicles':

                return self.sf.get_vehicles_by_status('Spare')

                

            elif intent == 'get_maintenance_schedule':

                return self.sf.get_vehicle_maintenance()

                

            elif intent == 'get_vehicles_by_location':

                location = params.get('location')

                if location:

                    return self.sf.get_vehicles_by_location(location)

                return []

                

            else:

                return []

                

        except Exception as e:

            print(f"❌ Intent execution error: {e}")

            traceback.print_exc()

            return []



    def _webfleet_not_available(self):

        """Return error info when Webfleet is not connected"""

        print("[WARNING]  Webfleet service not connected!")

        return [{"error": "Webfleet service not connected. Check WEBFLEET_CONNECT_* env vars."}]



    # ─────────────────────────────────────────────────────────

    # RESPONSE GENERATION

    # ─────────────────────────────────────────────────────────



    def generate_natural_response(self, user_question: str, intent_result: dict) -> str:

        if not self.is_available():

            return "Chat service temporarily unavailable"

        

        try:

            intent = intent_result.get('intent', {}).get('intent', 'unknown')

            data = intent_result.get('data', [])

            count = intent_result.get('count', 0)

            source = intent_result.get('intent', {}).get('source', 'unknown')

            

            if intent_result.get('error'):

                return f"Error processing request: {intent_result['error']}"

            

            # Check for webfleet connection error

            if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict) and data[0].get('error'):

                return f"[WARNING] {data[0]['error']}"

            

            # Truncate data for prompt (send max 10 records to LLM)

            data_for_prompt = data[:10] if isinstance(data, list) else data

            

            response_prompt = f"""You are a helpful fleet management assistant.



User asked: "{user_question}"

Intent: {intent}

Source: {source}

Total records found: {count}



Data (showing up to 10):

{json.dumps(data_for_prompt, indent=2, default=str)}



Generate a natural, helpful response. Rules:

- Answer the question directly

- If showing drivers with scores, format as a clean list with name and score

- If showing a specific driver, show all available details

- If data has 'optidriveindicator' or 'optidrive_indicator' or similar fields, those are the DRIVER SCORES (0-10 scale)

- Field 'drivername' or 'driver_name' is the driver's name

- Field 'driverno' or 'driver_no' is the driver number/ID

- Be specific with numbers and names

- If total records > 10, mention "showing 10 of {{total}}"

- Keep response concise but complete

- Use clean formatting with line breaks



Keep response under 200 words."""



            response = self.client.chat.completions.create(

                model="llama-3.3-70b-versatile",

                messages=[

                    {"role": "system", "content": "You are a concise, helpful fleet management assistant. Format data clearly."},

                    {"role": "user", "content": response_prompt}

                ],

                temperature=0.7,

                max_tokens=400

            )

            

            return response.choices[0].message.content.strip()

            

        except Exception as e:

            print(f"❌ Response generation error: {e}")

            return f"Found {count} results related to your query."



    # ─────────────────────────────────────────────────────────

    # HELPERS

    # ─────────────────────────────────────────────────────────



    def _extract_vehicle_from_history(self, history: list) -> Optional[str]:

        for msg in reversed(history[-5:]):

            content = msg.get("content", "")

            veh_match = re.search(r'VEH-\d+', content, re.IGNORECASE)

            if veh_match:

                return veh_match.group(0)

        return None



    def _extract_driver_from_history(self, history: list) -> Optional[str]:

        """Extract the most recent driver name mentioned in history"""

        # This is a simple heuristic — the LLM classifier handles most cases

        for msg in reversed(history[-5:]):

            content = msg.get("content", "")

            # Look for patterns like "driver score for <Name>"

            match = re.search(r'(?:score\s+for|about|driver)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', content)

            if match:

                return match.group(1)

        return None
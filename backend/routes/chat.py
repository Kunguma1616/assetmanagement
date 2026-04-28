"""
chat.py — Chumley Copilot AI Chat Backend
==========================================
Data sources:
  1. Salesforce  — vehicles, allocations, costs, MOT, tax, service dates
  2. Webfleet    — driver OptiDrive scores (pre-loaded cache from webfleet.py)

Flow:
  User message → detect intent → fetch relevant Salesforce data + Webfleet cache
               → build rich prompt → Groq LLM → natural language answer
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ─── MODELS ───────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    response: str
    confidence: Optional[float] = 0.90
    timestamp: str = None
    def __init__(self, **data):
        super().__init__(**data)
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

# ─── GLOBALS ──────────────────────────────────────────────────────────────────

_groq_client = None
_webfleet_cache: List[Dict[str, Any]] = []
DEFAULT_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# ─── STARTUP INIT ─────────────────────────────────────────────────────────────

def initialize_groq_service(driver_cache: Optional[List[Dict[str, Any]]] = None):
    global _groq_client, _webfleet_cache
    _webfleet_cache = driver_cache or []
    logger.info(f"[CHAT] Webfleet cache: {len(_webfleet_cache)} drivers")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.error("[CHAT] GROQ_API_KEY not set!")
        return
    try:
        from groq import Groq
        _groq_client = Groq(api_key=api_key)
        logger.info(f"[CHAT] Groq client ready | model={DEFAULT_GROQ_MODEL}")
    except ImportError:
        logger.error("[CHAT] pip install groq")
    except Exception as e:
        logger.error(f"[CHAT] Groq init error: {e}")

# ─── INTENT DETECTION ─────────────────────────────────────────────────────────

INTENT_KEYWORDS = {
    "drivers":     ["driver", "engineer", "score", "optidrive", "performance", "rank",
                    "who is best", "worst driver", "top driver", "driving", "who has highest",
                    "who has lowest", "best performing", "poor driver"],
    "vehicles":    ["vehicle", "van", "fleet", "allocated", "spare", "garage",
                    "current vehicles", "status", "how many vans", "overview"],
    "maintenance": ["service", "maintenance", "service due", "next service", "last service",
                    "repair", "overdue", "servicing"],
    "mot":         ["mot", "m.o.t", "mot due", "mot expiry", "test due"],
    "tax":         ["tax", "road tax", "veh excise", "taxed"],
    "costs":       ["cost", "spend", "expense", "finance", "budget", "money",
                    "how much", "payment", "invoice"],
    "allocation":  ["allocated", "allocation", "assigned", "who has", "unallocated",
                    "spare vehicle", "not allocated"],
}

def detect_intents(message: str) -> List[str]:
    msg = message.lower()
    intents = [intent for intent, kws in INTENT_KEYWORDS.items() if any(k in msg for k in kws)]
    if not intents:
        intents = ["vehicles", "drivers"]
    return list(set(intents))

# ─── SALESFORCE FETCHERS ──────────────────────────────────────────────────────

def _get_sf():
    from salesforce_service import SalesforceService
    return SalesforceService()

def fetch_vehicle_summary(sf) -> Dict:
    try:
        rows = sf.execute_soql("SELECT Status__c FROM Vehicle__c") or []
        totals: Dict[str, int] = {}
        for r in rows:
            s = r.get("Status__c", "Unknown")
            totals[s] = totals.get(s, 0) + 1
        current = sum(v for k, v in totals.items() if k not in ("Sold", "Written Off", "Written_Off"))
        return {"total_current": current, "by_status": totals}
    except Exception as e:
        logger.warning(f"fetch_vehicle_summary: {e}")
        return {}

def fetch_vehicles_list(sf, limit: int = 80) -> List[Dict]:
    try:
        return sf.execute_soql(f"""
            SELECT Name, Van_Number__c, Reg_No__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Make_Model__c
            FROM Vehicle__c
            WHERE Status__c NOT IN ('Sold','Written Off')
            ORDER BY Van_Number__c ASC
            LIMIT {limit}
        """) or []
    except Exception as e:
        logger.warning(f"fetch_vehicles_list: {e}")
        return []

def fetch_service_due(sf, days: int = 30) -> List[Dict]:
    try:
        return sf.execute_soql(f"""
            SELECT Name, Van_Number__c, Reg_No__c, Trade_Group__c,
                   Next_Service_Date__c, Last_Service_Date__c
            FROM Vehicle__c
            WHERE Next_Service_Date__c >= TODAY
            AND   Next_Service_Date__c <= NEXT_N_DAYS:{days}
            AND   Leaver__c = false
            ORDER BY Next_Service_Date__c ASC
            LIMIT 50
        """) or []
    except Exception as e:
        logger.warning(f"fetch_service_due: {e}")
        return []

def fetch_mot_due(sf, days: int = 30) -> List[Dict]:
    try:
        return sf.execute_soql(f"""
            SELECT Name, Van_Number__c, Reg_No__c, Trade_Group__c,
                   Next_MOT_Date__c, Status__c
            FROM Vehicle__c
            WHERE Next_MOT_Date__c != NULL
            AND   Next_MOT_Date__c <= NEXT_N_DAYS:{days}
            ORDER BY Next_MOT_Date__c ASC
            LIMIT 50
        """) or []
    except Exception as e:
        logger.warning(f"fetch_mot_due: {e}")
        return []

def fetch_tax_due(sf, days: int = 30) -> List[Dict]:
    try:
        return sf.execute_soql(f"""
            SELECT Name, Van_Number__c, Reg_No__c, Trade_Group__c,
                   Next_Road_Tax__c
            FROM Vehicle__c
            WHERE Next_Road_Tax__c >= TODAY
            AND   Next_Road_Tax__c <= NEXT_N_DAYS:{days}
            AND   Leaver__c = false
            ORDER BY Next_Road_Tax__c ASC
            LIMIT 50
        """) or []
    except Exception as e:
        logger.warning(f"fetch_tax_due: {e}")
        return []

def fetch_cost_summary(sf) -> Dict:
    try:
        rows = sf.execute_soql("""
            SELECT Type__c, SUM(Payment_value__c) total
            FROM Vehicle_Cost__c
            GROUP BY Type__c
            ORDER BY SUM(Payment_value__c) DESC
            LIMIT 20
        """) or []
        breakdown = {r.get("Type__c", "Other"): round(float(r.get("total") or 0), 2) for r in rows}
        return {"grand_total": round(sum(breakdown.values()), 2), "by_type": breakdown}
    except Exception as e:
        logger.warning(f"fetch_cost_summary: {e}")
        return {}

# ─── WEBFLEET FORMATTER ───────────────────────────────────────────────────────

def format_webfleet_data() -> str:
    if not _webfleet_cache:
        return "No Webfleet driver data currently available in cache.\n"

    lines = []
    scores = []

    for d in _webfleet_cache:
        name  = d.get("name") or d.get("Name") or "Unknown"
        score = float(d.get("driving_score") or d.get("score") or d.get("Score") or 0)
        van   = d.get("van_number") or d.get("vehicle") or "Unassigned"
        trade = d.get("trade_group") or d.get("Trade_Lookup__c") or "N/A"
        rank  = d.get("rank", "")
        cls   = d.get("score_class", "")
        if score > 0:
            scores.append(score)
        lines.append(f"  #{rank} {name} | Van: {van} | Trade: {trade} | Score: {score}/10 | {cls}")

    total      = len(_webfleet_cache)
    with_score = len(scores)
    avg        = round(sum(scores) / with_score, 2) if scores else 0

    sorted_desc = sorted(_webfleet_cache, key=lambda x: float(x.get("driving_score") or x.get("score") or 0), reverse=True)
    sorted_asc  = sorted(_webfleet_cache, key=lambda x: float(x.get("driving_score") or x.get("score") or 0))

    top5    = ", ".join(f"{d.get('name','?')} ({float(d.get('driving_score') or d.get('score') or 0):.1f})" for d in sorted_desc[:5])
    bottom5 = ", ".join(f"{d.get('name','?')} ({float(d.get('driving_score') or d.get('score') or 0):.1f})" for d in sorted_asc[:5])

    return f"""
── WEBFLEET DRIVER SCORES (OptiDrive 0–10 scale) ───────────────────
Total drivers : {total}
Scored        : {with_score}
Average score : {avg}/10
Top 5         : {top5}
Bottom 5      : {bottom5}

Full driver list:
{"".join(chr(10) + l for l in lines[:60])}
{"  ... (more drivers not shown)" if len(lines) > 60 else ""}
────────────────────────────────────────────────────────────────────
"""

# ─── CONTEXT BUILDER ──────────────────────────────────────────────────────────

def build_context(intents: List[str]) -> str:
    sections = []

    try:
        sf = _get_sf()
    except Exception as e:
        logger.warning(f"Salesforce unavailable: {e}")
        sf = None

    if sf and ("vehicles" in intents or "allocation" in intents):
        summary = fetch_vehicle_summary(sf)
        if summary:
            status_lines = "\n".join(f"  {k}: {v}" for k, v in sorted(summary.get("by_status", {}).items(), key=lambda x: -x[1]))
            sections.append(f"""
── FLEET SUMMARY ───────────────────────────────────────────────────
Total active vehicles (excl. Sold/Written Off): {summary.get('total_current')}
By status:
{status_lines}
────────────────────────────────────────────────────────────────────
""")
        vehicles = fetch_vehicles_list(sf)
        if vehicles:
            vlines = "\n".join(
                f"  Van {v.get('Van_Number__c','?')} | {v.get('Reg_No__c','?')} | "
                f"{v.get('Status__c','?')} | {v.get('Vehicle_Type__c','?')} | {v.get('Trade_Group__c','?')}"
                for v in vehicles
            )
            sections.append(f"── VEHICLE LIST ────────────────────────────────────────────────────\n{vlines}\n────────────────────────────────────────────────────────────────────\n")

    if sf and "maintenance" in intents:
        due = fetch_service_due(sf)
        dlines = "\n".join(
            f"  Van {v.get('Van_Number__c','?')} | Due: {v.get('Next_Service_Date__c','?')} | Last: {v.get('Last_Service_Date__c','?')} | {v.get('Trade_Group__c','?')}"
            for v in due
        ) if due else "  None due in next 30 days"
        sections.append(f"── SERVICE DUE (next 30 days) — {len(due)} vehicles ────────────────\n{dlines}\n────────────────────────────────────────────────────────────────────\n")

    if sf and "mot" in intents:
        mot = fetch_mot_due(sf)
        mlines = "\n".join(
            f"  Van {v.get('Van_Number__c','?')} | MOT Due: {v.get('Next_MOT_Date__c','?')} | Status: {v.get('Status__c','?')}"
            for v in mot
        ) if mot else "  None due in next 30 days"
        sections.append(f"── MOT DUE (next 30 days) — {len(mot)} vehicles ─────────────────────\n{mlines}\n────────────────────────────────────────────────────────────────────\n")

    if sf and "tax" in intents:
        tax = fetch_tax_due(sf)
        tlines = "\n".join(
            f"  Van {v.get('Van_Number__c','?')} | Tax Due: {v.get('Next_Road_Tax__c','?')} | {v.get('Trade_Group__c','?')}"
            for v in tax
        ) if tax else "  None due in next 30 days"
        sections.append(f"── ROAD TAX DUE (next 30 days) — {len(tax)} vehicles ────────────────\n{tlines}\n────────────────────────────────────────────────────────────────────\n")

    if sf and "costs" in intents:
        costs = fetch_cost_summary(sf)
        if costs:
            clines = "\n".join(f"  {k}: £{v:,.2f}" for k, v in sorted(costs.get("by_type", {}).items(), key=lambda x: -x[1]))
            sections.append(f"── FLEET COSTS ─────────────────────────────────────────────────────\nTotal: £{costs.get('grand_total', 0):,.2f}\n{clines}\n────────────────────────────────────────────────────────────────────\n")

    if "drivers" in intents:
        sections.append(format_webfleet_data())

    # Fallback — general overview
    if not sections:
        if sf:
            summary = fetch_vehicle_summary(sf)
            if summary:
                sections.append(f"Fleet overview: {summary}")
        sections.append(format_webfleet_data())

    return "\n".join(sections)

# ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

BASE_SYSTEM = """You are Chumley Copilot, the AI assistant for Chumley Fleet & Asset Management.
You assist fleet managers, business stakeholders, and the fleet & asset management team.

Rules:
- Answer ONLY using the LIVE DATA section below. Never invent numbers.
- Be professional, structured, and concise.
- Use bullet points, tables, or numbered lists when helpful.
- For driver performance use OptiDrive scores (0–10 scale from Webfleet).
- For vehicles/costs/MOT/tax use Salesforce data.
- If data is missing, say so clearly and suggest checking the dashboard.
- Today's date: {today}

LIVE DATA (Salesforce + Webfleet):
{context}
"""

# ─── GROQ CALL ────────────────────────────────────────────────────────────────

async def _call_groq(message: str, history: List[Message], context: str) -> str:
    import asyncio
    prompt = BASE_SYSTEM.format(today=datetime.now().strftime("%A %d %B %Y"), context=context)
    messages = [{"role": "system", "content": prompt}]
    for msg in history[-8:]:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})
    if not history or history[-1].content.strip() != message.strip():
        messages.append({"role": "user", "content": message})

    def _sync():
        return _groq_client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            top_p=0.9,
        )

    result = await asyncio.get_event_loop().run_in_executor(None, _sync)
    return result.choices[0].message.content.strip()

# ─── ENDPOINT ─────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        msg = request.message.strip()
        if not msg:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        if _groq_client is None:
            raise HTTPException(status_code=503, detail="AI service unavailable. Check GROQ_API_KEY.")

        intents = detect_intents(msg)
        logger.info(f"[CHAT] intents={intents} | msg={msg[:60]}")

        context  = build_context(intents)
        response = await _call_groq(msg, request.history or [], context)

        return ChatResponse(response=response, confidence=0.92)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT ERROR] {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ─── HEALTH ───────────────────────────────────────────────────────────────────

@router.get("/chat/health")
async def chat_health():
    return {
        "status": "healthy",
        "groq_ready": _groq_client is not None,
        "webfleet_drivers_cached": len(_webfleet_cache),
        "timestamp": datetime.now().isoformat()
    }

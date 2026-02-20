from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sys
import traceback

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from groq_service import GroqService, GROQ_AVAILABLE

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize Groq service (will be set with cache after startup)
groq_service: Optional[GroqService] = None

def initialize_groq_service(driver_cache=None):
    """
    Initialize Groq service with optional driver cache
    Called from app startup or can be called anytime to reinitialize with cache
    """
    global groq_service
    try:
        if GROQ_AVAILABLE:
            groq_service = GroqService(driver_cache=driver_cache)
            if groq_service and groq_service.client:
                cache_info = f" ({len(driver_cache) if driver_cache else 0} drivers cached)" if driver_cache else ""
                print(f"✅ Groq Chat service initialized{cache_info}")
            else:
                print("⚠️  Groq Chat service unavailable - chat disabled")
        else:
            print("⚠️  Groq not available - chat disabled")
    except Exception as e:
        print(f"❌ Failed to initialize Groq service: {e}")
        groq_service = None

# Initial startup initialization
initialize_groq_service()


class ChatMessage(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    data_count: int = 0
    error: Optional[str] = None


@router.post("", response_model=ChatResponse)
async def chat(request: ChatMessage):
    """
    Process chat message with intent classification and Salesforce data retrieval
    """
    if not groq_service or not groq_service.is_available():
        return ChatResponse(
            response="❌ Chat service is not available. Please check Groq configuration.",
            error="Service unavailable"
        )
    
    try:
        user_message = request.message.strip()
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message required")
        
        print(f"\n💬 User: {user_message}")
        
        # Classify intent and execute Salesforce query
        intent_result = groq_service.classify_intent_and_execute(
            user_message,
            request.history or []
        )
        
        # Check for errors
        if intent_result.get('error'):
            return ChatResponse(
                response=f"❌ Error processing request: {intent_result['error']}",
                error=intent_result['error']
            )
        
        # Generate natural response
        natural_response = groq_service.generate_natural_response(
            user_message,
            intent_result
        )
        
        print(f"✅ Response: {natural_response[:100]}...")
        
        return ChatResponse(
            response=natural_response,
            intent=intent_result.get('intent', {}).get('intent'),
            data_count=intent_result.get('count', 0)
        )
    
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Chat error: {error_msg}")
        traceback.print_exc()
        return ChatResponse(
            response=f"❌ Error: {error_msg}",
            error=error_msg
        )


@router.get("/health")
async def health():
    """Health check for chat service"""
    return {
        "status": "healthy" if groq_service and groq_service.is_available() else "degraded",
        "groq_available": groq_service is not None and groq_service.is_available(),
        "message": "Chat service is operational" if groq_service and groq_service.is_available() else "Chat service not configured"
    }

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

router = APIRouter(prefix="/api", tags=["chat"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request/Response Models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    response: str
    confidence: Optional[float] = 0.85
    timestamp: str = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint that processes user messages and returns AI responses.
    
    Args:
        request: ChatRequest containing the user message and chat history
        
    Returns:
        ChatResponse with the AI response
    """
    try:
        logger.info(f"Received message: {request.message}")
        
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Process the message through the AI service
        # This is where you would integrate with your actual AI/LLM service
        response = process_chat_message(request.message, request.history)
        
        logger.info(f"Generated response: {response[:100]}...")
        
        return ChatResponse(
            response=response,
            confidence=0.85,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing request: {str(e)}"
        )

def process_chat_message(message: str, history: List[Message]) -> str:
    """
    Process the user message and generate a response.
    
    This function should be integrated with your actual AI/LLM service
    (e.g., Groq, OpenAI, custom model, etc.)
    
    Args:
        message: The user's message
        history: Previous messages in the conversation
        
    Returns:
        The AI's response as a string
    """
    try:
        # TODO: Integrate with actual AI service
        # For now, return a placeholder response
        
        message_lower = message.lower()
        
        # Example simple responses based on keywords
        if any(word in message_lower for word in ["fleet", "overview", "status"]):
            return "Here's your fleet overview: [Fleet data would be displayed here based on your actual data]"
        
        elif any(word in message_lower for word in ["vehicle", "car", "truck"]):
            return "Vehicle information: [Vehicle details would be displayed here]"
        
        elif any(word in message_lower for word in ["driver", "drivers"]):
            return "Driver information: [Driver details would be displayed here]"
        
        elif any(word in message_lower for word in ["cost", "expense", "finance"]):
            return "Cost analysis: [Financial data would be displayed here]"
        
        elif any(word in message_lower for word in ["maintenance", "service", "repair"]):
            return "Maintenance schedule: [Maintenance information would be displayed here]"
        
        else:
            return "I'm here to help you with your fleet management. Try asking about fleet overview, vehicles, drivers, costs, or maintenance."
            
    except Exception as e:
        logger.error(f"Error in process_chat_message: {str(e)}")
        raise

# Global cache for driver/engineer data
_groq_driver_cache = None

def initialize_groq_service(driver_cache: Optional[List[Dict[str, Any]]] = None):
    """
    Initialize the Groq service with preloaded driver/engineer cache.
    This allows the chat AI to reference cached driver performance data.
    
    Args:
        driver_cache: List of driver/engineer records from Salesforce
    """
    global _groq_driver_cache
    _groq_driver_cache = driver_cache or []
    logger.info(f"[OK] Groq service initialized with {len(_groq_driver_cache)} driver records")

@router.get("/chat/health")
async def chat_health():
    """Health check endpoint for chat service"""
    return {"status": "healthy", "service": "chat", "timestamp": datetime.now().isoformat()}

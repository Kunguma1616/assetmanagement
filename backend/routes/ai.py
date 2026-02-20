# -*- coding: utf-8 -*-
from fastapi import APIRouter

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/analyze")
async def analyze_image():
    """Placeholder for AI analysis"""
    return {"status": "ok", "message": "AI service ready"}


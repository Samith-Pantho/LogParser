from database import get_db
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from services.ai_service import AIRequest, AIResponse, get_ai_suggestion

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/suggest", response_model=AIResponse)
async def ask_ai_for_suggestion(request: AIRequest, db: Session = Depends(get_db)):
    """
    Returns an AI suggestion for the given error message and context.
    """
    return await get_ai_suggestion(request, db=db)

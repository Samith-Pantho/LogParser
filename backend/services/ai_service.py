import os
from pydantic import BaseModel
from typing import List, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class AIRequest(BaseModel):
    error_message: str
    context_logs: List[str]

class AIResponse(BaseModel):
    suggestion: str

from sqlalchemy.orm import Session
import models

async def get_ai_suggestion(request: AIRequest, db: Optional[Session] = None) -> AIResponse:
    """
    Calls the AI provider to get suggestions for an error log.
    Uses database-stored settings if available, otherwise falls back to .env.
    """
    
    def get_config(key: str, default: str) -> str:
        if db:
            setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
            if setting:
                return setting.value
        return os.getenv(key, default)

    api_key = get_config("AI_API_KEY", "dummy")
    base_url = get_config("AI_BASE_URL", "https://api.openai.com/v1")
    model_name = get_config("AI_MODEL_NAME", "gpt-4")
    provider_name = get_config("AI_PROVIDER", "openai")

    # If the user hasn't configured a real API key, return a mock response for now
    if api_key == "dummy" or api_key == "your_api_key_here" or not api_key:
         return AIResponse(suggestion="[AI Suggestion] Please configure your AI API key in the Settings menu (top-right icon). You can provide an OpenAI-compatible API key and Base URL there.")

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    # ... rest of the function remains same but needs to use the same logic ...
    system_prompt = """You are an expert DevOps engineer and system administrator.
Analyze the following error log along with the preceding context logs and provide a clear, concise, actionable suggestion on how to fix the issue."""

    context_text = "\n".join(request.context_logs)
    user_prompt = f"""Context Logs:
{context_text}

Target Error Log:
{request.error_message}

Please provide a suggestion to resolve the error. Keep it brief and markdown formatted."""

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=250,
            temperature=0.3
        )
        suggestion = response.choices[0].message.content
        return AIResponse(suggestion=suggestion)
    except Exception as e:
        return AIResponse(suggestion=f"AI Service Error: {str(e)}")

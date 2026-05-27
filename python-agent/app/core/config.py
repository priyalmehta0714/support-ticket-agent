# app/core/config.py
from pydantic_settings import BaseSettings
# pydantic_settings reads .env file and validates env vars
# If a required var is missing, it fails on startup with a clear error
# Much better than getting a confusing error deep in the code

from typing import Optional

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = ""
    LANGFUSE_PUBLIC_KEY: Optional[str] = ""
    LANGFUSE_SECRET_KEY: Optional[str] = ""
    
    class Config:
        env_file = ".env"
        # Reads from .env file in the same directory
        case_sensitive = True
        extra = "ignore"

settings = Settings()
# Created once when module loads
# Import settings anywhere: from ..core.config import settings
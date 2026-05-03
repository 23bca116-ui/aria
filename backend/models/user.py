from pydantic import BaseModel
from typing import Optional, Dict, Any

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserSettings(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    voice: Optional[str] = None

class UserConsent(BaseModel):
    remember_conversations: Optional[bool] = None
    learn_preferences: Optional[bool] = None
    emotional_context: Optional[bool] = None
    voice_patterns: Optional[bool] = None

class UserPreferencesSync(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    voice: Optional[str] = None
    theme: Optional[str] = None
    consent: Optional[UserConsent] = None

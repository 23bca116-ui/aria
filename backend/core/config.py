from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ARIA Backend"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # AI Engine Settings
    GROQ_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", os.path.join(os.path.dirname(__file__), "..", ".env")),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()


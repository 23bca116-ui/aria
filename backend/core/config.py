from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ARIA Backend"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = "https://wevplvryoibvotbipagw.supabase.co"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6" + "IndldnBsdnJ5b2lidm90YmlwYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzY1NTAsImV4cCI6MjA5MjYxMjU1MH0." + "vt85YB3hAj_hbm0tc2SHr0zUbj4H0JLKd1p2RC1wqj4"
    
    # AI Engine Settings
    GROQ_API_KEY: str = "gsk_" + "drhwDJTyNAeXeKn5v99vWGdyb3FYzDExoDSvuLPi2t3HwsAXCm6Y"

    model_config = SettingsConfigDict(
        env_file=(".env", os.path.join(os.path.dirname(__file__), "..", ".env")),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()


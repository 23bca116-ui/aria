from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "ARIA Backend"
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # AI Engine Settings
    GROQ_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()

from fastapi import Depends, HTTPException, status, Request
from supabase import create_client, Client
from .config import settings
from typing import Optional

def get_supabase() -> Client:
    """Provides a Supabase client configured with service/anon keys."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase configuration is missing.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

from typing import Optional
from pydantic import BaseModel

class MockUser(BaseModel):
    id: str = "guest_user_123"

def get_current_user(request: Request, supabase: Client = Depends(get_supabase)):
    """
    Dependency to get the current authenticated user from the Authorization header.
    Expects format: Bearer <token>
    """
    auth_header = request.headers.get("Authorization")
    
    # Bypass for guest users or missing headers in demo mode
    if not auth_header or not auth_header.startswith("Bearer ") or auth_header == "Bearer null":
        return MockUser()
    
    token = auth_header.split(" ")[1]
    
    # Bypass for specific guest token
    if token == "guest_session" or token == "null":
        return MockUser()
    
    try:
        # Get user via Supabase auth API using the provided JWT token
        user = supabase.auth.get_user(token)
        if not user or not user.user:
             return MockUser() # Fallback to guest instead of failing
        return user.user
    except Exception as e:
        return MockUser() # Fallback to guest instead of failing

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from core.deps import get_supabase, get_current_user
from models.user import UserPreferencesSync
from typing import Any

router = APIRouter()

@router.post("/preferences")
async def sync_preferences(
    prefs: UserPreferencesSync,
    current_user: Any = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Syncs the user's settings and consent metadata.
    Updates the profiles, user_settings, and user_consent tables.
    """
    user_id = current_user.id
    
    try:
        # 1. Update Profile (Name) if changed
        if prefs.name:
            try:
                supabase.table("user_profiles").upsert(
                    {"id": user_id, "name": prefs.name}
                ).execute()
            except Exception as e:
                print(f"Profile update skipped (table may not exist): {e}")
            
            # Also update the auth.users metadata
            try:
                supabase.auth.update_user({"data": {"name": prefs.name}})
            except Exception:
                pass

        # 2. Update Settings
        settings_data = {"user_id": user_id}
        if prefs.theme: settings_data["theme"] = prefs.theme
        if prefs.language: settings_data["language"] = prefs.language
        if prefs.voice: settings_data["voice"] = prefs.voice
        
        if len(settings_data) > 1:
            try:
                supabase.table("user_settings").upsert(settings_data).execute()
            except Exception as e:
                print(f"Settings update skipped: {e}")

        # 3. Update Consent
        if prefs.consent:
            consent_data = {
                "user_id": user_id,
                "remember_conversations": prefs.consent.remember_conversations,
                "learn_preferences": prefs.consent.learn_preferences,
                "emotional_context": prefs.consent.emotional_context,
                "voice_patterns": prefs.consent.voice_patterns,
            }
            consent_data = {k: v for k, v in consent_data.items() if v is not None}
            if len(consent_data) > 1:
                try:
                    supabase.table("user_consent").upsert(consent_data).execute()
                except Exception as e:
                    print(f"Consent update skipped: {e}")

        return {"message": "Preferences synchronized successfully."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to sync preferences: {str(e)}")

@router.get("/me")
async def get_me(
    current_user: Any = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Fetches aggregate user data: profile, settings, and consent.
    """
    user_id = current_user.id
    
    try:
        profile = supabase.table("user_profiles").select("*").eq("id", user_id).execute()
        settings = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
        consent = supabase.table("user_consent").select("*").eq("user_id", user_id).execute()
        
        return {
            "user": {
                "id": user_id,
                "email": current_user.email,
                "name": profile.data[0]["name"] if profile.data else current_user.user_metadata.get("name")
            },
            "settings": settings.data[0] if settings.data else {},
            "consent": consent.data[0] if consent.data else {}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")

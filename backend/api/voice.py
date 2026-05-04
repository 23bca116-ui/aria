from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import Response
from supabase import Client
from typing import Any, Optional
import json

from core.deps import get_supabase, get_current_user
from core.memory import MemoryEngine
from api.memory import get_memory_engine
from core.ai import AIEngine

router = APIRouter()

# Instantiate AI Engine globally for connection pooling reuse
ai_engine = AIEngine()

@router.post("/converse")
async def handle_conversation(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    local_memories: Optional[str] = Form(None),
    voice_pref: Optional[str] = Form("calm"),
    current_user: Any = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    memory: MemoryEngine = Depends(get_memory_engine)
):
    """
    Main AI Loop:
    1. Receives audio blob and user JWT.
    2. STT via Whisper.
    3. Fetches User explicitly stored preferences.
    4. Orchestrates LLM via LLaMA 3.3.
    5. Ingests new insights to Memory.
    6. Streams TTS via ElevenLabs.
    """
    try:
        # Protect against empty uploads
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio payload")

        # 1. Transcribe
        transcription = await ai_engine.transcribe_audio(audio_bytes, filename=audio.filename)
        
        # 2. Fetch User Profile & Voice Settings (with fallbacks if tables don't exist yet)
        user_name = "User"
        try:
            settings_res = supabase.table("user_settings").select("voice").eq("user_id", current_user.id).execute()
            if settings_res.data:
                # Only override if they actually have a saved preference and didn't just send one
                db_voice = settings_res.data[0].get("voice")
                if db_voice: voice_pref = db_voice
        except Exception:
            pass
        
        try:
            profile_res = supabase.table("user_profiles").select("name").eq("id", current_user.id).execute()
            if profile_res.data:
                user_name = profile_res.data[0].get("name", "User")
        except Exception:
            # Fallback to auth metadata
            user_name = getattr(current_user, 'user_metadata', {}).get('name', 'User') if hasattr(current_user, 'user_metadata') else 'User'

        # 3. Pull SQL Explicit Memories & Recent Continuity
        structured_memories = []
        recent_history = []
        try:
            structured_memories = memory.fetch_all_structured(current_user.id)
            recent_history = memory.fetch_recent_context(current_user.id, limit=4)
        except Exception as e:
            print(f"Memory fetch warning (tables may not exist yet): {e}")

        if local_memories:
            try:
                parsed_local = json.loads(local_memories)
                if isinstance(parsed_local, list):
                    structured_memories.extend(parsed_local)
            except Exception:
                pass
        
        # 4. Generate LLM Response
        ai_reply_text = await ai_engine.generate_response(
            user_text=transcription, 
            user_name=user_name,
            sql_memories=structured_memories,
            recent_history=recent_history
        )

        # 5. Semantic Memory Background Storage (Offload to background to reduce latency)
        background_tasks.add_task(
            memory.extract_and_store,
            user_id=current_user.id,
            session_id=None,
            text=f"User: {transcription}\nARIA: {ai_reply_text}"
        )

        # 6. Generate Voice Bytes
        print(f"DEBUG: Using voice preference: {voice_pref}")
        audio_response_bytes = await ai_engine.synthesize_voice(text=ai_reply_text, voice_pref=voice_pref)

        import base64
        audio_b64 = base64.b64encode(audio_response_bytes).decode('utf-8')

        return {
            "transcription": transcription,
            "reply": ai_reply_text,
            "audio": audio_b64
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
class TextConverseRequest(BaseModel):
    text: str
    local_memories: Optional[list] = None
    voice_pref: Optional[str] = "calm"

@router.post("/converse_text")
async def handle_text_conversation(
    req: TextConverseRequest,
    current_user: Any = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    memory: MemoryEngine = Depends(get_memory_engine)
):
    """Fallback text pipeline."""
    try:
        user_name = "User"
        voice_pref = req.voice_pref or "calm"
        try:
            profile_res = supabase.table("user_profiles").select("name").eq("id", current_user.id).execute()
            if profile_res.data: user_name = profile_res.data[0].get("name", "User")
            settings_res = supabase.table("user_settings").select("voice").eq("user_id", current_user.id).execute()
            if settings_res.data: 
                db_voice = settings_res.data[0].get("voice")
                if db_voice: voice_pref = db_voice
        except Exception: pass

        structured_memories = []
        recent_history = []
        try:
            structured_memories = memory.fetch_all_structured(current_user.id)
            recent_history = memory.fetch_recent_context(current_user.id, limit=4)
        except Exception: pass

        if req.local_memories:
            structured_memories.extend(req.local_memories)

        ai_reply_text = await ai_engine.generate_response(req.text, user_name, structured_memories, recent_history)

        try:
            memory.extract_and_store(current_user.id, None, f"User: {req.text}\nARIA: {ai_reply_text}")
        except Exception: pass

        audio_response_bytes = await ai_engine.synthesize_voice(text=ai_reply_text, voice_pref=voice_pref)

        import base64
        audio_b64 = base64.b64encode(audio_response_bytes).decode('utf-8')

        return {
            "transcription": req.text,
            "reply": ai_reply_text,
            "audio": audio_b64
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_voice_history(
    current_user = Depends(get_current_user),
    memory: MemoryEngine = Depends(get_memory_engine)
):
    """Retrieves the most recent conversation logs for UI continuity."""
    try:
        history = memory.fetch_recent_context(current_user.id, limit=10)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

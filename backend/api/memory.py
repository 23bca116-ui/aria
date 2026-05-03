from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client
from typing import Any, List, Dict

from core.deps import get_supabase, get_current_user
from core.memory import MemoryEngine

router = APIRouter()

# Memory Engine instance cache
_memory_engine = None

def get_memory_engine(supabase: Client = Depends(get_supabase)) -> MemoryEngine:
    global _memory_engine
    if _memory_engine is None:
        _memory_engine = MemoryEngine(supabase)
    return _memory_engine

class MemoryIngestRequest(BaseModel):
    text: str
    session_id: str = ""

@router.get("/")
async def list_memories(
    current_user: Any = Depends(get_current_user),
    engine: MemoryEngine = Depends(get_memory_engine)
):
    """
    Fetches all structured memories (SQL) belonging to the user
    for rendering in the Memory Vault UI.
    """
    try:
        memories = engine.fetch_all_structured(current_user.id)
        return {"data": memories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest")
async def ingest_memory(
    req: MemoryIngestRequest,
    current_user: Any = Depends(get_current_user),
    engine: MemoryEngine = Depends(get_memory_engine)
):
    """
    UI endpoint to explicitly save a memory (testing)
    Usually this is fired internally during the Voice loop.
    """
    try:
        res = engine.extract_and_store(current_user.id, req.session_id, req.text)
        return {"message": "Memory ingested", "details": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_memory(
    query: str,
    limit: int = 3,
    current_user: Any = Depends(get_current_user),
    engine: MemoryEngine = Depends(get_memory_engine)
):
    """
    Semantic search targeting ChromaDB.
    """
    try:
        results = engine.semantic_search(current_user.id, query, limit)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{memory_id}")
async def forget_memory(
    memory_id: str,
    current_user: Any = Depends(get_current_user),
    engine: MemoryEngine = Depends(get_memory_engine)
):
    """
    Allows the user to manually blast an explicitly saved fact out of SQL.
    """
    try:
        engine.forget_fact(current_user.id, memory_id)
        return {"message": f"Successfully forgot memory {memory_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

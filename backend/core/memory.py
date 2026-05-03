import os
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings
from supabase import Client
import uuid
import datetime
from typing import List, Dict, Any

# ====================================================================
# Mock Embedding Function 
# (Enforces rule: strictly no local ONNX inferences downloaded)
# We will swap this out for the Groq/Similar API call in Phase 4
# ====================================================================
class ExternalAPIEmbeddingMock(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        # Generates a dummy deterministic length-384 float array
        return [[0.01 * len(text) for _ in range(384)] for text in input]

class MemoryEngine:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        
        # Local ephemeral Chroma DB for development
        # Swaps to HTTPClient in production on Railway
        self.chroma_client = chromadb.EphemeralClient()
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="aria_semantic",
            embedding_function=ExternalAPIEmbeddingMock()
        )

    def extract_and_store(self, user_id: str, session_id: str, text: str):
        """
        Simulates extracting explicit facts (SQL) and implicit semantic meaning (Chroma)
        from a raw user input string.
        """
        # 1. SQL Layer (Structured Storage)
        # We mock extraction based on simple heuristics for demonstration
        if "like" in text.lower() or "prefer" in text.lower() or "favorite" in text.lower():
            self._store_sql_fact(user_id, session_id, "preference", text)
        elif "remember" in text.lower() or "important" in text.lower():
            self._store_sql_fact(user_id, session_id, "pinned", text)
        else:
            # By default, treat as a conversational log
            self._store_sql_fact(user_id, session_id, "conversation", text)

        # 2. ChromaDB Layer (Semantic Storage)
        chunk_id = str(uuid.uuid4())
        self.collection.add(
            ids=[chunk_id],
            documents=[text],
            metadatas=[{"user_id": user_id, "session_id": session_id or "", "timestamp": str(datetime.datetime.now())}]
        )
        return {"sql_status": "stored", "chroma_status": "embedded"}

    def _store_sql_fact(self, user_id: str, session_id: str, category: str, content: str):
        """Internal helper to write to public.memory_metadata"""
        try:
            self.supabase.table("memory_metadata").insert({
                "user_id": user_id,
                "session_id": session_id if session_id else None,
                "category": category,
                "content": content
            }).execute()
        except Exception as e:
            print(f"Error saving SQL fact: {e}")

    def semantic_search(self, user_id: str, query: str, limit: int = 3):
        """Searches ChromaDB for related contextual chunks"""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit,
                where={"user_id": user_id}
            )
            # Flatten results
            if results["documents"] and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metadatas = results["metadatas"][0] if results["metadatas"] else []
                return [{"content": text, "meta": meta} for text, meta in zip(docs, metadatas)]
            return []
        except Exception as e:
            print(f"Chroma search error: {e}")
            return []
            
    def fetch_all_structured(self, user_id: str) -> List[Dict]:
        """Fetches all explicitly pinned facts/preferences from the SQL layer."""
        res = self.supabase.table("memory_metadata").select("*").neq("category", "conversation").eq("user_id", user_id).execute()
        return res.data if res.data else []
        
    def fetch_recent_context(self, user_id: str, limit: int = 4) -> List[Dict]:
        """Fetches the N most recent conversation logs to maintain context window."""
        res = self.supabase.table("memory_metadata").select("*").eq("category", "conversation").eq("user_id", user_id).order("id", desc=True).limit(limit).execute()
        # Return chronologically ascending
        return list(reversed(res.data)) if res.data else []

    def forget_fact(self, user_id: str, memory_id: str):
        """Deletes an explicit memory out of the SQL layer."""
        self.supabase.table("memory_metadata").delete().match({"id": memory_id, "user_id": user_id}).execute()

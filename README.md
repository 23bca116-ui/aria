# ARIA — The Ambient Intelligence Companion

ARIA is a premium, voice-first AI companion designed for deep emotional intelligence and persistent semantic memory.

## 🏗️ Architecture Summary

ARIA utilizes a hybrid intelligence stack for low-latency, human-like interaction:

1.  **The Brain:** Llama 3.3 (70B) via **Groq**, optimized for conversational speed and brevity.
2.  **The Voice:** 
    *   **STT:** Whisper-large-v3 via **Groq** (Extreme low latency).
    *   **TTS:** **Microsoft Edge Voice** (Neural high-fidelity synthesis).
3.  **The Memory (Dual-Layer):**
    *   **Structured (SQL):** Uses **Supabase** for explicit facts (preferences, names, pinned notes). This layer is queryable and used for direct context injection.
    *   **Semantic (Vector):** Uses **ChromaDB** for abstract impressions and thematic continuity. This layer allows ARIA to "feel" the vibe of past conversations without needing exact keyword matches.
4.  **The Interface:** A high-end PWA built with Vanilla JS and CSS Design Tokens, featuring a custom Web Audio oscillator for wake-word chimes.

## 🧠 SQL vs ChromaDB: Why Both?

| Feature | SQL (Structured) | ChromaDB (Semantic) |
| :--- | :--- | :--- |
| **Purpose** | Facts & Preferences | Context & Vibes |
| **Example** | "I like dark chocolate" | "We talked about philosophy last week" |
| **Reliability** | 100% Exact Recall | Approximate / Thematic |
| **Speed** | Instant | Low (Latency depends on embedding) |
| **Usage** | System Prompt Injection | Semantic Search / Long-term lookup |

## 🚀 Setup & Execution

### 1. Environment Variables
Create a `.env` file in the `backend/` directory with:
```env
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 2. Backend Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### 3. Frontend Execution
The frontend is a static PWA. You can serve it using any local server:
```bash
# Example using Python
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

## ⚠️ Known Limitations
- **Local Embeddings:** Currently uses a deterministic mock for embeddings to avoid downloading multi-gigabyte models to the local system. In production, this should be swapped for `text-embedding-3-small`.
- **Ephemeral Vector Store:** ChromaDB runs in `EphemeralClient` mode for local dev. This means semantic memories are lost when the server restarts (SQL facts remain persistent).
- **Background Mic:** Web browsers restrict microphone access in the background. ARIA must be the active tab to listen for the "Hey ARIA" wake word.

## 🔮 Future Production Roadmap
1.  **Persistent Vector Cloud:** Migrate ChromaDB to a hosted vector instance (e.g., Pinecone or Chroma Cloud).
2.  **Streaming Audio:** Implement WebSocket streaming for the Edge-TTS to reduce first-byte-latency.
3.  **Biometric Lock:** Implement WebAuthn (FaceID/TouchID) for the Privacy settings section.
4.  **Multi-Modal:** Add vision support using Llama 3.2 Vision to allow ARIA to "see" your environment.

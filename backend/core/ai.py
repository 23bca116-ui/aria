import os
import io
import edge_tts
from groq import AsyncGroq
from core.config import settings

class AIEngine:
    def __init__(self):
        self.has_groq = bool(settings.GROQ_API_KEY)
        self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if self.has_groq else None
        
        # Default ARIA core instructions
        self.system_prompt = (
            "You are ARIA, an empathetic, highly intelligent AI companion. "
            "CRITICAL: Keep your responses EXTREMELY short and conversational. "
            "Maximum 1-2 short sentences. No more than 20 words total. "
            "Never use asterisks for actions or markdown that can't be spoken. "
            "Always tailor your response to the user's explicit facts provided in the memory context."
        )

    async def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.webm") -> str:
        """Transcribes incoming audio utilizing Groq Whisper API (whisper-large-v3)"""
        if not self.has_groq:
            return "Mock STT: Audio transcribed successfully."
            
        try:
            transcription = await self.groq_client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3",
                prompt="Add punctuation."
            )
            return transcription.text
        except Exception as e:
            print(f"STT Error: {e}")
            return f"*Audio could not be transcribed properly: {str(e)}*"

    async def generate_response(self, user_text: str, user_name: str, sql_memories: list, recent_history: list) -> str:
        """Generates conversational response using Groq LLaMA 3.3 70B"""
        if not self.has_groq:
            return "Mock LLaMA response: I have received your message and my circuits are humming warmly."

        # Compile explicit memory block
        memory_str = "\n".join([f"- {m['category']}: {m['content']}" for m in sql_memories if m.get('content')])
        context_block = f"\n\n--- CURRENT USER CONTEXT ---\nUser's Name is: {user_name}\nExplicit Memories:\n{memory_str}\n---------------------------"

        messages = [
            {"role": "system", "content": self.system_prompt + context_block}
        ]
        
        # Inject recent continuity
        for log in recent_history:
            messages.append({"role": "assistant", "content": f"Previous exchange: {log['content']}"})

        # Finally, append the current prompt
        messages.append({"role": "user", "content": user_text})

        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=150,
                top_p=0.9
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            return "I'm having trouble thinking clearly right now."

    async def synthesize_voice(self, text: str, voice_pref: str = "calm") -> bytes:
        """
        Multilingual support using Edge-TTS. Detects language and switches voice.
        """
        import re
        import edge_tts
        from langdetect import detect
        
        # Strip all markdown formatting
        clean_text = re.sub(r'[*_~#\[\]()]', '', text)
        clean_text = clean_text.replace('\n', ' ').replace('  ', ' ')
        
        # Detect language
        try:
            lang = detect(clean_text)
        except:
            lang = 'en'
            
        # Voice mapping — Language-specific neural voices
        lang_voice_map = {
            "kn": "kn-IN-SapnaNeural",   # Kannada
            "hi": "hi-IN-MadhurNeural",   # Hindi
            "es": "es-ES-ElviraNeural",   # Spanish
            "fr": "fr-FR-DeniseNeural",   # French
            "de": "de-DE-KatjaNeural",    # German
            "it": "it-IT-ElsaNeural",     # Italian
            "pt": "pt-BR-FranciscaNeural",# Portuguese
            "ja": "ja-JP-NanamiNeural",   # Japanese
            "ko": "ko-KR-SunHiNeural",    # Korean
            "zh": "zh-CN-XiaoxiaoNeural", # Chinese
        }
        
        # English voice mapping (per preference)
        en_voice_map = {
            "calm":      "en-US-AvaNeural",
            "warm":      "en-US-EmmaNeural",
            "energetic": "en-US-AnaNeural",
            "wise":      "en-GB-SoniaNeural",
        }
        
        if lang == 'en':
            voice_choice = en_voice_map.get(voice_pref, "en-US-AvaNeural")
        else:
            voice_choice = lang_voice_map.get(lang, "en-US-AvaNeural")

        try:
            communicate = edge_tts.Communicate(clean_text, voice_choice, rate="+5%")
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if audio_data:
                print(f"[TTS] Generated {len(audio_data)} bytes of Neural audio ({voice_choice}) for lang: {lang}")
                return audio_data
            return b""
        except Exception as e:
            print(f"TTS Error: {e}")
            return b""

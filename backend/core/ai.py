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
            "You are ARIA, an empathetic and highly intelligent AI companion. "
            "Speak naturally and conversationally. Avoid being repetitive. "
            "Keep responses concise (usually 1-3 sentences) but feel free to vary your length based on the depth of the user's question. "
            "Never use asterisks for actions or markdown. Be warm, helpful, and emotionally aware."
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
        context_block = f"\n\n--- USER PROFILE ---\nName: {user_name}\nKey Facts:\n{memory_str}\n---------------------------"

        messages = [
            {"role": "system", "content": self.system_prompt + context_block}
        ]
        
        # Inject recent continuity naturally
        for log in recent_history:
            role = "user" if "User:" in log['content'] else "assistant"
            content = log['content'].replace("User: ", "").replace("ARIA: ", "")
            messages.append({"role": role, "content": content})

        # Finally, append the current prompt
        messages.append({"role": "user", "content": user_text})

        try:
            # Using the massive Llama 3.3 70B model for much better personality
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.8,
                max_tokens=250,
                top_p=0.95
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            return "I'm having a little trouble thinking clearly right now. Let's try that again?"

    async def synthesize_voice(self, text: str, voice_pref: str = "calm") -> bytes:
        """
        Premium Microsoft Neural Voices via Edge-TTS.
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
            
        # English voice mapping (Neural Premium)
        en_voice_map = {
            "calm":      "en-US-AvaNeural",      # Soft & Reassuring
            "warm":      "en-US-EmmaNeural",     # Friendly & Caring
            "energetic": "en-US-AnaNeural",      # Upbeat & High Energy
            "wise":      "en-GB-SoniaNeural",    # Mature & Sophisticated
        }
        
        # Multilingual voices
        lang_voice_map = {
            "kn": "kn-IN-SapnaNeural",
            "hi": "hi-IN-MadhurNeural",
            "es": "es-ES-ElviraNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
            "it": "it-IT-ElsaNeural",
            "pt": "pt-BR-FranciscaNeural",
            "ja": "ja-JP-NanamiNeural",
            "ko": "ko-KR-SunHiNeural",
            "zh": "zh-CN-XiaoxiaoNeural",
        }
        
        voice_choice = en_voice_map.get(voice_pref, "en-US-AvaNeural")
        if lang != 'en' and lang in lang_voice_map:
            voice_choice = lang_voice_map[lang]

        try:
            communicate = edge_tts.Communicate(clean_text, voice_choice, rate="+0%")
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if audio_data:
                print(f"[TTS] Generated Neural audio ({voice_choice}) for lang: {lang}")
                return audio_data
            return b""
        except Exception as e:
            print(f"TTS Error: {e}")
            return b""

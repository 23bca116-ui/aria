-- ARIA Application Schema

-- Enable UUID extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. User Profiles
-- Links to Supabase auth.users
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. User Settings
-- Theme, Voice, Language Preferences
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'en',
    voice TEXT DEFAULT 'calm',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. User Consent & Privacy
-- Granular toggles for AI memory and context
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_consent (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    remember_conversations BOOLEAN DEFAULT TRUE,
    learn_preferences BOOLEAN DEFAULT TRUE,
    emotional_context BOOLEAN DEFAULT TRUE,
    voice_patterns BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. Conversation Sessions
-- Tracks distinct Voice/Text discussions
-- ==========================================
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    emotional_arc TEXT,
    -- Tracks mood changes throughout the session
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ==========================================
-- 5. Memory Metadata (SQL layer for ChromaDB correlation)
-- Structured tracking of stored facts
-- ==========================================
CREATE TABLE IF NOT EXISTS public.memory_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- e.g., 'preference', 'fact', 'relationship'
    content TEXT NOT NULL,
    chroma_id TEXT, -- Future link to the vector embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    relevance_score FLOAT DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_metadata ENABLE ROW LEVEL SECURITY;

-- Allow users to read and update their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own consent" ON public.user_consent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own consent" ON public.user_consent FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON public.conversation_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.conversation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own memories" ON public.memory_metadata FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own memories" ON public.memory_metadata FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- Auto-create profile trigger
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.user_settings (user_id) VALUES (new.id);
  INSERT INTO public.user_consent (user_id) VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

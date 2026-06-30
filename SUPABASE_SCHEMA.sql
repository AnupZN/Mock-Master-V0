-- ==========================================
-- SUPABASE DATABASE INITIALIZATION SCHEMA
-- ==========================================
-- Instructions:
-- 1. Open your Supabase Dashboard (https://supabase.com).
-- 2. Select your project.
-- 3. Go to the "SQL Editor" in the left-hand navigation.
-- 4. Click "New Query" and paste the entire script below.
-- 5. Click "Run" (or Ctrl + Enter / Cmd + Enter) to execute.
-- 6. Ensure row-level security (RLS) is disabled or appropriate policies are added if needed.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Users Settings Table
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    theme TEXT,
    is_dark_mode BOOLEAN DEFAULT FALSE,
    font_size INTEGER DEFAULT 14,
    question_font TEXT DEFAULT 'Inter',
    daily_target INTEGER DEFAULT 10,
    user_name TEXT,
    user_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Practice/Exam History Table
CREATE TABLE IF NOT EXISTS public.history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    chapter_title TEXT NOT NULL,
    date TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    max_score NUMERIC DEFAULT 100,
    accuracy NUMERIC DEFAULT 0,
    time_taken INTEGER DEFAULT 0,
    is_practice_mode BOOLEAN DEFAULT FALSE,
    practice_type TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    bookmark_id TEXT PRIMARY KEY, -- Constructed as subject_id_chapter_id_question_id
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Wrong Questions Log Table (for spacing repetition and review)
CREATE TABLE IF NOT EXISTS public.wrong_questions (
    wrong_id TEXT PRIMARY KEY, -- Constructed as subject_id_chapter_id_question_id
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Custom Questions Customization Table
CREATE TABLE IF NOT EXISTS public.custom_questions (
    custom_id TEXT PRIMARY KEY, -- Constructed as subject_id_chapter_id_question_id
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    question_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Admin Manifest (Custom Subjects & Chapters index)
CREATE TABLE IF NOT EXISTS public.admin_manifest (
    id TEXT PRIMARY KEY DEFAULT 'current',
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Create Admin Chapters Data (Custom Questions lists per chapter)
CREATE TABLE IF NOT EXISTS public.admin_chapters_data (
    id TEXT PRIMARY KEY, -- Constructed as subject_id_chapter_id
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- If you have Row-Level Security (RLS) enabled on your Supabase tables, you MUST
-- define policies to allow users to insert, read, update, and delete their own data.
-- Run the following statements in your Supabase SQL Editor:

-- 1. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chapters_data ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow individual read" ON public.users;
DROP POLICY IF EXISTS "Allow individual insert" ON public.users;
DROP POLICY IF EXISTS "Allow individual update" ON public.users;
DROP POLICY IF EXISTS "Allow individual delete" ON public.users;

DROP POLICY IF EXISTS "Allow individual read" ON public.history;
DROP POLICY IF EXISTS "Allow individual insert" ON public.history;
DROP POLICY IF EXISTS "Allow individual update" ON public.history;
DROP POLICY IF EXISTS "Allow individual delete" ON public.history;

DROP POLICY IF EXISTS "Allow individual read" ON public.bookmarks;
DROP POLICY IF EXISTS "Allow individual insert" ON public.bookmarks;
DROP POLICY IF EXISTS "Allow individual update" ON public.bookmarks;
DROP POLICY IF EXISTS "Allow individual delete" ON public.bookmarks;

DROP POLICY IF EXISTS "Allow individual read" ON public.wrong_questions;
DROP POLICY IF EXISTS "Allow individual insert" ON public.wrong_questions;
DROP POLICY IF EXISTS "Allow individual update" ON public.wrong_questions;
DROP POLICY IF EXISTS "Allow individual delete" ON public.wrong_questions;

DROP POLICY IF EXISTS "Allow individual read" ON public.custom_questions;
DROP POLICY IF EXISTS "Allow individual insert" ON public.custom_questions;
DROP POLICY IF EXISTS "Allow individual update" ON public.custom_questions;
DROP POLICY IF EXISTS "Allow individual delete" ON public.custom_questions;

DROP POLICY IF EXISTS "Allow read manifest for everyone" ON public.admin_manifest;
DROP POLICY IF EXISTS "Allow update manifest for authenticated" ON public.admin_manifest;

DROP POLICY IF EXISTS "Allow read chapter data for everyone" ON public.admin_chapters_data;
DROP POLICY IF EXISTS "Allow update chapter data for authenticated" ON public.admin_chapters_data;


-- 3. Create policies for 'users' table
CREATE POLICY "Allow individual read" ON public.users
    FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Allow individual insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = uid);
CREATE POLICY "Allow individual update" ON public.users
    FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);
CREATE POLICY "Allow individual delete" ON public.users
    FOR DELETE USING (auth.uid()::text = uid);

-- 4. Create policies for 'history' table
-- We cast auth.uid() to TEXT and compare to user_id to support any key format cleanly
CREATE POLICY "Allow individual read" ON public.history
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON public.history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON public.history
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual delete" ON public.history
    FOR DELETE USING (auth.uid()::text = user_id);

-- 5. Create policies for 'bookmarks' table
CREATE POLICY "Allow individual read" ON public.bookmarks
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON public.bookmarks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON public.bookmarks
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual delete" ON public.bookmarks
    FOR DELETE USING (auth.uid()::text = user_id);

-- 6. Create policies for 'wrong_questions' table
CREATE POLICY "Allow individual read" ON public.wrong_questions
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON public.wrong_questions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON public.wrong_questions
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual delete" ON public.wrong_questions
    FOR DELETE USING (auth.uid()::text = user_id);

-- 7. Create policies for 'custom_questions' table
CREATE POLICY "Allow individual read" ON public.custom_questions
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON public.custom_questions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON public.custom_questions
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual delete" ON public.custom_questions
    FOR DELETE USING (auth.uid()::text = user_id);

-- 8. Create policies for 'admin_manifest' table
CREATE POLICY "Allow read manifest for everyone" ON public.admin_manifest
    FOR SELECT USING (true);
CREATE POLICY "Allow insert manifest for authenticated" ON public.admin_manifest
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update manifest for authenticated" ON public.admin_manifest
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow delete manifest for authenticated" ON public.admin_manifest
    FOR DELETE USING (auth.role() = 'authenticated');

-- 9. Create policies for 'admin_chapters_data' table
CREATE POLICY "Allow read chapter data for everyone" ON public.admin_chapters_data
    FOR SELECT USING (true);
CREATE POLICY "Allow insert chapter data for authenticated" ON public.admin_chapters_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update chapter data for authenticated" ON public.admin_chapters_data
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow delete chapter data for authenticated" ON public.admin_chapters_data
    FOR DELETE USING (auth.role() = 'authenticated');

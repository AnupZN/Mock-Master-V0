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
-- (Optional) Enable Realtime or RLS policies
-- ==========================================
-- By default, tables are ready for access. If Row-Level Security (RLS) is enabled,
-- you should create RLS policies allowing authenticated users to access their own data.

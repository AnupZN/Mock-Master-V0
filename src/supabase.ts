import { createClient } from "@supabase/supabase-js";
import { AppSettings, AttemptHistoryItem, Bookmark as BookmarkType } from "./types";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

// Gracefully handle missing keys to prevent startup crashes.
export const supabase = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

// Check if Supabase has been configured with real, non-placeholder credentials
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  const isPlaceholderUrl = 
    supabaseUrl === "your-supabase-project-url" || 
    supabaseUrl.includes("placeholder-url");
  const isPlaceholderKey = 
    supabaseAnonKey === "your-supabase-anon-key" || 
    supabaseAnonKey.includes("placeholder-anon-key");
  return !isPlaceholderUrl && !isPlaceholderKey;
}

// Placeholder to avoid breaking the App.tsx import signature
export const googleProvider = {};

let activeUser: any = null;

function adaptSupabaseUser(user: any) {
  if (!user) return null;
  return {
    uid: user.id,
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };
}

// Authentication adapter
export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Attempt to load current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      activeUser = session?.user ? adaptSupabaseUser(session.user) : null;
      callback(activeUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      activeUser = session?.user ? adaptSupabaseUser(session.user) : null;
      callback(activeUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  },
  get currentUser() {
    return activeUser;
  }
};

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.");
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split("@")[0],
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithPopup(_auth?: any, _provider?: any) {
  if (!isSupabaseConfigured()) {
    alert("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.");
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut(_auth?: any) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export { signOut as firebaseSignOut };

// Database Helpers
export async function fetchUserDoc(userId: string): Promise<Partial<AppSettings> | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("uid", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return {
        theme: data.theme,
        isDarkMode: data.is_dark_mode,
        fontSize: data.font_size,
        questionFont: data.question_font,
        dailyTarget: data.daily_target,
        userName: data.user_name,
        userTitle: data.user_title,
      } as Partial<AppSettings>;
    }
    return null;
  } catch (error) {
    console.error("Supabase error fetching user settings:", error);
    return null;
  }
}

export async function saveUserDoc(userId: string, settings: AppSettings): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from("users")
      .upsert({
        uid: userId,
        theme: settings.theme,
        is_dark_mode: settings.isDarkMode,
        font_size: settings.fontSize,
        question_font: settings.questionFont,
        daily_target: settings.dailyTarget,
        user_name: settings.userName || "",
        user_title: settings.userTitle || "",
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving user settings:", error);
  }
}

export async function fetchUserHistory(userId: string): Promise<AttemptHistoryItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    if (!data) return [];

    const items: AttemptHistoryItem[] = data.map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      chapterId: row.chapter_id,
      chapterTitle: row.chapter_title,
      date: row.date,
      score: Number(row.score),
      totalQuestions: row.total_questions,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      skippedCount: row.skipped_count,
      maxScore: Number(row.max_score),
      accuracy: Number(row.accuracy),
      timeTaken: row.time_taken,
      isPracticeMode: row.is_practice_mode,
      practiceType: row.practice_type,
    }));

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Supabase error fetching user history:", error);
    return [];
  }
}

export async function saveUserHistoryItem(userId: string, item: AttemptHistoryItem): Promise<void> {
  if (!isSupabaseConfigured()) return;
  
  const safeNum = (val: any, def = 0) => {
    const n = Number(val);
    return Number.isNaN(n) || val === undefined || val === null ? def : n;
  };

  try {
    const { error } = await supabase
      .from("history")
      .insert({
        id: item.id || `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        subject_id: item.subjectId || "unknown_subject",
        subject_name: item.subjectName || "Unknown Subject",
        chapter_id: item.chapterId || "unknown_chapter",
        chapter_title: item.chapterTitle || "Unknown Chapter",
        date: item.date || new Date().toISOString(),
        score: safeNum(item.score, 0),
        total_questions: safeNum(item.totalQuestions, 0),
        correct_count: safeNum(item.correctCount, 0),
        wrong_count: safeNum(item.wrongCount, 0),
        skipped_count: safeNum(item.skippedCount, 0),
        max_score: safeNum(item.maxScore, 100),
        accuracy: safeNum(item.accuracy, 0),
        time_taken: safeNum(item.timeTaken, 0),
        is_practice_mode: !!item.isPracticeMode,
        practice_type: item.practiceType || "",
      });

    if (error) {
      // 23505 is PostgreSQL's duplicate key unique constraint violation.
      // We ignore this because history attempts are immutable and already exist in the database.
      if (error.code === "23505") {
        console.log("History item already exists in database, skipping insert:", item.id);
        return;
      }
      console.error("Supabase returned error on inserting history item:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
  } catch (error: any) {
    console.error("Supabase error saving history item:", error?.message || error);
  }
}

export async function fetchUserBookmarks(userId: string): Promise<BookmarkType[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      subjectId: row.subject_id,
      chapterId: row.chapter_id,
      questionId: row.question_id,
    }));
  } catch (error) {
    console.error("Supabase error fetching bookmarks:", error);
    return [];
  }
}

export async function saveUserBookmark(userId: string, bookmark: BookmarkType): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const bookmarkId = `${userId}_${bookmark.subjectId}_${bookmark.chapterId}_${bookmark.questionId}`;
  try {
    const { error } = await supabase
      .from("bookmarks")
      .upsert({
        bookmark_id: bookmarkId,
        user_id: userId,
        subject_id: bookmark.subjectId,
        chapter_id: bookmark.chapterId,
        question_id: bookmark.questionId,
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving bookmark:", error);
  }
}

export async function deleteUserBookmark(userId: string, bookmark: BookmarkType): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const bookmarkId = `${userId}_${bookmark.subjectId}_${bookmark.chapterId}_${bookmark.questionId}`;
  try {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error deleting bookmark:", error);
  }
}

export async function fetchUserWrongQuestions(userId: string): Promise<BookmarkType[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("wrong_questions")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      subjectId: row.subject_id,
      chapterId: row.chapter_id,
      questionId: row.question_id,
    }));
  } catch (error) {
    console.error("Supabase error fetching wrong questions:", error);
    return [];
  }
}

export async function saveUserWrongQuestion(userId: string, wrong: BookmarkType): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const wrongId = `${userId}_${wrong.subjectId}_${wrong.chapterId}_${wrong.questionId}`;
  try {
    const { error } = await supabase
      .from("wrong_questions")
      .upsert({
        wrong_id: wrongId,
        user_id: userId,
        subject_id: wrong.subjectId,
        chapter_id: wrong.chapterId,
        question_id: wrong.questionId,
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving wrong question:", error);
  }
}

export async function deleteUserWrongQuestion(userId: string, wrong: BookmarkType): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const wrongId = `${userId}_${wrong.subjectId}_${wrong.chapterId}_${wrong.questionId}`;
  try {
    const { error } = await supabase
      .from("wrong_questions")
      .delete()
      .eq("wrong_id", wrongId)
      .eq("user_id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error deleting wrong question:", error);
  }
}

export interface CustomQuestion {
  custom_id: string;
  user_id: string;
  subject_id: string;
  chapter_id: string;
  question_id: number;
  question_data: any;
  updated_at?: string;
}

export async function fetchCustomQuestions(userId: string): Promise<CustomQuestion[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("custom_questions")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Supabase error fetching custom questions:", error);
    return [];
  }
}

export async function saveCustomQuestion(
  userId: string,
  subjectId: string,
  chapterId: string,
  questionId: number,
  questionData: any
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const customId = `${userId}_${subjectId}_${chapterId}_${questionId}`;
  try {
    const { error } = await supabase
      .from("custom_questions")
      .upsert({
        custom_id: customId,
        user_id: userId,
        subject_id: subjectId,
        chapter_id: chapterId,
        question_id: questionId,
        question_data: questionData,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving custom question:", error);
  }
}

// Admin Manifest (Custom Subjects & Chapters index)
export async function fetchAdminManifest(): Promise<any | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("admin_manifest")
      .select("data")
      .eq("id", "current")
      .maybeSingle();

    if (error) throw error;
    return data ? data.data : null;
  } catch (error) {
    console.error("Supabase error fetching admin manifest:", error);
    return null;
  }
}

export async function saveAdminManifest(manifestData: any): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from("admin_manifest")
      .upsert({
        id: "current",
        data: manifestData,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving admin manifest:", error);
    throw error;
  }
}

// Admin Chapters Data (Custom Questions lists per chapter)
export async function fetchAdminChapterData(subjectId: string, chapterId: string): Promise<any | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("admin_chapters_data")
      .select("data")
      .eq("id", `${subjectId}_${chapterId}`)
      .maybeSingle();

    if (error) throw error;
    return data ? data.data : null;
  } catch (error) {
    console.error("Supabase error fetching admin chapter data:", error);
    return null;
  }
}

export async function saveAdminChapterData(subjectId: string, chapterId: string, data: any): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from("admin_chapters_data")
      .upsert({
        id: `${subjectId}_${chapterId}`,
        subject_id: subjectId,
        chapter_id: chapterId,
        data: data,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error("Supabase error saving admin chapter data:", error);
    throw error;
  }
}

export async function clearUserHistoryInDb(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from("history")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  } catch (error) {
    console.error("Supabase error deleting user history in DB:", error);
    throw error;
  }
}

export async function clearAllUserProgressInDb(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error: hErr } = await supabase.from("history").delete().eq("user_id", userId);
    if (hErr) throw hErr;

    const { error: bErr } = await supabase.from("bookmarks").delete().eq("user_id", userId);
    if (bErr) throw bErr;

    const { error: wErr } = await supabase.from("wrong_questions").delete().eq("user_id", userId);
    if (wErr) throw wErr;

    const { error: cErr } = await supabase.from("custom_questions").delete().eq("user_id", userId);
    if (cErr) throw cErr;
  } catch (error) {
    console.error("Supabase error clearing all user progress in DB:", error);
    throw error;
  }
}


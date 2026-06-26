import { AppSettings, AttemptHistoryItem, Bookmark } from "./types";

// Local Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: "modular_exam_portal_settings_v2",
  HISTORY: "modular_exam_portal_history_v2",
  BOOKMARKS: "modular_exam_portal_bookmarks_v2",
  LAST_OPENED_SUBJECT: "modular_exam_portal_last_subject_v2",
  LAST_OPENED_CHAPTER: "modular_exam_portal_last_chapter_v2",
  RESUME_EXAM: "modular_exam_portal_resume_session_v2",
  WRONG_QUESTIONS: "modular_exam_portal_wrong_questions_v2",
};

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "slate",
  isDarkMode: false,
  fontSize: 16,
  questionFont: "sans",
  dailyTarget: 15,
  userName: "Guest",
  userTitle: "Level 1 Aspirant",
};

// Safe JSON Parse wrapper
function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Failed to parse local storage key: ${key}`, e);
    return defaultValue;
  }
}

function safeSetItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to local storage key: ${key}`, e);
  }
}

// Settings
export function getAppSettings(): AppSettings {
  const settings = safeGetItem<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, {});
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  } as AppSettings;
}

export function saveAppSettings(settings: AppSettings): void {
  safeSetItem(STORAGE_KEYS.SETTINGS, settings);
}

// History / Progress
export function getAttemptHistory(): AttemptHistoryItem[] {
  return safeGetItem<AttemptHistoryItem[]>(STORAGE_KEYS.HISTORY, []);
}

export function saveAttemptHistory(history: AttemptHistoryItem[]): void {
  safeSetItem(STORAGE_KEYS.HISTORY, history);
}

// Bookmarks
export function getBookmarks(): Bookmark[] {
  return safeGetItem<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  safeSetItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
}

// Wrong Questions (List of {subjectId, chapterId, questionId})
export function getWrongQuestions(): Bookmark[] {
  return safeGetItem<Bookmark[]>(STORAGE_KEYS.WRONG_QUESTIONS, []);
}

export function saveWrongQuestions(wrongQuestions: Bookmark[]): void {
  safeSetItem(STORAGE_KEYS.WRONG_QUESTIONS, wrongQuestions);
}

// Last Activity Navigation
export function getLastOpened(): { subjectId: string; chapterId: string } | null {
  const subjectId = localStorage.getItem(STORAGE_KEYS.LAST_OPENED_SUBJECT);
  const chapterId = localStorage.getItem(STORAGE_KEYS.LAST_OPENED_CHAPTER);
  if (subjectId && chapterId) {
    return { subjectId, chapterId };
  }
  return null;
}

export function saveLastOpened(subjectId: string, chapterId: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_OPENED_SUBJECT, subjectId);
  localStorage.setItem(STORAGE_KEYS.LAST_OPENED_CHAPTER, chapterId);
}

// Resume Exam Session
export function getResumableSession<T>(): T | null {
  return safeGetItem<T | null>(STORAGE_KEYS.RESUME_EXAM, null);
}

export function saveResumableSession(session: any): void {
  safeSetItem(STORAGE_KEYS.RESUME_EXAM, session);
}

export function clearResumableSession(): void {
  localStorage.removeItem(STORAGE_KEYS.RESUME_EXAM);
}

// Utilities
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Export Data
export function exportUserData(): string {
  const data = {
    settings: getAppSettings(),
    history: getAttemptHistory(),
    bookmarks: getBookmarks(),
    wrongQuestions: getWrongQuestions(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import Data
export function importUserData(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.settings) saveAppSettings(parsed.settings);
    if (parsed.history) saveAttemptHistory(parsed.history);
    if (parsed.bookmarks) saveBookmarks(parsed.bookmarks);
    if (parsed.wrongQuestions) saveWrongQuestions(parsed.wrongQuestions);
    return true;
  } catch (e) {
    console.error("Failed to import user data", e);
    return false;
  }
}

// Clean All Progress
export function clearAllProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
  localStorage.removeItem(STORAGE_KEYS.LAST_OPENED_SUBJECT);
  localStorage.removeItem(STORAGE_KEYS.LAST_OPENED_CHAPTER);
  localStorage.removeItem(STORAGE_KEYS.RESUME_EXAM);
  localStorage.removeItem(STORAGE_KEYS.WRONG_QUESTIONS);
}

// Clean All User Data including Settings
export function clearUserData(): void {
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
  localStorage.removeItem(STORAGE_KEYS.LAST_OPENED_SUBJECT);
  localStorage.removeItem(STORAGE_KEYS.LAST_OPENED_CHAPTER);
  localStorage.removeItem(STORAGE_KEYS.RESUME_EXAM);
  localStorage.removeItem(STORAGE_KEYS.WRONG_QUESTIONS);
}

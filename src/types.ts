export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number; // 0-based index
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  question_hi?: string;
  options_hi?: string[];
  explanation_hi?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
  table_hi?: {
    headers: string[];
    rows: string[][];
  };
}

export interface Chapter {
  id: string;
  title: string;
  file: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  folder: string;
  chapters: Chapter[];
}

export interface ChapterData {
  subject: string;
  chapter: string;
  timePerQuestion: number;
  positiveMarks: number;
  negativeMarks: number;
  questions: Question[];
}

export interface ExamSession {
  subjectId: string;
  chapterId: string;
  subjectName: string;
  chapterTitle: string;
  questions: Question[];
  userAnswers: Record<number, number | null>; // question.id -> selected option index (or null/undefined for skipped)
  markedForReview: Record<number, boolean>;
  visitedQuestions: Record<number, boolean>;
  timeRemaining: number;
  totalTime: number;
  isPracticeMode?: boolean;
  practiceType?: "random_10" | "random_25" | "random_50" | "wrong_questions" | "bookmarks" | "mixed";
}

export interface AttemptHistoryItem {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  date: string; // ISO string
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  maxScore: number;
  accuracy: number;
  timeTaken: number; // in seconds
  isPracticeMode?: boolean;
  practiceType?: string;
}

export interface Bookmark {
  subjectId: string;
  chapterId: string;
  questionId: number;
}

export interface AppSettings {
  theme: "slate" | "amber" | "emerald" | "ocean" | "rose" | "classic";
  isDarkMode: boolean;
  fontSize: number; // 12 to 24px, default 16
  questionFont: "sans" | "mono" | "display" | "serif";
  dailyTarget: number; // default 15 questions
  userName?: string;
  userTitle?: string;
}

export interface UserStats {
  todayCount: number;
  weeklyCounts: Record<string, number>; // date "YYYY-MM-DD" -> count
  lastActive: string; // "YYYY-MM-DD"
}

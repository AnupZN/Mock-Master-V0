import { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  ArrowLeft,
  Clock,
  HelpCircle,
  Award,
  Bookmark,
  CheckCircle,
  Play,
  RotateCcw,
  BookOpenCheck,
  Lock
} from "lucide-react";
import { Subject, Chapter, ChapterData, AttemptHistoryItem, Bookmark as BookmarkType } from "../types";
import { getThemeStyles } from "../utils/theme";

interface ChaptersViewProps {
  subject: Subject;
  history: AttemptHistoryItem[];
  bookmarks: BookmarkType[];
  wrongQuestions: BookmarkType[];
  theme?: string;
  onBack: () => void;
  onStartExam: (chapterData: ChapterData, chapterId: string, options?: { onlyWrong?: boolean; onlyBookmarked?: boolean }) => void;
  onReviseChapter: (chapterData: ChapterData) => void;
}

export default function ChaptersView({
  subject,
  history,
  bookmarks,
  wrongQuestions,
  theme,
  onBack,
  onStartExam,
  onReviseChapter,
}: ChaptersViewProps) {
  const themeClass = useMemo(() => getThemeStyles(theme), [theme]);
  const [chaptersData, setChaptersData] = useState<Record<string, ChapterData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all chapter data to display stats dynamically
  useEffect(() => {
    let active = true;
    const fetchAllChapters = async () => {
      setLoading(true);
      setError(null);
      const dataMap: Record<string, ChapterData> = {};
      try {
        for (const chapter of subject.chapters) {
          const filePath = `/data/${subject.folder}/${chapter.file}`;
          const res = await fetch(filePath);
          if (!res.ok) {
            throw new Error(`Failed to load ${chapter.title}`);
          }
          const data: ChapterData = await res.json();
          dataMap[chapter.id] = data;
        }
        if (active) {
          setChaptersData(dataMap);
        }
      } catch (err: any) {
        console.error("Error loading chapter files:", err);
        if (active) {
          setError("Failed to load chapter files. Please verify data directory exists and paths are correct.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      };
    };

    fetchAllChapters();

    return () => {
      active = false;
    };
  }, [subject]);

  // Chapter-wise attempts and statistics
  const chapterStats = useMemo(() => {
    const stats: Record<string, {
      completed: boolean;
      bestScore: number;
      wrongCount: number;
      bookmarkCount: number;
    }> = {};

    subject.chapters.forEach((ch) => {
      // Completed / Best Score
      const chAttempts = history.filter((h) => h.subjectId === subject.id && h.chapterId === ch.id);
      const completed = chAttempts.length > 0;
      let bestScore = 0;

      chAttempts.forEach((h) => {
        const pct = h.maxScore > 0 ? (h.score / h.maxScore) * 100 : 0;
        if (pct > bestScore) bestScore = pct;
      });

      // Filter wrongs specific to this chapter
      const wrongs = wrongQuestions.filter((w) => w.subjectId === subject.id && w.chapterId === ch.id);

      // Bookmarks specific to this chapter
      const bmarks = bookmarks.filter((b) => b.subjectId === subject.id && b.chapterId === ch.id);

      stats[ch.id] = {
        completed,
        bestScore: Math.round(bestScore),
        wrongCount: wrongs.length,
        bookmarkCount: bmarks.length,
      };
    });

    return stats;
  }, [subject, history, bookmarks, wrongQuestions]);

  return (
    <div className="space-y-6" id="chapters-container">
      {/* Subject Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:${themeClass.primaryText} rounded-2xl hover:${themeClass.lightBg} border border-slate-100 dark:border-slate-800/50 transition cursor-pointer`}
            id="back-to-subjects-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{subject.icon}</span>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{subject.name} Chapters</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Pick a chapter to configure and launch an exam session</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className={`w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin`}></div>
          <p className="text-xs font-semibold text-slate-400">Loading dynamic chapter metadata...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 p-6 rounded-2xl text-center space-y-3">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
          >
            Return to Subjects
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="chapters-grid">
          {subject.chapters.map((chapter) => {
            const data = chaptersData[chapter.id];
            const stats = chapterStats[chapter.id] || {
              completed: false,
              bestScore: 0,
              wrongCount: 0,
              bookmarkCount: 0,
            };

            if (!data) return null;

            const questionCount = data.questions.length;
            const estimatedMinutes = Math.ceil((questionCount * data.timePerQuestion) / 60);

            // Calculate difficulty breakdown or primary level
            const difficultyCount = data.questions.reduce((acc, q) => {
              acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            let primaryDifficulty = "Moderate";
            if (difficultyCount["Easy"] > questionCount / 2) primaryDifficulty = "Easy";
            if (difficultyCount["Hard"] > questionCount / 2) primaryDifficulty = "Challenging";

            return (
              <div
                key={chapter.id}
                className={`group relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-sm hover:shadow-md hover:${themeClass.borderActive} dark:hover:${themeClass.borderActive} transition-all duration-300 flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  {/* Title & Badges */}
                  <div className="flex items-start justify-between">
                    <h3 className={`font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:${themeClass.primaryText} transition-colors duration-200 pr-4`}>
                      {chapter.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {stats.completed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 py-1 px-2.5 rounded-full uppercase tracking-wider">
                          <CheckCircle size={10} />
                          <span>Attempted</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-extrabold py-1 px-2.5 rounded-full uppercase tracking-wider ${
                        primaryDifficulty === "Easy"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : primaryDifficulty === "Challenging"
                          ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                      }`}>
                        {primaryDifficulty}
                      </span>
                    </div>
                  </div>

                  {/* Estimated parameters */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      <span>~{estimatedMinutes} Mins</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <HelpCircle size={13} />
                      <span>{questionCount} Questions</span>
                    </span>
                  </div>

                  {/* Best score & dynamic details */}
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/40 py-3 px-4 rounded-2xl border border-slate-100 dark:border-slate-800/10">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Award size={14} className="text-amber-500" />
                      <span>Best Score:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.bestScore > 0 ? `${stats.bestScore}%` : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Bookmark size={14} className={themeClass.primaryText} fill="currentColor" />
                      <span>Bookmarked:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.bookmarkCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid of Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-800/60 mt-6 pt-4">
                  {/* Primary Start Button */}
                  <button
                    onClick={() => onStartExam(data, chapter.id)}
                    className={`flex items-center justify-center gap-1.5 py-3 px-4 ${themeClass.primaryBg} ${themeClass.primaryHoverBg} text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer`}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Start Test</span>
                  </button>

                  {/* Revision Review Button */}
                  <button
                    onClick={() => onReviseChapter(data)}
                    disabled={!stats.completed}
                    className={`flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-bold rounded-xl border transition ${
                      stats.completed
                        ? `bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:${themeClass.lightBg} hover:${themeClass.primaryText} border-slate-200 dark:border-slate-800/60 cursor-pointer`
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-200 dark:border-slate-800/20 cursor-not-allowed opacity-50"
                    }`}
                    title={!stats.completed ? "Unlock Quick Study by completing the test at least once" : "Quick Revision Mode"}
                  >
                    {stats.completed ? (
                      <BookOpenCheck size={13} />
                    ) : (
                      <Lock size={13} className="text-slate-400" />
                    )}
                    <span>Quick Study</span>
                  </button>

                  {/* Practice Wrong Questions Button */}
                  <button
                    onClick={() => onStartExam(data, chapter.id, { onlyWrong: true })}
                    disabled={stats.wrongCount === 0}
                    className={`flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-bold rounded-xl transition cursor-pointer border ${
                      stats.wrongCount > 0
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-950/50 hover:bg-rose-100/60"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-200 dark:border-slate-800/20 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <RotateCcw size={13} />
                    <span>Retry Wrong ({stats.wrongCount})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

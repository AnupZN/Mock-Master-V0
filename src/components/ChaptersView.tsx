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
  Lock,
  Folder,
  FolderOpen
} from "lucide-react";
import { Subject, Chapter, ChapterData, AttemptHistoryItem, Bookmark as BookmarkType } from "../types";
import { getThemeStyles } from "../utils/theme";
import { fetchAdminChapterData } from "../supabase";

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
  const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<string | null>(null);

  // Reset selected sub-subject when switching subjects
  useEffect(() => {
    setSelectedSubSubjectId(null);
  }, [subject]);

  // Fetch all chapter data to display stats dynamically
  useEffect(() => {
    let active = true;
    const fetchAllChapters = async () => {
      setLoading(true);
      setError(null);
      const dataMap: Record<string, ChapterData> = {};
      let anyLoaded = false;
      let loadErrorsCount = 0;

      try {
        for (const chapter of subject.chapters) {
          let data: ChapterData | null = null;

          // 1. Try fetching from Supabase first (if configured/synced)
          try {
            const dbData = await fetchAdminChapterData(subject.id, chapter.id);
            if (dbData) {
              data = dbData as ChapterData;
            }
          } catch (dbErr) {
            console.error(`Error reading from Supabase for ${subject.id}_${chapter.id}:`, dbErr);
          }

          // 2. Fall back to local file if not found or failed
          if (!data) {
            try {
              const pathsToTry = [
                `/data/${subject.folder}/${chapter.file}`,
                `/data/${subject.folder?.toLowerCase()}/${chapter.file}`,
                `/data/${subject.folder ? (subject.folder.charAt(0).toUpperCase() + subject.folder.slice(1).toLowerCase()) : ""}/${chapter.file}`,
                `/data/${subject.id}/${chapter.file}`,
                `/data/${subject.id?.toLowerCase()}/${chapter.file}`,
                `/data/${subject.id ? (subject.id.charAt(0).toUpperCase() + subject.id.slice(1).toLowerCase()) : ""}/${chapter.file}`
              ].filter(Boolean);

              // Deduplicate paths
              const uniquePaths = Array.from(new Set(pathsToTry));

              for (const path of uniquePaths) {
                try {
                  const res = await fetch(path);
                  if (res.ok) {
                    data = (await res.json()) as ChapterData;
                    break;
                  } else {
                    console.warn(`Local file not found for ${chapter.title} at ${path}`);
                  }
                } catch (pathErr) {
                  console.error(`Error fetching local JSON at ${path}:`, pathErr);
                }
              }
            } catch (fileErr) {
              console.error(`Error in path-finding for local JSON for ${chapter.title}:`, fileErr);
            }
          }

          if (data) {
            dataMap[chapter.id] = data;
            anyLoaded = true;
          } else {
            loadErrorsCount++;
          }
        }

        if (active) {
          setChaptersData(dataMap);
          
          // If the subject has chapters defined but absolutely NONE could be loaded, show an error.
          if (subject.chapters.length > 0 && !anyLoaded) {
            setError("Failed to load any chapter files. Please verify data directory exists and paths are correct.");
          }
        }
      } catch (err: any) {
        console.error("Critical error in fetchAllChapters loop:", err);
        if (active) {
          setError("An unexpected error occurred while loading chapters.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
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
      let bestScore = 0;

      chAttempts.forEach((h) => {
        const pct = h.maxScore > 0 ? (h.score / h.maxScore) * 100 : 0;
        if (pct > bestScore) bestScore = pct;
      });

      const completed = Math.round(bestScore) >= 90;

      // Filter wrongs specific to this chapter
      const wrongs = wrongQuestions.filter((w) => w.subjectId === subject.id && w.chapterId === ch.id);

      // Bookmarks specific to this chapter
      const bmarks = bookmarks.filter((b) => b.subjectId === subject.id && b.chapterId === ch.id);

      // Validate wrong and bookmarked questions exist in the actual questions list
      const chData = chaptersData[ch.id];
      const validWrongs = chData && chData.questions
        ? wrongs.filter((w) => chData.questions.some((q) => q.id === w.questionId))
        : wrongs;
      const validBmarks = chData && chData.questions
        ? bmarks.filter((b) => chData.questions.some((q) => q.id === b.questionId))
        : bmarks;

      stats[ch.id] = {
        completed,
        bestScore: Math.round(bestScore),
        wrongCount: chData && chData.questions ? validWrongs.length : wrongs.length,
        bookmarkCount: chData && chData.questions ? validBmarks.length : bmarks.length,
      };
    });

    return stats;
  }, [subject, history, bookmarks, wrongQuestions, chaptersData]);

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
        <div className="space-y-10" id="chapters-grid">
          {(() => {
            const hasSubSubjects = subject.subSubjects && subject.subSubjects.length > 0;

            const renderChapterCard = (chapter: Chapter) => {
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
                      <div className="space-y-1.5 pr-4">
                        {chapter.subSubjectId && subject.subSubjects && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 py-0.5 px-2 rounded-md">
                            📁 {subject.subSubjects.find((s) => s.id === chapter.subSubjectId)?.name || "General"}
                          </span>
                        )}
                        <h3 className={`font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:${themeClass.primaryText} transition-colors duration-200`}>
                          {chapter.title}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {stats.completed && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 py-1 px-2.5 rounded-full uppercase tracking-wider">
                            <CheckCircle size={10} />
                            <span>Completed</span>
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

                      {stats.bookmarkCount > 0 ? (
                        <button
                          onClick={() => onStartExam(data, chapter.id, { onlyBookmarked: true })}
                          className={`flex items-center gap-1 text-xs font-bold ${themeClass.primaryText} hover:opacity-80 transition cursor-pointer`}
                          title="Click to start test with bookmarked questions"
                        >
                          <Bookmark size={14} className={themeClass.primaryText} fill="currentColor" />
                          <span>Bookmarked:</span>
                          <span className="font-extrabold underline decoration-dotted">
                            {stats.bookmarkCount} (Practice)
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <Bookmark size={14} className="text-slate-400" />
                          <span>Bookmarked:</span>
                          <span className="font-bold">
                            {stats.bookmarkCount}
                          </span>
                        </div>
                      )}
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
                      title={!stats.completed ? "Unlock Quick Study by scoring 90% or more on this chapter's test" : "Quick Revision Mode"}
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
            };

            // Group by sub-subjects
            const subSubjectsList = subject.subSubjects || [];
            const chaptersBySubSubject: Record<string, Chapter[]> = {};
            const unassignedChapters: Chapter[] = [];

            subject.chapters.forEach((chap) => {
              if (chap.subSubjectId && subSubjectsList.some((s) => s.id === chap.subSubjectId)) {
                if (!chaptersBySubSubject[chap.subSubjectId]) {
                  chaptersBySubSubject[chap.subSubjectId] = [];
                }
                chaptersBySubSubject[chap.subSubjectId].push(chap);
              } else {
                unassignedChapters.push(chap);
              }
            });

            if (!hasSubSubjects) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {subject.chapters.map((chapter) => renderChapterCard(chapter))}
                </div>
              );
            }

            // Build structured sub-subject list with statistics
            const groupsList = subSubjectsList.map((sub) => {
              const chaps = chaptersBySubSubject[sub.id] || [];
              const attemptedCount = chaps.filter((c) => chapterStats[c.id]?.completed).length;
              const totalQuestions = chaps.reduce((acc, c) => {
                const qData = chaptersData[c.id];
                return acc + (qData ? qData.questions.length : 0);
              }, 0);
              const progressPercent = chaps.length > 0 ? Math.round((attemptedCount / chaps.length) * 100) : 0;

              return {
                id: sub.id,
                name: sub.name,
                chapters: chaps,
                attemptedCount,
                totalQuestions,
                progressPercent,
              };
            });

            // Include unassigned chapters card if they exist
            if (unassignedChapters.length > 0) {
              const attemptedCount = unassignedChapters.filter((c) => chapterStats[c.id]?.completed).length;
              const totalQuestions = unassignedChapters.reduce((acc, c) => {
                const qData = chaptersData[c.id];
                return acc + (qData ? qData.questions.length : 0);
              }, 0);
              const progressPercent = unassignedChapters.length > 0 ? Math.round((attemptedCount / unassignedChapters.length) * 100) : 0;

              groupsList.push({
                id: "_unassigned",
                name: "General / Unassigned",
                chapters: unassignedChapters,
                attemptedCount,
                totalQuestions,
                progressPercent,
              });
            }

            if (selectedSubSubjectId === null) {
              // RENDER CARDS VIEW FOR SUB-SUBJECTS
              return (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Select a category to view chapters
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupsList.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedSubSubjectId(group.id)}
                        className="group text-left p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-5 shadow-sm"
                      >
                        <div className="space-y-4 w-full">
                          <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 group-hover:${themeClass.primaryText} transition-colors duration-250`}>
                              <Folder size={22} className="group-hover:scale-110 transition-transform duration-200" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850 py-1 px-2.5 rounded-full">
                              {group.chapters.length} {group.chapters.length === 1 ? "Chapter" : "Chapters"}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="font-extrabold text-base text-slate-850 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-1">
                              {group.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                              {group.totalQuestions} Questions total across sections
                            </p>
                          </div>
                        </div>

                        <div className="w-full space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            <span>Completed</span>
                            <span>{group.attemptedCount}/{group.chapters.length} Attempted</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${themeClass.primaryBg} transition-all duration-500`}
                              style={{ width: `${group.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            // RENDER SELECTED CHAPTER LIST
            const selectedGroup = groupsList.find((g) => g.id === selectedSubSubjectId);
            const displayChapters = selectedGroup ? selectedGroup.chapters : [];

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-800/60 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedSubSubjectId(null)}
                      className={`flex items-center gap-1.5 text-xs font-extrabold ${themeClass.primaryText} hover:underline cursor-pointer`}
                    >
                      ← Categories
                    </button>
                    <span className="text-slate-200 dark:text-slate-800">|</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {selectedGroup?.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {displayChapters.length} {displayChapters.length === 1 ? "Chapter" : "Chapters"}
                  </span>
                </div>

                {displayChapters.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 pl-4 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No chapters are added to this section yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayChapters.map((chapter) => renderChapterCard(chapter))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

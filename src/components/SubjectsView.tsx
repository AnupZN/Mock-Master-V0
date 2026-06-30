import { useMemo, useState, useEffect } from "react";
import { BookOpen, Layers, Award, ChevronRight, CheckCircle2 } from "lucide-react";
import { Subject, AttemptHistoryItem } from "../types";
import { getThemeStyles } from "../utils/theme";
import { supabase, isSupabaseConfigured } from "../supabase";

interface SubjectsViewProps {
  subjects: Subject[];
  history: AttemptHistoryItem[];
  theme?: string;
  onSelectSubject: (subjectId: string) => void;
}

export default function SubjectsView({ subjects, history, theme, onSelectSubject }: SubjectsViewProps) {
  const themeClass = useMemo(() => getThemeStyles(theme), [theme]);
  const [dynamicQuestionCounts, setDynamicQuestionCounts] = useState<Record<string, number>>({});

  // Fetch true live counts from Supabase and local sources dynamically
  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      const counts: Record<string, number> = {};

      // 1. Initialize with default fallback counts
      subjects.forEach((subj) => {
        if (subj.id === "history") counts[subj.id] = 8;
        else if (subj.id === "polity") counts[subj.id] = 3;
        else if (subj.id === "geography") counts[subj.id] = 3;
        else counts[subj.id] = 0;
      });

      // 2. Fetch custom data from Supabase if online
      let dbChapters: any[] = [];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("admin_chapters_data")
            .select("subject_id, chapter_id, data");
          if (!error && data) {
            dbChapters = data;
          }
        } catch (err) {
          console.error("Failed to fetch admin chapters from Supabase for stats:", err);
        }
      }

      // Map of subjectId_chapterId -> question count
      const dbCountsMap = new Map<string, number>();
      dbChapters.forEach((row) => {
        const qList = row.data?.questions;
        if (Array.isArray(qList)) {
          dbCountsMap.set(`${row.subject_id}_${row.chapter_id}`, qList.length);
        }
      });

      // 3. For each subject, aggregate dynamic counts (Supabase custom vs Local JSON files)
      for (const subj of subjects) {
        let subjectTotal = 0;
        for (const chapter of subj.chapters) {
          const dbKey = `${subj.id}_${chapter.id}`;
          if (dbCountsMap.has(dbKey)) {
            subjectTotal += dbCountsMap.get(dbKey) || 0;
          } else {
            // Fetch local JSON to get the actual fallback count
            try {
              const pathsToTry = [
                `/data/${subj.folder}/${chapter.file}`,
                `/data/${subj.folder?.toLowerCase()}/${chapter.file}`,
                `/data/${subj.folder ? (subj.folder.charAt(0).toUpperCase() + subj.folder.slice(1).toLowerCase()) : ""}/${chapter.file}`,
                `/data/${subj.id}/${chapter.file}`,
                `/data/${subj.id?.toLowerCase()}/${chapter.file}`,
                `/data/${subj.id ? (subj.id.charAt(0).toUpperCase() + subj.id.slice(1).toLowerCase()) : ""}/${chapter.file}`
              ].filter(Boolean);

              const uniquePaths = Array.from(new Set(pathsToTry));
              let localData: any = null;
              for (const path of uniquePaths) {
                try {
                  const res = await fetch(path);
                  if (res.ok) {
                    localData = await res.json();
                    break;
                  }
                } catch (e) {}
              }

              if (localData && Array.isArray(localData.questions)) {
                subjectTotal += localData.questions.length;
              } else {
                // Individual fallback matching
                if (subj.id === "history") {
                  if (chapter.id === "chapter01") subjectTotal += 5;
                  else if (chapter.id === "chapter02") subjectTotal += 3;
                } else if (subj.id === "polity" || subj.id === "geography") {
                  subjectTotal += 3;
                }
              }
            } catch (err) {
              console.error(`Error loading local fallback count for ${subj.id}_${chapter.id}:`, err);
            }
          }
        }
        counts[subj.id] = subjectTotal;
      }

      if (active) {
        setDynamicQuestionCounts(counts);
      }
    };

    loadCounts();
    return () => {
      active = false;
    };
  }, [subjects]);

  // Compute subject-wise statistics
  const subjectStats = useMemo(() => {
    const stats: Record<string, {
      completedChaptersCount: number;
      bestScore: number;
      totalQuestionsCount: number;
    }> = {};

    subjects.forEach((subj) => {
      const chapterIds = new Set(subj.chapters.map((ch) => ch.id));
      const qCount = dynamicQuestionCounts[subj.id] !== undefined ? dynamicQuestionCounts[subj.id] : (subj.id === "history" ? 8 : 3);

      // Completed chapters from history
      const uniqueCompletedChapters = new Set<string>();
      let bestScore = 0;

      history.forEach((h) => {
        if (h.subjectId === subj.id) {
          if (chapterIds.has(h.chapterId)) {
            uniqueCompletedChapters.add(h.chapterId);
          }
          const scorePercent = h.maxScore > 0 ? (h.score / h.maxScore) * 100 : 0;
          if (scorePercent > bestScore) {
            bestScore = scorePercent;
          }
        }
      });

      stats[subj.id] = {
        completedChaptersCount: uniqueCompletedChapters.size,
        bestScore: Math.round(bestScore),
        totalQuestionsCount: qCount,
      };
    });

    return stats;
  }, [subjects, history, dynamicQuestionCounts]);

  return (
    <div className="space-y-6" id="subjects-container">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className={themeClass.primaryText} size={24} />
          <span>Prepare by Subjects</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg">
          Select a subject to browse through chapters, view estimated preparation times, and challenge specialized question pools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="subjects-grid">
        {subjects.map((subject) => {
          const stats = subjectStats[subject.id] || {
            completedChaptersCount: 0,
            bestScore: 0,
            totalQuestionsCount: 0,
          };

          const chapterCount = subject.chapters.length;
          const completionPercentage = chapterCount > 0
            ? Math.round((stats.completedChaptersCount / chapterCount) * 100)
            : 0;

          return (
            <div
              key={subject.id}
              className={`group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-sm hover:shadow-md hover:${themeClass.borderActive} dark:hover:${themeClass.borderActive} transition-all duration-300 flex flex-col justify-between`}
            >
              {/* Top Accent Gradient Border */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 group-hover:${themeClass.primaryBg} transition-all duration-300`}></div>

              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm border border-slate-100 dark:border-slate-800">
                    {subject.icon}
                  </div>
                  {completionPercentage === 100 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2.5 rounded-full uppercase tracking-wider">
                      <CheckCircle2 size={12} />
                      <span>Completed</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className={`text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:${themeClass.primaryText} transition-colors duration-200`}>
                    {subject.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers size={13} />
                      <span>{chapterCount} Chapters</span>
                    </span>
                    <span>•</span>
                    <span>{stats.totalQuestionsCount} Exam Qs</span>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Chapter Progress</span>
                    <span>{stats.completedChaptersCount} / {chapterCount}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${themeClass.primaryBg} rounded-full transition-all duration-500`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Card Footer: best score & action */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 mt-6 pt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Award size={14} className="text-amber-500" />
                  <span>Best Score:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {stats.bestScore > 0 ? `${stats.bestScore}%` : "N/A"}
                  </span>
                </div>

                <button
                  onClick={() => onSelectSubject(subject.id)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-bold ${themeClass.primaryText} hover:text-white hover:${themeClass.primaryBg} rounded-xl transition duration-150 cursor-pointer`}
                >
                  <span>Chapters</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

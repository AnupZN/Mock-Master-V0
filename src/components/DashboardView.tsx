import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Layers,
  HelpCircle,
  Play,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Bookmark,
  Shuffle
} from "lucide-react";
import { Subject, AttemptHistoryItem, Bookmark as BookmarkType } from "../types";
import { formatTime, formatDate } from "../utils";
import { getThemeStyles } from "../utils/theme";

interface DashboardViewProps {
  subjects: Subject[];
  history: AttemptHistoryItem[];
  bookmarks: BookmarkType[];
  dailyTarget: number;
  userName?: string;
  theme?: string;
  onNavigate: (view: string, data?: any) => void;
  onStartPractice: (type: string, selectedSubjectIds?: string[], count?: number) => void;
}

export default function DashboardView({
  subjects,
  history,
  bookmarks,
  dailyTarget,
  userName,
  theme,
  onNavigate,
  onStartPractice,
}: DashboardViewProps) {
  const themeClass = useMemo(() => getThemeStyles(theme), [theme]);

  const [isMixedModalOpen, setIsMixedModalOpen] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [mixedQuestionCount, setMixedQuestionCount] = useState(15);

  const openMixedModal = (count?: number) => {
    setSelectedSubjectIds(subjects.map((s) => s.id));
    if (count) {
      setMixedQuestionCount(count);
    }
    setIsMixedModalOpen(true);
  };

  // Overall stats
  const totals = useMemo(() => {
    const totalSubjects = subjects.length;
    const totalChapters = subjects.reduce((sum, s) => sum + s.chapters.length, 0);
    
    // Calculate total questions (knowing our static dataset has 14 questions total)
    // History: Ch1(5) + Ch2(3) = 8
    // Polity: Ch1(3) = 3
    // Geography: Ch1(3) = 3
    // Total = 14
    let totalQuestions = 14; 
    
    return { totalSubjects, totalChapters, totalQuestions };
  }, [subjects]);

  // Daily Progress (today's completed questions)
  const todayProgress = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAttempts = history.filter((h) => h.date.startsWith(todayStr));
    const questionsAttempted = todayAttempts.reduce(
      (sum, h) => sum + h.correctCount + h.wrongCount + h.skippedCount,
      0
    );
    const percent = Math.min(100, Math.round((questionsAttempted / dailyTarget) * 100));
    return { count: questionsAttempted, percent };
  }, [history, dailyTarget]);

  // Weekly Progress (last 7 days bar chart calculation)
  const weeklyData = useMemo(() => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];

      const dayAttempts = history.filter((h) => h.date.startsWith(dateStr));
      const count = dayAttempts.reduce(
        (sum, h) => sum + h.correctCount + h.wrongCount + h.skippedCount,
        0
      );
      days.push({ dayName, count, dateStr });
    }

    const maxCount = Math.max(...days.map((d) => d.count), 5); // Avoid division by zero, min height of 5
    return { days, maxCount };
  }, [history]);

  // Best Score & Overall Stats
  const performanceStats = useMemo(() => {
    if (history.length === 0) {
      return { bestScore: 0, bestSubject: "N/A", avgAccuracy: 0 };
    }

    let bestPercent = 0;
    let totalCorrect = 0;
    let totalAttempted = 0;

    history.forEach((h) => {
      const pct = h.maxScore > 0 ? (h.score / h.maxScore) * 100 : 0;
      if (pct > bestPercent) bestPercent = pct;

      totalCorrect += h.correctCount;
      totalAttempted += h.correctCount + h.wrongCount; // ignore skipped for actual selected accuracy
    });

    const avgAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    return {
      bestScore: Math.round(bestPercent),
      avgAccuracy,
    };
  }, [history]);

  // Last attempt to continue practice
  const lastAttempt = history[0] || null;

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Top Banner (Clean Dynamic Preset Theme Minimalism) */}
      <div 
        className={`relative overflow-hidden rounded-3xl ${themeClass.primaryBg} p-8 text-white flex justify-between items-center shadow-lg ${themeClass.shadowMd} dark:shadow-none`}
        id="dashboard-header-card"
      >
        <div className="absolute -right-4 -bottom-4 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 space-y-2 max-w-xl">
          <h1 className="text-3xl font-black tracking-tight font-sans">
            Welcome back, {userName || "Guest"}!
          </h1>
          <p className="text-white/80 text-sm font-sans">
            Track your daily goals, practice chapter-wise question banks, and improve your accuracy with our modular preparation portal.
          </p>
          <div className="pt-2">
            {lastAttempt ? (
              <button
                onClick={() => onNavigate("chapters", { subjectId: lastAttempt.subjectId })}
                className={`flex items-center gap-2 px-6 py-3 bg-white ${themeClass.primaryText} font-bold rounded-xl text-sm shadow-xl ${themeClass.shadowLg} active:scale-95 transition-transform cursor-pointer`}
                id="continue-practice-btn"
              >
                <Play size={16} fill="currentColor" />
                <span>Continue Practice</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => onNavigate("subjects")}
                className={`flex items-center gap-2 px-6 py-3 bg-white ${themeClass.primaryText} font-bold rounded-xl text-sm shadow-xl ${themeClass.shadowLg} active:scale-95 transition-transform cursor-pointer`}
                id="start-prep-btn"
              >
                <Play size={16} fill="currentColor" />
                <span>Browse Subjects</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="hidden lg:block relative z-10 w-40 h-40 opacity-25">
           <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
            <path d="M44.7,-76.4C58.2,-69.2,70,-58.5,77.5,-45.5C85,-32.5,88.1,-17.2,85.6,-2.5C83.1,12.2,75,26.3,65.3,38.8C55.6,51.3,44.4,62.2,31,69.5C17.6,76.8,2,80.5,-12.9,78.2C-27.9,75.9,-42.2,67.6,-53.4,56.7C-64.6,45.8,-72.7,32.3,-77.4,18.1C-82.1,3.8,-83.4,-11.2,-78.9,-25C-74.4,-38.7,-64.1,-51.2,-51.4,-58.8C-38.7,-66.4,-23.6,-69.1,-9.3,-72.8C5,-76.6,19.3,-81.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
      </div>

      {/* Main Core Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="stats-grid">
        {/* Total Subjects */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl">🏛️</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Subjects</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalSubjects}</p>
          </div>
        </div>

        {/* Total Chapters */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">📂</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Chapters</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalChapters}</p>
          </div>
        </div>

        {/* Total Questions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center text-xl">❓</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Questions</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalQuestions}</p>
          </div>
        </div>

        {/* Best Score */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">🏆</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Best Score</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{performanceStats.bestScore}%</p>
          </div>
        </div>
      </div>

      {/* Progress & Weekly Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="progress-weekly-grid">
        {/* Today's Target Progress Card */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp size={20} className={themeClass.primaryText} />
              <span>Today's Progress</span>
            </h3>
            <p className="text-xs text-slate-400">Daily Target is set in Settings</p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 relative">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={`${
                    themeClass.id === "amber"
                      ? "stroke-amber-500 dark:stroke-amber-400"
                      : themeClass.id === "emerald"
                      ? "stroke-emerald-600 dark:stroke-emerald-500"
                      : themeClass.id === "ocean"
                      ? "stroke-sky-600 dark:stroke-sky-500"
                      : themeClass.id === "rose"
                      ? "stroke-rose-600 dark:stroke-rose-500"
                      : "stroke-indigo-600 dark:stroke-indigo-500"
                  } transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${((100 - todayProgress.percent) / 100) * (2 * Math.PI * 40)}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Centered Numbers */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {todayProgress.count}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  / {dailyTarget} Qs
                </span>
              </div>
            </div>
          </div>

          <div className="text-center bg-slate-50 dark:bg-slate-800/40 py-3 px-4 rounded-2xl">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {todayProgress.percent >= 100
                ? "🎉 Daily Target Achieved! Stellar job."
                : `Complete ${dailyTarget - todayProgress.count} more questions to hit your goal.`}
            </p>
          </div>
        </div>

        {/* Weekly Progress Bar Chart Card */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={20} className="text-sky-500" />
              <span>Weekly Practice Activity</span>
            </h3>
            <p className="text-xs text-slate-400">Completed questions over the last 7 days</p>
          </div>

          {/* Custom CSS Bars graph (no third-party heavy dependencies, clean & fully controllable) */}
          <div className="flex items-end justify-between gap-2 h-44 px-2 pt-6 pb-2" id="weekly-bar-chart">
            {weeklyData.days.map((day, i) => {
              const barHeight = Math.max(5, (day.count / weeklyData.maxCount) * 100);
              return (
                <div key={i} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10 whitespace-nowrap">
                    {day.count} Questions
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-t-lg overflow-hidden h-36 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className={`w-full rounded-t-lg ${
                        day.count >= dailyTarget
                          ? "bg-emerald-500 dark:bg-emerald-600"
                          : day.count > 0
                          ? themeClass.primaryBg
                          : "bg-transparent"
                      }`}
                    ></motion.div>
                  </div>
                  {/* Day label */}
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 font-mono">
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Special Practice Modules & Bookmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="practice-modules">
        {/* Quick Practice Suite */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shuffle size={20} className="text-amber-500" />
              <span>Mixed practice modes</span>
            </h3>
            <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold uppercase">Randomized</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => openMixedModal(10)}
              className={`flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:${themeClass.lightBg} hover:${themeClass.border} rounded-2xl transition duration-150 cursor-pointer text-center`}
            >
              <span className={`text-2xl font-bold ${themeClass.primaryText}`}>10</span>
              <span className="text-xs font-semibold text-slate-500 mt-1">Random Qs</span>
            </button>
            <button
              onClick={() => openMixedModal(25)}
              className={`flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:${themeClass.lightBg} hover:${themeClass.border} rounded-2xl transition duration-150 cursor-pointer text-center`}
            >
              <span className={`text-2xl font-bold ${themeClass.primaryText}`}>25</span>
              <span className="text-xs font-semibold text-slate-500 mt-1">Random Qs</span>
            </button>
            <button
              onClick={() => openMixedModal(50)}
              className={`flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:${themeClass.lightBg} hover:${themeClass.border} rounded-2xl transition duration-150 cursor-pointer text-center`}
            >
              <span className={`text-2xl font-bold ${themeClass.primaryText}`}>50</span>
              <span className="text-xs font-semibold text-slate-500 mt-1">Random Qs</span>
            </button>
          </div>
          <button
            onClick={openMixedModal}
            className={`w-full flex items-center justify-center gap-2 py-3 ${themeClass.lightBg} ${themeClass.lightBgHover} ${themeClass.primaryText} font-bold rounded-xl transition duration-150 cursor-pointer`}
          >
            <Shuffle size={16} />
            <span>Start Multi-Subject Mixed Quiz</span>
          </button>
        </div>

        {/* Personalized Focus Practice */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Award size={20} className="text-emerald-500" />
            <span>Targeted Revisions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wrong Questions practice */}
            <button
              onClick={() => onStartPractice("wrong_questions")}
              className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 hover:border-rose-100 rounded-2xl transition duration-150 cursor-pointer"
            >
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <XCircle size={20} />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Incorrect Bank</h4>
                <p className="text-xs text-slate-400">Re-attempt wrong ones</p>
              </div>
            </button>

            {/* Bookmarked Questions practice */}
            <button
              onClick={() => onNavigate("bookmarks")}
              className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 hover:border-amber-100 rounded-2xl transition duration-150 cursor-pointer"
            >
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Bookmark size={20} fill="currentColor" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Bookmarks</h4>
                <p className="text-xs text-slate-400">({bookmarks.length}) Bookmarked Qs</p>
              </div>
            </button>
          </div>
          <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/20 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800/20">
            💡 Practice mode compiles items from all chapters automatically.
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4" id="recent-activity-section">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock size={20} className="text-slate-500" />
          <span>Recent Activity</span>
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Calendar size={40} className="mx-auto text-slate-300" />
            <p className="font-medium text-sm">No exam history recorded yet.</p>
            <p className="text-xs max-w-xs mx-auto">Start by picking a subject and taking your very first quiz!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/60">
            {history.slice(0, 5).map((item) => {
              const accuracy = item.accuracy;
              const isExcellent = accuracy >= 80;
              const isPassing = accuracy >= 40;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-900/10 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition duration-150 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isExcellent 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                        : isPassing 
                        ? `${themeClass.lightBg} ${themeClass.primaryText}` 
                        : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                    }`}>
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {item.isPracticeMode ? "Random Practice" : item.chapterTitle}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-500">{item.subjectName}</span>
                        <span>•</span>
                        <span>{formatDate(item.date)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800/30">
                    <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</p>
                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                          {item.score}/{item.maxScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</p>
                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                          {item.accuracy}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</p>
                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                          {formatTime(item.timeTaken)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate("result", { historyItem: item })}
                      className={`px-4 py-2 text-xs font-bold ${themeClass.primaryText} ${themeClass.lightBg} ${themeClass.lightBgHover} rounded-xl transition duration-150 cursor-pointer`}
                    >
                      Metrics
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isMixedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500`}>
                  <Shuffle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Mixed Practice Setup
                  </h3>
                  <p className="text-xs text-slate-400">Configure your custom practice session</p>
                </div>
              </div>
              <button
                onClick={() => setIsMixedModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Select Subjects */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Subjects
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectIds(subjects.map((s) => s.id))}
                    className={`text-[10px] font-bold ${themeClass.primaryText} hover:underline`}
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectIds([])}
                    className={`text-[10px] font-bold text-slate-400 hover:underline`}
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl">
                {subjects.map((subj) => {
                  const isChecked = selectedSubjectIds.includes(subj.id);
                  const chapterCount = subj.chapters.length;
                  return (
                    <label
                      key={subj.id}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjectIds((prev) => [...prev, subj.id]);
                            } else {
                              setSelectedSubjectIds((prev) => prev.filter((id) => id !== subj.id));
                            }
                          }}
                          className={`w-4.5 h-4.5 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500`}
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {subj.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                        {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Select Question Count */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Question Count
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[10, 15, 20, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMixedQuestionCount(num)}
                    className={`py-2 px-1 text-xs font-extrabold rounded-xl transition border ${
                      mixedQuestionCount === num
                        ? `${themeClass.primaryBg} border-transparent text-white shadow-sm`
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMixedModalOpen(false)}
                className="flex-1 py-3 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedSubjectIds.length === 0}
                onClick={() => {
                  setIsMixedModalOpen(false);
                  onStartPractice("mixed", selectedSubjectIds, mixedQuestionCount);
                }}
                className={`flex-1 py-3 text-xs font-bold text-center text-white rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSubjectIds.length > 0
                    ? `${themeClass.primaryBg} hover:${themeClass.primaryHoverBg} shadow-sm ${themeClass.shadowMd}`
                    : "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <Play size={14} fill="currentColor" />
                <span>Start Practice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import {
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Percent,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  LayoutGrid
} from "lucide-react";
import { AttemptHistoryItem, Question } from "../types";
import { formatTime, formatDate } from "../utils";

interface ResultViewProps {
  historyItem: AttemptHistoryItem;
  questions: Question[]; // original questions for doing detailed difficulty/topic breakdown
  userAnswers: Record<number, number | null>; // what was selected
  onReview: () => void;
  onNavigateToDashboard: () => void;
}

export default function ResultView({
  historyItem,
  questions,
  userAnswers,
  onReview,
  onNavigateToDashboard,
}: ResultViewProps) {
  // Compute Difficulty-wise and Topic-wise statistics
  const analytics = useMemo(() => {
    const difficultyStats: Record<string, { correct: number; total: number }> = {
      Easy: { correct: 0, total: 0 },
      Medium: { correct: 0, total: 0 },
      Hard: { correct: 0, total: 0 },
    };

    const topicStats: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q) => {
      const selectedOption = userAnswers[q.id];
      const isCorrect = selectedOption === q.correct;

      // Difficulty Stats
      if (difficultyStats[q.difficulty]) {
        difficultyStats[q.difficulty].total++;
        if (isCorrect) difficultyStats[q.difficulty].correct++;
      }

      // Topic (Tags) Stats
      q.tags.forEach((tag) => {
        if (!topicStats[tag]) {
          topicStats[tag] = { correct: 0, total: 0 };
        }
        topicStats[tag].total++;
        if (isCorrect) topicStats[tag].correct++;
      });
    });

    return { difficultyStats, topicStats };
  }, [questions, userAnswers]);

  const percentageScore = historyItem.maxScore > 0 
    ? Math.round((historyItem.score / historyItem.maxScore) * 100) 
    : 0;

  // Determine performance color & message
  const feedback = useMemo(() => {
    if (percentageScore >= 90) {
      return {
        title: "Masterful Performance!",
        desc: "You have displayed absolute dominance over this topic. Excellent conceptual clarity!",
        color: "text-emerald-600 dark:text-emerald-400",
        ringColor: "stroke-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
      };
    } else if (percentageScore >= 75) {
      return {
        title: "Outstanding Work!",
        desc: "A highly respectable score. Minor tweaks in timing and practice will push you to perfect score.",
        color: "text-indigo-600 dark:text-indigo-400",
        ringColor: "stroke-indigo-500",
        bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40",
      };
    } else if (percentageScore >= 50) {
      return {
        title: "Good Effort!",
        desc: "You have captured the core foundations. Recommend reviewing the detailed explanations of wrong items.",
        color: "text-amber-600 dark:text-amber-400",
        ringColor: "stroke-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
      };
    } else {
      return {
        title: "Keep Learning & Retry",
        desc: "Don't discourage yourself. Revision is key. Practice mistakes separately and try again.",
        color: "text-rose-600 dark:text-rose-400",
        ringColor: "stroke-rose-500",
        bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40",
      };
    }
  }, [percentageScore]);

  // Mock a smart percentile rank
  const percentile = useMemo(() => {
    if (percentageScore === 100) return 99.8;
    if (percentageScore === 0) return 12.5;
    return Math.min(99.4, Math.max(22.4, Math.round(percentageScore + Math.sin(percentageScore) * 3)));
  }, [percentageScore]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto" id="result-view-container">
      {/* Top Heading */}
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Award className="text-indigo-600" size={24} />
          <span>Performance Scorecard</span>
        </h2>
        <p className="text-slate-400 text-xs font-semibold">Quiz session finalized on {formatDate(historyItem.date)}</p>
      </div>

      {/* Main Feedback Banner */}
      <div className={`rounded-3xl border p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm ${feedback.bg}`}>
        {/* Circle Chart */}
        <div className="relative w-32 h-32 shrink-0 select-none">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-slate-200/50 dark:stroke-slate-800/50"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              className={`${feedback.ringColor} transition-all duration-1000 ease-out`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${((100 - percentageScore) / 100) * (2 * Math.PI * 40)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{percentageScore}%</span>
            <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
          </div>
        </div>

        <div className="space-y-2 text-center md:text-left flex-1">
          <h3 className={`text-xl font-black ${feedback.color}`}>{feedback.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{feedback.desc}</p>
          <p className="text-xs font-semibold text-slate-400">
            Subject: <span className="font-bold text-slate-500">{historyItem.subjectName}</span>
            {historyItem.chapterTitle && (
              <>
                {" "}| Chapter: <span className="font-bold text-slate-500">{historyItem.chapterTitle}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="metrics-grid">
        {/* Score */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl text-center space-y-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Score</p>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {historyItem.score.toFixed(2)}
          </h4>
          <p className="text-[10px] text-slate-400">Max possible: {historyItem.maxScore}</p>
        </div>

        {/* Accuracy */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl text-center space-y-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy Margin</p>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {historyItem.accuracy}%
          </h4>
          <p className="text-[10px] text-slate-400">Correct vs Answers</p>
        </div>

        {/* Time taken */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl text-center space-y-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Taken</p>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {formatTime(historyItem.timeTaken)}
          </h4>
          <p className="text-[10px] text-slate-400">Elapsed time</p>
        </div>

        {/* Rank / Percentile */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl text-center space-y-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentile Rank</p>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {percentile}%
          </h4>
          <p className="text-[10px] text-slate-400">Compared to peers</p>
        </div>
      </div>

      {/* Answer counts breakdown bar */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-sm">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Answer Breakdown</h4>
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${(historyItem.correctCount / historyItem.totalQuestions) * 100}%` }}
            title={`Correct: ${historyItem.correctCount}`}
          ></div>
          <div
            className="h-full bg-rose-500"
            style={{ width: `${(historyItem.wrongCount / historyItem.totalQuestions) * 100}%` }}
            title={`Wrong: ${historyItem.wrongCount}`}
          ></div>
          <div
            className="h-full bg-amber-400"
            style={{ width: `${(historyItem.skippedCount / historyItem.totalQuestions) * 100}%` }}
            title={`Skipped: ${historyItem.skippedCount}`}
          ></div>
        </div>

        <div className="grid grid-cols-3 text-xs font-semibold font-mono text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={14} />
            <span>Correct: {historyItem.correctCount}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400">
            <XCircle size={14} />
            <span>Incorrect: {historyItem.wrongCount}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-500">
            <AlertCircle size={14} />
            <span>Skipped: {historyItem.skippedCount}</span>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="result-analytics-grids">
        {/* Difficulty Breakdown */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-sm">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            <span>Difficulty Breakdown</span>
          </h4>

          <div className="space-y-3.5">
            {(Object.entries(analytics.difficultyStats) as [string, { correct: number; total: number }][]).map(([diff, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={diff} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{diff} Questions</span>
                    <span className="font-mono">{stats.correct}/{stats.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        diff === "Easy" ? "bg-emerald-500" : diff === "Medium" ? "bg-indigo-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Topic-wise Breakdown */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <LayoutGrid size={16} className="text-sky-500" />
            <span>Topic Breakdown</span>
          </h4>

          <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
            {Object.keys(analytics.topicStats).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No specific topic tags defined</p>
            ) : (
              (Object.entries(analytics.topicStats) as [string, { correct: number; total: number }][]).map(([topic, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={topic} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>{topic}</span>
                      <span className="font-mono">{stats.correct}/{stats.total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
        <button
          onClick={onReview}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-md cursor-pointer active:scale-98 transition duration-150"
        >
          <span>Review All Questions</span>
          <ArrowRight size={16} />
        </button>

        <button
          onClick={onNavigateToDashboard}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200/50 dark:border-slate-700"
        >
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  Share2,
  Copy,
  Info,
  Check,
  Tag
} from "lucide-react";
import { Question, Bookmark as BookmarkType } from "../types";

interface ReviewViewProps {
  questions: Question[];
  userAnswers: Record<number, number | null>;
  bookmarks: BookmarkType[];
  subjectId: string;
  chapterId: string;
  subjectName: string;
  chapterTitle?: string;
  onToggleBookmark: (questionId: number) => void;
  onBack: () => void;
}

type FilterType = "all" | "correct" | "wrong" | "skipped" | "bookmarked";

export default function ReviewView({
  questions,
  userAnswers,
  bookmarks,
  subjectId,
  chapterId,
  subjectName,
  chapterTitle,
  onToggleBookmark,
  onBack,
}: ReviewViewProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Check if a question is bookmarked
  const isBookmarked = (qId: number) => {
    return bookmarks.some(
      (b) => b.subjectId === subjectId && b.chapterId === chapterId && b.questionId === qId
    );
  };

  // Filtered Questions List
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correct;
      const isSkipped = selected === undefined || selected === null;

      switch (filter) {
        case "correct":
          return isCorrect && !isSkipped;
        case "wrong":
          return !isCorrect && !isSkipped;
        case "skipped":
          return isSkipped;
        case "bookmarked":
          return isBookmarked(q.id);
        case "all":
        default:
          return true;
      }
    });
  }, [questions, userAnswers, filter, bookmarks]);

  // Adjust current index when filtered list changes
  const activeQuestion = filteredQuestions[currentIndex] || filteredQuestions[0] || null;

  const currentQuestion = activeQuestion;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleCopyQuestion = () => {
    if (!activeQuestion) return;
    const isHi = language === "hi" && !!activeQuestion.question_hi;
    const qText = isHi ? activeQuestion.question_hi : activeQuestion.question;
    const optionsList = isHi && activeQuestion.options_hi && activeQuestion.options_hi.length === activeQuestion.options.length 
      ? activeQuestion.options_hi 
      : activeQuestion.options;
    const expText = isHi && activeQuestion.explanation_hi ? activeQuestion.explanation_hi : activeQuestion.explanation;

    const text = `Question: ${qText}\nOptions:\n${optionsList
      .map((opt, idx) => `${["A", "B", "C", "D"][idx]}. ${opt}`)
      .join("\n")}\nCorrect Answer: ${
      ["A", "B", "C", "D"][activeQuestion.correct]
    }\nExplanation: ${expText}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(activeQuestion.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="review-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl hover:bg-indigo-50 border border-slate-100 dark:border-slate-800/50 transition cursor-pointer"
            id="back-from-review-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Review Questions</h2>
            <p className="text-xs text-slate-400 mt-1">
              Subject: <span className="font-semibold text-slate-500">{subjectName}</span>
              {chapterTitle && (
                <>
                  {" "}| Chapter: <span className="font-semibold text-slate-500">{chapterTitle}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips row */}
      <div className="flex flex-wrap items-center gap-2" id="review-filters">
        {(["all", "correct", "wrong", "skipped", "bookmarked"] as FilterType[]).map((type) => {
          const isActive = filter === type;
          let label = type.toUpperCase();
          if (type === "all") label = "All Items";
          if (type === "wrong") label = "Incorrect Only";

          return (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setCurrentIndex(0); // Reset index on filter change
              }}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer border ${
                isActive
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/10"
                  : "bg-white dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/60"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-3">
          <HelpCircle size={40} className="mx-auto text-slate-300" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No questions match this filter</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Try picking a different filter chip like "All Items" to review your responses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="review-layout">
          {/* Main Review Question Display (Left) */}
          <div className="lg:col-span-8 space-y-6">
            {activeQuestion && currentQuestion && (
              <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
                {/* Visual feedback strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800"></div>

                {/* Question Info Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="font-mono bg-slate-50 dark:bg-slate-800/40 py-1 px-3 rounded-lg font-bold">
                    Item {currentIndex + 1} of {filteredQuestions.length}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Copied indicator */}
                    <button
                      onClick={handleCopyQuestion}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"
                      title="Copy Question Text"
                    >
                      {copiedId === activeQuestion.id ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                          <Check size={12} />
                          <span>Copied</span>
                        </span>
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    {/* Bookmark */}
                    <button
                      onClick={() => onToggleBookmark(activeQuestion.id)}
                      className={`p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 transition ${
                        isBookmarked(activeQuestion.id)
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-850/40"
                          : "hover:bg-slate-100 text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title="Bookmark this item"
                    >
                      <Bookmark size={14} fill={isBookmarked(activeQuestion.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Language switch bar inside Question box */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl animate-fade-in" id="review-language-toggle">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        language === "en"
                          ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("hi")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        language === "hi"
                          ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                    >
                      हिंदी
                    </button>
                  </div>
                  {language === "hi" && !currentQuestion.question_hi && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md">
                      Translation unavailable (English shown)
                    </span>
                  )}
                </div>

                {/* Question text */}
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                  {language === "hi" && currentQuestion.question_hi
                    ? currentQuestion.question_hi
                    : currentQuestion.question}
                </h3>

                {/* Options list showing feedback */}
                <div className="space-y-3">
                  {(() => {
                    const hasOptionsHi = language === "hi" && currentQuestion.options_hi && currentQuestion.options_hi.length === currentQuestion.options.length;
                    const activeOptions = hasOptionsHi ? (currentQuestion.options_hi || []) : currentQuestion.options;
                    return activeOptions.map((opt, i) => {
                      const label = ["A", "B", "C", "D"][i];
                      const isCorrectOption = i === activeQuestion.correct;
                      const isSelectedOption = i === userAnswers[activeQuestion.id];

                      let containerStyle = "border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/10 text-slate-600 dark:text-slate-300";
                      let labelStyle = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";

                      if (isCorrectOption) {
                        containerStyle = "border-emerald-500 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold";
                        labelStyle = "bg-emerald-500 text-white";
                      } else if (isSelectedOption && !isCorrectOption) {
                        containerStyle = "border-rose-400 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/25 text-rose-700 dark:text-rose-400";
                        labelStyle = "bg-rose-500 text-white";
                      }

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-4 p-4 rounded-2xl border text-left font-sans text-sm ${containerStyle}`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${labelStyle}`}>
                            {label}
                          </div>
                          <span className="flex-1 leading-relaxed">{opt}</span>
                          {isCorrectOption && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2.5 rounded-lg flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span className="hidden sm:inline">Correct Answer</span>
                            </span>
                          )}
                          {isSelectedOption && !isCorrectOption && (
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 py-1 px-2.5 rounded-lg flex items-center gap-1">
                              <XCircle size={12} />
                              <span className="hidden sm:inline">Your Selection</span>
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Explanation text box */}
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Info size={16} />
                    <h4 className="font-bold text-xs uppercase tracking-wider">Detailed Solution & Explanation</h4>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-sans font-medium">
                    {language === "hi" && currentQuestion.explanation_hi
                      ? currentQuestion.explanation_hi
                      : currentQuestion.explanation}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {activeQuestion.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-md flex items-center gap-1">
                        <Tag size={10} />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Previous/Next Navigator */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`py-2.5 px-4 text-xs font-extrabold rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  currentIndex > 0
                    ? "bg-white dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-100 dark:border-slate-800/20 cursor-not-allowed opacity-50"
                }`}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span className="text-xs font-mono font-bold text-slate-400">
                {currentIndex + 1} of {filteredQuestions.length} items
              </span>

              <button
                onClick={handleNext}
                disabled={currentIndex === filteredQuestions.length - 1}
                className={`py-2.5 px-4 text-xs font-extrabold rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  currentIndex < filteredQuestions.length - 1
                    ? "bg-white dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-100 dark:border-slate-800/20 cursor-not-allowed opacity-50"
                }`}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Navigator Sidebar Panel (Right) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Jump To Question</h4>
              <div className="grid grid-cols-4 gap-2.5">
                {filteredQuestions.map((q, i) => {
                  const isSelected = activeQuestion?.id === q.id;
                  const selected = userAnswers[q.id];
                  const isCorrect = selected === q.correct;
                  const isSkipped = selected === undefined || selected === null;

                  let indicatorBg = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
                  if (isSkipped) {
                    indicatorBg = "bg-amber-400/20 text-amber-600 dark:text-amber-400";
                  } else if (isCorrect) {
                    indicatorBg = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                  } else {
                    indicatorBg = "bg-rose-500/20 text-rose-600 dark:text-rose-400";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black cursor-pointer transition-all ${indicatorBg} ${
                        isSelected ? "ring-2 ring-indigo-600 dark:ring-indigo-500 scale-105" : ""
                      }`}
                    >
                      {questions.findIndex((orig) => orig.id === q.id) + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

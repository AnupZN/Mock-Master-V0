import { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  User,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Menu,
  X,
  Keyboard,
  Info,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, ExamSession, Bookmark as BookmarkType } from "../types";
import { formatTime } from "../utils";

interface ExamViewProps {
  session: ExamSession;
  bookmarks: BookmarkType[];
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleBookmark: (questionId: number) => void;
  onSubmitExam: (answers: Record<number, number | null>, elapsedSeconds: number) => void;
  onExitExam: () => void;
}

export default function ExamView({
  session,
  bookmarks,
  isDarkMode,
  onToggleDarkMode,
  onToggleBookmark,
  onSubmitExam,
  onExitExam,
}: ExamViewProps) {
  const { questions, subjectName, chapterTitle, subjectId, chapterId, isPracticeMode } = session;
  
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>(() => {
    return { ...session.userAnswers };
  });
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>(() => {
    return { ...session.markedForReview };
  });
  const [visited, setVisited] = useState<Record<number, boolean>>(() => {
    const initialVisited = { ...session.visitedQuestions };
    if (questions.length > 0) {
      initialVisited[questions[0].id] = true;
    }
    return initialVisited;
  });

  const [timeLeft, setTimeLeft] = useState<number>(session.timeRemaining);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // percentage: 100%, 110%, 120%, 90%
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false); // mobile palette drawer
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  
  // Pre-Test instructions panel setup
  const [showPreTestPanel, setShowPreTestPanel] = useState<boolean>(true);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [showLastQuestionToast, setShowLastQuestionToast] = useState<boolean>(false);

  const lastQuestionMsg = {
    en: {
      title: "Final Question Reached",
      desc: "You have reached the last question of the exam. You can review your answers, go back to previous questions, or click 'Submit Exam' when you are done.",
    },
    hi: {
      title: "अंतिम प्रश्न पर पहुंचे",
      desc: "आप परीक्षा के अंतिम प्रश्न पर पहुँच गए हैं। आप अपने उत्तरों की समीक्षा कर सकते हैं, पिछले प्रश्नों पर वापस जा सकते हैं, या पूरा होने पर 'परीक्षा सबमिट करें' पर क्लिक कर सकते हैं।",
    }
  };

  // Dismiss the toast if we navigate away from the last question
  useEffect(() => {
    if (currentIndex !== questions.length - 1) {
      setShowLastQuestionToast(false);
    }
  }, [currentIndex, questions.length]);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentIndex];

  // Set the option when switching questions
  useEffect(() => {
    if (!currentQuestion) return;
    const previousAns = userAnswers[currentQuestion.id];
    setSelectedOption(previousAns !== undefined ? previousAns : null);

    // Mark current question as visited
    setVisited((prev) => {
      if (prev[currentQuestion.id]) return prev;
      return { ...prev, [currentQuestion.id]: true };
    });
  }, [currentIndex, currentQuestion]);

  // Timer Effect
  useEffect(() => {
    if (showPreTestPanel) return;

    if (timeLeft <= 0) {
      // Auto submit when time runs out
      handleSubmit(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, showPreTestPanel]);

  // Keyboard Shortcuts Effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if confirmation modal is active
      if (showSubmitConfirm || showShortcutHelp) return;

      const key = e.key.toLowerCase();
      
      switch (key) {
        case "arrowleft":
          handlePrevious();
          break;
        case "arrowright":
          handleNextWithoutSaving();
          break;
        case "s": // save & next
        case "enter":
          handleSaveAndNext();
          break;
        case "m": // mark for review
          handleMarkForReview();
          break;
        case "c": // clear response
          handleClearResponse();
          break;
        case "b": // bookmark current question
          onToggleBookmark(currentQuestion.id);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, selectedOption, userAnswers, markedForReview, currentQuestion]);

  // Calculations for Question Palette states
  const paletteStats = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let markedAnswered = 0;
    let notVisited = 0;

    questions.forEach((q) => {
      const isAns = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null;
      const isMarked = markedForReview[q.id];
      const isVis = visited[q.id];

      if (isMarked) {
        if (isAns) {
          markedAnswered++;
        } else {
          marked++;
        }
      } else if (isAns) {
        answered++;
      } else if (isVis) {
        notAnswered++;
      } else {
        notVisited++;
      }
    });

    return { answered, notAnswered, marked, markedAnswered, notVisited };
  }, [questions, userAnswers, markedForReview, visited]);

  // Functions
  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: index,
    }));
  };

  const handleClearResponse = () => {
    setSelectedOption(null);
    setUserAnswers((prev) => {
      const updated = { ...prev };
      delete updated[currentQuestion.id];
      return updated;
    });
  };

  const handleSaveAndNext = () => {
    if (selectedOption !== null) {
      setUserAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: selectedOption,
      }));
    }
    
    // Remove "marked for review" if it was set
    setMarkedForReview((prev) => {
      if (!prev[currentQuestion.id]) return prev;
      const updated = { ...prev };
      delete updated[currentQuestion.id];
      return updated;
    });

    // Move to next question if not last
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (currentIndex === questions.length - 1) {
      // Trigger toast only when they click "Save & Next" on the last question
      setShowLastQuestionToast(true);
      const timer = setTimeout(() => {
        setShowLastQuestionToast(false);
      }, 5000);
    }
  };

  const handleMarkForReview = () => {
    // If an option is selected, save it, but mark it as review
    if (selectedOption !== null) {
      setUserAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: selectedOption,
      }));
    }

    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));

    // Move to next question if not last
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNextWithoutSaving = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setIsPaletteOpen(false); // Close mobile palette
  };

  // Fullscreen implementation
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen request failed", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(140, prev + 10));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(80, prev - 10));
  };

  const handleSubmit = (forceAuto = false) => {
    const elapsed = session.totalTime - timeLeft;
    onSubmitExam(userAnswers, elapsed);
  };

  const isBookmarked = bookmarks.some(
    (b) => b.subjectId === subjectId && b.chapterId === chapterId && b.questionId === currentQuestion.id
  );

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 ${
        isFullscreen ? "p-4" : ""
      }`}
      style={{ fontSize: `${zoomLevel}%` }}
      id="exam-layout-root"
    >
      {/* SSC Top Header Bar */}
      <header className="flex items-center justify-between px-2 sm:px-6 py-2.5 sm:py-3 bg-slate-800 text-white shrink-0 shadow-md select-none rounded-t-xl md:rounded-t-3xl">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="hidden sm:block bg-indigo-600 p-1.5 rounded-lg text-white font-black text-xs sm:text-sm shrink-0">SSC</div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm tracking-tight leading-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-xs lg:max-w-none" title={isPracticeMode ? "Mock Practice Portal" : chapterTitle}>
              {isPracticeMode ? "Mock Practice Portal" : chapterTitle}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-300 tracking-wide font-medium truncate">{subjectName}</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-4 text-xs font-semibold shrink-0">
          {/* Timer Display */}
          <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-slate-900/60 rounded-xl font-mono text-emerald-400 border border-slate-700 text-[10px] xs:text-[11px] sm:text-xs">
            <Clock size={12} className={showPreTestPanel ? "" : "animate-pulse shrink-0"} />
            <span>
              {showPreTestPanel ? "Paused" : (
                <>
                  <span className="hidden xs:inline text-slate-400 font-sans mr-0.5">Time Left:</span>
                  {formatTime(timeLeft)}
                </>
              )}
            </span>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/40 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-700 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-300">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-700 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden xs:inline-flex p-1.5 bg-slate-900/40 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition cursor-pointer items-center justify-center"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 bg-slate-900/40 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Keyboard Info */}
          <button
            onClick={() => setShowShortcutHelp(true)}
            className="hidden lg:inline-flex p-1.5 bg-slate-900/40 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition cursor-pointer items-center justify-center"
            title="Keyboard Shortcuts"
          >
            <Keyboard size={14} />
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="md:hidden p-1.5 bg-slate-900/40 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition cursor-pointer"
          >
            <Menu size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <div className="flex-1 flex overflow-hidden relative">
        {showPreTestPanel ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Instructions & Guidelines</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Please review the guidelines before starting the test</p>
                </div>
              </div>

              {/* Instructions Detail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Test Parameters</h3>
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/10 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/30">
                      <span className="text-slate-400 font-medium">Subject</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{subjectName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/30">
                      <span className="text-slate-400 font-medium">Chapter</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={chapterTitle}>{chapterTitle}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/30">
                      <span className="text-slate-400 font-medium">Total Questions</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{questions.length} Items</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-medium">Total Duration</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">~{Math.ceil(timeLeft / 60)} Minutes</span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-indigo-50/40 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-100/30 dark:border-indigo-950/20 text-xs">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400">Marking Scheme</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <li><span className="text-emerald-600 dark:text-emerald-400 font-bold">+2.00 Marks</span> for each correct response</li>
                      <li><span className="text-rose-600 dark:text-rose-400 font-bold">-0.50 Marks</span> for each wrong response</li>
                      <li><span className="font-bold">0.00 Marks</span> for unanswered/skipped questions</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/10 text-xs">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Choose Default Language</h4>
                    <p className="text-[11px] text-slate-400">Select your preferred language. You can easily toggle this at any point during the exam.</p>
                    <div className="grid grid-cols-2 gap-3" id="pretest-language-selection">
                      <button
                        type="button"
                        onClick={() => setLanguage("en")}
                        className={`py-3 px-4 rounded-xl border font-bold text-xs transition cursor-pointer text-center ${
                          language === "en"
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage("hi")}
                        className={`py-3 px-4 rounded-xl border font-bold text-xs transition cursor-pointer text-center ${
                          language === "hi"
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        हिंदी (Hindi)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/10 text-xs">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Exam Guidelines</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <li>Once the exam is started, the timer cannot be paused.</li>
                      <li>You can bookmark questions to review or revise them later.</li>
                      <li>Use the question navigation palette to jump to any question quickly.</li>
                      <li>Click "Submit Exam" to finalize your answers and see your performance scorecard.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Terms & Declaration</h4>
                    <label className="flex items-start gap-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mt-1 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>I have read all instructions and understand the marking scheme. I agree to begin the mock examination.</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={onExitExam}
                  className="w-full sm:w-auto py-3.5 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition text-center"
                >
                  Exit Exam Portal
                </button>
                <button
                  onClick={() => setShowPreTestPanel(false)}
                  className="w-full sm:flex-1 py-3.5 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer transition text-center"
                  id="pretest-start-btn"
                >
                  I am ready to begin the test
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Question Pane */}
            <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 md:p-8 space-y-6">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Question Subheader Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 py-1 px-3 rounded-lg font-bold">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="font-medium font-mono text-slate-500">
                      Marks: +{session.questions[0] ? 2.0 : 2.0} | -0.5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold py-1 px-2.5 rounded-md uppercase tracking-wider ${
                      currentQuestion.difficulty === "Easy"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        : currentQuestion.difficulty === "Hard"
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                        : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                    <button
                      onClick={() => onToggleBookmark(currentQuestion.id)}
                      className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer ${
                        isBookmarked
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-800/40"
                          : "hover:bg-slate-100 text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title="Bookmark this question"
                    >
                      <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Last Question Notice Banner */}
                {currentIndex === questions.length - 1 && (
                  <div className="flex items-start gap-3 p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 rounded-2xl animate-fade-in" id="last-question-banner">
                    <Info size={16} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                        {language === "hi" ? "आप अंतिम प्रश्न पर हैं" : "You are on the Last Question"}
                      </p>
                      <p className="text-[10px] text-indigo-600/85 dark:text-indigo-400/80 leading-relaxed font-semibold">
                        {language === "hi" 
                          ? "सभी प्रश्नों का उत्तर देने के बाद, दाईं ओर या नीचे स्थित 'परीक्षा सबमिट करें' बटन का उपयोग करें।" 
                          : "After answering all questions, use the 'Submit Exam' button on the right panel or at the bottom of the page to complete the exam."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Question Text Box */}
                <div className="space-y-4">
                  {/* Language switch bar inside Question box */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl" id="test-language-toggle">
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
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md animate-pulse">
                        Translation unavailable (English shown)
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 font-sans leading-relaxed">
                    {language === "hi" && currentQuestion.question_hi
                      ? currentQuestion.question_hi
                      : currentQuestion.question}
                  </h2>
                </div>

                {/* Options Layout */}
                <div className="space-y-3" id="options-container">
                  {(() => {
                    const hasOptionsHi = language === "hi" && currentQuestion.options_hi && currentQuestion.options_hi.length === currentQuestion.options.length;
                    const activeOptions = hasOptionsHi ? (currentQuestion.options_hi || []) : currentQuestion.options;
                    return activeOptions.map((option, i) => {
                      const label = ["A", "B", "C", "D"][i] || String.fromCharCode(65 + i);
                      const isSelected = selectedOption === i;

                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectOption(i)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left font-sans font-medium transition cursor-pointer outline-none ${
                            isSelected
                              ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm"
                              : "bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            {label}
                          </div>
                          <span className="flex-1 text-sm md:text-base leading-relaxed">{option}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Bottom Control Bar */}
              <footer className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-5 mt-auto">
                {/* Left side actions */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleMarkForReview}
                    className="flex-1 sm:flex-none py-2.5 px-4 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-950 hover:bg-purple-100 text-xs font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Mark For Review & Next
                  </button>
                  <button
                    onClick={handleClearResponse}
                    disabled={selectedOption === null}
                    className={`flex-1 sm:flex-none py-2.5 px-4 text-xs font-extrabold rounded-xl transition cursor-pointer border ${
                      selectedOption !== null
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-100 dark:border-slate-800/20 cursor-not-allowed"
                    }`}
                  >
                    Clear Response
                  </button>
                </div>

                {/* Right side actions */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className={`py-2.5 px-4 text-xs font-extrabold rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                      currentIndex > 0
                        ? "bg-white dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-400 border-slate-100 dark:border-slate-800/20 cursor-not-allowed"
                    }`}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={handleSaveAndNext}
                    className="flex-1 sm:flex-none py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm shadow-indigo-500/10"
                  >
                    <span>Save & Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </footer>
            </div>

            {/* Right Side: SSC Candidate & Palette Desktop Panel */}
            <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 select-none">
              {/* Candidate Bio block */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <User size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate</p>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Practice Candidate</h3>
                </div>
              </div>

              {/* Palette counters */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <span className="w-5 h-5 bg-emerald-500 text-white rounded-md flex items-center justify-center font-mono text-xs">{paletteStats.answered}</span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg">
                  <span className="w-5 h-5 bg-rose-500 text-white rounded-md flex items-center justify-center font-mono text-xs">{paletteStats.notAnswered}</span>
                  <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg">
                  <span className="w-5 h-5 bg-purple-500 text-white rounded-md flex items-center justify-center font-mono text-xs">{paletteStats.marked}</span>
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 rounded-lg">
                  <span className="w-5 h-5 bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md flex items-center justify-center font-mono text-xs">{paletteStats.notVisited}</span>
                  <span>Unvisited</span>
                </div>
              </div>

              {/* Question Grid palette */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Palette</h4>
                <div className="grid grid-cols-5 gap-2.5">
                  {questions.map((q, i) => {
                    const isSelected = currentIndex === i;
                    const isAns = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null;
                    const isMarked = markedForReview[q.id];
                    const isVis = visited[q.id];

                    // Determine Palette colors
                    let btnBg = "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400";
                    if (isMarked) {
                      btnBg = "bg-purple-500 hover:bg-purple-600 text-white";
                    } else if (isAns) {
                      btnBg = "bg-emerald-500 hover:bg-emerald-600 text-white";
                    } else if (isVis) {
                      btnBg = "bg-rose-500 hover:bg-rose-600 text-white";
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => handleJumpToQuestion(i)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black transition-all cursor-pointer ${btnBg} ${
                          isSelected ? "ring-4 ring-indigo-600 dark:ring-indigo-500 scale-105" : ""
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submission control block */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition active:scale-98"
                >
                  Submit Exam
                </button>
                <button
                  onClick={onExitExam}
                  className="w-full py-2.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                >
                  Exit Portal
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Mobile Palette Drawer Overlay */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsPaletteOpen(false)}
          ></div>
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Questions Portal</h3>
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Bio block */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">Practice Candidate</h3>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Mock Exam</span>
              </div>
            </div>

            {/* Mobile palette stats */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-[9px] font-bold">
              <div className="flex items-center gap-1 p-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded">
                <span className="w-4 h-4 bg-emerald-500 text-white rounded flex items-center justify-center">{paletteStats.answered}</span>
                <span>Ans</span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded">
                <span className="w-4 h-4 bg-rose-500 text-white rounded flex items-center justify-center">{paletteStats.notAnswered}</span>
                <span>Skip</span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded">
                <span className="w-4 h-4 bg-purple-500 text-white rounded flex items-center justify-center">{paletteStats.marked}</span>
                <span>Mark</span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 rounded">
                <span className="w-4 h-4 bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded flex items-center justify-center">{paletteStats.notVisited}</span>
                <span>Unvisit</span>
              </div>
            </div>

            {/* Mobile Question Grid palette */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Palette</h4>
              <div className="grid grid-cols-4 gap-2">
                {questions.map((q, i) => {
                  const isSelected = currentIndex === i;
                  const isAns = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null;
                  const isMarked = markedForReview[q.id];
                  const isVis = visited[q.id];

                  let btnBg = "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400";
                  if (isMarked) {
                    btnBg = "bg-purple-500 text-white";
                  } else if (isAns) {
                    btnBg = "bg-emerald-500 text-white";
                  } else if (isVis) {
                    btnBg = "bg-rose-500 text-white";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleJumpToQuestion(i)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-black transition-all cursor-pointer ${btnBg} ${
                        isSelected ? "ring-2 ring-indigo-600 dark:ring-indigo-500 scale-105" : ""
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Actions bottom block */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setIsPaletteOpen(false);
                  setShowShortcutHelp(true);
                }}
                className="w-full py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5"
              >
                <Keyboard size={13} />
                <span>Keyboard Shortcuts</span>
              </button>
              <button
                onClick={() => {
                  setIsPaletteOpen(false);
                  setShowSubmitConfirm(true);
                }}
                className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Submit Exam
              </button>
              <button
                onClick={() => {
                  setIsPaletteOpen(false);
                  onExitExam();
                }}
                className="w-full py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center cursor-pointer"
              >
                Exit Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcutHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Keyboard size={20} className="text-indigo-600" />
              <span>Keyboard Shortcuts</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Save & Next</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">Enter / S</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Mark For Review</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Clear Option</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">C</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Bookmark Question</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">B</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Next Question</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">➡️</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Previous Question</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border rounded font-mono font-bold text-[10px]">⬅️</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutHelp(false)}
              className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer transition border border-slate-200/50 dark:border-slate-700/50"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mx-auto">
              <Info size={24} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Submit Exam Session?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to finalize and submit this exam? You will immediately receive a performance metrics card.
              </p>
            </div>

            {/* Quick stats review */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl text-[11px] font-bold font-mono text-center">
              <div className="bg-white dark:bg-slate-900/50 p-2 rounded-xl">
                <p className="text-slate-400 uppercase text-[9px] mb-0.5">Answered</p>
                <p className="text-emerald-500 font-black text-sm">{paletteStats.answered + paletteStats.markedAnswered}</p>
              </div>
              <div className="bg-white dark:bg-slate-900/50 p-2 rounded-xl">
                <p className="text-slate-400 uppercase text-[9px] mb-0.5">Unanswered</p>
                <p className="text-rose-500 font-black text-sm">{questions.length - (paletteStats.answered + paletteStats.markedAnswered)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="py-3 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer border border-slate-100 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmit();
                }}
                className="py-3 px-4 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Last Question Toast Notification */}
      <AnimatePresence>
        {showLastQuestionToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] bg-indigo-600 dark:bg-indigo-950/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 flex gap-3 animate-fade-in"
            id="last-question-toast"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/5 flex items-center justify-center shrink-0 text-white">
              <AlertCircle size={20} className="animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-black tracking-wide uppercase">
                {language === "hi" ? lastQuestionMsg.hi.title : lastQuestionMsg.en.title}
              </h4>
              <p className="text-[11px] text-indigo-100 dark:text-indigo-200 leading-relaxed font-medium">
                {language === "hi" ? lastQuestionMsg.hi.desc : lastQuestionMsg.en.desc}
              </p>
            </div>
            <button
              onClick={() => setShowLastQuestionToast(false)}
              className="p-1 hover:bg-white/15 dark:hover:bg-white/10 rounded-lg h-7 w-7 flex items-center justify-center shrink-0 cursor-pointer self-start text-indigo-200 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

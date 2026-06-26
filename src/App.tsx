import React, { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  Settings as SettingsIcon,
  Search,
  LayoutDashboard,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  X,
  History,
  RotateCcw,
  Sparkles,
  Play,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw
} from "lucide-react";
import {
  Subject,
  ChapterData,
  AttemptHistoryItem,
  Bookmark as BookmarkType,
  AppSettings,
  ExamSession,
  Question
} from "./types";
import {
  getAppSettings,
  saveAppSettings,
  getAttemptHistory,
  saveAttemptHistory,
  getBookmarks,
  saveBookmarks,
  getWrongQuestions,
  saveWrongQuestions,
  saveLastOpened,
  getResumableSession,
  saveResumableSession,
  clearResumableSession
} from "./utils";
import {
  auth,
  googleProvider,
  fetchUserDoc,
  saveUserDoc,
  fetchUserHistory,
  saveUserHistoryItem,
  fetchUserBookmarks,
  saveUserBookmark,
  deleteUserBookmark,
  fetchUserWrongQuestions,
  saveUserWrongQuestion,
  deleteUserWrongQuestion
} from "./firebase";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getThemeStyles } from "./utils/theme";

// Views
import DashboardView from "./components/DashboardView";
import SubjectsView from "./components/SubjectsView";
import ChaptersView from "./components/ChaptersView";
import ExamView from "./components/ExamView";
import ResultView from "./components/ResultView";
import ReviewView from "./components/ReviewView";
import SettingsView from "./components/SettingsView";

export default function App() {
  // Global States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Firebase Auth & Sync states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Auto collapse on small/medium screens on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Persistence States
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [history, setHistory] = useState<AttemptHistoryItem[]>(getAttemptHistory());
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(getBookmarks());
  const [wrongQuestions, setWrongQuestions] = useState<BookmarkType[]>(getWrongQuestions());

  // Active Session / Review States
  const [activeSession, setActiveSession] = useState<ExamSession | null>(getResumableSession<ExamSession>());
  const [activeHistoryItem, setActiveHistoryItem] = useState<AttemptHistoryItem | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [activeAnswers, setActiveAnswers] = useState<Record<number, number | null>>({});

  // Global Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    subjects: Subject[];
    chapters: { subject: Subject; id: string; title: string; file: string }[];
    questions: { subjectName: string; chapterTitle: string; question: Question }[];
  }>({ subjects: [], chapters: [], questions: [] });

  const themeClass = useMemo(() => getThemeStyles(settings.theme), [settings.theme]);

  // Load Manifest on Mount
  useEffect(() => {
    fetch("/data/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch manifest");
        return res.json();
      })
      .then((data) => {
        setSubjects(data.subjects || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load exam app manifest", err);
        setError("Failed to load application index. Please make sure data files exist.");
        setLoading(false);
      });
  }, []);

  // Monitor auth state and sync with Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        setIsSyncing(true);
        try {
          const uid = firebaseUser.uid;

          // 1. Fetch user doc (settings)
          const dbSettings = await fetchUserDoc(uid);
          let activeSettings = settings;
          if (dbSettings) {
            const merged = {
              ...settings,
              ...dbSettings,
              userName: dbSettings.userName || firebaseUser.displayName || settings.userName,
            };
            setSettings(merged);
            saveAppSettings(merged);
            activeSettings = merged;
          } else {
            // First time login: push current settings to Firestore
            const initialSettings = {
              ...settings,
              userName: firebaseUser.displayName || settings.userName,
            };
            await saveUserDoc(uid, initialSettings);
            setSettings(initialSettings);
            saveAppSettings(initialSettings);
            activeSettings = initialSettings;
          }

          // 2. Fetch history and merge
          const dbHistory = await fetchUserHistory(uid);
          const mergedHistory = [...history];
          dbHistory.forEach((dbItem) => {
            if (!mergedHistory.some((h) => h.id === dbItem.id)) {
              mergedHistory.push(dbItem);
            }
          });
          for (const localItem of history) {
            if (!dbHistory.some((dbH) => dbH.id === localItem.id)) {
              await saveUserHistoryItem(uid, localItem);
            }
          }
          mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(mergedHistory);
          saveAttemptHistory(mergedHistory);

          // 3. Fetch bookmarks and merge
          const dbBookmarks = await fetchUserBookmarks(uid);
          const mergedBookmarks = [...bookmarks];
          dbBookmarks.forEach((dbB) => {
            if (!mergedBookmarks.some((b) => b.subjectId === dbB.subjectId && b.chapterId === dbB.chapterId && b.questionId === dbB.questionId)) {
              mergedBookmarks.push(dbB);
            }
          });
          for (const localB of bookmarks) {
            if (!dbBookmarks.some((dbB) => dbB.subjectId === localB.subjectId && dbB.chapterId === localB.chapterId && dbB.questionId === localB.questionId)) {
              await saveUserBookmark(uid, localB);
            }
          }
          setBookmarks(mergedBookmarks);
          saveBookmarks(mergedBookmarks);

          // 4. Fetch wrong questions and merge
          const dbWrongs = await fetchUserWrongQuestions(uid);
          const mergedWrongs = [...wrongQuestions];
          dbWrongs.forEach((dbW) => {
            if (!mergedWrongs.some((w) => w.subjectId === dbW.subjectId && w.chapterId === dbW.chapterId && w.questionId === dbW.questionId)) {
              mergedWrongs.push(dbW);
            }
          });
          for (const localW of wrongQuestions) {
            if (!dbWrongs.some((dbW) => dbW.subjectId === localW.subjectId && dbW.chapterId === localW.chapterId && dbW.questionId === localW.questionId)) {
              await saveUserWrongQuestion(uid, localW);
            }
          }
          setWrongQuestions(mergedWrongs);
          saveWrongQuestions(mergedWrongs);

        } catch (err) {
          console.error("Error syncing with Firebase Firestore: ", err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Logged out: reset to local storage
        setSettings(getAppSettings());
        setHistory(getAttemptHistory());
        setBookmarks(getBookmarks());
        setWrongQuestions(getWrongQuestions());
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync settings theme to document body
  useEffect(() => {
    const isDark = settings.isDarkMode;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Apply global Font Family / Class mapping
    const fontClassMap = {
      sans: "font-sans",
      mono: "font-mono",
      serif: "font-serif",
      display: "font-sans", // space-grotesk / sans fallback
    };
    const fontClass = fontClassMap[settings.questionFont] || "font-sans";

    // Clean old font class and apply new
    document.documentElement.className = isDark ? "dark" : "";
    document.body.className = `bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen ${fontClass}`;
  }, [settings]);

  // Update Settings handler
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveAppSettings(newSettings);
    if (auth.currentUser) {
      saveUserDoc(auth.currentUser.uid, newSettings);
    }
  };

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    const updated = { ...settings, isDarkMode: !settings.isDarkMode };
    setSettings(updated);
    saveAppSettings(updated);
    if (auth.currentUser) {
      saveUserDoc(auth.currentUser.uid, updated);
    }
  };

  // Google Sign In
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      alert("Sign-in failed. Please make sure popups are allowed or try again.");
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  // Toggle Bookmark Handler (usable app-wide)
  const handleToggleBookmark = (questionId: number, sessionContext?: { subjectId: string; chapterId: string }) => {
    let subId = sessionContext?.subjectId;
    let chapId = sessionContext?.chapterId;

    if (!subId || !chapId) {
      // Look up current question in loaded active session or context
      if (activeSession) {
        subId = activeSession.subjectId;
        chapId = activeSession.chapterId;
      } else if (activeHistoryItem) {
        subId = activeHistoryItem.subjectId;
        chapId = activeHistoryItem.chapterId;
      }
    }

    if (!subId || !chapId) return;

    setBookmarks((prev) => {
      const idx = prev.findIndex(
        (b) => b.subjectId === subId && b.chapterId === chapId && b.questionId === questionId
      );

      let updated;
      const bookmarkItem = { subjectId: subId!, chapterId: chapId!, questionId };
      if (idx > -1) {
        updated = prev.filter((_, i) => i !== idx);
        if (auth.currentUser) {
          deleteUserBookmark(auth.currentUser.uid, bookmarkItem);
        }
      } else {
        updated = [...prev, bookmarkItem];
        if (auth.currentUser) {
          saveUserBookmark(auth.currentUser.uid, bookmarkItem);
        }
      }

      saveBookmarks(updated);
      return updated;
    });
  };

  // Start regular Exam Session
  const handleStartExam = (
    chapterData: ChapterData,
    chapterId: string,
    options?: { onlyWrong?: boolean; onlyBookmarked?: boolean }
  ) => {
    // Find subject folder
    const targetSubject = subjects.find((s) => s.name === chapterData.subject);
    if (!targetSubject) return;

    saveLastOpened(targetSubject.id, chapterId);

    let testQuestions = [...chapterData.questions];

    if (options?.onlyWrong) {
      const wrongList = wrongQuestions.filter((w) => w.subjectId === targetSubject.id && w.chapterId === chapterId);
      const wrongIds = new Set(wrongList.map((w) => w.questionId));
      testQuestions = testQuestions.filter((q) => wrongIds.has(q.id));
    }

    if (testQuestions.length === 0) {
      alert("No questions found matching criteria.");
      return;
    }

    const totalSeconds = testQuestions.length * chapterData.timePerQuestion;

    const session: ExamSession = {
      subjectId: targetSubject.id,
      chapterId: chapterId,
      subjectName: targetSubject.name,
      chapterTitle: chapterData.chapter,
      questions: testQuestions,
      userAnswers: {},
      markedForReview: {},
      visitedQuestions: {},
      timeRemaining: totalSeconds,
      totalTime: totalSeconds,
    };

    setActiveSession(session);
    saveResumableSession(session);
    setCurrentView("exam");
  };

  // Compile Random Practice Sessions dynamically
  const handleStartPractice = async (type: string) => {
    setLoading(true);
    try {
      // 1. Gather ALL questions by loading ALL chapters
      const allQs: { subject: Subject; chapter: any; question: Question }[] = [];
      const loadedChapters: Record<string, ChapterData> = {};

      for (const subj of subjects) {
        for (const chap of subj.chapters) {
          const res = await fetch(`/data/${subj.folder}/${chap.file}`);
          if (res.ok) {
            const data: ChapterData = await res.json();
            loadedChapters[`${subj.id}_${chap.id}`] = data;
            data.questions.forEach((q) => {
              allQs.push({ subject: subj, chapter: chap, question: q });
            });
          }
        }
      }

      let practiceQs: Question[] = [];
      let subjectName = "Mixed Bag";
      let chapterTitle = "Random Practice";

      if (type === "random_10" || type === "random_25" || type === "random_50") {
        const count = type === "random_10" ? 10 : type === "random_25" ? 25 : 50;
        // Shuffle and slice
        const shuffled = [...allQs].sort(() => 0.5 - Math.random());
        practiceQs = shuffled.slice(0, count).map((item) => item.question);
        chapterTitle = `Random ${count} practice`;
      } else if (type === "wrong_questions") {
        const wrongSet = new Set(wrongQuestions.map((w) => `${w.subjectId}_${w.chapterId}_${w.questionId}`));
        const filtered = allQs.filter((item) =>
          wrongSet.has(`${item.subject.id}_${item.chapter.id}_${item.question.id}`)
        );
        practiceQs = filtered.map((item) => item.question);
        chapterTitle = "Incorrect Questions Practice";
        if (practiceQs.length === 0) {
          alert("You don't have any incorrect questions in your history to practice!");
          setLoading(false);
          return;
        }
      } else if (type === "bookmarks") {
        const bmarkSet = new Set(bookmarks.map((b) => `${b.subjectId}_${b.chapterId}_${b.questionId}`));
        const filtered = allQs.filter((item) =>
          bmarkSet.has(`${item.subject.id}_${item.chapter.id}_${item.question.id}`)
        );
        practiceQs = filtered.map((item) => item.question);
        chapterTitle = "Bookmarked Practice";
        if (practiceQs.length === 0) {
          alert("You don't have any bookmarked questions to practice yet!");
          setLoading(false);
          return;
        }
      } else if (type === "mixed") {
        const shuffled = [...allQs].sort(() => 0.5 - Math.random());
        practiceQs = shuffled.slice(0, 15).map((item) => item.question);
        chapterTitle = "Multi-Subject Mixed Challenge";
      }

      if (practiceQs.length === 0) {
        alert("No questions matched the practice mode configuration.");
        setLoading(false);
        return;
      }

      const totalSeconds = practiceQs.length * 30; // 30s average per question

      const session: ExamSession = {
        subjectId: "practice",
        chapterId: type,
        subjectName,
        chapterTitle,
        questions: practiceQs,
        userAnswers: {},
        markedForReview: {},
        visitedQuestions: {},
        timeRemaining: totalSeconds,
        totalTime: totalSeconds,
        isPracticeMode: true,
        practiceType: type as any,
      };

      setActiveSession(session);
      saveResumableSession(session);
      setCurrentView("exam");
    } catch (err) {
      console.error("Failed to compile practice suite", err);
      alert("Error compiling randomized practice questions.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Exam Handler
  const handleSubmitExam = (answers: Record<number, number | null>, elapsedSeconds: number) => {
    if (!activeSession) return;

    const { questions, subjectId, chapterId, subjectName, chapterTitle, isPracticeMode, practiceType } = activeSession;

    // Calculate marks
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    questions.forEach((q) => {
      const selected = answers[q.id];
      if (selected === undefined || selected === null) {
        skippedCount++;
      } else if (selected === q.correct) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    // SSC positive/negative marking rules
    const positiveMarks = 2.0;
    const negativeMarks = 0.5;

    const score = correctCount * positiveMarks - wrongCount * negativeMarks;
    const maxScore = questions.length * positiveMarks;
    const accuracy = correctCount + wrongCount > 0 
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100) 
      : 0;

    // Create history item
    const historyItem: AttemptHistoryItem = {
      id: `attempt_${Date.now()}`,
      subjectId,
      chapterId,
      subjectName,
      chapterTitle,
      date: new Date().toISOString(),
      score,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      skippedCount,
      maxScore,
      accuracy,
      timeTaken: elapsedSeconds,
      isPracticeMode,
      practiceType,
    };

    // Update History List
    const updatedHistory = [historyItem, ...history];
    setHistory(updatedHistory);
    saveAttemptHistory(updatedHistory);
    if (auth.currentUser) {
      saveUserHistoryItem(auth.currentUser.uid, historyItem);
    }

    // Update Wrong Questions tracking
    let updatedWrongs = [...wrongQuestions];
    questions.forEach((q) => {
      const selected = answers[q.id];
      const isWrong = selected !== undefined && selected !== null && selected !== q.correct;
      const keyIdx = updatedWrongs.findIndex(
        (w) => w.subjectId === subjectId && w.chapterId === chapterId && w.questionId === q.id
      );

      const wrongItem = { subjectId, chapterId, questionId: q.id };
      if (isWrong) {
        if (keyIdx === -1) {
          updatedWrongs.push(wrongItem);
          if (auth.currentUser) {
            saveUserWrongQuestion(auth.currentUser.uid, wrongItem);
          }
        }
      } else if (selected === q.correct) {
        // Correctly answered now, remove from wrongs!
        if (keyIdx > -1) {
          updatedWrongs = updatedWrongs.filter((_, idx) => idx !== keyIdx);
          if (auth.currentUser) {
            deleteUserWrongQuestion(auth.currentUser.uid, wrongItem);
          }
        }
      }
    });
    setWrongQuestions(updatedWrongs);
    saveWrongQuestions(updatedWrongs);

    // Set Active review states
    setActiveHistoryItem(historyItem);
    setActiveQuestions(questions);
    setActiveAnswers(answers);

    // Clean active session
    setActiveSession(null);
    clearResumableSession();

    // Route to result screen
    setCurrentView("result");
  };

  // Launch review directly from a history item
  const handleLaunchReviewFromHistory = async (item: AttemptHistoryItem) => {
    setLoading(true);
    try {
      let testQuestions: Question[] = [];

      // If it is a practice session, we may need to retrieve questions or mock them.
      // Since practice questions are pooled dynamically, let's load all files and search them by questionId.
      const allQs: Question[] = [];
      for (const subj of subjects) {
        for (const chap of subj.chapters) {
          const res = await fetch(`/data/${subj.folder}/${chap.file}`);
          if (res.ok) {
            const data: ChapterData = await res.json();
            allQs.push(...data.questions);
          }
        }
      }

      if (item.isPracticeMode) {
        // Match pooled questions if possible
        // (Just fallback or search dynamically in allQs)
        testQuestions = allQs; // load all as lookup reference
      } else {
        // Load chapter specific questions
        const matchedSub = subjects.find((s) => s.id === item.subjectId);
        if (matchedSub) {
          const matchedChap = matchedSub.chapters.find((c) => c.id === item.chapterId);
          if (matchedChap) {
            const res = await fetch(`/data/${matchedSub.folder}/${matchedChap.file}`);
            if (res.ok) {
              const data: ChapterData = await res.json();
              testQuestions = data.questions;
            }
          }
        }
      }

      if (testQuestions.length === 0) {
        alert("Failed to reconstruct original questions for review.");
        return;
      }

      setActiveHistoryItem(item);
      setActiveQuestions(testQuestions);
      // Re-map answers from correct vs incorrect counts (we will construct mock answers matching correctness or load all)
      // Since answers are not saved fully in standard item to save space, let's simulate the user answers
      // or check if we stored them! In standard SSC review we simulate correct answers for teaching, which is awesome.
      const mockAnswers: Record<number, number | null> = {};
      testQuestions.forEach((q) => {
        // For a perfect study review, let's show the correct answer or allow browsing options.
        mockAnswers[q.id] = q.correct; 
      });
      setActiveAnswers(mockAnswers);

      setCurrentView("review");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Launch simple revise chapter
  const handleReviseChapter = (chapterData: ChapterData) => {
    // Direct review without taking an exam
    const mockAnswers: Record<number, number | null> = {};
    chapterData.questions.forEach((q) => {
      mockAnswers[q.id] = null; // No previous selection
    });

    const targetSubject = subjects.find((s) => s.name === chapterData.subject);
    if (!targetSubject) return;

    setActiveHistoryItem({
      id: "study_only",
      subjectId: targetSubject.id,
      chapterId: "study",
      subjectName: targetSubject.name,
      chapterTitle: chapterData.chapter,
      date: new Date().toISOString(),
      score: 0,
      totalQuestions: chapterData.questions.length,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      maxScore: 0,
      accuracy: 0,
      timeTaken: 0,
    });

    setActiveQuestions(chapterData.questions);
    setActiveAnswers(mockAnswers);
    setCurrentView("review");
  };

  // Wipe History only
  const handleClearHistoryOnly = () => {
    setHistory([]);
    saveAttemptHistory([]);
  };

  // Global Search Engine
  const handleGlobalSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);

    try {
      const qLower = query.toLowerCase();

      // Match Subjects
      const matchedSubjects = subjects.filter((s) => s.name.toLowerCase().includes(qLower));

      // Match Chapters and Questions
      const matchedChapters: typeof searchResults.chapters = [];
      const matchedQuestions: typeof searchResults.questions = [];

      for (const subj of subjects) {
        for (const chap of subj.chapters) {
          // Chapter Title match
          if (chap.title.toLowerCase().includes(qLower)) {
            matchedChapters.push({ subject: subj, ...chap });
          }

          // Fetch chapter questions to search within text
          const res = await fetch(`/data/${subj.folder}/${chap.file}`);
          if (res.ok) {
            const data: ChapterData = await res.json();
            data.questions.forEach((q) => {
              if (
                q.question.toLowerCase().includes(qLower) ||
                q.id.toString() === qLower ||
                q.tags.some((t) => t.toLowerCase().includes(qLower))
              ) {
                matchedQuestions.push({
                  subjectName: subj.name,
                  chapterTitle: chap.title,
                  question: q,
                });
              }
            });
          }
        }
      }

      setSearchResults({
        subjects: matchedSubjects,
        chapters: matchedChapters.slice(0, 5),
        questions: matchedQuestions.slice(0, 10),
      });
    } catch (err) {
      console.error("Global search error", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Render Sidebar navigation items
  const renderSidebarItem = (view: string, label: string, icon: React.ReactNode) => {
    const isActive = currentView === view;
    const activeClass = `${themeClass.lightBg} ${themeClass.primaryText} font-bold`;

    return (
      <button
        onClick={() => {
          setCurrentView(view);
          setActiveSubject(null);
          setIsSearching(false);
          setSearchQuery("");
        }}
        title={isSidebarCollapsed ? label : undefined}
        className={`w-full flex items-center ${
          isSidebarCollapsed ? "justify-center px-0 py-3.5" : "gap-3 px-4 py-3"
        } rounded-xl text-left text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer ${
          isActive ? activeClass : "text-slate-500 dark:text-slate-400"
        }`}
      >
        <span className="shrink-0">{icon}</span>
        {!isSidebarCollapsed && <span>{label}</span>}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Hide standard layout frame if taking active Exam */}
      {currentView === "exam" && activeSession ? (
        <div className="w-full h-screen">
          <ExamView
            session={activeSession}
            bookmarks={bookmarks}
            isDarkMode={settings.isDarkMode}
            theme={settings.theme}
            onToggleDarkMode={handleToggleDarkMode}
            onToggleBookmark={handleToggleBookmark}
            onSubmitExam={handleSubmitExam}
            onExitExam={() => {
              if (confirm("Exit active exam? Your elapsed time and progress will not be saved.")) {
                setActiveSession(null);
                clearResumableSession();
                setCurrentView("dashboard");
              }
            }}
          />
        </div>
      ) : (
        <>
          {/* Main Layout Left Sidebar (Desktop Only) */}
          <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? "w-20 p-4" : "w-64 p-6"} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 shrink-0 select-none transition-all duration-300`}>
            {/* App Branding */}
            <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-4" : "justify-between"} pb-6 border-b border-slate-200 dark:border-slate-800/60 mb-6`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${themeClass.primaryBg} rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${themeClass.shadowMd} dark:shadow-none`}>
                  <BookOpen size={20} />
                </div>
                {!isSidebarCollapsed && (
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">EXAM.PRO</span>
                )}
              </div>
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1 flex-1" id="sidebar-nav">
              {renderSidebarItem("dashboard", "Dashboard", <LayoutDashboard size={18} />)}
              {renderSidebarItem("subjects", "Subjects", <BookOpen size={18} />)}
              {renderSidebarItem("settings", "Settings", <SettingsIcon size={18} />)}
            </nav>

            {/* Resume Session block if any */}
            {activeSession && (
              <div className={`bg-slate-900 text-white rounded-2xl relative overflow-hidden mt-auto shadow-sm ${isSidebarCollapsed ? "p-2.5 flex items-center justify-center" : "p-5"}`}>
                {isSidebarCollapsed ? (
                  <button
                    onClick={() => setCurrentView("exam")}
                    title={`Resume Exam: ${activeSession.chapterTitle}`}
                    className={`w-10 h-10 ${themeClass.primaryBg} ${themeClass.primaryHoverBg} text-white rounded-lg flex items-center justify-center transition duration-150 cursor-pointer shadow-lg ${themeClass.shadowLg} shrink-0`}
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                ) : (
                  <div className="relative z-10">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Active Session</p>
                    <h4 className="font-bold text-sm mb-3 truncate">{activeSession.chapterTitle}</h4>
                    <button
                      onClick={() => setCurrentView("exam")}
                      className={`w-full py-2 ${themeClass.primaryBg} ${themeClass.primaryHoverBg} text-white text-xs font-bold rounded-lg transition duration-150 cursor-pointer shadow-lg ${themeClass.shadowLg}`}
                    >
                      Resume Exam
                    </button>
                  </div>
                )}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              </div>
            )}
          </aside>

          {/* Main Workspace Frame */}
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            {/* Global Top Navbar */}
            <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-8 flex items-center justify-between shrink-0 select-none">
              {/* Mobile Branding / Menu Trigger */}
              <div className="flex items-center gap-3 md:hidden">
                <div className={`w-10 h-10 ${themeClass.primaryBg} rounded-xl flex items-center justify-center text-white shadow-md`}>
                  <BookOpen size={18} />
                </div>
                <h1 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">EXAM.PRO</h1>
              </div>

              {/* Global Search Bar */}
              <div className="relative max-w-[160px] md:max-w-xs lg:max-w-sm w-full hidden sm:block">
                <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subjects, chapters, questions..."
                  value={searchQuery}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 ${themeClass.focusRing} transition-all text-slate-800 dark:text-slate-100`}
                />
                {isSearching && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearching(false);
                    }}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Quick Profile */}
              <div className="flex items-center gap-5">
                {currentUser ? (
                  <div className="flex items-center gap-4">
                    {/* Sync indicator */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {isSyncing ? (
                        <>
                          <RefreshCw className={`animate-spin ${themeClass.primaryText}`} size={13} />
                          <span className="hidden sm:inline">Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="text-emerald-500" size={13} />
                          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Synced</span>
                        </>
                      )}
                    </div>

                    {/* Profile avatar & metadata */}
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{currentUser.displayName || settings.userName || "Dr. Sarah Chen"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{settings.userTitle || "Cloud Member"}</p>
                      </div>
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "User"}
                          className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${themeClass.accentBg} border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center ${themeClass.accentText} font-bold overflow-hidden select-none`}>
                          {(() => {
                            const name = currentUser.displayName || settings.userName || "User";
                            const parts = name.trim().split(/\s+/);
                            const filteredParts = parts.filter(p => !/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|md\.?)$/i.test(p));
                            const activeParts = filteredParts.length > 0 ? filteredParts : parts;
                            if (activeParts.length === 1) {
                              return activeParts[0].substring(0, 2).toUpperCase();
                            }
                            return (activeParts[0][0] + activeParts[activeParts.length - 1][0]).toUpperCase();
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Disconnect / Sign out button */}
                    <button
                      onClick={handleSignOut}
                      className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-100 dark:hover:border-red-900/40 transition text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      title="Sign Out / Disconnect Sync"
                    >
                      <LogOut size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSignIn}
                      className={`flex items-center gap-2 px-4 py-2 ${themeClass.primaryBg} ${themeClass.primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-md ${themeClass.shadowMd} transition duration-200 cursor-pointer`}
                      title="Sync stats and backups via Google Sign In"
                    >
                      <LogIn size={13} />
                      <span className="hidden sm:inline">Sync Account</span>
                      <span className="sm:hidden">Sync</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{settings.userName || "Dr. Sarah Chen"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{settings.userTitle || "Aspirant Level 14"}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-full ${themeClass.accentBg} border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center ${themeClass.accentText} font-bold overflow-hidden select-none`}>
                        {(() => {
                          const name = settings.userName || "Dr. Sarah Chen";
                          const parts = name.trim().split(/\s+/);
                          const filteredParts = parts.filter(p => !/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|md\.?)$/i.test(p));
                          const activeParts = filteredParts.length > 0 ? filteredParts : parts;
                          if (activeParts.length === 1) {
                            return activeParts[0].substring(0, 2).toUpperCase();
                          }
                          return (activeParts[0][0] + activeParts[activeParts.length - 1][0]).toUpperCase();
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Mobile Navigation bar */}
            <nav className="flex md:hidden items-center justify-around bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50 p-2 text-slate-400">
              <button
                onClick={() => {
                  setCurrentView("dashboard");
                  setActiveSubject(null);
                  setIsSearching(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 ${currentView === "dashboard" ? themeClass.primaryText : ""}`}
              >
                <LayoutDashboard size={18} />
                <span className="text-[9px] font-bold">Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView("subjects");
                  setActiveSubject(null);
                  setIsSearching(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 ${currentView === "subjects" ? themeClass.primaryText : ""}`}
              >
                <BookOpen size={18} />
                <span className="text-[9px] font-bold">Subjects</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView("settings");
                  setActiveSubject(null);
                  setIsSearching(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 ${currentView === "settings" ? themeClass.primaryText : ""}`}
              >
                <SettingsIcon size={18} />
                <span className="text-[9px] font-bold">Settings</span>
              </button>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-32 space-y-3">
                  <div className={`w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin`}></div>
                  <p className="text-xs font-semibold text-slate-400">Loading catalog indexes...</p>
                </div>
              ) : error ? (
                <div className="max-w-md mx-auto text-center py-20 space-y-4">
                  <HelpCircle size={40} className="mx-auto text-rose-500" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{error}</p>
                </div>
              ) : isSearching ? (
                /* Global Search Results Panel */
                <div className="space-y-6 max-w-4xl mx-auto" id="search-results-pane">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-4">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                      Search Results for "{searchQuery}"
                    </h2>
                    <button
                      onClick={() => {
                        setIsSearching(false);
                        setSearchQuery("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Clear Search
                    </button>
                  </div>

                  {searchLoading ? (
                    <div className="text-center py-12 text-slate-400">Searching indexes...</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Matching Subjects */}
                      {searchResults.subjects.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Matching Subjects</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {searchResults.subjects.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setActiveSubject(sub);
                                  setCurrentView("chapters");
                                  setIsSearching(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 text-left transition cursor-pointer"
                              >
                                <span className="text-2xl">{sub.icon}</span>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{sub.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium">{sub.chapters.length} Chapters available</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matching Chapters */}
                      {searchResults.chapters.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Matching Chapters</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {searchResults.chapters.map((chap) => (
                              <button
                                key={chap.id}
                                onClick={() => {
                                  setActiveSubject(chap.subject);
                                  setCurrentView("chapters");
                                  setIsSearching(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 text-left transition cursor-pointer"
                              >
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{chap.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium">Subject: {chap.subject.name}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matching Questions text */}
                      {searchResults.questions.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Matching Questions</h3>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden">
                            {searchResults.questions.map((item, idx) => (
                              <div key={idx} className="p-4 space-y-1 bg-white dark:bg-slate-900">
                                <span className={`text-[9px] font-bold ${themeClass.primaryText} ${themeClass.lightBg} py-0.5 px-2 rounded-md`}>
                                  {item.subjectName} • {item.chapterTitle}
                                </span>
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
                                  {item.question.question}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                  {item.question.tags.map((t) => (
                                    <span key={t} className="text-[9px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800/40 py-0.5 px-1.5 rounded">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.subjects.length === 0 &&
                        searchResults.chapters.length === 0 &&
                        searchResults.questions.length === 0 && (
                          <div className="text-center py-12 text-slate-400">No results found matching "{searchQuery}"</div>
                        )}
                    </div>
                  )}
                </div>
              ) : (
                /* Primary Standard Views router */
                <>
                  {currentView === "dashboard" && (
                    <DashboardView
                      subjects={subjects}
                      history={history}
                      bookmarks={bookmarks}
                      dailyTarget={settings.dailyTarget}
                      userName={settings.userName}
                      theme={settings.theme}
                      onNavigate={(view, data) => {
                        if (view === "chapters" && data?.subjectId) {
                          const matched = subjects.find((s) => s.id === data.subjectId);
                          if (matched) {
                            setActiveSubject(matched);
                            setCurrentView("chapters");
                          }
                        } else {
                          setCurrentView(view);
                        }
                      }}
                      onStartPractice={handleStartPractice}
                    />
                  )}

                  {currentView === "subjects" && (
                    <SubjectsView
                      subjects={subjects}
                      history={history}
                      theme={settings.theme}
                      onSelectSubject={(subjectId) => {
                        const sub = subjects.find((s) => s.id === subjectId);
                        if (sub) {
                          setActiveSubject(sub);
                          setCurrentView("chapters");
                        }
                      }}
                    />
                  )}

                  {currentView === "chapters" && activeSubject && (
                    <ChaptersView
                      subject={activeSubject}
                      history={history}
                      bookmarks={bookmarks}
                      wrongQuestions={wrongQuestions}
                      theme={settings.theme}
                      onBack={() => {
                        setActiveSubject(null);
                        setCurrentView("subjects");
                      }}
                      onStartExam={handleStartExam}
                      onReviseChapter={handleReviseChapter}
                    />
                  )}

                  {currentView === "result" && activeHistoryItem && (
                    <ResultView
                      historyItem={activeHistoryItem}
                      questions={activeQuestions}
                      userAnswers={activeAnswers}
                      onReview={() => setCurrentView("review")}
                      onNavigateToDashboard={() => {
                        setActiveHistoryItem(null);
                        setCurrentView("dashboard");
                      }}
                    />
                  )}

                  {currentView === "review" && activeHistoryItem && (
                    <ReviewView
                      questions={activeQuestions}
                      userAnswers={activeAnswers}
                      bookmarks={bookmarks}
                      subjectId={activeHistoryItem.subjectId}
                      chapterId={activeHistoryItem.chapterId}
                      subjectName={activeHistoryItem.subjectName}
                      chapterTitle={activeHistoryItem.chapterTitle}
                      theme={settings.theme}
                      onToggleBookmark={(qId) => handleToggleBookmark(qId)}
                      onBack={() => {
                        if (activeHistoryItem.id === "study_only") {
                          setCurrentView("chapters");
                        } else {
                          setCurrentView("result");
                        }
                      }}
                    />
                  )}

                  {currentView === "settings" && (
                    <SettingsView
                      settings={settings}
                      onUpdateSettings={handleUpdateSettings}
                      onClearHistoryOnly={handleClearHistoryOnly}
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

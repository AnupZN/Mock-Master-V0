import { useState, useMemo, useEffect } from "react";
import {
  Bookmark,
  BookOpen,
  ArrowLeft,
  Search,
  Book,
  Play,
  Shuffle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  FileText,
  Layers,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { Subject, Chapter, Question, Bookmark as BookmarkType } from "../types";
import { getThemeStyles } from "../utils/theme";
import QuestionContent from "./QuestionContent";

interface BookmarksViewProps {
  subjects: Subject[];
  bookmarks: BookmarkType[];
  theme?: string;
  fontSize?: number;
  loadChapterData: (subjectId: string, chapterId: string, folder: string, file: string) => Promise<any>;
  onToggleBookmark: (subjectId: string, chapterId: string, questionId: number) => void;
  onStartCustomPractice: (questions: Question[], title: string, type?: string) => void;
  onBack: () => void;
}

type TabType = "all" | "subjects" | "test";

export default function BookmarksView({
  subjects,
  bookmarks,
  theme,
  fontSize = 16,
  loadChapterData,
  onToggleBookmark,
  onStartCustomPractice,
  onBack,
}: BookmarksViewProps) {
  const themeClass = useMemo(() => getThemeStyles(theme), [theme]);
  
  const [activeTab, setActiveTab] = useState<TabType>("subjects");
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  
  // High-performance resolved question details cache
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Array<{
    subject: Subject;
    chapter: Chapter;
    question: Question;
    revealed?: boolean;
  }>>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  
  // Custom Test Configuration states
  const [testSubjectIds, setTestSubjectIds] = useState<string[]>([]);
  const [testQuestionCount, setTestQuestionCount] = useState<number>(10);
  const [testShuffle, setTestShuffle] = useState<boolean>(true);

  // Expanded states for Subject Wise layout
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);

  // Load question details for bookmarks
  useEffect(() => {
    let active = true;
    const fetchBookmarkDetails = async () => {
      setLoading(true);
      const temp: Array<{ subject: Subject; chapter: Chapter; question: Question }> = [];
      
      // Group to load chapter questions in parallel batches efficiently
      const grouped: Record<string, { subject: Subject; chapter: Chapter; questionIds: Set<number> }> = {};
      
      for (const b of bookmarks) {
        const subj = subjects.find((s) => s.id === b.subjectId);
        if (!subj) continue;
        const chap = subj.chapters.find((c) => c.id === b.chapterId);
        if (!chap) continue;
        
        const key = `${b.subjectId}_${b.chapterId}`;
        if (!grouped[key]) {
          grouped[key] = { subject: subj, chapter: chap, questionIds: new Set() };
        }
        grouped[key].questionIds.add(b.questionId);
      }
      
      const keys = Object.keys(grouped);
      
      // Batch fetch
      await Promise.all(
        keys.map(async (key) => {
          const { subject, chapter, questionIds } = grouped[key];
          try {
            const data = await loadChapterData(subject.id, chapter.id, subject.folder, chapter.file);
            if (data && data.questions) {
              data.questions.forEach((q: Question) => {
                if (questionIds.has(q.id)) {
                  temp.push({
                    subject,
                    chapter,
                    question: q,
                  });
                }
              });
            }
          } catch (err) {
            console.error("Error loading bookmarked chapter data", err);
          }
        })
      );
      
      if (active) {
        setBookmarkedQuestions(temp);
        setLoading(false);
      }
    };

    fetchBookmarkDetails();
    return () => {
      active = false;
    };
  }, [bookmarks, subjects]);

  // Set default subjects for the Test creator once bookmarks are loaded
  useEffect(() => {
    if (bookmarkedQuestions.length > 0 && testSubjectIds.length === 0) {
      const uniqueSubjs = Array.from(new Set(bookmarkedQuestions.map((bq) => bq.subject.id)));
      setTestSubjectIds(uniqueSubjs);
    }
  }, [bookmarkedQuestions]);

  // Filter bookmarked questions for the "All Questions" tab
  const filteredQuestions = useMemo(() => {
    return bookmarkedQuestions.filter((item) => {
      const matchesSubject = selectedSubjectFilter === "all" || item.subject.id === selectedSubjectFilter;
      const qText = language === "hi" && item.question.question_hi ? item.question.question_hi : item.question.question;
      const matchesSearch = searchQuery.trim() === "" || 
        qText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.question.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.question.explanation && item.question.explanation.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSubject && matchesSearch;
    });
  }, [bookmarkedQuestions, selectedSubjectFilter, searchQuery, language]);

  // Group bookmarked questions for "Subject Wise" tab
  const subjectWiseGrouping = useMemo(() => {
    const map: Record<string, {
      subject: Subject;
      chapters: Record<string, {
        chapter: Chapter;
        questions: Array<{ question: Question; revealed?: boolean }>;
      }>;
    }> = {};

    bookmarkedQuestions.forEach((item) => {
      if (!map[item.subject.id]) {
        map[item.subject.id] = {
          subject: item.subject,
          chapters: {},
        };
      }
      if (!map[item.subject.id].chapters[item.chapter.id]) {
        map[item.subject.id].chapters[item.chapter.id] = {
          chapter: item.chapter,
          questions: [],
        };
      }
      map[item.subject.id].chapters[item.chapter.id].questions.push({
        question: item.question,
        revealed: item.revealed,
      });
    });

    return Object.values(map);
  }, [bookmarkedQuestions]);

  // Reveal answer in the display list
  const toggleRevealAnswer = (index: number) => {
    setBookmarkedQuestions((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, revealed: !item.revealed } : item))
    );
  };

  // Launch a custom test using Bookmarks
  const handleStartBookmarkTest = () => {
    // Collect questions matching config
    let eligibleQs = bookmarkedQuestions.filter((bq) => testSubjectIds.includes(bq.subject.id));
    
    if (eligibleQs.length === 0) {
      alert("Please select at least one subject with bookmarked questions.");
      return;
    }

    if (testShuffle) {
      eligibleQs = [...eligibleQs].sort(() => 0.5 - Math.random());
    }

    const testQuestions = eligibleQs.slice(0, testQuestionCount).map((item) => item.question);
    const title = `Bookmark practice test (${testQuestions.length} Qs)`;
    onStartCustomPractice(testQuestions, title, "bookmarks");
  };

  // Launch direct test for a specific chapter
  const handleStartChapterBookmarkTest = (subjectName: string, chapterTitle: string, questions: Question[]) => {
    const title = `${chapterTitle} (Bookmarks)`;
    onStartCustomPractice(questions, title, "bookmarks");
  };

  // Launch direct test for a specific subject
  const handleStartSubjectBookmarkTest = (subjectName: string, questions: Question[]) => {
    const title = `${subjectName} (Bookmarks)`;
    onStartCustomPractice(questions, title, "bookmarks");
  };

  // Dynamic unique subjects helper
  const uniqueBookmarkedSubjects = useMemo(() => {
    const seen = new Set<string>();
    return bookmarkedQuestions.reduce((acc, curr) => {
      if (!seen.has(curr.subject.id)) {
        seen.add(curr.subject.id);
        acc.push(curr.subject);
      }
      return acc;
    }, [] as Subject[]);
  }, [bookmarkedQuestions]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 sm:px-4 py-2 animate-fade-in" id="bookmarks-hub-container">
      {/* Back & Heading Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            id="bookmarks-back-button"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${themeClass.lightBg} ${themeClass.primaryText}`}>
                Personal Vault
              </span>
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Study Bookmarks Hub
            </h1>
          </div>
        </div>

        {/* Global toggles: English/Hindi */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-slate-400 font-medium">Language:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                language === "en"
                  ? `${themeClass.primaryBg} text-white`
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                language === "hi"
                  ? `${themeClass.primaryBg} text-white`
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>

      {/* Statistics dashboard panel */}
      {bookmarks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="bookmarks-quick-stats">
          {/* Stat 1 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className={`p-3.5 ${themeClass.lightBg} ${themeClass.primaryText} rounded-2xl`}>
              <Bookmark size={24} fill="currentColor" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bookmarks</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{bookmarks.length} Qs</h3>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Distribution</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {uniqueBookmarkedSubjects.length} Subjects
              </h3>
            </div>
          </div>

          {/* Stat 3 - Quick Launch Practice */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Full-scale Study
              </p>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Attempt All Bookmarks</h4>
                <p className="text-xs text-slate-400">Run custom practice quiz</p>
              </div>
              <button
                onClick={() => {
                  const qList = bookmarkedQuestions.map((bq) => bq.question);
                  onStartCustomPractice(qList, `All Bookmarks Practice (${qList.length} Qs)`, "bookmarks");
                }}
                className={`p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition cursor-pointer shadow-lg shadow-amber-500/20`}
                title="Launch all bookmarked questions test"
              >
                <Play size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex gap-1 -mb-px">
          {/* Tab 1: Subject Wise */}
          <button
            onClick={() => setActiveTab("subjects")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "subjects"
                ? `${themeClass.borderActive} ${themeClass.primaryText}`
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Layers size={16} />
            <span>By Subjects</span>
          </button>

          {/* Tab 2: All Questions */}
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "all"
                ? `${themeClass.borderActive} ${themeClass.primaryText}`
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <FileText size={16} />
            <span>Browse All ({bookmarks.length})</span>
          </button>

          {/* Tab 3: Attempt as Test */}
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "test"
                ? `${themeClass.borderActive} ${themeClass.primaryText}`
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <GraduationCap size={16} />
            <span>Custom Test Builder</span>
          </button>
        </div>
      </div>

      {/* Dynamic Tab Contents */}
      {loading ? (
        <div className="text-center py-20 space-y-4">
          <div className={`w-10 h-10 border-4 border-t-transparent ${themeClass.border} rounded-full animate-spin mx-auto`}></div>
          <p className="text-sm font-semibold text-slate-400">Loading your bookmark vault...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mx-auto">
            <Bookmark size={30} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">No Bookmarked Questions</h3>
            <p className="text-sm text-slate-400">
              When reviewing chapters, custom practices, or test answers, tap the bookmark icon to save high-value questions here for focused practice.
            </p>
          </div>
          <button
            onClick={onBack}
            className={`px-5 py-2.5 ${themeClass.primaryBg} ${themeClass.primaryHoverBg} text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-md`}
          >
            Explore Subjects
          </button>
        </div>
      ) : (
        <div className="space-y-6" id="bookmarks-tab-contents">
          {/* TAB 1: BY SUBJECTS */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Bookmarks organized systematically by subject categories. Click a subject or chapter to expand, view contents, or attempt mini-quizzes.
              </p>

              <div className="space-y-4">
                {subjectWiseGrouping.map((group) => {
                  const isSubjectExpanded = expandedSubjectId === group.subject.id;
                  const chaptersList = Object.values(group.chapters) as Array<{ chapter: Chapter; questions: Array<{ question: Question; revealed?: boolean }> }>;
                  const subjectQs = chaptersList.flatMap((c) => c.questions.map((q) => q.question));

                  return (
                    <div
                      key={group.subject.id}
                      className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm"
                    >
                      {/* Subject Header row */}
                      <div className="p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setExpandedSubjectId(isSubjectExpanded ? null : group.subject.id)}
                          className="flex items-center gap-3 text-left flex-1 font-bold text-slate-800 dark:text-slate-100 hover:opacity-85 cursor-pointer"
                        >
                          <div className={`p-2 rounded-lg ${themeClass.lightBg} ${themeClass.primaryText}`}>
                            <Book size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-extrabold">{group.subject.name}</h3>
                            <p className="text-xs text-slate-400 font-medium">
                              {Object.keys(group.chapters).length} chapters containing {subjectQs.length} bookmarks
                            </p>
                          </div>
                          {isSubjectExpanded ? (
                            <ChevronDown size={18} className="text-slate-400 shrink-0 ml-auto" />
                          ) : (
                            <ChevronRight size={18} className="text-slate-400 shrink-0 ml-auto" />
                          )}
                        </button>

                        {/* Subject Practice Action Button */}
                        <button
                          onClick={() => handleStartSubjectBookmarkTest(group.subject.name, subjectQs)}
                          className={`ml-4 px-3 py-1.5 text-xs font-bold ${themeClass.primaryText} ${themeClass.lightBg} ${themeClass.lightBgHover} rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer`}
                          title={`Practice all bookmarks of ${group.subject.name}`}
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Practice ({subjectQs.length})</span>
                        </button>
                      </div>

                      {/* Subject Expanded Chapters list */}
                      {isSubjectExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {chaptersList.map(({ chapter, questions }) => {
                            const isChapterExpanded = expandedChapterId === chapter.id;
                            const chapQs = questions.map((q) => q.question);

                            return (
                              <div key={chapter.id} className="p-4 bg-white dark:bg-slate-900 space-y-3">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => setExpandedChapterId(isChapterExpanded ? null : chapter.id)}
                                    className="flex items-center gap-2 text-left flex-1 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 cursor-pointer text-xs sm:text-sm"
                                  >
                                    {isChapterExpanded ? (
                                      <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                      <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <span className="underline decoration-slate-200 underline-offset-4">{chapter.title}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                      {questions.length} Qs
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => handleStartChapterBookmarkTest(group.subject.name, chapter.title, chapQs)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                    title="Start quiz for these chapter bookmarks"
                                  >
                                    <Play size={10} fill="currentColor" />
                                    <span>Attempt ({questions.length})</span>
                                  </button>
                                </div>

                                {/* Questions expanded inside Chapter */}
                                {isChapterExpanded && (
                                  <div className="pl-6 space-y-4 pt-2 border-l border-slate-100 dark:border-slate-800">
                                    {questions.map(({ question, revealed }, qIdx) => (
                                      <div
                                        key={question.id}
                                        className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50 space-y-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">
                                              Question ID: #{question.id}
                                            </span>
                                            <QuestionContent
                                              question={question}
                                              language={language}
                                              themeClass={themeClass}
                                              fontSize={fontSize}
                                            />
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {/* Delete Bookmark */}
                                            <button
                                              onClick={() => onToggleBookmark(group.subject.id, chapter.id, question.id)}
                                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                              title="Remove Bookmark"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Options layout */}
                                        <div className="grid grid-cols-1 gap-2">
                                          {(language === "hi" && question.options_hi ? question.options_hi : question.options).map((opt, oIdx) => {
                                            const isCorrect = oIdx === question.correct;
                                            return (
                                              <div
                                                key={oIdx}
                                                className={`p-2.5 text-xs rounded-xl border flex items-start gap-2 ${
                                                  revealed && isCorrect
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-800 dark:text-emerald-300 font-bold"
                                                    : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                                                }`}
                                              >
                                                <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold ${
                                                  revealed && isCorrect
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                }`}>
                                                  {String.fromCharCode(65 + oIdx)}
                                                </span>
                                                <span className="flex-1 leading-relaxed">{opt}</span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Show / Hide Answer Button */}
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                          <button
                                            onClick={() => {
                                              // We find matching index in the global list to toggle
                                              const bIdx = bookmarkedQuestions.findIndex((bq) => bq.question.id === question.id);
                                              if (bIdx !== -1) toggleRevealAnswer(bIdx);
                                            }}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                                          >
                                            {revealed ? (
                                              <>
                                                <EyeOff size={14} />
                                                <span>Hide Solution</span>
                                              </>
                                            ) : (
                                              <>
                                                <Eye size={14} />
                                                <span>Show Solution</span>
                                              </>
                                            )}
                                          </button>
                                        </div>

                                        {/* Explanation text */}
                                        {revealed && (
                                          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-300 space-y-1">
                                            <p className="font-bold text-slate-700 dark:text-slate-200">Explanation:</p>
                                            <p className="leading-relaxed">
                                              {(language === "hi" && question.explanation_hi ? question.explanation_hi : question.explanation) || "No step-by-step explanation recorded for this question."}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BROWSE ALL */}
          {activeTab === "all" && (
            <div className="space-y-4">
              {/* Search & Filter row */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Inputs */}
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search query within your bookmarked questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>

                {/* Subject Filter dropdown */}
                <div className="sm:max-w-[200px] w-full">
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="w-full p-2.5 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Subjects</option>
                    {uniqueBookmarkedSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List of questions */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-semibold text-sm">No bookmarks found matching filters.</p>
                  <p className="text-xs">Try searching for other words or reset the subject filter.</p>
                </div>
              ) : (
                <div className="space-y-4" id="all-bookmarks-list">
                  {filteredQuestions.map((item, gIdx) => {
                    const originalIndexInStore = bookmarkedQuestions.findIndex((bq) => bq.question.id === item.question.id);
                    return (
                      <div
                        key={`${item.subject.id}_${item.chapter.id}_${item.question.id}_all`}
                        className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4"
                      >
                        {/* Top Subject context bar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-extrabold ${themeClass.primaryText} ${themeClass.lightBg} px-2.5 py-1 rounded-full uppercase`}>
                              {item.subject.name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              •
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 max-w-xs truncate">
                              {item.chapter.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Remove bookmark */}
                            <button
                              onClick={() => onToggleBookmark(item.subject.id, item.chapter.id, item.question.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Delete bookmark"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Question ID: #{item.question.id}</span>
                          <QuestionContent
                            question={item.question}
                            language={language}
                            themeClass={themeClass}
                            fontSize={fontSize}
                          />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(language === "hi" && item.question.options_hi ? item.question.options_hi : item.question.options).map((opt, oIdx) => {
                            const isCorrect = oIdx === item.question.correct;
                            return (
                              <div
                                key={oIdx}
                                className={`p-3 text-xs sm:text-sm rounded-2xl border flex items-start gap-2.5 transition duration-150 ${
                                  item.revealed && isCorrect
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-800 dark:text-emerald-300 font-bold"
                                    : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                                }`}
                              >
                                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                                  item.revealed && isCorrect
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1 leading-relaxed pt-0.5">{opt}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Bottom Bar: Reveal Explanation / Answers */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => toggleRevealAnswer(originalIndexInStore)}
                            className="text-xs font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer"
                          >
                            {item.revealed ? (
                              <>
                                <EyeOff size={15} />
                                <span>Hide Solution & Explanation</span>
                              </>
                            ) : (
                              <>
                                <Eye size={15} />
                                <span>Reveal Solution & Explanation</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Explanation panel */}
                        {item.revealed && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-250/30 dark:border-slate-800/50 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 animate-fade-in">
                            <p className="font-extrabold text-slate-800 dark:text-slate-200">Detailed Solution:</p>
                            <p className="leading-relaxed whitespace-pre-line">
                              {(language === "hi" && item.question.explanation_hi ? item.question.explanation_hi : item.question.explanation) || "No detailed step-by-step resolution recorded for this question."}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM TEST BUILDER */}
          {activeTab === "test" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <GraduationCap className={themeClass.primaryText} size={22} />
                    <span>Attempt Bookmarked Questions as Test</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure and compile a custom simulated practice quiz containing your bookmarked items.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Subjects */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      1. Choose Subjects to Include
                    </label>
                    <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {uniqueBookmarkedSubjects.map((sub) => {
                        const countInSub = bookmarkedQuestions.filter((bq) => bq.subject.id === sub.id).length;
                        const isChecked = testSubjectIds.includes(sub.id);

                        return (
                          <label
                            key={sub.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setTestSubjectIds(testSubjectIds.filter((id) => id !== sub.id));
                                  } else {
                                    setTestSubjectIds([...testSubjectIds, sub.id]);
                                  }
                                }}
                                className={`h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300`}
                              />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {sub.name}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                              {countInSub} Bookmarks
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Count & Shuffle */}
                  <div className="space-y-5">
                    {/* Size Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                        2. Question Pool Count
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[5, 10, 20, 50].map((num) => {
                          const totalAvailableSelected = bookmarkedQuestions.filter((bq) => testSubjectIds.includes(bq.subject.id)).length;
                          const disabled = num > totalAvailableSelected && totalAvailableSelected > 0 && num !== 5;
                          return (
                            <button
                              key={num}
                              disabled={disabled}
                              onClick={() => setTestQuestionCount(num)}
                              className={`p-3 text-xs font-bold rounded-2xl border transition text-center cursor-pointer ${
                                testQuestionCount === num
                                  ? `${themeClass.border} ${themeClass.lightBg} ${themeClass.primaryText}`
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                              } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              {num} Qs
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Selected subjects contain a total of{" "}
                        <strong>
                          {bookmarkedQuestions.filter((bq) => testSubjectIds.includes(bq.subject.id)).length}
                        </strong>{" "}
                        bookmarks.
                      </p>
                    </div>

                    {/* Shuffle Order */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Shuffle Questions</h4>
                        <p className="text-[10px] text-slate-400">Disorder questions sequence for maximum cognitive gains</p>
                      </div>
                      <button
                        onClick={() => setTestShuffle(!testShuffle)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                          testShuffle ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                            testShuffle ? "translate-x-5" : "translate-x-0"
                          }`}
                        ></div>
                      </button>
                    </div>

                    {/* Start practice test */}
                    <button
                      onClick={handleStartBookmarkTest}
                      disabled={testSubjectIds.length === 0}
                      className={`w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-extrabold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 dark:shadow-none`}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Launch Custom Bookmark Test</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

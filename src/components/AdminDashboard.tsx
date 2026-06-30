import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Edit3,
  Save,
  Database,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  ListPlus,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle,
  Pencil,
  Eye,
  Info,
  Upload,
  X
} from "lucide-react";
import { Subject, ChapterData, Question, Chapter, SubSubject } from "../types";
import {
  saveAdminManifest,
  saveAdminChapterData,
  fetchAdminChapterData
} from "../supabase";

// Robust parser supporting both JSON and plain-text MCQ blocks
function parseBulkQuestions(input: string, startId: number): { questions: Question[]; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { questions: [], error: "Input is empty." };
  }

  // 1. Try JSON parsing first
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { questions: [], error: "JSON input must be an array of question objects." };
      }

      const questions: Question[] = [];
      let currentId = startId;

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
          return {
            questions: [],
            error: `Question at index ${i} is missing 'question' text or does not have exactly 4 'options'.`,
          };
        }

        // Validate and sanitize correct answer
        let correctIdx = 0;
        if (typeof item.correct === "number") {
          correctIdx = item.correct;
        } else if (typeof item.correct === "string") {
          const char = item.correct.trim().toUpperCase();
          if (char === "A") correctIdx = 0;
          else if (char === "B") correctIdx = 1;
          else if (char === "C") correctIdx = 2;
          else if (char === "D") correctIdx = 3;
          else {
            const num = parseInt(char, 10);
            if (!isNaN(num)) correctIdx = num;
          }
        }

        // Validate difficulty
        let diff: "Easy" | "Medium" | "Hard" = "Medium";
        if (item.difficulty && ["Easy", "Medium", "Hard"].includes(item.difficulty)) {
          diff = item.difficulty as "Easy" | "Medium" | "Hard";
        }

        const tags = Array.isArray(item.tags)
          ? item.tags.map((t: any) => String(t).trim())
          : typeof item.tags === "string"
          ? item.tags.split(",").map((t) => t.trim())
          : [];

        const qObj: Question = {
          id: item.id || currentId++,
          question: String(item.question).trim(),
          options: item.options.map((o: any) => String(o).trim()),
          correct: correctIdx,
          explanation: String(item.explanation || "").trim(),
          difficulty: diff,
          tags: tags.filter(Boolean),
        };

        if (item.question_hi) qObj.question_hi = String(item.question_hi).trim();
        if (Array.isArray(item.options_hi) && item.options_hi.length === 4) {
          qObj.options_hi = item.options_hi.map((o: any) => String(o).trim());
        }
        if (item.explanation_hi) qObj.explanation_hi = String(item.explanation_hi).trim();

        questions.push(qObj);
      }
      return { questions };
    } catch (err: any) {
      return { questions: [], error: `Invalid JSON format: ${err.message}` };
    }
  }

  // 2. Try Plain Text parsing
  const rawBlocks = trimmed.split(/\n\s*\n+/);
  const blocks: string[] = [];
  for (const rawBlock of rawBlocks) {
    const trimmedBlock = rawBlock.trim();
    if (!trimmedBlock) continue;

    // If this block starts with a Hindi question key, and there is a previous block, merge them!
    if (blocks.length > 0 && /^(Q_HI|QUESTION_HI|HINDI_QUESTION|HINDI_Q)\s*[:)]/i.test(trimmedBlock)) {
      blocks[blocks.length - 1] += "\n\n" + trimmedBlock;
    } else {
      blocks.push(trimmedBlock);
    }
  }

  const questions: Question[] = [];
  let currentId = startId;

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b].trim();
    if (!block) continue;

    const lines = block.split("\n");
    let questionText = "";
    let questionTextHi = "";
    const options: string[] = ["", "", "", ""];
    const optionsHi: string[] = ["", "", "", ""];
    let correctStr = "A";
    let explanation = "";
    let explanationHi = "";
    let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
    let tagsStr = "";

    let currentField = "";

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if (!line) continue;

      // Match key-value: Question: ... or Q_Hi: ...
      const matchKey = line.match(/^([A-Za-z0-9_-]+)\s*[:)]\s*(.*)$/i);
      if (matchKey) {
        const key = matchKey[1].toUpperCase();
        const val = matchKey[2].trim();

        if (key === "Q" || key === "QUESTION") {
          questionText = val;
          currentField = "Q";
        } else if (
          key === "Q_HI" ||
          key === "QUESTION_HI" ||
          key === "HINDI_QUESTION" ||
          key === "HINDI_Q"
        ) {
          questionTextHi = val;
          currentField = "Q_HI";
        } else if (key === "A") {
          options[0] = val;
          currentField = "A";
        } else if (key === "B") {
          options[1] = val;
          currentField = "B";
        } else if (key === "C") {
          options[2] = val;
          currentField = "C";
        } else if (key === "D") {
          options[3] = val;
          currentField = "D";
        } else if (key === "A_HI") {
          optionsHi[0] = val;
          currentField = "A_HI";
        } else if (key === "B_HI") {
          optionsHi[1] = val;
          currentField = "B_HI";
        } else if (key === "C_HI") {
          optionsHi[2] = val;
          currentField = "C_HI";
        } else if (key === "D_HI") {
          optionsHi[3] = val;
          currentField = "D_HI";
        } else if (key === "CORRECT" || key === "ANSWER" || key === "ANS") {
          correctStr = val;
          currentField = "CORRECT";
        } else if (key === "EXPLANATION" || key === "EXP") {
          explanation = val;
          currentField = "EXP";
        } else if (
          key === "EXPLANATION_HI" ||
          key === "EXP_HI" ||
          key === "HINDI_EXPLANATION"
        ) {
          explanationHi = val;
          currentField = "EXP_HI";
        } else if (key === "DIFFICULTY" || key === "DIFF") {
          difficulty = val.toLowerCase().includes("easy")
            ? "Easy"
            : val.toLowerCase().includes("hard")
            ? "Hard"
            : "Medium";
          currentField = "DIFF";
        } else if (key === "TAGS" || key === "TAG") {
          tagsStr = val;
          currentField = "TAGS";
        } else {
          appendField(val);
        }
      } else {
        appendField(line);
      }

      function appendField(text: string) {
        if (currentField === "Q") questionText += "\n" + text;
        else if (currentField === "Q_HI") questionTextHi += "\n" + text;
        else if (currentField === "A") options[0] += " " + text;
        else if (currentField === "B") options[1] += " " + text;
        else if (currentField === "C") options[2] += " " + text;
        else if (currentField === "D") options[3] += " " + text;
        else if (currentField === "A_HI") optionsHi[0] += " " + text;
        else if (currentField === "B_HI") optionsHi[1] += " " + text;
        else if (currentField === "C_HI") optionsHi[2] += " " + text;
        else if (currentField === "D_HI") optionsHi[3] += " " + text;
        else if (currentField === "EXP") explanation += "\n" + text;
        else if (currentField === "EXP_HI") explanationHi += "\n" + text;
        else if (currentField === "TAGS") tagsStr += "," + text;
      }
    }

    // Sanitize question text
    questionText = questionText.trim();
    if (!questionText) {
      // Fallback: If lines length is at least 5 and there's no tag, assume plain lines are MCQ
      const linesFiltered = lines.map((l) => l.trim()).filter(Boolean);
      if (linesFiltered.length >= 5) {
        questionText = linesFiltered[0];
        options[0] = linesFiltered[1].replace(/^[A-Da-d][.):]\s*/, "");
        options[1] = linesFiltered[2].replace(/^[A-Da-d][.):]\s*/, "");
        options[2] = linesFiltered[3].replace(/^[A-Da-d][.):]\s*/, "");
        options[3] = linesFiltered[4].replace(/^[A-Da-d][.):]\s*/, "");
        if (linesFiltered[5]) {
          const m = linesFiltered[5].match(/(?:correct|answer|ans)[:\s]+([A-D0-3])/i);
          if (m) correctStr = m[1];
        }
      } else {
        continue; // Skip invalid block
      }
    }

    // Map correct string to index
    let correctIdx = 0;
    const cleanCorrect = correctStr.trim().toUpperCase();
    if (cleanCorrect === "A" || cleanCorrect === "0" || cleanCorrect.includes("OPTION A") || cleanCorrect === "1") {
      correctIdx = 0;
    } else if (cleanCorrect === "B" || cleanCorrect === "1" || cleanCorrect.includes("OPTION B") || cleanCorrect === "2") {
      correctIdx = 1;
    } else if (cleanCorrect === "C" || cleanCorrect === "2" || cleanCorrect.includes("OPTION C") || cleanCorrect === "3") {
      correctIdx = 2;
    } else if (cleanCorrect === "D" || cleanCorrect === "3" || cleanCorrect.includes("OPTION D") || cleanCorrect === "4") {
      correctIdx = 3;
    }

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const qObj: Question = {
      id: currentId++,
      question: questionText,
      options: options.map((o) => o.trim()),
      correct: correctIdx,
      explanation: explanation.trim(),
      difficulty: difficulty,
      tags: tags,
    };

    if (questionTextHi.trim()) {
      qObj.question_hi = questionTextHi.trim();
    }
    if (optionsHi.some((o) => o.trim() !== "")) {
      qObj.options_hi = optionsHi.map((o) => o.trim());
    }
    if (explanationHi.trim()) {
      qObj.explanation_hi = explanationHi.trim();
    }

    questions.push(qObj);
  }

  if (questions.length === 0) {
    return {
      questions: [],
      error: "No valid questions could be parsed. Please verify formatting keys (Q:, A:, B:, C:, D:, Correct:).",
    };
  }

  return { questions };
}

interface AdminDashboardProps {
  initialSubjects: Subject[];
  theme?: string;
  onRefreshManifest: () => void;
  onBack: () => void;
}

export default function AdminDashboard({
  initialSubjects,
  theme,
  onRefreshManifest,
  onBack,
}: AdminDashboardProps) {
  // Local working copy of subjects list (manifest)
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Chapter states
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; title: string; file: string } | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);

  // Status messages
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Subject Edit / Add States
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjId, setSubjId] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjIcon, setSubjIcon] = useState("📚");
  const [subjFolder, setSubjFolder] = useState("");

  // Chapter Edit / Add States
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapId, setChapId] = useState("");
  const [chapTitle, setChapTitle] = useState("");
  const [chapFile, setChapFile] = useState("");
  const [chapTimePerQuestion, setChapTimePerQuestion] = useState(60);
  const [chapSubSubjectId, setChapSubSubjectId] = useState("");

  // Sub-subject Management States
  const [showSubSubjectManager, setShowSubSubjectManager] = useState(false);
  const [newSubSubjectName, setNewSubSubjectName] = useState("");

  // Question Edit / Add States
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qId, setQId] = useState<number>(0);
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qTags, setQTags] = useState("");
  const [qDifficulty, setQDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  
  // Question Hindi fields
  const [qTextHi, setQTextHi] = useState("");
  const [qOptionsHi, setQOptionsHi] = useState<string[]>(["", "", "", ""]);
  const [qExplanationHi, setQExplanationHi] = useState("");
  const [activeQuestionTab, setActiveQuestionTab] = useState<"en" | "hi">("en");

  // Custom Confirmation Modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "subject" | "chapter" | "question";
    id: string | number;
    title: string;
  } | null>(null);

  // Bulk Question Upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkActiveTab, setBulkActiveTab] = useState<"instructions" | "editor">("instructions");

  // Load copy of subjects
  useEffect(() => {
    setSubjectsList(JSON.parse(JSON.stringify(initialSubjects)));
  }, [initialSubjects]);

  // Synchronize selectedSubject and selectedChapter with subjectsList changes safely
  useEffect(() => {
    if (selectedSubject) {
      const updatedSubj = subjectsList.find((s) => s.id === selectedSubject.id);
      if (updatedSubj) {
        if (JSON.stringify(updatedSubj) !== JSON.stringify(selectedSubject)) {
          setSelectedSubject(updatedSubj);
        }
        if (selectedChapter) {
          const updatedChap = updatedSubj.chapters?.find((c) => c.id === selectedChapter.id);
          if (updatedChap && JSON.stringify(updatedChap) !== JSON.stringify(selectedChapter)) {
            setSelectedChapter(updatedChap);
          }
        }
      }
    }
  }, [subjectsList, selectedSubject, selectedChapter]);

  // Handle select subject
  const handleSelectSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    setSelectedChapter(null);
    setChapterData(null);
  };

  // Fetch chapter data when selecting a chapter
  useEffect(() => {
    if (!selectedSubject || !selectedChapter) return;

    const loadChapterQuestions = async () => {
      setLoadingChapter(true);
      try {
        // Fetch from Supabase
        const dbData = await fetchAdminChapterData(selectedSubject.id, selectedChapter.id);
        if (dbData) {
          setChapterData(dbData);
        } else {
          // Try local fallback
          const pathsToTry = [
            `/data/${selectedSubject.folder}/${selectedChapter.file}`,
            `/data/${selectedSubject.folder?.toLowerCase()}/${selectedChapter.file}`,
            `/data/${selectedSubject.folder ? (selectedSubject.folder.charAt(0).toUpperCase() + selectedSubject.folder.slice(1).toLowerCase()) : ""}/${selectedChapter.file}`,
            `/data/${selectedSubject.id}/${selectedChapter.file}`,
            `/data/${selectedSubject.id?.toLowerCase()}/${selectedChapter.file}`,
            `/data/${selectedSubject.id ? (selectedSubject.id.charAt(0).toUpperCase() + selectedSubject.id.slice(1).toLowerCase()) : ""}/${selectedChapter.file}`
          ].filter(Boolean);

          const uniquePaths = Array.from(new Set(pathsToTry));
          let loadedData = null;

          for (const path of uniquePaths) {
            try {
              const res = await fetch(path);
              if (res.ok) {
                loadedData = await res.json();
                break;
              }
            } catch (pathErr) {
              console.warn(`Error reading from local path ${path}:`, pathErr);
            }
          }

          if (loadedData) {
            setChapterData(loadedData);
          } else {
            // Initialize new empty chapter
            setChapterData({
              chapter: selectedChapter.title,
              subject: selectedSubject.name,
              timePerQuestion: 60,
              positiveMarks: 2,
              negativeMarks: 0.66,
              questions: [],
            });
          }
        }
      } catch (err) {
        console.error("Error loading chapter data:", err);
        setChapterData({
          chapter: selectedChapter.title,
          subject: selectedSubject.name,
          timePerQuestion: 60,
          questions: [],
        });
      } finally {
        setLoadingChapter(false);
      }
    };

    loadChapterQuestions();
  }, [selectedSubject, selectedChapter]);

  // Save Subject
  const handleSaveSubject = () => {
    if (!subjId.trim() || !subjName.trim() || !subjFolder.trim()) {
      alert("Please fill all required fields.");
      return;
    }

    if (editingSubject) {
      // Modify existing
      setSubjectsList((prev) =>
        prev.map((s) =>
          s.id === editingSubject.id
            ? { ...s, id: subjId, name: subjName, icon: subjIcon, folder: subjFolder }
            : s
        )
      );
      if (selectedSubject?.id === editingSubject.id) {
        setSelectedSubject({
          ...selectedSubject,
          id: subjId,
          name: subjName,
          icon: subjIcon,
          folder: subjFolder,
        });
      }
    } else {
      // Create new
      const newSubj: Subject = {
        id: subjId,
        name: subjName,
        icon: subjIcon,
        folder: subjFolder,
        chapters: [],
      };
      setSubjectsList((prev) => [...prev, newSubj]);
    }

    setShowSubjectModal(false);
    setEditingSubject(null);
  };

  // Open Edit Subject Modal
  const handleOpenEditSubject = (subj: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(subj);
    setSubjId(subj.id);
    setSubjName(subj.name);
    setSubjIcon(subj.icon);
    setSubjFolder(subj.folder);
    setShowSubjectModal(true);
  };

  // Open New Subject Modal
  const handleOpenNewSubject = () => {
    setEditingSubject(null);
    setSubjId("");
    setSubjName("");
    setSubjIcon("📚");
    setSubjFolder("");
    setShowSubjectModal(true);
  };

  // Delete Subject Trigger
  const handleDeleteSubjectClick = (subjId: string, subjName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      type: "subject",
      id: subjId,
      title: subjName,
    });
  };

  // Add a Sub-subject to current active Subject
  const handleAddSubSubject = () => {
    if (!selectedSubject) return;
    if (!newSubSubjectName.trim()) return;

    const subName = newSubSubjectName.trim();
    // Generate a clean slug-like unique ID
    const subId = subName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "");
    
    const currentSubSubjects = selectedSubject.subSubjects || [];
    if (currentSubSubjects.some((s) => s.id === subId)) {
      alert("A sub-subject with a similar name already exists.");
      return;
    }

    const newSub: SubSubject = { id: subId, name: subName };
    const updatedSubSubjects = [...currentSubSubjects, newSub];

    const updatedSubj = { ...selectedSubject, subSubjects: updatedSubSubjects };
    setSubjectsList((prev) => prev.map((s) => (s.id === selectedSubject.id ? updatedSubj : s)));
    setSelectedSubject(updatedSubj);
    setNewSubSubjectName("");
  };

  // Delete a Sub-subject from current active Subject
  const handleDeleteSubSubject = (subId: string) => {
    if (!selectedSubject) return;
    
    if (!confirm("Are you sure you want to delete this sub-subject? Chapters belonging to this sub-subject will be unassigned but NOT deleted.")) {
      return;
    }

    const currentSubSubjects = selectedSubject.subSubjects || [];
    const updatedSubSubjects = currentSubSubjects.filter((s) => s.id !== subId);

    // Unassign chapters from this sub-subject
    const updatedChapters = (selectedSubject.chapters || []).map((chap) => {
      if (chap.subSubjectId === subId) {
        const { subSubjectId, ...rest } = chap;
        return rest;
      }
      return chap;
    });

    const updatedSubj = { ...selectedSubject, subSubjects: updatedSubSubjects, chapters: updatedChapters };
    setSubjectsList((prev) => prev.map((s) => (s.id === selectedSubject.id ? updatedSubj : s)));
    setSelectedSubject(updatedSubj);
  };

  // Save Chapter
  const handleSaveChapter = () => {
    if (!selectedSubject) return;
    if (!chapId.trim() || !chapTitle.trim() || !chapFile.trim()) {
      alert("Please fill all required fields.");
      return;
    }

    const updatedChapters = selectedSubject.chapters ? [...selectedSubject.chapters] : [];

    if (editingChapter) {
      // Edit existing chapter in Subject
      const updated = updatedChapters.map((c) =>
        c.id === editingChapter.id
          ? { id: chapId, title: chapTitle, file: chapFile, subSubjectId: chapSubSubjectId }
          : c
      );
      const updatedSubj = { ...selectedSubject, chapters: updated };
      setSubjectsList((prev) => prev.map((s) => (s.id === selectedSubject.id ? updatedSubj : s)));
      setSelectedSubject(updatedSubj);

      // Update in-memory chapter data title/time
      if (selectedChapter?.id === editingChapter.id) {
        setSelectedChapter({ id: chapId, title: chapTitle, file: chapFile, subSubjectId: chapSubSubjectId });
        if (chapterData) {
          setChapterData({
            ...chapterData,
            chapter: chapTitle,
            timePerQuestion: chapTimePerQuestion,
          });
        }
      }
    } else {
      // Create new chapter inside active Subject
      const newChap = { id: chapId, title: chapTitle, file: chapFile, subSubjectId: chapSubSubjectId };
      const updated = [...updatedChapters, newChap];
      const updatedSubj = { ...selectedSubject, chapters: updated };
      setSubjectsList((prev) => prev.map((s) => (s.id === selectedSubject.id ? updatedSubj : s)));
      setSelectedSubject(updatedSubj);

      // Immediately select and initialize the new chapter's data
      setSelectedChapter(newChap);
      setChapterData({
        chapter: chapTitle,
        subject: selectedSubject.name,
        timePerQuestion: chapTimePerQuestion,
        positiveMarks: 2,
        negativeMarks: 0.66,
        questions: [],
      });
    }

    setShowChapterModal(false);
    setEditingChapter(null);
  };

  // Open Edit Chapter Modal
  const handleOpenEditChapter = (chap: Chapter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChapter(chap);
    setChapId(chap.id);
    setChapTitle(chap.title);
    setChapFile(chap.file);
    setChapSubSubjectId(chap.subSubjectId || "");
    setChapTimePerQuestion(chapterData?.timePerQuestion || 60);
    setShowChapterModal(true);
  };

  // Open New Chapter Modal
  const handleOpenNewChapter = () => {
    setEditingChapter(null);
    setChapId("chapter" + String((selectedSubject?.chapters?.length || 0) + 1).padStart(2, "0"));
    setChapTitle("");
    setChapFile(`chapter${String((selectedSubject?.chapters?.length || 0) + 1).padStart(2, "0")}.json`);
    setChapSubSubjectId("");
    setChapTimePerQuestion(60);
    setShowChapterModal(true);
  };

  // Delete Chapter Trigger
  const handleDeleteChapterClick = (chapterId: string, chapterTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      type: "chapter",
      id: chapterId,
      title: chapterTitle,
    });
  };

  // Save Question
  const handleSaveQuestion = () => {
    if (!chapterData) return;
    if (!qText.trim()) {
      alert("Question text cannot be empty.");
      return;
    }
    if (qOptions.some((o) => !o.trim())) {
      alert("All 4 English options must be provided.");
      return;
    }

    const newQuestion: Question = {
      id: qId || Date.now(),
      question: qText,
      options: qOptions,
      correct: qCorrect,
      explanation: qExplanation,
      difficulty: qDifficulty,
      tags: qTags.split(",").map((t) => t.trim()).filter((t) => t !== ""),
    };

    // Add Hindi details if provided
    if (qTextHi.trim()) {
      newQuestion.question_hi = qTextHi;
    }
    if (qOptionsHi.some((o) => o.trim() !== "")) {
      newQuestion.options_hi = qOptionsHi;
    }
    if (qExplanationHi.trim()) {
      newQuestion.explanation_hi = qExplanationHi;
    }

    let updatedQuestions = [...chapterData.questions];

    if (editingQuestion) {
      // Modify
      updatedQuestions = updatedQuestions.map((q) => (q.id === editingQuestion.id ? newQuestion : q));
    } else {
      // Add
      // Find maximum ID
      const maxId = chapterData.questions.reduce((max, q) => (q.id > max ? q.id : max), 0);
      newQuestion.id = maxId + 1;
      updatedQuestions.push(newQuestion);
    }

    setChapterData({
      ...chapterData,
      questions: updatedQuestions,
    });

    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  // Save Bulk Questions
  const handleSaveBulkQuestions = () => {
    if (!chapterData) return;
    if (!bulkInput.trim()) {
      setBulkError("Please paste some questions before importing.");
      return;
    }

    // Determine the next ID
    const maxId = chapterData.questions.reduce((max, q) => (q.id > max ? q.id : max), 0);
    const parsed = parseBulkQuestions(bulkInput, maxId + 1);

    if (parsed.error) {
      setBulkError(parsed.error);
      return;
    }

    if (parsed.questions.length === 0) {
      setBulkError("No questions were parsed from the input.");
      return;
    }

    const updatedQuestions = [...chapterData.questions, ...parsed.questions];
    setChapterData({
      ...chapterData,
      questions: updatedQuestions,
    });

    // Reset and close
    setShowBulkModal(false);
    setBulkInput("");
    setBulkError(null);
    
    // Set a success status message
    setStatusMessage({
      type: "success",
      text: `🎉 Draft updated! Successfully parsed and added ${parsed.questions.length} questions. Click "Publish Changes to Supabase" to save permanently.`,
    });
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQId(q.id);
    setQText(q.question);
    setQOptions([...q.options]);
    setQCorrect(q.correct);
    setQExplanation(q.explanation || "");
    setQTags(q.tags.join(", "));
    setQDifficulty(q.difficulty || "Medium");

    setQTextHi(q.question_hi || "");
    setQOptionsHi(q.options_hi && q.options_hi.length === 4 ? [...q.options_hi] : ["", "", "", ""]);
    setQExplanationHi(q.explanation_hi || "");
    setActiveQuestionTab("en");
    setShowQuestionModal(true);
  };

  // Open New Question Modal
  const handleOpenNewQuestion = () => {
    setEditingQuestion(null);
    setQId(0);
    setQText("");
    setQOptions(["", "", "", ""]);
    setQCorrect(0);
    setQExplanation("");
    setQTags("");
    setQDifficulty("Medium");

    setQTextHi("");
    setQOptionsHi(["", "", "", ""]);
    setQExplanationHi("");
    setActiveQuestionTab("en");
    setShowQuestionModal(true);
  };

  // Delete Question Trigger
  const handleDeleteQuestionClick = (questionId: number, questionText: string) => {
    const truncated = questionText.length > 60 ? questionText.slice(0, 60) + "..." : questionText;
    setDeleteConfirm({
      type: "question",
      id: questionId,
      title: truncated,
    });
  };

  // Publish Draft Changes to Supabase
  const handlePublishAll = async () => {
    setIsPublishing(true);
    setStatusMessage(null);
    try {
      // 1. Save the new overall manifest index
      await saveAdminManifest({ subjects: subjectsList });

      // 2. If a chapter has loaded and been modified, save its data
      if (selectedSubject && selectedChapter && chapterData) {
        await saveAdminChapterData(selectedSubject.id, selectedChapter.id, chapterData);
      }

      setStatusMessage({
        type: "success",
        text: "🎉 Congratulations! All custom subjects, chapters, and questions have been published successfully to Supabase! They are now live for everyone.",
      });
      onRefreshManifest();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: `Error saving changes: ${err.message || err}`,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-16">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 py-5 sticky top-0 z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 text-xs font-black bg-rose-500 text-white rounded-lg tracking-widest flex items-center gap-1">
                <Shield size={12} /> ADMIN ZONE
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">Syllabus & Question Manager</h1>
          </div>
        </div>

        {/* Publish / Sync controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePublishAll}
            disabled={isPublishing}
            className="p-3 px-5 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Database className="animate-spin" size={16} /> Publishing...
              </>
            ) : (
              <>
                <Save size={16} /> Publish Changes to Supabase
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Section */}
      <div className="max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subjects list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen size={18} /> Subjects
              </h2>
              <button
                onClick={handleOpenNewSubject}
                className="p-1.5 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={14} /> New Subject
              </button>
            </div>

            {/* Subject Cards */}
            <div className="space-y-2.5">
              {subjectsList.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => handleSelectSubject(subj)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedSubject?.id === subj.id
                      ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{subj.icon || "📚"}</span>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{subj.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {subj.id} • {subj.chapters?.length || 0} chapters</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEditSubject(subj, e)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-md transition"
                      title="Edit Subject"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSubjectClick(subj.id, subj.name, e)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-md transition"
                      title="Delete Subject"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* List of Chapters for Selected Subject */}
          {selectedSubject && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ListPlus size={18} /> Chapters
                </h2>
                <button
                  onClick={handleOpenNewChapter}
                  className="p-1.5 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus size={14} /> New Chapter
                </button>
              </div>

              {/* Sub-subjects Configuration Panel */}
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span> Sub-subjects Management
                  </h4>
                  <button
                    onClick={() => setShowSubSubjectManager(!showSubSubjectManager)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showSubSubjectManager ? "Hide Settings" : `Manage (${selectedSubject.subSubjects?.length || 0})`}
                  </button>
                </div>

                {showSubSubjectManager && (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                    {/* Add new sub-subject form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubSubjectName}
                        onChange={(e) => setNewSubSubjectName(e.target.value)}
                        placeholder="New sub-subject, e.g. Ancient History"
                        className="flex-1 text-xs p-2 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleAddSubSubject}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>

                    {/* Sub-subjects list */}
                    {(!selectedSubject.subSubjects || selectedSubject.subSubjects.length === 0) ? (
                      <p className="text-[11px] text-slate-400 text-center py-1">No sub-subjects added yet. Type a name above to categorize chapters.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {selectedSubject.subSubjects.map((subSubj) => (
                          <span
                            key={subSubj.id}
                            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-300 shadow-xs"
                          >
                            <span>{subSubj.name}</span>
                            <button
                              onClick={() => handleDeleteSubSubject(subSubj.id)}
                              className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full transition cursor-pointer"
                              title="Delete sub-subject"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chapters List */}
              {(!selectedSubject.chapters || selectedSubject.chapters.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No chapters yet. Click "New Chapter" to add one!
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {(() => {
                    const hasSubSubjects = selectedSubject.subSubjects && selectedSubject.subSubjects.length > 0;
                    
                    const renderChapterRow = (chap: Chapter) => (
                      <div
                        key={chap.id}
                        onClick={() => setSelectedChapter(chap)}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          selectedChapter?.id === chap.id
                            ? "bg-slate-100 dark:bg-slate-850 border-slate-300 dark:border-slate-700 font-extrabold"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/45 hover:border-slate-200 dark:hover:border-slate-850"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs text-slate-700 dark:text-slate-300 truncate">{chap.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">File: {chap.file}</span>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEditChapter(chap, e)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-md transition"
                            title="Edit Chapter"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteChapterClick(chap.id, chap.title, e)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-md transition"
                            title="Delete Chapter"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );

                    if (!hasSubSubjects) {
                      // Standard flat list of chapters
                      return (
                        <div className="space-y-2">
                          {selectedSubject.chapters.map((chap) => renderChapterRow(chap))}
                        </div>
                      );
                    }

                    // Group chapters by sub-subject
                    const subSubjectsList = selectedSubject.subSubjects || [];
                    const chaptersBySubSubject: Record<string, Chapter[]> = {};
                    const unassignedChapters: Chapter[] = [];

                    selectedSubject.chapters.forEach((chap) => {
                      if (chap.subSubjectId && subSubjectsList.some((s) => s.id === chap.subSubjectId)) {
                        if (!chaptersBySubSubject[chap.subSubjectId]) {
                          chaptersBySubSubject[chap.subSubjectId] = [];
                        }
                        chaptersBySubSubject[chap.subSubjectId].push(chap);
                      } else {
                        unassignedChapters.push(chap);
                      }
                    });

                    return (
                      <div className="space-y-4">
                        {subSubjectsList.map((sub) => {
                          const chaps = chaptersBySubSubject[sub.id] || [];
                          return (
                            <div key={sub.id} className="space-y-1.5">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1 flex items-center gap-1">
                                <span>📁</span> {sub.name} ({chaps.length})
                              </h5>
                              {chaps.length === 0 ? (
                                <div className="text-center py-3 text-slate-400 dark:text-slate-600 text-[10px] bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                  No chapters in this section
                                </div>
                              ) : (
                                <div className="space-y-2 pl-2.5 border-l border-slate-200 dark:border-slate-800">
                                  {chaps.map((chap) => renderChapterRow(chap))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {unassignedChapters.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1 flex items-center gap-1">
                              <span>📂</span> General / Unassigned ({unassignedChapters.length})
                            </h5>
                            <div className="space-y-2">
                              {unassignedChapters.map((chap) => renderChapterRow(chap))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Questions lists */}
        <div className="lg:col-span-8 space-y-6">
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl flex gap-3 border ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
              }`}
            >
              {statusMessage.type === "success" ? <CheckCircle className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <p className="text-sm font-semibold">{statusMessage.text}</p>
            </div>
          )}

          {!selectedSubject ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-12 text-center shadow-sm">
              <Database size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">Select a Subject to begin</h3>
              <p className="text-sm text-slate-400 mt-2">
                Click on any subject in the left column to configure its chapters, details, and questions.
              </p>
            </div>
          ) : !selectedChapter ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-12 text-center shadow-sm">
              <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">Choose a Chapter</h3>
              <p className="text-sm text-slate-400 mt-2">
                Select one of the chapters inside "{selectedSubject.name}" to load and modify its questions pool.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
              {/* Active Chapter Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 gap-3">
                <div>
                  <span className="text-xs text-indigo-500 font-extrabold font-mono tracking-wider">
                    {selectedSubject.name.toUpperCase()} / {selectedChapter.id.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{selectedChapter.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {chapterData ? `${chapterData.questions.length} questions loaded` : "Loading Chapter..."} •
                    Time per question: {chapterData?.timePerQuestion || 60} seconds
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="p-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700"
                    title="Import multiple questions in bulk"
                  >
                    <Upload size={14} /> Bulk Import
                  </button>
                  <button
                    onClick={handleOpenNewQuestion}
                    className="p-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {loadingChapter ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Database className="animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs">Loading questions list from database...</p>
                </div>
              ) : !chapterData || chapterData.questions.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <HelpCircle size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">Empty Chapter</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    This chapter has no questions yet. Click "Add Question" to start building your questions bank!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chapterData.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-0.5 px-2 rounded-md">
                            Q #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {q.id}</span>
                          {q.question_hi && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 p-0.5 px-1.5 rounded font-black">
                              Hindi Available
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                          {q.question}
                        </h4>
                        
                        {/* Options preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`text-xs p-1.5 px-3 rounded-lg flex items-center gap-2 ${
                                q.correct === oIdx
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-850 text-emerald-800 dark:text-emerald-400 font-bold"
                                  : "bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-slate-500"
                              }`}
                            >
                              <span className="font-bold font-mono">{["A", "B", "C", "D"][oIdx]}</span>
                              <span className="truncate">{opt}</span>
                            </div>
                          ))}
                        </div>

                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.tags.map((tag, tIdx) => (
                              <span key={tIdx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 p-0.5 px-1.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-start">
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-lg transition"
                          title="Edit Question"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestionClick(q.id, q.question)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {editingSubject ? "Edit Subject" : "Create New Subject"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Subject Name</label>
                <input
                  type="text"
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                  placeholder="e.g. Modern History"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Unique ID (lowercase)</label>
                  <input
                    type="text"
                    value={subjId}
                    onChange={(e) => setSubjId(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    disabled={!!editingSubject}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1 disabled:opacity-50"
                    placeholder="e.g. history_modern"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={subjIcon}
                    onChange={(e) => setSubjIcon(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                    placeholder="e.g. 🏛️"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Folder Name (Internal)</label>
                <input
                  type="text"
                  value={subjFolder}
                  onChange={(e) => setSubjFolder(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                  placeholder="e.g. History"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubject}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER MODAL */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {editingChapter ? "Edit Chapter" : "Create New Chapter"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Chapter Title</label>
                <input
                  type="text"
                  value={chapTitle}
                  onChange={(e) => setChapTitle(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                  placeholder="e.g. Revolt of 1857"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Unique ID</label>
                  <input
                    type="text"
                    value={chapId}
                    onChange={(e) => setChapId(e.target.value)}
                    disabled={!!editingChapter}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1 disabled:opacity-50"
                    placeholder="e.g. chapter03"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Time / Q (seconds)</label>
                  <input
                    type="number"
                    value={chapTimePerQuestion}
                    onChange={(e) => setChapTimePerQuestion(Number(e.target.value))}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                    placeholder="60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">JSON File Name (Internal)</label>
                <input
                  type="text"
                  value={chapFile}
                  onChange={(e) => setChapFile(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                  placeholder="e.g. chapter03.json"
                />
              </div>

              {selectedSubject?.subSubjects && selectedSubject.subSubjects.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-400">Sub-subject Grouping (Optional)</label>
                  <select
                    value={chapSubSubjectId}
                    onChange={(e) => setChapSubSubjectId(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 mt-1"
                  >
                    <option value="">-- None (No Grouping) --</option>
                    {selectedSubject.subSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChapterModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChapter}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION EDIT / CREATE MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {editingQuestion ? `Edit Question (ID: ${qId})` : "Add New Question"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Language Switch Tab */}
            <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
              <button
                onClick={() => setActiveQuestionTab("en")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeQuestionTab === "en"
                    ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-800"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                English Version (Primary)
              </button>
              <button
                onClick={() => setActiveQuestionTab("hi")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeQuestionTab === "hi"
                    ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-800"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                Hindi Translation (Optional)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeQuestionTab === "en" ? (
                <>
                  {/* English Version */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Question Text (EN)</label>
                    <textarea
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Type the question in English..."
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Options (EN)</label>
                    {qOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold font-mono">
                          {["A", "B", "C", "D"][idx]}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
                          }}
                          className="flex-1 text-sm p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder={`Option ${["A", "B", "C", "D"][idx]}...`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct answer & Tags */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Correct Option</label>
                      <select
                        value={qCorrect}
                        onChange={(e) => setQCorrect(Number(e.target.value))}
                        className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Difficulty</label>
                      <select
                        value={qDifficulty}
                        onChange={(e) => setQDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                        className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={qTags}
                        onChange={(e) => setQTags(e.target.value)}
                        className="w-full text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        placeholder="e.g. dynamic, core"
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Explanation / Solution (EN)</label>
                    <textarea
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Add an in-depth explanation/solution for English readers..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Hindi Version */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Question Text (HI)</label>
                    <textarea
                      value={qTextHi}
                      onChange={(e) => setQTextHi(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="प्रश्न का हिंदी अनुवाद लिखें..."
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Options (HI)</label>
                    {qOptionsHi.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold font-mono">
                          {["A", "B", "C", "D"][idx]}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQOptionsHi((prev) => prev.map((o, i) => (i === idx ? val : o)));
                          }}
                          className="flex-1 text-sm p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder={`Option ${["A", "B", "C", "D"][idx]} translation...`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Explanation / Solution (HI)</label>
                    <textarea
                      value={qExplanationHi}
                      onChange={(e) => setQExplanationHi(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="हिंदी पाठकों के लिए विस्तृत व्याख्या/समाधान जोड़ें..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-5 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Confirm draft question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Upload size={20} className="text-indigo-500" />
                  Bulk Import Questions
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Import multiple questions into <span className="font-extrabold text-indigo-500">{selectedSubject?.name} / {selectedChapter?.title}</span> using human-friendly text or JSON.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkError(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setBulkActiveTab("instructions")}
                className={`py-3 px-4 text-xs font-black border-b-2 transition ${
                  bulkActiveTab === "instructions"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                1. Formatting Instructions & Examples
              </button>
              <button
                onClick={() => setBulkActiveTab("editor")}
                className={`py-3 px-4 text-xs font-black border-b-2 transition ${
                  bulkActiveTab === "editor"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                2. Paste & Import Editor
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {bulkActiveTab === "instructions" ? (
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 space-y-2">
                    <h4 className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                      <Info size={14} /> Smart Parser Supported Formats
                    </h4>
                    <p className="text-xs leading-relaxed">
                      Our system includes an intelligent parser. You can write/generate multiple questions using **Plain Text / AI Format** (perfect for outputs from ChatGPT, Claude, etc.) or standard structured **JSON arrays**.
                    </p>
                  </div>

                  {/* Format 1: Plain Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                        Format A: Plain Text / MCQ Blocks (Recommended)
                      </h4>
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-0.5 px-2 rounded-md font-bold font-mono">AI Copy-Paste Friendly</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Simply write each question block separated by an empty line. It supports optional bilingual Hindi fields as shown below.
                    </p>
                    
                    <div className="relative">
                      <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed max-h-[220px]">
{`Question: What is the primary language of the web?
A: Python
B: JavaScript
C: C++
D: Java
Correct: B
Explanation: JavaScript is the standard script for browser clients.
Difficulty: Easy
Tags: web, code, basic

Question_HI: वेब की मुख्य प्रोग्रामिंग भाषा कौन सी है?
A_HI: पायथन
B_HI: जावास्क्रिप्ट
C_HI: सी++
D_HI: जावा
Explanation_HI: ब्राउज़र क्लाइंट के लिए जावास्क्रिप्ट मानक भाषा है।`}
                      </pre>
                      <button
                        onClick={() => {
                          setBulkInput(`Question: What is the primary language of the web?
A: Python
B: JavaScript
C: C++
D: Java
Correct: B
Explanation: JavaScript is the standard script for browser clients.
Difficulty: Easy
Tags: web, code, basic

Question: Which database is recommended by default for durable persistence?
A: Redis
B: SQLite
C: Firebase Firestore
D: LocalStorage
Correct: C
Explanation: Firebase Firestore provides secure, scalable cloud-hosted JSON persistence.
Difficulty: Medium
Tags: database, cloud, firebase`);
                          setBulkActiveTab("editor");
                        }}
                        className="absolute top-2 right-2 p-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition"
                      >
                        Use This Template
                      </button>
                    </div>
                  </div>

                  {/* Format 2: JSON */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                      Format B: JSON Array
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      A structured JSON array matching our exact model schema.
                    </p>
                    <div className="relative">
                      <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed max-h-[160px]">
{`[
  {
    "question": "What does CSS stand for?",
    "options": ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
    "correct": 1,
    "explanation": "CSS stands for Cascading Style Sheets.",
    "difficulty": "Easy",
    "tags": ["css", "styling"]
  }
]`}
                      </pre>
                      <button
                        onClick={() => {
                          setBulkInput(`[
  {
    "question": "What does CSS stand for?",
    "options": ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
    "correct": 1,
    "explanation": "CSS stands for Cascading Style Sheets.",
    "difficulty": "Easy",
    "tags": ["css", "styling"]
  },
  {
    "question": "What is the full form of HTML?",
    "options": ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "High Text Machine Language"],
    "correct": 0,
    "explanation": "HTML is Hyper Text Markup Language.",
    "difficulty": "Easy",
    "tags": ["html", "markup"]
  }
]`);
                          setBulkActiveTab("editor");
                        }}
                        className="absolute top-2 right-2 p-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition"
                      >
                        Use This Template
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500">Paste Questions Text / JSON below:</label>
                    <button
                      onClick={() => setBulkInput("")}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Clear Editor
                    </button>
                  </div>
                  
                  {bulkError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="shrink-0 mt-0.5" size={16} />
                      <div>
                        <span className="font-extrabold text-xs block">Parsing Error</span>
                        <p className="text-xs mt-0.5 font-mono">{bulkError}</p>
                      </div>
                    </div>
                  )}

                  <textarea
                    value={bulkInput}
                    onChange={(e) => {
                      setBulkInput(e.target.value);
                      if (bulkError) setBulkError(null);
                    }}
                    rows={12}
                    className="w-full font-mono text-xs p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-700 leading-relaxed"
                    placeholder="Paste your ChatGPT output or JSON array here...
Example format:
Question: What is...
A: Option A
B: Option B
C: Option C
D: Option D
Correct: A
Explanation: Because..."
                  />

                  <p className="text-[10px] text-slate-400">
                    💡 Tip: Ask AI: "Generate 5 multiple choice questions on web design in the format: Question, A, B, C, D, Correct, Explanation, Difficulty, Tags" and copy-paste its direct raw output right here.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
              <button
                onClick={() => {
                  setBulkActiveTab("instructions");
                }}
                className={`p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer ${
                  bulkActiveTab === "instructions" ? "invisible" : ""
                }`}
              >
                View Format Help
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                {bulkActiveTab === "editor" ? (
                  <button
                    onClick={handleSaveBulkQuestions}
                    className="px-5 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 animate-pulse-subtle"
                  >
                    <Plus size={14} /> Parse & Import Questions
                  </button>
                ) : (
                  <button
                    onClick={() => setBulkActiveTab("editor")}
                    className="px-5 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    Go to Paste Editor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                Confirm Deletion
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete the {deleteConfirm.type} <strong className="text-slate-800 dark:text-slate-100">"{deleteConfirm.title}"</strong>?
            </p>
            
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 leading-relaxed">
              ⚠️ Note: This change only updates your working draft. You <strong>MUST</strong> click the <strong>"Publish Changes to Supabase"</strong> button at the top-right of the dashboard to save it permanently.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "subject") {
                    setSubjectsList((prev) => prev.filter((s) => s.id !== deleteConfirm.id));
                    if (selectedSubject?.id === deleteConfirm.id) {
                      setSelectedSubject(null);
                      setSelectedChapter(null);
                      setChapterData(null);
                    }
                  } else if (deleteConfirm.type === "chapter") {
                    if (selectedSubject) {
                      const updated = selectedSubject.chapters.filter((c) => c.id !== deleteConfirm.id);
                      const updatedSubj = { ...selectedSubject, chapters: updated };
                      setSubjectsList((prev) => prev.map((s) => (s.id === selectedSubject.id ? updatedSubj : s)));
                      setSelectedSubject(updatedSubj);
                      if (selectedChapter?.id === deleteConfirm.id) {
                        setSelectedChapter(null);
                        setChapterData(null);
                      }
                    }
                  } else if (deleteConfirm.type === "question") {
                    if (chapterData) {
                      setChapterData({
                        ...chapterData,
                        questions: chapterData.questions.filter((q) => q.id !== deleteConfirm.id),
                      });
                    }
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

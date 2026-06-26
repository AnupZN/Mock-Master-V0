import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { AppSettings, AttemptHistoryItem, Bookmark as BookmarkType } from "./types";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Firestore Helper Functions

export async function fetchUserDoc(userId: string): Promise<Partial<AppSettings> | null> {
  const docRef = doc(db, "users", userId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Partial<AppSettings>;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function saveUserDoc(userId: string, settings: AppSettings): Promise<void> {
  const docRef = doc(db, "users", userId);
  try {
    await setDoc(docRef, {
      uid: userId,
      theme: settings.theme,
      isDarkMode: settings.isDarkMode,
      fontSize: settings.fontSize,
      questionFont: settings.questionFont,
      dailyTarget: settings.dailyTarget,
      userName: settings.userName || "",
      userTitle: settings.userTitle || "",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

export async function fetchUserHistory(userId: string): Promise<AttemptHistoryItem[]> {
  const colRef = collection(db, "users", userId, "history");
  try {
    const snap = await getDocs(colRef);
    const items: AttemptHistoryItem[] = [];
    snap.forEach((doc) => {
      items.push(doc.data() as AttemptHistoryItem);
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/history`);
    return [];
  }
}

export async function saveUserHistoryItem(userId: string, item: AttemptHistoryItem): Promise<void> {
  const docRef = doc(db, "users", userId, "history", item.id);
  try {
    await setDoc(docRef, {
      id: item.id,
      userId,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      chapterId: item.chapterId,
      chapterTitle: item.chapterTitle,
      date: item.date,
      score: item.score,
      totalQuestions: item.totalQuestions,
      correctCount: item.correctCount,
      wrongCount: item.wrongCount,
      skippedCount: item.skippedCount,
      maxScore: item.maxScore,
      accuracy: item.accuracy,
      timeTaken: item.timeTaken,
      isPracticeMode: !!item.isPracticeMode,
      practiceType: item.practiceType || "",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/history/${item.id}`);
  }
}

export async function fetchUserBookmarks(userId: string): Promise<BookmarkType[]> {
  const colRef = collection(db, "users", userId, "bookmarks");
  try {
    const snap = await getDocs(colRef);
    const items: BookmarkType[] = [];
    snap.forEach((doc) => {
      items.push(doc.data() as BookmarkType);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/bookmarks`);
    return [];
  }
}

export async function saveUserBookmark(userId: string, bookmark: BookmarkType): Promise<void> {
  const bookmarkId = `${bookmark.subjectId}_${bookmark.chapterId}_${bookmark.questionId}`;
  const docRef = doc(db, "users", userId, "bookmarks", bookmarkId);
  try {
    await setDoc(docRef, {
      userId,
      subjectId: bookmark.subjectId,
      chapterId: bookmark.chapterId,
      questionId: bookmark.questionId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/bookmarks/${bookmarkId}`);
  }
}

export async function deleteUserBookmark(userId: string, bookmark: BookmarkType): Promise<void> {
  const bookmarkId = `${bookmark.subjectId}_${bookmark.chapterId}_${bookmark.questionId}`;
  const docRef = doc(db, "users", userId, "bookmarks", bookmarkId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/bookmarks/${bookmarkId}`);
  }
}

export async function fetchUserWrongQuestions(userId: string): Promise<BookmarkType[]> {
  const colRef = collection(db, "users", userId, "wrongQuestions");
  try {
    const snap = await getDocs(colRef);
    const items: BookmarkType[] = [];
    snap.forEach((doc) => {
      items.push(doc.data() as BookmarkType);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/wrongQuestions`);
    return [];
  }
}

export async function saveUserWrongQuestion(userId: string, wrong: BookmarkType): Promise<void> {
  const wrongId = `${wrong.subjectId}_${wrong.chapterId}_${wrong.questionId}`;
  const docRef = doc(db, "users", userId, "wrongQuestions", wrongId);
  try {
    await setDoc(docRef, {
      userId,
      subjectId: wrong.subjectId,
      chapterId: wrong.chapterId,
      questionId: wrong.questionId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/wrongQuestions/${wrongId}`);
  }
}

export async function deleteUserWrongQuestion(userId: string, wrong: BookmarkType): Promise<void> {
  const wrongId = `${wrong.subjectId}_${wrong.chapterId}_${wrong.questionId}`;
  const docRef = doc(db, "users", userId, "wrongQuestions", wrongId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/wrongQuestions/${wrongId}`);
  }
}

// Test Connection on load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

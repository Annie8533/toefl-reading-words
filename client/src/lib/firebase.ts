/**
 * TOEFL Word Lab — Firebase 動態題庫資料層。
 * 題目僅在測試驗證通過並取得匿名 Firebase 工作階段後讀取。
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCC-BD9c8hUopQfZFgQfXmnuw1RRUZbSFQ",
  authDomain: "toefl-reading-d9586.firebaseapp.com",
  projectId: "toefl-reading-d9586",
  storageBucket: "toefl-reading-d9586.firebasestorage.app",
  messagingSenderId: "870763085198",
  appId: "1:870763085198:web:7b552c908da42d1b7b78df",
  measurementId: "G-HGKN7Q0FZD",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export type FirestoreQuestion = {
  id: string;
  category: string;
  word: string;
  prefix: string;
  missing: string;
  before: string;
  after: string;
  sentence: string;
  hint: string;
  order: number;
  active: boolean;
};

export async function unlockDemoSession() {
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

export async function loadProtectedQuestions(): Promise<FirestoreQuestion[]> {
  const result = await getDocs(collection(db, "courses", "toefl-reading", "questions"));
  return result.docs
    .map((document) => ({ id: document.id, ...(document.data() as Omit<FirestoreQuestion, "id">) }))
    .filter((question) => question.active)
    .sort((first, second) => first.order - second.order);
}

/** Read-only verification for the protected 521-question Firestore collection. */
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCC-BD9c8hUopQfZFgQfXmnuw1RRUZbSFQ",
  authDomain: "toefl-reading-d9586.firebaseapp.com",
  projectId: "toefl-reading-d9586",
  storageBucket: "toefl-reading-d9586.firebasestorage.app",
  messagingSenderId: "870763085198",
  appId: "1:870763085198:web:7b552c908da42d1b7b78df",
}, "verification-reader");

const auth = getAuth(app);
await signInAnonymously(auth);
const db = getFirestore(app);
const [course, questions, legacyQuestions] = await Promise.all([
  getDoc(doc(db, "courses", "toefl-reading")),
  getDocs(collection(db, "courses", "toefl-reading", "questions")),
  getDocs(collection(db, "courses", "toefl-reading", "legacy_questions")),
]);

const ids = questions.docs.map((item) => item.id).sort();
console.log(JSON.stringify({
  firestoreQuestionCount: questions.size,
  courseQuestionCount: course.data()?.questionCount ?? null,
  firestoreLegacyQuestionCount: legacyQuestions.size,
  courseLegacyQuestionCount: course.data()?.legacyQuestionCount ?? null,
  firstQuestionId: ids[0] ?? null,
  lastQuestionId: ids.at(-1) ?? null,
}, null, 2));

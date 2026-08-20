/**
 * One-time archival: move legacy toefl-* test questions out of the active
 * question collection and into courses/toefl-reading/legacy_questions.
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, writeBatch } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCC-BD9c8hUopQfZFgQfXmnuw1RRUZbSFQ",
  authDomain: "toefl-reading-d9586.firebaseapp.com",
  projectId: "toefl-reading-d9586",
  storageBucket: "toefl-reading-d9586.firebasestorage.app",
  messagingSenderId: "870763085198",
  appId: "1:870763085198:web:7b552c908da42d1b7b78df",
}, "legacy-question-archiver");

const auth = getAuth(app);
const credential = await signInAnonymously(auth);
const uid = credential.user.uid;
const db = getFirestore(app);

console.log(`TEMPORARY_ARCHIVE_UID=${uid}`);
console.log("Temporarily allow this exact UID to write Firestore, then type ARCHIVE and press Enter.");
await new Promise((resolve) => process.stdin.once("data", resolve));

const activeQuestions = collection(db, "courses", "toefl-reading", "questions");
const snapshot = await getDocs(activeQuestions);
const legacy = snapshot.docs.filter((item) => item.id.startsWith("toefl-"));
if (legacy.length !== 20) {
  throw new Error(`Expected 20 legacy questions, found ${legacy.length}. Aborting without changes.`);
}

const batch = writeBatch(db);
for (const item of legacy) {
  batch.set(doc(db, "courses", "toefl-reading", "legacy_questions", item.id), {
    ...item.data(),
    archivedFrom: "courses/toefl-reading/questions",
    archivedAt: new Date().toISOString(),
  });
  batch.delete(item.ref);
}
batch.set(doc(db, "courses", "toefl-reading"), {
  questionCount: 521,
  legacyQuestionCount: legacy.length,
  legacyArchivePath: "courses/toefl-reading/legacy_questions",
  updatedAt: new Date().toISOString(),
}, { merge: true });
await batch.commit();
console.log(`ARCHIVE_COMPLETE=${legacy.length}`);

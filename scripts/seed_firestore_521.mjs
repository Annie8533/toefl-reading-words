/**
 * One-time Firestore importer for the local 521-question bank.
 * Start the script, temporarily allow the printed anonymous UID to write,
 * then type IMPORT and press Enter. The script commits in batches of <=500.
 */
import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { doc, getFirestore, setDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCC-BD9c8hUopQfZFgQfXmnuw1RRUZbSFQ",
  authDomain: "toefl-reading-d9586.firebaseapp.com",
  projectId: "toefl-reading-d9586",
  storageBucket: "toefl-reading-d9586.firebasestorage.app",
  messagingSenderId: "870763085198",
  appId: "1:870763085198:web:7b552c908da42d1b7b78df",
};

const questions = JSON.parse(await readFile(new URL("../data/toefl-reading-521.json", import.meta.url), "utf8"));
if (questions.length !== 521) throw new Error(`Expected 521 questions, received ${questions.length}.`);

const app = initializeApp(firebaseConfig, "seed-importer");
const auth = getAuth(app);
const db = getFirestore(app);
const credential = await signInAnonymously(auth);
const uid = credential.user.uid;

console.log(`TEMPORARY_IMPORT_UID=${uid}`);
console.log("Temporarily allow this exact UID to write Firestore, then type IMPORT and press Enter.");

await new Promise((resolve) => process.stdin.once("data", resolve));

for (let offset = 0; offset < questions.length; offset += 500) {
  const batch = writeBatch(db);
  questions.slice(offset, offset + 500).forEach(({ id, ...question }) => {
    batch.set(doc(db, "courses", "toefl-reading", "questions", id), question, { merge: true });
  });
  await batch.commit();
  console.log(`Committed questions ${offset + 1}-${Math.min(offset + 500, questions.length)}.`);
}

await setDoc(
  doc(db, "courses", "toefl-reading"),
  {
    title: "新托福閱讀填空練習網站",
    questionCount: questions.length,
    updatedAt: new Date().toISOString(),
  },
  { merge: true },
);

console.log(`IMPORT_COMPLETE=${questions.length}`);

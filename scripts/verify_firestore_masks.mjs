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
};

const app = initializeApp(firebaseConfig, "mask-verifier");
await signInAnonymously(getAuth(app));
const snapshot = await getDocs(collection(getFirestore(app), "courses", "toefl-reading", "questions"));
const questions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

if (questions.length !== 521) {
  throw new Error(`Expected 521 live questions, received ${questions.length}.`);
}

const failures = questions.flatMap((item) => {
  const word = String(item.word ?? "");
  const prefix = String(item.prefix ?? "");
  const missing = String(item.missing ?? "");
  const before = String(item.before ?? "");
  const after = String(item.after ?? "");
  const sentence = String(item.sentence ?? "");
  const problems = [];
  if ((prefix + missing).toLowerCase() !== word.toLowerCase()) problems.push("word reconstruction");
  if (!missing) problems.push("empty missing segment");
  if ((before + prefix + missing + after).toLowerCase() !== sentence.toLowerCase()) problems.push("sentence reconstruction");
  if (missing && after.toLowerCase().startsWith(missing.toLowerCase())) problems.push("suffix leaked into after");
  return problems.length ? [{ id: item.id, word, problems }] : [];
});

if (failures.length) {
  console.error(JSON.stringify(failures.slice(0, 20), null, 2));
  throw new Error(`Live mask verification failed for ${failures.length} questions.`);
}

for (const word of ["consumer", "cell"]) {
  const item = questions.find((question) => String(question.word).toLowerCase() === word);
  if (!item) throw new Error(`Missing expected sample word: ${word}`);
  console.log(`${word}: ${item.before}${item.prefix}${"_".repeat(item.missing.length)}${item.after}`);
}

console.log(`LIVE_MASK_AUDIT_PASSED=${questions.length}`);

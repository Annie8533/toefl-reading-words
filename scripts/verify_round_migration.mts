import { loadStudyRecord } from "../client/src/lib/studyStorage";

const storage = new Map<string, string>();
(globalThis as typeof globalThis & { window: Window }).window = {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: () => null,
    get length() { return storage.size; },
  },
} as Window;

storage.set("toefl-word-lab.study-record.v1", JSON.stringify({
  version: 1,
  currentRoundIds: ["toefl-041", "toefl-042"],
  currentRoundCompletedIds: ["toefl-041"],
  activeQuestionId: "toefl-041",
  seenQuestionIds: ["toefl-041"],
  totalAttempts: 1,
  totalCorrect: 0,
  roundNumber: 3,
  questions: {},
  mistakes: {},
}));

const questionIds = Array.from({ length: 521 }, (_, index) => `q${String(index + 1).padStart(3, "0")}`);
const migrated = loadStudyRecord(questionIds);

if (migrated.currentRoundIds.length !== 10) {
  throw new Error(`Expected a rebuilt 10-question round, received ${migrated.currentRoundIds.length}.`);
}
if (migrated.currentRoundCompletedIds.length !== 0) {
  throw new Error("Stale completed IDs were carried into the rebuilt round.");
}
if (migrated.activeQuestionId !== "q001") {
  throw new Error(`Expected q001 as active question, received ${migrated.activeQuestionId}.`);
}

console.log("ROUND_MIGRATION_PASSED=10");

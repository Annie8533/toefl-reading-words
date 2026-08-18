/** TOEFL Word Lab — 驗證 localStorage 學習紀錄資料流程。 */
import {
  completeCurrentRound,
  createInitialRecord,
  createNewRound,
  loadStudyRecord,
  recordAttempt,
  saveStudyRecord,
  setActiveQuestion,
  type QuestionSnapshot,
} from "../client/src/lib/studyStorage";

const values = new Map<string, string>();

globalThis.window = {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() {
      return values.size;
    },
  },
} as unknown as Window & typeof globalThis;

const questionIds = ["toefl-041", "toefl-042"];
const sample: QuestionSnapshot = {
  id: "toefl-041",
  word: "mixture",
  category: "自然科學類",
  sentence: "Soil is a mixture of minerals, organic matter, and water.",
  prefix: "mi",
  missing: "xture",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let record = createInitialRecord(questionIds);
record = setActiveQuestion(record, sample.id);
record = recordAttempt(record, sample, false);

assert(record.totalAttempts === 1, "錯答應增加總答題數");
assert(record.totalCorrect === 0, "錯答不應增加答對數");
assert(record.mistakes[sample.id]?.reviewWeight === 2, "錯答應以權重 2 加入錯題本");
assert(record.currentRoundCompletedIds.includes(sample.id), "錯答應記為已做題目");
assert(saveStudyRecord(record), "學習紀錄應可寫入 localStorage");

let restored = loadStudyRecord(questionIds);
assert(restored.totalAttempts === 1, "重新開啟後應讀回總答題數");
assert(restored.mistakes[sample.id]?.word === "mixture", "重新開啟後應讀回錯題內容");
assert(restored.activeQuestionId === sample.id, "重新開啟後應讀回目前題目");

restored = recordAttempt(restored, sample, true);
assert(restored.totalCorrect === 1, "答對應增加答對數");
assert(restored.mistakes[sample.id]?.reviewWeight === 1, "答對一次應降低錯題權重");
restored = recordAttempt(restored, sample, true);
assert(!restored.mistakes[sample.id], "重複答對後應從錯題本移除已熟練題目");

const dailyIds = Array.from({ length: 10 }, (_, index) => `daily-${index + 1}`);
let dailyRecord = createInitialRecord(dailyIds);
dailyRecord = completeCurrentRound(dailyRecord);
assert(dailyRecord.dailyProgress.completedRounds === 1, "完成檢討後應記錄今日第一組");
assert(dailyRecord.dailyProgress.completedQuestions === 10, "完成檢討後應記錄今日十題");
dailyRecord = createNewRound(dailyRecord, dailyIds);
dailyRecord = completeCurrentRound(dailyRecord);
assert(dailyRecord.dailyProgress.completedRounds === 2, "完成第二組後應達成每日兩組目標");
assert(dailyRecord.dailyProgress.completedQuestions === 20, "完成第二組後應達成每日二十題目標");

console.log("localStorage 學習紀錄驗證通過：錯題、進度、重載、複習降權與每日二十題目標皆符合預期。");

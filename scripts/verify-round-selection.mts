/** TOEFL Word Lab — 驗證新題優先與錯題穿插的十題配題規則。 */
import {
  createInitialRecord,
  createNewRound,
  recordAttempt,
  type QuestionSnapshot,
} from "../client/src/lib/studyStorage";

const questionIds = Array.from({ length: 20 }, (_, index) => `word-${index + 1}`);

function questionFor(id: string): QuestionSnapshot {
  return {
    id,
    word: id,
    category: "驗證題",
    sentence: `${id} sentence.`,
    prefix: "w",
    missing: "ord",
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let record = createInitialRecord(questionIds);
record.seenQuestionIds = questionIds.slice(0, 10);

questionIds.slice(0, 7).forEach((id) => {
  record = recordAttempt(record, questionFor(id), false);
});

const nextRound = createNewRound(record, questionIds);
const mistakeIds = new Set(questionIds.slice(0, 7));
const selectedMistakes = nextRound.currentRoundIds.filter((id) => mistakeIds.has(id));
const selectedNew = nextRound.currentRoundIds.filter((id) => !record.seenQuestionIds.includes(id));

assert(nextRound.currentRoundIds.length === 10, "每輪應維持十題");
assert(selectedMistakes.length <= 4, "錯題在下一輪不可超過四題");
assert(selectedNew.length >= 6, "下一輪應至少保留六題尚未練過的新題");
assert(nextRound.currentRoundIds[0] && !mistakeIds.has(nextRound.currentRoundIds[0]), "第一題應優先使用新題或非錯題");

console.log("配題驗證通過：十題中錯題最多四題，並保留至少六題新題。 ");

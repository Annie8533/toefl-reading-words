/** TOEFL Word Lab — 驗證新題前置、錯題後段輪替與答對降權規則。 */
import {
  createInitialRecord,
  createNewRound,
  recordAttempt,
  type QuestionSnapshot,
} from "../client/src/lib/studyStorage";

const questionIds = Array.from({ length: 40 }, (_, index) => `word-${index + 1}`);

function questionFor(id: string): QuestionSnapshot {
  return { id, word: id, category: "驗證題", sentence: `${id} sentence.`, prefix: "w", missing: "ord" };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let firstRecord = createInitialRecord(questionIds);
firstRecord.seenQuestionIds = questionIds.slice(0, 10);
const firstRoundMistakes = questionIds.slice(0, 8);
firstRoundMistakes.forEach((id) => {
  firstRecord = recordAttempt(firstRecord, questionFor(id), false);
});

const secondRound = createNewRound(firstRecord, questionIds);
assert(secondRound.currentRoundIds.length === 10, "每輪應維持十題");
assert(secondRound.currentRoundIds.slice(0, 6).every((id) => !firstRecord.seenQuestionIds.includes(id)), "前六題應優先使用新題");
assert(secondRound.currentRoundIds.slice(6).every((id) => firstRoundMistakes.includes(id)), "錯題只應安排在後段");

let secondRecord = secondRound;
const repeatedMistakes = secondRound.currentRoundIds.slice(6, 8);
const newMistakes = secondRound.currentRoundIds.slice(0, 3);
const secondRoundMistakes = new Set([...repeatedMistakes, ...newMistakes]);
secondRound.currentRoundIds.forEach((id) => {
  secondRecord = recordAttempt(secondRecord, questionFor(id), secondRoundMistakes.has(id) === false);
});

const thirdRound = createNewRound(secondRecord, questionIds);
assert(thirdRound.currentRoundIds.slice(0, 6).every((id) => !secondRecord.seenQuestionIds.includes(id)), "新題充足時，第三輪前六題仍應為新題");
assert(thirdRound.currentRoundIds.slice(6).every((id) => Boolean(secondRecord.mistakes[id])), "錯題只應留在第三輪後段");
assert(repeatedMistakes.every((id) => thirdRound.currentRoundIds.slice(6).includes(id)), "重複答錯題應提高入選機會，但只能出現在後段");

let correctionRecord = createInitialRecord(questionIds);
correctionRecord = recordAttempt(correctionRecord, questionFor("word-1"), false);
correctionRecord = recordAttempt(correctionRecord, questionFor("word-1"), true);
assert(Boolean(correctionRecord.mistakes["word-1"]), "答對一次後可保留一次較低優先度的複習機會");
correctionRecord = recordAttempt(correctionRecord, questionFor("word-1"), true);
assert(!correctionRecord.mistakes["word-1"], "連續答對兩次後應暫停抽取該錯題");

const lowInventoryIds = questionIds.slice(0, 12);
let lowInventoryRecord = createInitialRecord(lowInventoryIds);
lowInventoryRecord.seenQuestionIds = lowInventoryIds.slice(0, 10);
lowInventoryIds.slice(0, 8).forEach((id) => {
  lowInventoryRecord = recordAttempt(lowInventoryRecord, questionFor(id), false);
});
const lowInventoryRound = createNewRound(lowInventoryRecord, lowInventoryIds);
assert(lowInventoryRound.currentRoundIds.slice(2).every((id) => Boolean(lowInventoryRecord.mistakes[id])), "新題不足時應優先由錯題補足，而非已答對題");

console.log("配題驗證通過：新題前置、錯題後段輪替、重複錯題後段優先、連續答對暫停，及新題不足時錯題補足均正常。");

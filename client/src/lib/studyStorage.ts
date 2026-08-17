/**
 * TOEFL Word Lab — 校對工作桌風格：本機學習紀錄資料層。
 * localStorage 是唯一的資料儲存位置；不會建立帳號或傳送學習內容。
 */

export type AttemptStatus = "correct" | "incorrect";

export type QuestionSnapshot = {
  id: string;
  word: string;
  category: string;
  sentence: string;
  prefix: string;
  missing: string;
};

export type QuestionProgress = {
  attempts: number;
  correct: number;
  lastStatus: AttemptStatus;
  lastAnsweredAt: string;
};

export type MistakeEntry = QuestionSnapshot & {
  wrongCount: number;
  reviewWeight: number;
  lastWrongAt: string;
};

export type StudyRecord = {
  version: 1;
  totalAttempts: number;
  totalCorrect: number;
  seenQuestionIds: string[];
  currentRoundIds: string[];
  currentRoundCompletedIds: string[];
  activeQuestionId: string;
  questions: Record<string, QuestionProgress>;
  mistakes: Record<string, MistakeEntry>;
};

const STORAGE_KEY = "toefl-word-lab.study-record.v1";

export function createInitialRecord(questionIds: string[]): StudyRecord {
  return {
    version: 1,
    totalAttempts: 0,
    totalCorrect: 0,
    seenQuestionIds: [],
    currentRoundIds: questionIds,
    currentRoundCompletedIds: [],
    activeQuestionId: questionIds[0] ?? "",
    questions: {},
    mistakes: {},
  };
}

export function loadStudyRecord(questionIds: string[]): StudyRecord {
  const fallback = createInitialRecord(questionIds);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<StudyRecord>;
    if (parsed.version !== 1) return fallback;

    const available = new Set(questionIds);
    const savedRound = (parsed.currentRoundIds ?? []).filter((id) => available.has(id));
    const activeQuestionId = available.has(parsed.activeQuestionId ?? "")
      ? (parsed.activeQuestionId as string)
      : savedRound[0] ?? questionIds[0] ?? "";

    return {
      ...fallback,
      ...parsed,
      seenQuestionIds: (parsed.seenQuestionIds ?? []).filter((id) => available.has(id)),
      currentRoundIds: savedRound.length ? savedRound : questionIds,
      currentRoundCompletedIds: (parsed.currentRoundCompletedIds ?? []).filter((id) => available.has(id)),
      activeQuestionId,
      questions: parsed.questions ?? {},
      mistakes: parsed.mistakes ?? {},
    };
  } catch {
    return fallback;
  }
}

export function saveStudyRecord(record: StudyRecord): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function createNewRound(record: StudyRecord, questionIds: string[]): StudyRecord {
  const weighted = [...questionIds].sort((a, b) => {
    const weightGap = (record.mistakes[b]?.reviewWeight ?? 0) - (record.mistakes[a]?.reviewWeight ?? 0);
    return weightGap || a.localeCompare(b);
  });

  return {
    ...record,
    currentRoundIds: weighted,
    currentRoundCompletedIds: [],
    activeQuestionId: weighted[0] ?? "",
  };
}

export function setActiveQuestion(record: StudyRecord, questionId: string): StudyRecord {
  return { ...record, activeQuestionId: questionId };
}

export function recordAttempt(
  record: StudyRecord,
  question: QuestionSnapshot,
  isCorrect: boolean,
): StudyRecord {
  const now = new Date().toISOString();
  const previousProgress = record.questions[question.id];
  const previousMistake = record.mistakes[question.id];

  const questions = {
    ...record.questions,
    [question.id]: {
      attempts: (previousProgress?.attempts ?? 0) + 1,
      correct: (previousProgress?.correct ?? 0) + (isCorrect ? 1 : 0),
      lastStatus: (isCorrect ? "correct" : "incorrect") as AttemptStatus,
      lastAnsweredAt: now,
    },
  };

  const mistakes = { ...record.mistakes };

  if (isCorrect && previousMistake) {
    const remainingWeight = previousMistake.reviewWeight - 1;
    if (remainingWeight <= 0) {
      delete mistakes[question.id];
    } else {
      mistakes[question.id] = { ...previousMistake, reviewWeight: remainingWeight };
    }
  }

  if (!isCorrect) {
    mistakes[question.id] = {
      ...question,
      wrongCount: (previousMistake?.wrongCount ?? 0) + 1,
      reviewWeight: Math.min((previousMistake?.reviewWeight ?? 0) + 2, 8),
      lastWrongAt: now,
    };
  }

  return {
    ...record,
    totalAttempts: record.totalAttempts + 1,
    totalCorrect: record.totalCorrect + (isCorrect ? 1 : 0),
    seenQuestionIds: record.seenQuestionIds.includes(question.id)
      ? record.seenQuestionIds
      : [...record.seenQuestionIds, question.id],
    currentRoundCompletedIds: record.currentRoundCompletedIds.includes(question.id)
      ? record.currentRoundCompletedIds
      : [...record.currentRoundCompletedIds, question.id],
    questions,
    mistakes,
  };
}

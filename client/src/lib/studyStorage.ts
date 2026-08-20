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
  consecutiveWrong?: number;
  correctStreak?: number;
  lastScheduledRound?: number;
};

export type DailyProgress = {
  date: string;
  completedRounds: number;
  completedQuestions: number;
};

export type StudyRecord = {
  version: 1;
  totalAttempts: number;
  totalCorrect: number;
  seenQuestionIds: string[];
  currentRoundIds: string[];
  currentRoundCompletedIds: string[];
  activeQuestionId: string;
  currentRoundReviewed: boolean;
  roundNumber: number;
  dailyProgress: DailyProgress;
  questions: Record<string, QuestionProgress>;
  mistakes: Record<string, MistakeEntry>;
};

const STORAGE_KEY = "toefl-word-lab.study-record.v1";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createDailyProgress(): DailyProgress {
  return { date: todayKey(), completedRounds: 0, completedQuestions: 0 };
}

function refreshDailyProgress(progress: DailyProgress | undefined): DailyProgress {
  if (!progress || progress.date !== todayKey()) return createDailyProgress();
  return {
    date: progress.date,
    completedRounds: Math.min(Math.max(progress.completedRounds ?? 0, 0), 2),
    completedQuestions: Math.min(Math.max(progress.completedQuestions ?? 0, 0), 20),
  };
}

export function createInitialRecord(questionIds: string[]): StudyRecord {
  return {
    version: 1,
    totalAttempts: 0,
    totalCorrect: 0,
    seenQuestionIds: [],
    currentRoundIds: questionIds.slice(0, 10),
    currentRoundCompletedIds: [],
    activeQuestionId: questionIds[0] ?? "",
    currentRoundReviewed: false,
    roundNumber: 1,
    dailyProgress: createDailyProgress(),
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
    const hasCompatibleSavedRound = savedRound.length > 0;
    const currentRoundIds = hasCompatibleSavedRound ? savedRound : fallback.currentRoundIds;
    const activeQuestionId = currentRoundIds.includes(parsed.activeQuestionId ?? "")
      ? (parsed.activeQuestionId as string)
      : currentRoundIds[0] ?? "";

    return {
      ...fallback,
      ...parsed,
      seenQuestionIds: (parsed.seenQuestionIds ?? []).filter((id) => available.has(id)),
      currentRoundIds,
      currentRoundCompletedIds: hasCompatibleSavedRound
        ? (parsed.currentRoundCompletedIds ?? []).filter((id) => currentRoundIds.includes(id))
        : [],
      activeQuestionId,
      currentRoundReviewed: Boolean(parsed.currentRoundReviewed),
      roundNumber: Math.max(Number(parsed.roundNumber ?? 1), 1),
      dailyProgress: refreshDailyProgress(parsed.dailyProgress),
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
  const isUnseen = (id: string) => !record.seenQuestionIds.includes(id);
  const mistakeIds = questionIds.filter((id) => Boolean(record.mistakes[id]));
  const unseenIds = questionIds.filter((id) => isUnseen(id));
  const otherIds = questionIds.filter((id) => !record.mistakes[id] && !isUnseen(id));
  const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

  // 題庫足夠時，每輪保留最多 4 題錯題；新題固定在前段，錯題只安排在後段。
  // 新題不足時，會以待複習錯題補足，已答對題僅在兩者都不足時才最後回收。
  const targetCount = Math.min(10, questionIds.length);
  const nextRoundNumber = Math.max(record.roundNumber, 1) + 1;
  const standardMistakeCount = Math.min(4, mistakeIds.length);
  const freshTarget = targetCount - standardMistakeCount;
  const selectedFresh = shuffle(unseenIds).slice(0, freshTarget);
  const extraMistakesNeeded = Math.max(0, targetCount - selectedFresh.length - standardMistakeCount);
  const mistakeTarget = Math.min(mistakeIds.length, standardMistakeCount + extraMistakesNeeded);

  const scoredMistakes = mistakeIds
    .map((id) => {
      const entry = record.mistakes[id];
      const repeatedWrongBonus = (entry.consecutiveWrong ?? 0) * 3;
      const recentAppearancePenalty = entry.lastScheduledRound === record.roundNumber ? 5 : 0;
      const correctStreakPenalty = (entry.correctStreak ?? 0) * 4;
      return {
        id,
        score: entry.wrongCount * 3 + entry.reviewWeight + repeatedWrongBonus - recentAppearancePenalty - correctStreakPenalty + Math.random(),
      };
    })
    .sort((first, second) => second.score - first.score);

  // 分數高者較容易被選入；選入後再由低到高排在後段，讓最需要複習的題不會搶走前段新題。
  const selectedMistakes = scoredMistakes
    .slice(0, mistakeTarget)
    .sort((first, second) => first.score - second.score)
    .map((item) => item.id);
  const selectedIds = [...selectedFresh, ...selectedMistakes];
  const fallbackCorrect = shuffle(otherIds.filter((id) => !selectedIds.includes(id))).slice(0, targetCount - selectedIds.length);
  const mixed = [...selectedIds, ...fallbackCorrect];
  const mistakes = { ...record.mistakes };
  selectedMistakes.forEach((id) => {
    mistakes[id] = { ...mistakes[id], lastScheduledRound: nextRoundNumber };
  });

  return {
    ...record,
    mistakes,
    currentRoundIds: mixed,
    currentRoundCompletedIds: [],
    activeQuestionId: mixed[0] ?? "",
    currentRoundReviewed: false,
    roundNumber: nextRoundNumber,
    dailyProgress: refreshDailyProgress(record.dailyProgress),
  };
}

export function completeCurrentRound(record: StudyRecord): StudyRecord {
  const dailyProgress = refreshDailyProgress(record.dailyProgress);
  if (record.currentRoundReviewed) return { ...record, dailyProgress };

  return {
    ...record,
    currentRoundReviewed: true,
    dailyProgress: {
      ...dailyProgress,
      completedRounds: Math.min(2, dailyProgress.completedRounds + 1),
      completedQuestions: Math.min(20, dailyProgress.completedQuestions + record.currentRoundIds.length),
    },
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
    const correctStreak = (previousMistake.correctStreak ?? 0) + 1;
    if (correctStreak >= 2) {
      delete mistakes[question.id];
    } else {
      mistakes[question.id] = {
        ...previousMistake,
        reviewWeight: Math.max(remainingWeight, 1),
        consecutiveWrong: 0,
        correctStreak,
      };
    }
  }

  if (!isCorrect) {
    mistakes[question.id] = {
      ...question,
      wrongCount: (previousMistake?.wrongCount ?? 0) + 1,
      reviewWeight: Math.min((previousMistake?.reviewWeight ?? 0) + 2, 8),
      lastWrongAt: now,
      consecutiveWrong: (previousMistake?.consecutiveWrong ?? 0) + 1,
      correctStreak: 0,
    };
  }

  return {
    ...record,
    dailyProgress: refreshDailyProgress(record.dailyProgress),
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

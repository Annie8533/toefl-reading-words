/**
 * TOEFL Word Lab — 校對工作桌風格：暖紙、墨藍、朱橘校對記號；手機版採單欄學習軸。
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  createNewRound,
  loadStudyRecord,
  recordAttempt,
  saveStudyRecord,
  setActiveQuestion,
  type QuestionSnapshot,
  type StudyRecord,
} from "@/lib/studyStorage";

type Question = QuestionSnapshot & {
  before: string;
  after: string;
  hint: string;
};

const QUESTIONS: Question[] = [
  {
    id: "toefl-041",
    category: "自然科學類",
    word: "mixture",
    prefix: "mi",
    missing: "xture",
    before: "Soil is a ",
    after: " of minerals, organic matter, and water.",
    sentence: "Soil is a mixture of minerals, organic matter, and water.",
    hint: "由不同成分組合而成的物質。",
  },
  {
    id: "toefl-042",
    category: "歷史與社會類",
    word: "subsequent",
    prefix: "sub",
    missing: "sequent",
    before: "The policy changed in ",
    after: " decades.",
    sentence: "The policy changed in subsequent decades.",
    hint: "接續在後的；隨後的。",
  },
  {
    id: "toefl-043",
    category: "人文與藝術類",
    word: "interpret",
    prefix: "inter",
    missing: "pret",
    before: "Scholars continue to ",
    after: " the symbols in the manuscript.",
    sentence: "Scholars continue to interpret the symbols in the manuscript.",
    hint: "解釋、詮釋資料或意義。",
  },
  {
    id: "toefl-044",
    category: "自然科學類",
    word: "abundant",
    prefix: "ab",
    missing: "undant",
    before: "Water is ",
    after: " during the rainy season.",
    sentence: "Water is abundant during the rainy season.",
    hint: "數量充足的；豐富的。",
  },
  {
    id: "toefl-045",
    category: "社會科學類",
    word: "proportion",
    prefix: "pro",
    missing: "portion",
    before: "A large ",
    after: " of residents commute by train.",
    sentence: "A large proportion of residents commute by train.",
    hint: "整體中所占的部分或比例。",
  },
  {
    id: "toefl-046",
    category: "自然科學類",
    word: "fossil",
    prefix: "fos",
    missing: "sil",
    before: "The researchers discovered a ",
    after: " near the riverbed.",
    sentence: "The researchers discovered a fossil near the riverbed.",
    hint: "古代生物留下的化石。",
  },
  {
    id: "toefl-047",
    category: "人文與藝術類",
    word: "contemporary",
    prefix: "con",
    missing: "temporary",
    before: "The gallery presents ",
    after: " works by local artists.",
    sentence: "The gallery presents contemporary works by local artists.",
    hint: "屬於同一時期的；當代的。",
  },
  {
    id: "toefl-048",
    category: "社會科學類",
    word: "allocate",
    prefix: "allo",
    missing: "cate",
    before: "The committee will ",
    after: " funds to the new project.",
    sentence: "The committee will allocate funds to the new project.",
    hint: "分配資源、時間或資金。",
  },
  {
    id: "toefl-049",
    category: "自然科學類",
    word: "distinct",
    prefix: "dis",
    missing: "tinct",
    before: "The two species have ",
    after: " patterns of migration.",
    sentence: "The two species have distinct patterns of migration.",
    hint: "清楚不同的；可區分的。",
  },
  {
    id: "toefl-050",
    category: "歷史與社會類",
    word: "contribute",
    prefix: "con",
    missing: "tribute",
    before: "Trade routes ",
    after: " to the growth of cities.",
    sentence: "Trade routes contribute to the growth of cities.",
    hint: "促成、貢獻於某件事。",
  },
];

const QUESTION_IDS = QUESTIONS.map((question) => question.id);
const STORAGE_NOTICE = "⚠️ 提醒：為確保能永久保存您的錯題紀錄，請點擊右上角選單，選擇【在 Safari / Chrome 中開啟】。請勿使用 LINE 或 IG 內建瀏覽器，也請勿使用無痕模式。";

type Feedback = { kind: "correct" | "incorrect"; message: string } | null;

function QuestionMarker({
  number,
  active,
  completed,
  onClick,
}: {
  number: number;
  active: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`question-marker ${active ? "is-active" : ""} ${completed ? "is-complete" : ""}`}
      onClick={onClick}
      aria-label={`第 ${number} 題，${completed ? "已作答" : "尚未作答"}`}
    >
      {completed ? <Check size={13} strokeWidth={3} /> : number}
    </button>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={accent ? "metric-accent" : ""}>{value}</strong>
    </div>
  );
}

function ProgressRail({ record, onSelect }: { record: StudyRecord; onSelect: (id: string) => void }) {
  const currentRound = record.currentRoundIds.length ? record.currentRoundIds : QUESTION_IDS;
  return (
    <aside className="progress-rail" aria-label="作答進度">
      <div className="rail-heading">
        <span>稿件索引</span>
        <strong>{currentRound.length} 題</strong>
      </div>
      <div className="marker-grid">
        {currentRound.map((id, index) => (
          <QuestionMarker
            key={id}
            number={index + 1}
            active={record.activeQuestionId === id}
            completed={record.currentRoundCompletedIds.includes(id)}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
      <div className="metric-stack">
        <Metric label="本輪稿件" value={`${record.currentRoundCompletedIds.length}/${currentRound.length}`} />
        <Metric label="總答題數" value={record.totalAttempts} />
        <Metric
          label="累積正確率"
          value={record.totalAttempts ? `${Math.round((record.totalCorrect / record.totalAttempts) * 100)}%` : "—"}
        />
        <Metric label="待複習" value={Object.keys(record.mistakes).length} accent />
      </div>
      <div className="rail-note">
        <Sparkles size={14} />
        <p>紀錄只儲存在此裝置，關閉後仍可延續錯題複習。</p>
      </div>
    </aside>
  );
}

function MistakeBook({ record, onFocus }: { record: StudyRecord; onFocus: (id: string) => void }) {
  const entries = Object.values(record.mistakes).sort((a, b) => b.reviewWeight - a.reviewWeight);

  return (
    <aside className="mistake-book" aria-label="專屬錯題本">
      <div className="mistake-book-image" />
      <div className="mistake-book-content">
        <span className="eyebrow-light">專屬錯題</span>
        <h2>錯題會<br />更常回來。</h2>
        <p>答錯單字會加入錯題本並提高練習權重；連續答對後，權重才會逐步下降。</p>
        <div className="review-status">
          <span className="status-dot" />
          <span>{entries.length ? `錯題本收錄 ${entries.length} 題` : "目前沒有待複習錯題"}</span>
        </div>
        <div className="mistake-list">
          {entries.length ? (
            entries.map((entry) => (
              <button type="button" className="mistake-card" key={entry.id} onClick={() => onFocus(entry.id)}>
                <span className="mistake-word">{entry.word}</span>
                <span className="mistake-meta">錯 {entry.wrongCount} 次 · 權重 {entry.reviewWeight}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))
          ) : (
            <div className="mistake-empty">
              <BookOpenCheck size={20} />
              <span>答錯的單字會自動留在這裡。</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function Home() {
  const [record, setRecord] = useState<StudyRecord>(() => loadStudyRecord(QUESTION_IDS));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);

  const questionById = useMemo(() => new Map(QUESTIONS.map((question) => [question.id, question])), []);
  const activeQuestion = questionById.get(record.activeQuestionId) ?? QUESTIONS[0];
  const activeIndex = (record.currentRoundIds.length ? record.currentRoundIds : QUESTION_IDS).indexOf(activeQuestion.id);
  const answerProgress = record.questions[activeQuestion.id];

  useEffect(() => {
    document.title = "TOEFL Word Lab｜Complete the Words";
  }, []);

  function commit(nextRecord: StudyRecord) {
    setRecord(nextRecord);
    setStorageAvailable(saveStudyRecord(nextRecord));
  }

  function selectQuestion(questionId: string) {
    commit(setActiveQuestion(record, questionId));
    setAnswer("");
    setFeedback(null);
  }

  function handleNewRound() {
    commit(createNewRound(record, QUESTION_IDS));
    setAnswer("");
    setFeedback(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = answer.trim().toLowerCase();
    if (!normalized) {
      setFeedback({ kind: "incorrect", message: "請先補上缺失字母，再送出校對。" });
      return;
    }

    const isCorrect = normalized === activeQuestion.missing.toLowerCase();
    const nextRecord = recordAttempt(record, activeQuestion, isCorrect);
    commit(nextRecord);
    setFeedback(
      isCorrect
        ? { kind: "correct", message: `校對完成。${activeQuestion.word} 已記入你的答對紀錄。` }
        : { kind: "incorrect", message: `正解是 ${activeQuestion.word}。已自動加入你的專屬錯題本。` },
    );
  }

  function nextQuestion() {
    const order = record.currentRoundIds.length ? record.currentRoundIds : QUESTION_IDS;
    const nextId = order[(Math.max(activeIndex, 0) + 1) % order.length];
    selectQuestion(nextId);
  }

  return (
    <div className="app-shell" id="top">
      <div className="storage-alert" role="note">
        <CircleAlert size={17} aria-hidden="true" />
        <p>{STORAGE_NOTICE}</p>
      </div>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="TOEFL Word Lab 首頁">
          <img src="/manus-storage/toefl-word-lab-mark_c2dc9ad2.png" alt="" />
          <span><b>TOEFL</b> WORD LAB</span>
        </a>
        <div className="topbar-actions">
          <span className="desktop-mode"><i /> 錯題優先模式</span>
          <button type="button" className="new-round-button" onClick={handleNewRound}>
            <RotateCcw size={15} />
            <span>新的練習</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> 2026 TOEFL 閱讀字彙訓練</p>
            <h1 id="hero-title">讀句子，依字首<br /><em>補回完整單字。</em></h1>
            <p className="hero-description">這一輪有 10 個學術例句。以鍵盤補上缺失字母，送出後立即校對；錯題會自動保留在你的專屬錯題本。</p>
            <div className="process-steps" aria-label="練習步驟">
              <span><b>01</b> 找脈絡</span><span><b>—</b></span><span>補字母</span><span><b>—</b></span><span>立即校對</span>
            </div>
          </div>
        </section>

        <section className="mobile-summary" aria-label="學習摘要">
          <div><span>本輪</span><strong>{record.currentRoundCompletedIds.length}/10</strong></div>
          <div><span>正確率</span><strong>{record.totalAttempts ? `${Math.round((record.totalCorrect / record.totalAttempts) * 100)}%` : "—"}</strong></div>
          <div><span>錯題本</span><strong className="metric-accent">{Object.keys(record.mistakes).length}</strong></div>
        </section>

        {!storageAvailable && (
          <div className="storage-fallback" role="alert">
            <CircleAlert size={18} />
            <span>目前瀏覽器限制本機儲存，這次作答可能無法在下次開啟時保留。請改用 Safari 或 Chrome 一般模式。</span>
          </div>
        )}

        <section className="workspace" aria-label="單字練習工作區">
          <ProgressRail record={record} onSelect={selectQuestion} />

          <article className="worksheet">
            <div className="worksheet-head">
              <div>
                <p className="worksheet-kicker"><b>{String(Math.max(activeIndex + 1, 1)).padStart(2, "0")}</b><span /> {activeQuestion.category}</p>
                <p className="worksheet-label">WORKSHEET <strong>{String(Math.max(activeIndex + 1, 1)).padStart(2, "0")} / 10</strong> · COMPLETE THE WORDS</p>
              </div>
              <span className={`answer-state ${answerProgress?.lastStatus === "correct" ? "correct" : ""}`}>
                {answerProgress?.lastStatus === "correct" ? "已校對" : "待校對"}
              </span>
            </div>

            <div className="worksheet-rule" />
            <div className="instruction"><Target size={15} /> <span>閱讀句中，請補上缺失的字母。</span></div>
            <p className="sentence" lang="en">
              {activeQuestion.before}<span className="blank-word">{activeQuestion.prefix}<i>{"_".repeat(activeQuestion.missing.length)}</i></span>{activeQuestion.after}
            </p>

            <form onSubmit={handleSubmit} className="answer-form">
              <label htmlFor={`answer-${activeQuestion.id}`}>輸入缺失字母</label>
              <div className="answer-row">
                <div className="prefix-input">
                  <span>{activeQuestion.prefix}</span>
                  <input
                    id={`answer-${activeQuestion.id}`}
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value.replace(/[^a-zA-Z]/g, ""))}
                    placeholder={"_".repeat(activeQuestion.missing.length)}
                    aria-describedby="answer-help"
                  />
                </div>
                <span id="answer-help" className="enter-hint">按 Enter 送出</span>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  提交並批改 <ArrowRight size={18} />
                </button>
                {feedback && (
                  <div className={`feedback ${feedback.kind}`} role="status">
                    {feedback.kind === "correct" ? <Check size={17} /> : <X size={17} />}
                    <span>{feedback.message}</span>
                  </div>
                )}
              </div>
            </form>

            <div className="worksheet-footer">
              <span>提示：{activeQuestion.hint}</span>
              <span>題庫 521 詞</span>
            </div>

            <button type="button" className="next-question" onClick={nextQuestion}>
              下一題 <ChevronRight size={17} />
            </button>
          </article>

          <MistakeBook record={record} onFocus={selectQuestion} />
        </section>

        <section className="strategy-section" aria-labelledby="strategy-title">
          <div className="strategy-image" />
          <div className="strategy-copy">
            <span className="eyebrow"><span /> 本輪策略</span>
            <h2 id="strategy-title">錯題會成為<br /><em>下一輪的起點。</em></h2>
            <p>每次答錯都會在同一個瀏覽器中留下練習權重。當你重新開始，尚未熟練的單字會優先排在前面。</p>
            <div className="strategy-note"><ClipboardList size={18} /> <span>目前已記錄 {record.seenQuestionIds.length} 個不同題目</span></div>
          </div>
        </section>
      </main>

      <footer>TOEFL WORD LAB <span>·</span> 你的作答紀錄只保存在目前使用的瀏覽器中</footer>
    </div>
  );
}

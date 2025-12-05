// app/teacher/game/[roomId]/player/page.tsx
"use client";

import { useEffect, useState, CSSProperties, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/firebase/firebaseConfig";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ========= TYPES ========= */
type QSet = {
  number: number;
  question: string;
  answers: string[];
  correct: string; // correct answer TEXT
  imageUrl?: string;
};

type Mode = "waiting" | "activity" | "waitingExam" | "exam" | "done" | "results";

/* ========= HELPERS ========= */

/** Simple string -> deterministic numeric seed */
function stringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded shuffle so same (roomId+uid) => same order, different uid => different order */
function seededShuffle<T>(list: T[], seedKey: string): T[] {
  const copy = [...list];
  const rand = mulberry32(stringToSeed(seedKey));

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Prepare questions for a specific player:
 *  - shuffle question order (seeded per player + round type)
 *  - shuffle answers inside each question (seeded per question)
 */
function prepareQuestions(list: QSet[], seedBase: string): QSet[] {
  const shuffledQuestions = seededShuffle(list, seedBase + ":questions");
  return shuffledQuestions.map((q, idx) => ({
    ...q,
    answers: q.answers
      ? seededShuffle(q.answers, `${seedBase}:q:${q.number ?? idx}`)
      : [],
  }));
}

// 🌀 Force Cloudinary images to WebP (with compression)
function toWebpUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace("/upload/", "/upload/f_webp,q_auto,w_800/");
}

/* ========= REVIEW HELPERS ========= */

function resolveStudentAnswer(raw: any, question: any): string {
  if (raw === undefined || raw === null) return "-";

  // we save text answers, but keep this flexible
  if (typeof raw === "string") return raw || "-";

  if (typeof raw === "number" && Array.isArray(question?.answers)) {
    const idx = raw;
    if (idx >= 0 && idx < question.answers.length) {
      return question.answers[idx] ?? "-";
    }
  }

  return String(raw);
}

function getCorrectAnswer(question: any): string {
  if (!question) return "-";
  if (typeof question.correct === "string" && question.correct.trim() !== "") {
    return question.correct;
  }
  if (
    typeof question.correctIndex === "number" &&
    Array.isArray(question.answers)
  ) {
    const idx = question.correctIndex;
    if (idx >= 0 && idx < question.answers.length) {
      return question.answers[idx] ?? "-";
    }
  }
  return "-";
}

/* ========= MAIN ========= */
export default function PlayerScreen() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const uid = (searchParams.get("uid") as string) || "";

  /* ========= STATE ========= */
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [activityQ, setActivityQ] = useState<QSet[]>([]);
  const [examQ, setExamQ] = useState<QSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [roundScore, setRoundScore] = useState(0); // per-round score
  const [mode, setMode] = useState<Mode>("waiting");

  // store chosen answers locally so we can save + review later
  const [activityAnswers, setActivityAnswers] = useState<string[]>([]);
  const [examAnswers, setExamAnswers] = useState<string[]>([]);

  /* ========= REVIEW STATE ========= */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewActivityQuestions, setReviewActivityQuestions] = useState<QSet[]>(
    []
  );
  const [reviewExamQuestions, setReviewExamQuestions] = useState<QSet[]>([]);
  const [myResult, setMyResult] = useState<any | null>(null);

  /* ========= AUDIO ========= */
  const activityMusicRef = useRef<HTMLAudioElement | null>(null);
  const examMusicRef = useRef<HTMLAudioElement | null>(null);
  const clickFxRef = useRef<HTMLAudioElement | null>(null);

  const [musicEnabled, setMusicEnabled] = useState(true);
  const [fxEnabled, setFxEnabled] = useState(true);

  // Init audio objects on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const activity = new Audio("/sounds/activity_bg.mp3");
    activity.loop = true;
    activity.volume = 0.4;
    activityMusicRef.current = activity;

    const exam = new Audio("/sounds/exam_bg.mp3");
    exam.loop = true;
    exam.volume = 0.4;
    examMusicRef.current = exam;

    const click = new Audio("/sounds/click.wav");
    clickFxRef.current = click;

    return () => {
      activity.pause();
      exam.pause();
    };
  }, []);

  function stopMusic() {
    activityMusicRef.current?.pause();
    examMusicRef.current?.pause();
  }

  // Control which bgm plays based on mode + setting
  useEffect(() => {
    const activity = activityMusicRef.current;
    const exam = examMusicRef.current;

    stopMusic();
    if (!musicEnabled) return;

    if (mode === "activity" && activity) {
      activity.play().catch(() => {});
    } else if (mode === "exam" && exam) {
      exam.play().catch(() => {});
    }
  }, [mode, musicEnabled]);

  // Click SFX
  function playClick() {
    if (!fxEnabled) return;
    const audio = clickFxRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  /* ========= FIRESTORE REAL-TIME ========= */
  useEffect(() => {
    if (!uid) return;

    const roomRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomInfo(data);

      if (data.mode === "activity") {
        setIndex(0);
        setRoundScore(0);
        setMode("activity");
      }
      if (data.mode === "exam") {
        setIndex(0);
        setRoundScore(0);
        setMode("exam");
      }
      if (data.resultsPublished) {
        setLeaderboard(data.leaderboard || []);
        setMode("results");
      }

      // 🔍 Host opened Review Answers
      if (data.reviewOpen) {
        setReviewOpen(true);
        setReviewLoading(true);

        (async () => {
          try {
            const [activitySnap, examSnap, mySnap] = await Promise.all([
              getDocs(collection(db, "rooms", roomId, "activity")),
              getDocs(collection(db, "rooms", roomId, "exam")),
              getDoc(doc(db, "rooms", roomId, "attendance", uid)),
            ]);

            const acts: any[] = [];
            activitySnap.forEach((d) => acts.push(d.data() as QSet));
            acts.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

            const exs: any[] = [];
            examSnap.forEach((d) => exs.push(d.data() as QSet));
            exs.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

            setReviewActivityQuestions(acts);
            setReviewExamQuestions(exs);

            if (mySnap.exists()) setMyResult(mySnap.data());
            else setMyResult(null);
          } catch (err) {
            console.error("Player review load error:", err);
          } finally {
            setReviewLoading(false);
          }
        })();
      } else {
        setReviewOpen(false);
      }
    });

    return () => unsub();
  }, [roomId, uid]);

  /* ========= LOAD QUESTIONS (for gameplay) ========= */
  useEffect(() => {
    if (!uid) return; // wait until uid is available

    async function load() {
      const A = await getDocs(collection(db, "rooms", roomId, "activity"));
      const E = await getDocs(collection(db, "rooms", roomId, "exam"));
      const act: QSet[] = [];
      const ex: QSet[] = [];
      A.forEach((d) => act.push(d.data() as QSet));
      E.forEach((d) => ex.push(d.data() as QSet));

      // 🔀 shuffle questions + answers per player (seeded by room + uid)
      setActivityQ(prepareQuestions(act, `activity-${roomId}-${uid}`));
      setExamQ(prepareQuestions(ex, `exam-${roomId}-${uid}`));
    }
    load();
  }, [roomId, uid]);

  /* ========= ANSWER ========= */
  async function select(ans: string) {
    if (!uid) return;

    playClick();

    const list = mode === "activity" ? activityQ : examQ;
    const current = list[index];
    if (!current) return;

    const ok = ans === current.correct; // still valid even after shuffling answers

    const isActivity = mode === "activity";
    const isExam = mode === "exam";

    // prepare updated answers array
    let newActivityAnswers = activityAnswers;
    let newExamAnswers = examAnswers;

    if (isActivity) {
      newActivityAnswers = [...activityAnswers];
      newActivityAnswers[index] = ans;
    } else if (isExam) {
      newExamAnswers = [...examAnswers];
      newExamAnswers[index] = ans;
    }

    const newScore = roundScore + (ok ? 1 : 0);
    const isLast = index + 1 === list.length;

    if (isActivity) {
      if (isLast) {
        setActivityAnswers(newActivityAnswers);
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          activityScore: newScore,
          activityAnswers: newActivityAnswers,
        });
        setMode("waitingExam");
        setIndex(0);
        setRoundScore(0);
      } else {
        setActivityAnswers(newActivityAnswers);
        setRoundScore(newScore);
        setIndex((p) => p + 1);
      }
    } else if (isExam) {
      if (isLast) {
        setExamAnswers(newExamAnswers);
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          examScore: newScore,
          examAnswers: newExamAnswers,
        });
        setMode("done");
      } else {
        setExamAnswers(newExamAnswers);
        setRoundScore(newScore);
        setIndex((p) => p + 1);
      }
    }
  }

  /* ========= SETTINGS MODAL ========= */
  const [showSettings, setShowSettings] = useState(false);

  const SettingsModal = () =>
    !showSettings ? null : (
      <div style={overlay} onClick={() => setShowSettings(false)}>
        <div style={settingsBox} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>⚙ Sound Settings</h3>

          <div style={row} onClick={() => setMusicEnabled((prev) => !prev)}>
            <span>🎵 Music</span>
            <Toggle enabled={musicEnabled} />
          </div>
          <div style={row} onClick={() => setFxEnabled((prev) => !prev)}>
            <span>🔊 Click Sound</span>
            <Toggle enabled={fxEnabled} />
          </div>

          <button
            style={{ ...chipButton, marginTop: 16 }}
            onClick={() => setShowSettings(false)}
          >
            Close
          </button>
        </div>
      </div>
    );

  const PageWrap = (content: any) => (
    <main style={page}>
      <button style={settingsBtn} onClick={() => setShowSettings(true)}>
        ⚙
      </button>
      <SettingsModal />
      {content}
      {/* Personal review overlay, controlled by teacher */}
      {reviewOpen && (
        <ReviewOverlay
          loading={reviewLoading}
          activity={reviewActivityQuestions}
          exam={reviewExamQuestions}
          result={myResult}
          onClose={() => setReviewOpen(false)} // <<< back to leaderboard
        />
      )}
    </main>
  );

  const sortedPlayers = [...leaderboard].sort(
    (a, b) =>
      (b.activityScore ?? 0) +
      (b.examScore ?? 0) -
      ((a.activityScore ?? 0) + (a.examScore ?? 0))
  );

  /* ========= UI SCREENS ========= */

  // WAITING FOR ACTIVITY
  if (mode === "waiting")
    return PageWrap(
      <CenteredShell>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={title}
        >
          ⏳ Waiting for Activity
        </motion.h1>
        <p style={subtitle}>
          Your teacher will start the Activity round soon. Stay ready!
        </p>

        <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg} />
        {viewImg && <FullImage img={viewImg} close={() => setViewImg(null)} />}
      </CenteredShell>
    );

  // WAITING FOR EXAM
  if (mode === "waitingExam")
    return PageWrap(
      <CenteredShell>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={title}
        >
          💠 Activity done – waiting for Exam
        </motion.h1>
        <p style={subtitle}>
          Nice work! Wait for your teacher to begin the Exam round.
        </p>

        <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg} />
        {viewImg && <FullImage img={viewImg} close={() => setViewImg(null)} />}
      </CenteredShell>
    );

  // ACTIVITY & EXAM GAMEPLAY (same layout)
  if (mode === "activity" || mode === "exam") {
    const list = mode === "activity" ? activityQ : examQ;
    const q = list[index];
    if (!q) return PageWrap(<CenteredShell>Loading question…</CenteredShell>);

    const total = list.length;
    const headerColor = mode === "activity" ? "#22c55e" : "#38bdf8";
    const headerLabel = mode === "activity" ? "Activity Round" : "Exam Round";

    // 👉 ensure question image uses WebP URL
    const qImgSrc = q.imageUrl ? toWebpUrl(q.imageUrl) : "";

    return PageWrap(
      <div style={mainShell}>
        {/* TOP BAR */}
        <header style={topBar}>
          <div>
            <p style={topLabel}>Mode</p>
            <div
              style={{
                ...pill,
                borderColor: headerColor,
                color: headerColor,
              }}
            >
              {headerLabel}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <p style={topLabel}>Question</p>
            <div style={{ ...pill, borderColor: "#a855f7", color: "#e5e7eb" }}>
              {index + 1} / {total}
            </div>
          </div>
        </header>

        {/* QUESTION CARD */}
        <AnimatePresence mode="wait">
          <motion.div
            key={q.number}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25 }}
            style={questionCard}
          >
            {/* Question image (optional) */}
            {q.imageUrl && qImgSrc && (
              <div style={{ marginBottom: 14 }}>
                <img
                  src={qImgSrc}
                  style={questionImg}
                  onClick={() => setViewImg(qImgSrc)}
                />
              </div>
            )}

            {/* Question text */}
            <div style={questionText}>{q.question}</div>
          </motion.div>
        </AnimatePresence>

        {viewImg && <FullImage img={viewImg} close={() => setViewImg(null)} />}

        {/* ANSWER CHOICES (shuffled per player) */}
        <div style={answersWrap}>
          {q.answers.map((a, i) => {
            const color =
              i === 0
                ? "#00ffa3"
                : i === 1
                ? "#9ca3af"
                : i === 2
                ? "#ff6ad5"
                : "#ff9f40";

            return (
              <AnswerBox
                key={i}
                label={a}
                color={color}
                onClick={() => select(a)}
              />
            );
          })}
        </div>

        {mode === "activity" && (
          <p style={{ ...subtitle, marginTop: 14, fontSize: 12 }}>
            Your Activity result will be saved when this round ends.
          </p>
        )}
        {mode === "exam" && (
          <p style={{ ...subtitle, marginTop: 14, fontSize: 12 }}>
            Your Exam result will be saved at the end of this round.
          </p>
        )}
      </div>
    );
  }

  // DONE – waiting for teacher to publish results
  if (mode === "done")
    return PageWrap(
      <CenteredShell>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={title}
        >
          ✔ Finished!
        </motion.h1>
        <p style={subtitle}>
          Your answers have been submitted. Wait while your teacher prepares the
          results.
        </p>
      </CenteredShell>
    );

  // RESULTS / LEADERBOARD
  if (mode === "results") {
    const sorted = [...sortedPlayers];
    return PageWrap(
      <div style={mainShell}>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={title}
        >
          🏆 Final Leaderboard
        </motion.h1>

        <table style={table}>
          <thead>
            <tr>
              <th style={thCell}>Name</th>
              <th style={thCell}>Activity</th>
              <th style={thCell}>Exam</th>
              <th style={thCell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const T = (p.activityScore ?? 0) + (p.examScore ?? 0);
              const isSelf = p.id === uid;
              return (
                <tr
                  key={p.id}
                  style={
                    isSelf
                      ? {
                          background: "#00ffaa22",
                          fontWeight: 700,
                        }
                      : {}
                  }
                >
                  <td style={tdCell}>
                    {i + 1}. {p.name}
                  </td>
                  <td style={tdCell}>{p.activityScore ?? 0}</td>
                  <td style={tdCell}>{p.examScore ?? 0}</td>
                  <td style={{ ...tdCell, color: "#00ffa3" }}>{T}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          style={{ ...chipButton, marginTop: 22 }}
          onClick={() => router.push("/")}
        >
          Exit to Home
        </button>
      </div>
    );
  }

  return null;
}

/* ========= REVIEW OVERLAY COMPONENT ========= */

function ReviewOverlay({
  loading,
  activity,
  exam,
  result,
  onClose,
}: {
  loading: boolean;
  activity: QSet[];
  exam: QSet[];
  result: any | null;
  onClose: () => void; // 👈 back to leaderboard
}) {
  const activityScore = result?.activityScore ?? 0;
  const examScore = result?.examScore ?? 0;
  const totalScore = activityScore + examScore;

  return (
    <div style={reviewBg}>
      <div style={reviewCard}>
        <h2 style={reviewTitle}>🔍 Review Answers</h2>
        <p style={reviewSub}>
          These are <b>your</b> answers and the correct answers.
        </p>

        {loading && (
          <p style={{ textAlign: "center", marginBottom: 10 }}>
            Loading review...
          </p>
        )}

        {!loading && (
          <>
            {/* SCORE SUMMARY */}
            <div style={scoreCard}>
              <div style={scoreItem}>
                <span style={scoreLabel}>Activity</span>
                <span style={scoreValue}>{activityScore}</span>
              </div>
              <div style={scoreDivider} />
              <div style={scoreItem}>
                <span style={scoreLabel}>Exam</span>
                <span style={scoreValue}>{examScore}</span>
              </div>
              <div style={scoreDivider} />
              <div style={scoreItem}>
                <span style={scoreLabel}>Total</span>
                <span style={{ ...scoreValue, color: "#22c55e" }}>
                  {totalScore}
                </span>
              </div>
            </div>

            {/* ACTIVITY QUESTIONS */}
            <h3 style={sectionTitleReview}>Activity Questions</h3>
            {activity.length === 0 && (
              <p style={emptyTextReview}>No activity questions.</p>
            )}
            {activity.map((q, i) => {
              const rawAns = result?.activityAnswers?.[i];
              const ans = resolveStudentAnswer(rawAns, q);
              const corr = getCorrectAnswer(q);
              const correct = ans !== "-" && corr !== "-" && ans === corr;

              return (
                <div key={i} style={questionBlockReview}>
                  <div style={questionTextReview}>
                    <b>A{i + 1}.</b> {q.question}
                  </div>

                  <div style={answerRowReview}>
                    <span style={answerLabelReview}>Your answer</span>
                    <span
                      style={{
                        ...answerValueReview,
                        color: correct ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {ans}
                    </span>
                  </div>
                  <div style={answerRowReview}>
                    <span style={answerLabelReview}>Correct answer</span>
                    <span
                      style={{
                        ...answerValueReview,
                        color: "#22c55e",
                      }}
                    >
                      {corr}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* EXAM QUESTIONS */}
            <h3 style={sectionTitleReview}>Exam Questions</h3>
            {exam.length === 0 && (
              <p style={emptyTextReview}>No exam questions.</p>
            )}
            {exam.map((q, i) => {
              const rawAns = result?.examAnswers?.[i];
              const ans = resolveStudentAnswer(rawAns, q);
              const corr = getCorrectAnswer(q);
              const correct = ans !== "-" && corr !== "-" && ans === corr;

              return (
                <div key={i} style={questionBlockReview}>
                  <div style={questionTextReview}>
                    <b>E{i + 1}.</b> {q.question}
                  </div>

                  <div style={answerRowReview}>
                    <span style={answerLabelReview}>Your answer</span>
                    <span
                      style={{
                        ...answerValueReview,
                        color: correct ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {ans}
                    </span>
                  </div>
                  <div style={answerRowReview}>
                    <span style={answerLabelReview}>Correct answer</span>
                    <span
                      style={{
                        ...answerValueReview,
                        color: "#22c55e",
                      }}
                    >
                      {corr}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* BACK BUTTON */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <button style={chipButton} onClick={onClose}>
            ⬅ Back to Leaderboard
          </button>
        </div>

        <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
          Your teacher controls when this review screen appears.
        </p>
      </div>
    </div>
  );
}

/* ========= OTHER COMPONENTS ========= */

const Toggle = ({ enabled }: { enabled: boolean }) => (
  <div
    style={{
      width: 48,
      height: 24,
      borderRadius: 30,
      background: enabled ? "#00ffa3" : "#777",
      position: "relative",
      transition: "0.2s",
    }}
  >
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "white",
        position: "absolute",
        top: 2,
        left: enabled ? 24 : 2,
        transition: "0.2s",
      }}
    />
  </div>
);

const SlidesGrid = ({
  roomInfo,
  setViewImg,
}: {
  roomInfo: any;
  setViewImg: (img: string | null) => void;
}) =>
  !roomInfo?.slides ? null : (
    <div style={grid}>
      {roomInfo.slides.map((rawImg: string, i: number) => {
        const img = toWebpUrl(rawImg); // 👉 convert slide to WebP
        return (
          <img
            key={i}
            src={img}
            style={thumb}
            onClick={() => setViewImg(img)}
          />
        );
      })}
    </div>
  );

const FullImage = ({ img, close }: { img: string; close: () => void }) => (
  <div style={viewBox} onClick={close}>
    <img src={img} style={fullImg} />
  </div>
);

function AnswerBox({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      style={{
        padding: "14px 14px",
        width: "100%",
        borderRadius: 14,
        background: color,
        border: "none",
        fontSize: 16,
        fontWeight: 700,
        color: "#0a0f24",
        cursor: "pointer",
        boxShadow: `0 0 18px ${color}88`,
        textAlign: "left",
      }}
      onClick={onClick}
    >
      {label}
    </motion.button>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 540,
        background: "rgba(15,23,42,0.96)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        border: "1px solid rgba(148,163,184,0.35)",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

/* ========= STYLES ========= */

const page: CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #0f172a 0, #020617 60%)",
  color: "white",
  padding: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const mainShell: CSSProperties = {
  width: "100%",
  maxWidth: 640,
};

const title: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const subtitle: CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
};

const topBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
  gap: 10,
};

const topLabel: CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 4,
};

const pill: CSSProperties = {
  padding: "4px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.5)",
  fontSize: 13,
  background: "rgba(15,23,42,0.9)",
  minWidth: 90,
  textAlign: "center",
};

const questionCard: CSSProperties = {
  background: "#1e293b",
  padding: "18px 18px 20px",
  borderRadius: 18,
  marginBottom: 22,
  boxShadow: "0 0 22px #14b8ff44",
};

const questionText: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.5,
};

const answersWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,110px)",
  gap: 10,
  justifyContent: "center",
  marginTop: 18,
};

const thumb: CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: 8,
  objectFit: "cover",
  border: "2px solid #00ffa3",
  cursor: "pointer",
};

const viewBox: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99,
};

const fullImg: CSSProperties = {
  maxWidth: "90vw",
  maxHeight: "90vh",
  borderRadius: 8,
};

const table: CSSProperties = {
  width: "100%",
  marginTop: 14,
  borderCollapse: "collapse",
  fontSize: 13,
};

const thCell: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid rgba(55,65,81,0.9)",
  fontWeight: 600,
  color: "#e5e7eb",
};

const tdCell: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid rgba(31,41,55,0.9)",
  fontWeight: 400,
};

const settingsBtn: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  fontSize: 20,
  padding: "6px 10px",
  background: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(148,163,184,0.7)",
  borderRadius: 999,
  cursor: "pointer",
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const settingsBox: CSSProperties = {
  background: "#0b1220",
  padding: "20px 24px",
  borderRadius: 14,
  border: "2px solid #00ffa3",
  width: 260,
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 16,
  padding: "6px 0",
  cursor: "pointer",
};

const questionImg: CSSProperties = {
  width: "100%",
  maxHeight: 260,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.6)",
  objectFit: "contain",
  background: "#020617",
  cursor: "zoom-in",
};

const chipButton: CSSProperties = {
  padding: "8px 18px",
  borderRadius: 999,
  border: "none",
  background: "#ff6ad5",
  color: "#0a0f24",
  fontWeight: 700,
  cursor: "pointer",
};

/* ==== REVIEW STYLES ==== */

const reviewBg: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const reviewCard: CSSProperties = {
  background: "#020617",
  borderRadius: 18,
  padding: 18,
  width: "96%",
  maxWidth: 720,
  maxHeight: "92vh",
  overflowY: "auto",
  border: "1px solid rgba(148,163,184,0.5)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
};

const reviewTitle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 4,
  textAlign: "center",
  color: "#f9a8ff",
};

const reviewSub: CSSProperties = {
  fontSize: 13,
  textAlign: "center",
  marginBottom: 12,
  opacity: 0.8,
};

const scoreCard: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.12))",
  border: "1px solid rgba(96,165,250,0.35)",
  marginBottom: 12,
};

const scoreItem: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};

const scoreLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  opacity: 0.8,
};

const scoreValue: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
};

const scoreDivider: CSSProperties = {
  width: 1,
  background: "rgba(148,163,184,0.4)",
  margin: "0 8px",
};

const sectionTitleReview: CSSProperties = {
  fontSize: 16,
  fontWeight: "bold",
  marginTop: 10,
  marginBottom: 4,
  color: "#7dfff6",
};

const questionBlockReview: CSSProperties = {
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: "1px solid #0f172a",
};

const questionTextReview: CSSProperties = {
  fontSize: 14,
  marginBottom: 4,
};

const answerRowReview: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
};

const answerLabelReview: CSSProperties = {
  opacity: 0.8,
};

const answerValueReview: CSSProperties = {
  fontWeight: 600,
};

const emptyTextReview: CSSProperties = {
  fontSize: 13,
  opacity: 0.7,
  marginBottom: 4,
};

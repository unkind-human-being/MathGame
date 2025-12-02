// app/teacher/game/player/page.tsx
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
} from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ========= TYPES ========= */
type QSet = {
  number: number;
  question: string;
  answers: string[];
  correct: string;
  imageUrl?: string;
};

type Mode = "waiting" | "activity" | "waitingExam" | "exam" | "done" | "results";

/* ========= HELPERS ========= */

// 🔀 Randomize question order per player
function shuffleQuestions(list: QSet[]): QSet[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 🌀 Force Cloudinary images to WebP (with compression)
// Works for URLs like: https://res.cloudinary.com/<name>/image/upload/....
// If it's not Cloudinary, just return the original URL.
function toWebpUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  // insert f_webp,q_auto,w_800 right after /upload/
  return url.replace(
    "/upload/",
    "/upload/f_webp,q_auto,w_800/"
  );
}

/* ========= MAIN ========= */
export default function PlayerScreen() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const uid = searchParams.get("uid") as string;

  /* ========= STATE ========= */
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [activityQ, setActivityQ] = useState<QSet[]>([]);
  const [examQ, setExamQ] = useState<QSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [mode, setMode] = useState<Mode>("waiting");

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
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
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
    });
    return () => unsub();
  }, [roomId]);

  /* ========= LOAD QUESTIONS ========= */
  useEffect(() => {
    async function load() {
      const A = await getDocs(collection(db, "rooms", roomId, "activity"));
      const E = await getDocs(collection(db, "rooms", roomId, "exam"));
      const act: QSet[] = [];
      const ex: QSet[] = [];
      A.forEach((d) => act.push(d.data() as QSet));
      E.forEach((d) => ex.push(d.data() as QSet));

      // 🔀 shuffle so each player sees different order
      setActivityQ(shuffleQuestions(act));
      setExamQ(shuffleQuestions(ex));
    }
    load();
  }, [roomId]);

  /* ========= ANSWER ========= */
  async function select(ans: string) {
    playClick();

    const list = mode === "activity" ? activityQ : examQ;
    const current = list[index];
    if (!current) return;

    const ok = ans === current.correct;
    const next = index + 1 === list.length;
    const score = roundScore + (ok ? 1 : 0);

    if (next) {
      if (mode === "activity") {
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          activityScore: score,
        });
        setMode("waitingExam");
        setIndex(0);
        setRoundScore(0);
      } else {
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          examScore: score,
        });
        setMode("done");
      }
      return;
    }
    setRoundScore(score);
    setIndex((p) => p + 1);
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

          <div style={{ textAlign: "center" }}>
            <p style={topLabel}>Question</p>
            <div style={{ ...pill, borderColor: "#a855f7", color: "#e5e7eb" }}>
              {index + 1} / {total}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <p style={topLabel}>Score</p>
            <div style={{ ...pill, borderColor: "#22c55e", color: "#bbf7d0" }}>
              {roundScore}
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

        {/* ANSWER CHOICES */}
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
            Your Activity score will be saved when this round ends.
          </p>
        )}
        {mode === "exam" && (
          <p style={{ ...subtitle, marginTop: 14, fontSize: 12 }}>
            Your Exam score will be saved at the end of this round.
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
    const sorted = [...leaderboard].sort(
      (a, b) =>
        (b.activityScore ?? 0) +
        (b.examScore ?? 0) -
        ((a.activityScore ?? 0) + (a.examScore ?? 0))
    );
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

/* ========= COMPONENTS ========= */

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

/* Animated answer button */
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

/* Centered shell */
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
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
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

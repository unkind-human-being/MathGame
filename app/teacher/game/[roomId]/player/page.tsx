"use client";

import { useEffect, useState, CSSProperties } from "react";
import { db } from "@/firebase/firebaseConfig";
import { doc, onSnapshot, updateDoc, collection, getDocs } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ========= TYPES ========= */
type QSet = {
  number: number;
  question: string;
  answers: string[];
  correct: string;
};

type Mode =
  | "waiting"        // before activity
  | "activity"       // answering activity questions
  | "waitingExam"    // done with activity, waiting for exam to start
  | "exam"           // answering exam questions
  | "done"           // finished exam, waiting leaderboard
  | "results";       // final leaderboard

export default function PlayerScreen() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const uid = searchParams.get("uid") as string;

  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [activityQ, setActivityQ] = useState<QSet[]>([]);
  const [examQ, setExamQ] = useState<QSet[]>([]);

  const [viewImg, setViewImg] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [roundScore, setRoundScore] = useState(0); // score for current round only
  const [mode, setMode] = useState<Mode>("waiting");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  /* ========= LIVE ROOM LISTENER ========= */
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomInfo(data);

      // Host controls global mode
      if (data.mode === "activity") {
        setMode("activity");
        setIndex(0);
        setRoundScore(0);
      }
      if (data.mode === "exam") {
        setMode("exam");
        setIndex(0);
        setRoundScore(0);
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
      const actSnap = await getDocs(collection(db, "rooms", roomId, "activity"));
      const exSnap = await getDocs(collection(db, "rooms", roomId, "exam"));

      const act: QSet[] = [];
      const ex: QSet[] = [];

      actSnap.forEach((d) => act.push(d.data() as QSet));
      exSnap.forEach((d) => ex.push(d.data() as QSet));

      act.sort((a, b) => a.number - b.number);
      ex.sort((a, b) => a.number - b.number);

      setActivityQ(act);
      setExamQ(ex);
    }
    load();
  }, [roomId]);

  /* ========= ANSWER HANDLER ========= */
  async function select(ans: string) {
    const set = mode === "activity" ? activityQ : examQ;
    if (set.length === 0) return;

    const isCorrect = ans === set[index].correct;
    const newScore = roundScore + (isCorrect ? 1 : 0);
    const lastQuestion = index + 1 === set.length;

    if (lastQuestion) {
      if (mode === "activity") {
        // Save activity score
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          activityScore: newScore,
        });

        // Prepare for exam waiting
        setRoundScore(0);
        setIndex(0);
        setMode("waitingExam");
      } else if (mode === "exam") {
        // Save exam score
        await updateDoc(doc(db, "rooms", roomId, "attendance", uid), {
          examScore: newScore,
        });

        setMode("done");
      }
      return;
    }

    // Next question in current round
    setRoundScore(newScore);
    setIndex((i) => i + 1);
  }

  /* ========= WAITING BEFORE ACTIVITY ========= */
  if (mode === "waiting") {
    return (
      <main style={page}>
        <h1 style={big}>⏳ Waiting for Activity...</h1>
        <p style={{ opacity: 0.7 }}>Review the slides while you wait.</p>

        <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg} />

        {viewImg && <FullImage img={viewImg} close={() => setViewImg(null)} />}
      </main>
    );
  }

  /* ========= WAITING AFTER ACTIVITY, BEFORE EXAM ========= */
  if (mode === "waitingExam") {
    return (
      <main style={page}>
        <h1 style={big}>✅ Activity Finished!</h1>
        <p style={{ opacity: 0.7, marginBottom: 8 }}>Please wait for the Exam to start.</p>
        <p style={{ opacity: 0.7, fontSize: 16 }}>
          Your activity score will be counted in the final ranking.
        </p>

        <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg} />

        {viewImg && <FullImage img={viewImg} close={() => setViewImg(null)} />}
      </main>
    );
  }

  /* ========= ACTIVITY ROUND ========= */
  if (mode === "activity" && activityQ.length > 0) {
    const q = activityQ[index];

    return (
      <main style={page}>
        <h1 style={big}>🟢 Activity Round</h1>
        <h2 style={qNum}>
          Question {index + 1}/{activityQ.length}
        </h2>

        <div style={box}>{q.question}</div>

        {q.answers.map((a: string, i: number) => (
          <button key={i} style={btn(colors[i])} onClick={() => select(a)}>
            {a}
          </button>
        ))}

        <p style={{ opacity: 0.6, marginTop: 8 }}>Current score: {roundScore}</p>
      </main>
    );
  }

  /* ========= EXAM ROUND ========= */
  if (mode === "exam" && examQ.length > 0) {
    const q = examQ[index];

    return (
      <main style={page}>
        <h1 style={big}>📘 Exam Round</h1>
        <h2 style={qNum}>
          Question {index + 1}/{examQ.length}
        </h2>

        <div style={box}>{q.question}</div>

        {q.answers.map((a: string, i: number) => (
          <button key={i} style={btn(colors[i])} onClick={() => select(a)}>
            {a}
          </button>
        ))}

        <p style={{ opacity: 0.6, marginTop: 8 }}>
          Progress: {index + 1}/{examQ.length}
        </p>
      </main>
    );
  }

  /* ========= DONE, WAITING FOR LEADERBOARD ========= */
  if (mode === "done") {
    return (
      <main style={page}>
        <h1 style={big}>✔ Exam Finished</h1>
        <p style={{ opacity: 0.7 }}>Waiting for the host to publish the leaderboard...</p>
      </main>
    );
  }

  /* ========= FINAL LEADERBOARD ========= */
  if (mode === "results") {
    const sorted = [...leaderboard].sort(
      (a, b) =>
        (b.activityScore ?? 0) + (b.examScore ?? 0) -
        ((a.activityScore ?? 0) + (a.examScore ?? 0))
    );

    return (
      <main style={page}>
        <h1 style={big}>🏆 Final Leaderboard</h1>

        <table style={table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Activity</th>
              <th>Exam</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p: any, i: number) => {
              const activityScore = p.activityScore ?? 0;
              const examScore = p.examScore ?? 0;
              const total = activityScore + examScore;

              return (
                <tr
                  key={p.id}
                  style={{
                    background: p.id === uid ? "#00ffa325" : "transparent",
                    fontWeight: p.id === uid ? "bold" : "normal",
                  }}
                >
                  <td>
                    {i + 1}. {p.name}
                  </td>
                  <td>{activityScore}</td>
                  <td>{examScore}</td>
                  <td style={{ color: "#00ffa3" }}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button style={btn("#ff6ad5")} onClick={() => router.push("/")}>
          Exit Game
        </button>
      </main>
    );
  }

  return null;
}

/* ========= SLIDES GRID (REUSED) ========= */
function SlidesGrid({
  roomInfo,
  setViewImg,
}: {
  roomInfo: any;
  setViewImg: (img: string | null) => void;
}) {
  if (!roomInfo?.slides || roomInfo.slides.length === 0) return null;

  return (
    <div style={grid}>
      {roomInfo.slides.map((img: string, i: number) => (
        <img
          key={i}
          src={img}
          style={thumb}
          onClick={() => setViewImg(img)}
        />
      ))}
    </div>
  );
}

/* ========= FULLSCREEN IMAGE ========= */
function FullImage({ img, close }: { img: string; close: () => void }) {
  return (
    <div style={viewBox} onClick={close}>
      <img src={img} style={fullImg} />
    </div>
  );
}

/* ========= STYLES ========= */
const page: CSSProperties = {
  minHeight: "100vh",
  background: "#0a0f24",
  padding: 25,
  color: "white",
  textAlign: "center",
};

const big: CSSProperties = { fontSize: 30, fontWeight: 900, marginBottom: 10 };

const qNum: CSSProperties = {
  fontSize: 20,
  color: "#7dfff6",
  marginBottom: 12,
};

const box: CSSProperties = {
  background: "#152033",
  padding: 18,
  borderRadius: 10,
  fontSize: 19,
  marginBottom: 18,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,110px)",
  gap: 10,
  marginTop: 10,
  justifyContent: "center",
};

const thumb: CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: 8,
  objectFit: "cover",
  cursor: "pointer",
  border: "2px solid #00ffa3",
};

const btn = (c: string): CSSProperties => ({
  padding: "14px",
  width: "100%",
  borderRadius: 10,
  marginBottom: 12,
  fontSize: 17,
  fontWeight: "bold",
  background: c,
  color: "#031716",
  border: "none",
});

const viewBox: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const fullImg: CSSProperties = {
  maxWidth: "92vw",
  maxHeight: "92vh",
  borderRadius: 10,
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 16,
  fontSize: 16,
};

const colors = ["#00ffa3", "#14b8ff", "#ff6ad5", "#ffae00"];

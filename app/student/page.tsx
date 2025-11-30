"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/firebase/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  DocumentData,
} from "firebase/firestore";

type Difficulty = "easy" | "average" | "hard";

interface Question {
  id: string;
  text: string;
  answers: string[];
  correctIndex: number;
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  average: "Average",
  hard: "Hard",
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "#22c55e",
  average: "#eab308",
  hard: "#f97316",
};

function collectionName(difficulty: Difficulty) {
  return `questions_${difficulty}`; // matches admin side collections
}

export default function StudentGame() {
  const [user, setUser] = useState<any>(null);

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // CHECK LOGIN (optional – only if you use Firebase Auth for students)
  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUser(u);
  }, []);

  // Load questions when difficulty changes
  useEffect(() => {
    if (!difficulty) return;

    const loadQuestions = async () => {
      setLoadingQuestions(true);
      setLoadError("");
      setFinished(false);
      setIndex(0);
      setScore(0);

      // ✅ If offline, don't even try Firestore
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setQuestions([]);
        setLoadError(
          "You are offline. Connect to the internet to load questions."
        );
        setLoadingQuestions(false);
        return;
      }

      try {
        const colRef = collection(db, collectionName(difficulty));
        const q = query(colRef, orderBy("createdAt", "asc"));
        const snapshot = await getDocs(q);

        const list: Question[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as DocumentData;
          return {
            id: docSnap.id,
            text: data.text ?? "",
            answers: data.answers ?? [],
            correctIndex: data.correctIndex ?? 0,
          };
        });

        setQuestions(list);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load questions. Please try again.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [difficulty]);

  async function handleAnswer(ansIndex: number) {
    const current = questions[index];
    const isCorrect = ansIndex === current.correctIndex;
    const nextScore = isCorrect ? score + 1 : score;

    setScore(nextScore);

    const isLast = index + 1 === questions.length;

    if (isLast) {
      setFinished(true);

      // SAVE SCORE IN FIRESTORE (only if online)
      if (
        user &&
        typeof navigator !== "undefined" &&
        navigator.onLine
      ) {
        try {
          await setDoc(doc(db, "studentScores", user.uid), {
            score: nextScore,
            totalQuestions: questions.length,
            difficulty,
            finishedAt: Date.now(),
          });
        } catch (err) {
          console.warn("Failed to save score (maybe offline):", err);
        }
      }
    } else {
      setIndex(index + 1);
    }
  }

  function handleResetDifficulty() {
    setDifficulty(null);
    setQuestions([]);
    setIndex(0);
    setScore(0);
    setFinished(false);
    setLoadError("");
  }

  // SCREEN 1: CHOOSE DIFFICULTY
  if (!difficulty) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top, #0f172a 0, #020617 60%)",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "#020617dd",
            borderRadius: "20px",
            padding: "24px 20px 22px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              fontSize: "26px",
              fontWeight: 800,
              textAlign: "center",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            AZMATH GAME
          </motion.h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#9ca3af",
              marginBottom: "20px",
            }}
          >
            Choose your difficulty to start the math challenge.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {(["easy", "average", "hard"] as Difficulty[]).map((d, i) => (
              <motion.button
                key={d}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background:
                    d === "easy"
                      ? "linear-gradient(135deg,#22c55e,#4ade80)"
                      : d === "average"
                      ? "linear-gradient(135deg,#eab308,#facc15)"
                      : "linear-gradient(135deg,#f97316,#fb923c)",
                  boxShadow: `0 12px 25px ${difficultyColors[d]}55`,
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {difficultyLabels[d].toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.9,
                    }}
                  >
                    {d === "easy" &&
                      "Warm up your brain with simple questions."}
                    {d === "average" &&
                      "A balanced mix of fun and challenge."}
                    {d === "hard" &&
                      "Test your limits with tough questions!"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    opacity: 0.95,
                  }}
                >
                  {d === "easy" ? "★" : d === "average" ? "★★" : "★★★"}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // If difficulty chosen but still loading questions
  if (loadingQuestions) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#0a0f24,#111827)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          padding: "20px",
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: "center" }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              marginBottom: "10px",
            }}
          >
            Loading questions for{" "}
            <span
              style={{
                color: difficultyColors[difficulty],
                fontWeight: 600,
              }}
            >
              {difficultyLabels[difficulty]}
            </span>{" "}
            mode...
          </p>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              border: "4px solid #1f2937",
              borderTopColor: "#38bdf8",
              animation: "spin 0.9s linear infinite",
              margin: "0 auto",
            }}
          />
        </motion.div>

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  // No questions set by admin yet OR offline case
  if (!loadingQuestions && questions.length === 0) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#0a0f24,#111827)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          {loadError
            ? "Cannot load questions"
            : "No questions available"}
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            maxWidth: "360px",
          }}
        >
          {loadError
            ? loadError
            : <>
                The admin hasn&apos;t added any questions yet for{" "}
                <span
                  style={{
                    color: difficultyColors[difficulty!],
                  }}
                >
                  {difficultyLabels[difficulty!]}
                </span>{" "}
                mode.
              </>}
        </p>

        <button
          onClick={handleResetDifficulty}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "999px",
            border: "none",
            background: "#38bdf8",
            color: "#020617",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Choose another difficulty
        </button>

        {loadError && (
          <p
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "#fecaca",
            }}
          >
            Tip: open AZMATH while online at least once so questions can
            sync and be available next time.
          </p>
        )}
      </main>
    );
  }

  // QUIZ FINISHED SCREEN
  if (finished) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#0f172a,#111827)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <motion.h1
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontSize: "34px",
            fontWeight: "900",
            textShadow: "0 0 25px #00ffa3",
            textTransform: "uppercase",
          }}
        >
          Final Score
        </motion.h1>

        <p
          style={{
            marginTop: "6px",
            fontSize: "14px",
            color: "#9ca3af",
          }}
        >
          Difficulty:{" "}
          <span style={{ color: difficultyColors[difficulty!] }}>
            {difficultyLabels[difficulty!]}
          </span>
        </p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: "28px",
            marginTop: "20px",
            color: "#00ffa3",
            fontWeight: 800,
          }}
        >
          {score} / {questions.length}
        </motion.p>

        <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIndex(0);
              setScore(0);
              setFinished(false);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              background: "#00ffa3",
              color: "#0a0f24",
              border: "none",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Play Again (same difficulty)
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleResetDifficulty}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              background: "#1f2937",
              color: "#e5e7eb",
              border: "1px solid #4b5563",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Change Difficulty
          </motion.button>
        </div>
      </main>
    );
  }

  // MAIN QUIZ UI
  const currentQuestion = questions[index];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0a0f24,#111827)",
        padding: "20px",
        color: "white",
      }}
    >
      {/* Top bar: difficulty + progress */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginBottom: "4px",
            }}
          >
            Difficulty
          </p>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              background: "rgba(15,23,42,0.9)",
              border: `1px solid ${difficultyColors[difficulty!]}`,
              color: difficultyColors[difficulty!],
              fontWeight: 600,
            }}
          >
            {difficultyLabels[difficulty!]}
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            Question {index + 1} / {questions.length}
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#6ee7ff",
            }}
          >
            Score: {score}
          </p>
        </div>
      </header>

      {/* QUESTION BOX */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#1e293b",
          padding: "22px",
          borderRadius: "15px",
          color: "white",
          fontSize: "20px",
          fontWeight: "600",
          marginBottom: "25px",
          boxShadow: "0 0 20px #14b8ff55",
        }}
      >
        {currentQuestion.text}
      </motion.div>

      {/* ANSWERS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {currentQuestion.answers.map((answer, i) => {
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
              color={color}
              label={answer}
              onClick={() => handleAnswer(i)}
            />
          );
        })}
      </div>

      {/* Change difficulty button */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          onClick={handleResetDifficulty}
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Change Difficulty
        </button>
      </div>
    </main>
  );
}

/* ANSWER BOX UI */
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
      style={{
        padding: "16px",
        width: "100%",
        borderRadius: "14px",
        background: color,
        border: "none",
        fontSize: "18px",
        fontWeight: "700",
        color: "#0a0f24",
        cursor: "pointer",
        boxShadow: `0 0 15px ${color}aa`,
      }}
      onClick={onClick}
    >
      {label}
    </motion.button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default function StudentGame() {
  const [user, setUser] = useState<any>(null);

  // 5 QUESTIONS (you can replace these later)
  const questions = [
    {
      q: "What is 5 + 7?",
      answers: ["10", "11", "12", "13"],
      correct: "12",
    },
    {
      q: "What is 9 × 3?",
      answers: ["18", "27", "21", "24"],
      correct: "27",
    },
    {
      q: "What is 15 − 6?",
      answers: ["11", "9", "6", "8"],
      correct: "9",
    },
    {
      q: "What is 8 × 4?",
      answers: ["32", "28", "36", "30"],
      correct: "32",
    },
    {
      q: "What is 20 ÷ 5?",
      answers: ["4", "3", "5", "6"],
      correct: "4",
    },
  ];

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // CHECK LOGIN
  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUser(u);
  }, []);

  async function handleAnswer(ans: string) {
    const correct = questions[index].correct;

    if (ans === correct) setScore(score + 1);

    if (index + 1 === questions.length) {
      setFinished(true);

      // SAVE SCORE IN FIRESTORE
      if (user) {
        await setDoc(doc(db, "studentScores", user.uid), {
          score,
          finishedAt: Date.now(),
        });
      }
    } else {
      setIndex(index + 1);
    }
  }

  if (finished)
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
            fontSize: "40px",
            fontWeight: "900",
            textShadow: "0 0 25px #00ffa3",
          }}
        >
          FINAL SCORE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: "28px", marginTop: "20px", color: "#00ffa3" }}
        >
          {score} / {questions.length}
        </motion.p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          style={{
            marginTop: "30px",
            padding: "12px 25px",
            borderRadius: "12px",
            background: "#00ffa3",
            color: "#0a0f24",
            border: "none",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Play Again
        </motion.button>
      </main>
    );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0a0f24,#111827)",
        padding: "20px",
      }}
    >
      {/* QUESTION NUMBER */}
      <p
        style={{
          color: "#6ee7ff",
          fontSize: "16px",
          marginBottom: "15px",
        }}
      >
        Question {index + 1} / {questions.length}
      </p>

      {/* QUESTION BOX */}
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#1e293b",
          padding: "25px",
          borderRadius: "15px",
          color: "white",
          fontSize: "22px",
          fontWeight: "600",
          marginBottom: "30px",
          boxShadow: "0 0 20px #14b8ff55",
        }}
      >
        {questions[index].q}
      </motion.div>

      {/* ANSWERS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <AnswerBox
          color="#00ffa3"
          label={questions[index].answers[0]}
          onClick={() => handleAnswer(questions[index].answers[0])}
        />
        <AnswerBox
          color="#9ca3af"
          label={questions[index].answers[1]}
          onClick={() => handleAnswer(questions[index].answers[1])}
        />
        <AnswerBox
          color="#ff6ad5"
          label={questions[index].answers[2]}
          onClick={() => handleAnswer(questions[index].answers[2])}
        />
        <AnswerBox
          color="#ff9f40"
          label={questions[index].answers[3]}
          onClick={() => handleAnswer(questions[index].answers[3])}
        />
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
        padding: "18px",
        width: "100%",
        borderRadius: "14px",
        background: color,
        border: "none",
        fontSize: "20px",
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

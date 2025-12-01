"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  DocumentData,
  addDoc,
  limit,
} from "firebase/firestore";

type Difficulty = "easy" | "average" | "hard";

interface Question {
  id: string;
  text: string;
  answers: string[];
  correctIndex: number;
  imageUrls?: string[];
}

interface LeaderboardEntry {
  userId?: string;
  name?: string;
  score: number;
  correct?: number;
  totalQuestions: number;
  difficulty: Difficulty;
  finishedAt: number;
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
  return `questions_${difficulty}`;
}

// 🔀 Shuffle helper so questions appear in random order
function shuffleQuestions(arr: Question[]): Question[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function StudentGame() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);

  const [soundsEnabled, setSoundsEnabled] = useState(true);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // AUDIO REFS
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const correctClickRef = useRef<HTMLAudioElement | null>(null);
  const wrongClickRef = useRef<HTMLAudioElement | null>(null);
  const streakRef = useRef<HTMLAudioElement | null>(null);
  const bigStreakRef = useRef<HTMLAudioElement | null>(null);
  const resultScoreRef = useRef<HTMLAudioElement | null>(null);

  // Helper to play sound respecting settings (fixed typing)
  const playSound = (audioRef: { current: HTMLAudioElement | null }) => {
    if (!soundsEnabled) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // ignore autoplay errors
      });
    } catch {
      // ignore
    }
  };

  // Init audio objects on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const bgm = new Audio("/sounds/play/background.wav");
    bgm.loop = true;
    bgm.volume = 0.4;
    bgmRef.current = bgm;

    // 🔊 make sure these match the files in /public/sounds/play
    correctClickRef.current = new Audio("/sounds/play/correct_click.wav");
    wrongClickRef.current = new Audio("/sounds/play/wrong_click.wav");
    streakRef.current = new Audio("/sounds/play/streak_sound.mp3");
    bigStreakRef.current = new Audio("/sounds/play/correct streak.mp3");
    resultScoreRef.current = new Audio("/sounds/play/result_score.mp3");

    return () => {
      bgm.pause();
    };
  }, []);

  // Control background music play/pause
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (difficulty && !finished && soundsEnabled) {
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
  }, [difficulty, finished, soundsEnabled]);

  // CHECK LOGIN
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
      setCorrectCount(0);
      setStreak(0);
      setTimeLeft(60);
      setLeaderboard([]);
      setLeaderboardLoading(false);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setQuestions([]);
        setLoadError("You are offline. Connect to the internet to load questions.");
        setLoadingQuestions(false);
        return;
      }

      try {
        const colRef = collection(db, collectionName(difficulty));
        const q = query(colRef, orderBy("createdAt", "asc"));
        const snapshot = await getDocs(q);

        const list: Question[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as DocumentData;

          let imgArray: string[] = [];
          if (Array.isArray(data.imageUrls)) {
            imgArray = data.imageUrls.filter((x: unknown) => typeof x === "string");
          } else if (typeof data.imageUrl === "string" && data.imageUrl.trim()) {
            imgArray = [data.imageUrl];
          }

          return {
            id: docSnap.id,
            text: data.text ?? "",
            answers: data.answers ?? [],
            correctIndex: data.correctIndex ?? 0,
            imageUrls: imgArray,
          };
        });

        // 🔀 randomize order each time we load
        const shuffled = shuffleQuestions(list);
        setQuestions(shuffled);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load questions. Please try again.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [difficulty]);

  // Timer: 60s per question
  useEffect(() => {
    if (!difficulty || finished || questions.length === 0 || index >= questions.length) return;

    setTimeLeft(60);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time's up -> treat as wrong answer
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, index, finished, questions.length]);

  async function handleAnswer(ansIndex: number) {
    if (finished || index >= questions.length) return;

    const current = questions[index];
    const isCorrect = ansIndex === current.correctIndex;

    let newStreak = streak;
    let newScore = score;
    let newCorrectCount = correctCount;

    if (isCorrect) {
      newStreak = streak + 1;
      newCorrectCount = correctCount + 1;
      // time-based scoring: faster = more points
      newScore = score + timeLeft;

      playSound(correctClickRef);

      if (newStreak >= 2) {
        playSound(streakRef);
      }

      if ([3, 5, 8, 10].includes(newStreak)) {
        playSound(bigStreakRef);
      }
    } else {
      newStreak = 0;
      playSound(wrongClickRef);
    }

    setStreak(newStreak);
    setScore(newScore);
    setCorrectCount(newCorrectCount);

    const isLast = index + 1 === questions.length;

    if (isLast) {
      setFinished(true);
      playSound(resultScoreRef);

      if (user && typeof navigator !== "undefined" && navigator.onLine) {
        const result: LeaderboardEntry = {
          userId: user.uid,
          name: user.displayName || user.email || "Anonymous",
          score: newScore,
          correct: newCorrectCount,
          totalQuestions: questions.length,
          difficulty: difficulty!,
          finishedAt: Date.now(),
        };

        try {
          await Promise.all([
            setDoc(doc(db, "studentScores", user.uid), result),
            addDoc(collection(db, `leaderboard_${difficulty!}`), result),
          ]);
        } catch (err) {
          console.warn("Failed to save score/leaderboard:", err);
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
    setCorrectCount(0);
    setFinished(false);
    setLoadError("");
    setStreak(0);
    setTimeLeft(60);
  }

  // Load leaderboard when game is finished
  useEffect(() => {
    if (!finished || !difficulty) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const colRef = collection(db, `leaderboard_${difficulty}`);
        // 👉 single orderBy only, so no composite index needed
        const q = query(colRef, orderBy("score", "desc"), limit(5));
        const snap = await getDocs(q);
        const list: LeaderboardEntry[] = snap.docs.map((d) => d.data() as LeaderboardEntry);
        setLeaderboard(list);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();
  }, [finished, difficulty]);

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
          position: "relative",
        }}
      >
        <SoundToggleButton enabled={soundsEnabled} onToggle={() => setSoundsEnabled((prev) => !prev)} />

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
                    {d === "easy" && "Warm up your brain with simple questions."}
                    {d === "average" && "A balanced mix of fun and challenge."}
                    {d === "hard" && "Test your limits with tough questions!"}
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
          position: "relative",
        }}
      >
        <SoundToggleButton enabled={soundsEnabled} onToggle={() => setSoundsEnabled((prev) => !prev)} />

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
          position: "relative",
        }}
      >
        <SoundToggleButton enabled={soundsEnabled} onToggle={() => setSoundsEnabled((prev) => !prev)} />

        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          {loadError ? "Cannot load questions" : "No questions available"}
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            maxWidth: "360px",
          }}
        >
          {loadError ? (
            loadError
          ) : (
            <>
              The admin hasn&apos;t added any questions yet for{" "}
              <span
                style={{
                  color: difficultyColors[difficulty!],
                }}
              >
                {difficultyLabels[difficulty!]}
              </span>{" "}
              mode.
            </>
          )}
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
            Tip: open AZMATH while online at least once so questions can sync and be available next
            time.
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
          position: "relative",
        }}
      >
        <SoundToggleButton enabled={soundsEnabled} onToggle={() => setSoundsEnabled((prev) => !prev)} />

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
          <span
            style={{
              color: difficultyColors[difficulty!],
            }}
          >
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
          {score}
        </motion.p>

        <p
          style={{
            marginTop: "6px",
            fontSize: "13px",
            color: "#9ca3af",
          }}
        >
          Correct answers: {correctCount} / {questions.length}
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "28px",
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // 🔀 reshuffle existing set so order changes every replay
              setQuestions((prev) => shuffleQuestions(prev));
              setIndex(0);
              setScore(0);
              setCorrectCount(0);
              setFinished(false);
              setStreak(0);
              setTimeLeft(60);
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
            Play Again
          </motion.button>

        </div>

        {/* Leaderboard */}
        <div
          style={{
            marginTop: "32px",
            width: "100%",
            maxWidth: "480px",
            textAlign: "left",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            {difficultyLabels[difficulty!]} Leaderboard
          </h3>
          {leaderboardLoading ? (
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
              }}
            >
              Loading leaderboard...
            </p>
          ) : leaderboard.length === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              No scores yet for this difficulty.
            </p>
          ) : (
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {leaderboard.map((entry, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    background: "rgba(15,23,42,0.9)",
                    padding: "6px 10px",
                    borderRadius: "10px",
                    border: "1px solid rgba(55,65,81,0.9)",
                  }}
                >
                  <span>
                    {i + 1}. {entry.name || "Player"}
                  </span>
                  <span>{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
                  {/* Back to home (small button under leaderboard) */}
        <div
          style={{
            marginTop: "18px",
            width: "100%",
            maxWidth: "480px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              fontSize: "11px",
              cursor: "pointer",
              opacity: 0.9,
            }}
          >
            Back to Home
          </button>
        </div>

        </div>
      </main>
    );
  }

  // MAIN QUIZ UI
  const currentQuestion = questions[index];
  const imgs = currentQuestion.imageUrls || [];
  const hasImages = imgs.length > 0;
  const multipleImages = imgs.length > 1;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0a0f24,#111827)",
        padding: "20px",
        color: "white",
        display: "flex",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <SoundToggleButton enabled={soundsEnabled} onToggle={() => setSoundsEnabled((prev) => !prev)} />

      <div
        style={{
          width: "100%",
          maxWidth: "640px",
        }}
      >
        {/* Top bar: time (left) + score (center) + difficulty/progress (right) */}
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            marginBottom: "16px",
            gap: "8px",
          }}
        >
          {/* Time */}
          <div>
            <p
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginBottom: "4px",
              }}
            >
              Time
            </p>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(56,189,248,0.8)",
                fontSize: "13px",
                minWidth: "80px",
                textAlign: "center",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              {timeLeft}s
            </div>
          </div>

          {/* Score */}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginBottom: "4px",
              }}
            >
              Score
            </p>
            <div
              style={{
                padding: "4px 16px",
                borderRadius: "999px",
                border: "1px solid rgba(34,197,94,0.9)",
                fontSize: "15px",
                fontWeight: 700,
                minWidth: "100px",
                textAlign: "center",
                background: "rgba(15,23,42,0.9)",
                color: "#bbf7d0",
              }}
            >
              {score}
            </div>
          </div>

          {/* Difficulty + progress */}
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginBottom: "4px",
              }}
            >
              Question {index + 1} / {questions.length}
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
        </header>

        {/* QUESTION BOX + IMAGES */}
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#1e293b",
            padding: "18px 18px 20px",
            borderRadius: "18px",
            color: "white",
            marginBottom: "24px",
            boxShadow: "0 0 20px #14b8ff55",
          }}
        >
          {/* Images */}
          {hasImages && (
            <div
              style={{
                marginBottom: "14px",
              }}
            >
              {multipleImages ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))",
                    gap: "8px",
                  }}
                >
                  {imgs.map((url, i) => (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        width: "100%",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.4)",
                        background: "#020617",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Question image ${i + 1}`}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.5)",
                    background: "#020617",
                  }}
                >
                  <img
                    src={imgs[0]}
                    alt="Question"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Question text */}
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {currentQuestion.text}
          </div>
        </motion.div>

        {/* ANSWERS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {currentQuestion.answers.map((answer, i) => {
            const color =
              i === 0 ? "#00ffa3" : i === 1 ? "#9ca3af" : i === 2 ? "#ff6ad5" : "#ff9f40";
            return <AnswerBox key={i} color={color} label={answer} onClick={() => handleAnswer(i)} />;
          })}
        </div>

        {/* Change difficulty button */}
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
          }}
        >
        </div>
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

/* SOUND TOGGLE BUTTON (top-left) */
function SoundToggleButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        padding: "6px 10px",
        borderRadius: "999px",
        border: "1px solid rgba(148,163,184,0.6)",
        background: "rgba(15,23,42,0.9)",
        color: "#e5e7eb",
        fontSize: "11px",
        cursor: "pointer",
      }}
    >
      {enabled ? "Sound: On" : "Sound: Off"}
    </button>
  );
}

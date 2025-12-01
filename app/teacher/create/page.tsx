// app/teacher/create/page.tsx
"use client";

import { useState, useEffect, CSSProperties } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// CLOUDINARY CONFIG (same as your other project)
const CLOUD_NAME = "dmoara1ht";
const UPLOAD_PRESET = "azmath";

// ✅ Reuse the same helper that works in your other project
async function uploadToCloudinary(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Cloudinary upload error:", text);
    throw new Error(text || "Cloudinary upload failed");
  }

  return res.json() as Promise<{ secure_url: string }>;
}

const MATH_SYMBOLS = [
  "+",
  "-",
  "×",
  "÷",
  "=",
  "≠",
  "≈",
  "<",
  ">",
  "≤",
  "≥",
  "±",
  "∞",
  "√",
  "∛",
  "∑",
  "∏",
  "∫",
  "∂",
  "π",
  "θ",
  "α",
  "β",
  "γ",
  "Δ",
  "Ω",
  "→",
  "←",
  "↔",
  "°",
  "%",
  "∥",
  "⊥",
  "∠",
  "∴",
];

type QA = {
  q: string;
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  correct: string;
  imageUrl?: string;
};

type ActiveField = {
  type: "exam" | "activity";
  index: number;
  field: keyof QA;
};

export default function CreateRoom() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/auth/login");
      else setUser(u);
    });
    return () => unsub();
  }, [router]);

  const [roomName, setRoomName] = useState("");
  const [roomId] = useState(() =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  /* ------------------ QUESTIONS ------------------ */
  const emptyQA: QA = {
    q: "",
    a1: "",
    a2: "",
    a3: "",
    a4: "",
    correct: "",
    imageUrl: "",
  };

  const [examQuestions, setExamQuestions] = useState<QA[]>([{ ...emptyQA }]);
  const [activityQuestions, setActivityQuestions] = useState<QA[]>([
    { ...emptyQA },
  ]);

  const [activeTab, setActiveTab] = useState<"exam" | "activity">("exam");

  /* ------------------ SLIDES ------------------ */
  const [slides, setSlides] = useState<string[]>([]);
  const [uploadingSlides, setUploadingSlides] = useState(false);

  /* ------------------ QUESTION IMAGE UPLOAD ------------------ */
  const [uploadingQuestion, setUploadingQuestion] = useState<{
    type: "exam" | "activity";
    index: number;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  /* ------------------ MINI KEYBOARD ------------------ */
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // ---------- Upload slides ----------
  async function uploadSlide(e: any) {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    setUploadingSlides(true);
    try {
      const result = await uploadToCloudinary(file);
      if (!result.secure_url) {
        alert("Slide upload failed. Please check Cloudinary config.");
        return;
      }
      setSlides((prev) => [...prev, String(result.secure_url)]);
    } catch (err) {
      console.error("Slide upload failed:", err);
      alert("Slide upload failed. Please check Cloudinary config / console.");
    } finally {
      setUploadingSlides(false);
    }
  }

  // ---------- Upload question image ----------
  async function uploadQuestionImage(
    type: "exam" | "activity",
    index: number,
    e: any
  ) {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    setUploadingQuestion({ type, index });

    try {
      const result = await uploadToCloudinary(file);
      if (!result.secure_url) {
        alert("Question image upload failed. Please check Cloudinary config.");
        return;
      }

      const url = String(result.secure_url);

      if (type === "exam") {
        setExamQuestions((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], imageUrl: url };
          return copy;
        });
      } else {
        setActivityQuestions((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], imageUrl: url };
          return copy;
        });
      }
    } catch (err) {
      console.error("Question image upload failed:", err);
      alert(
        "Question image upload failed. Please check Cloudinary config / console."
      );
    } finally {
      setUploadingQuestion(null);
    }
  }

  /* ---------- Update Fields ---------- */
  const updateExam = (i: number, key: keyof QA, val: string) => {
    const c = [...examQuestions];
    (c[i] as any)[key] = val;
    setExamQuestions(c);
  };

  const updateAct = (i: number, key: keyof QA, val: string) => {
    const c = [...activityQuestions];
    (c[i] as any)[key] = val;
    setActivityQuestions(c);
  };

  /* ---------- Insert symbol ---------- */
  const insertSymbol = (symbol: string) => {
    if (!activeField) return;
    const { type, index, field } = activeField;

    if (type === "exam") {
      setExamQuestions((prev) => {
        const copy = [...prev];
        const current = copy[index];
        if (!current) return prev;
        const currentVal = (current[field] as string) ?? "";
        copy[index] = { ...current, [field]: currentVal + symbol } as QA;
        return copy;
      });
    } else {
      setActivityQuestions((prev) => {
        const copy = [...prev];
        const current = copy[index];
        if (!current) return prev;
        const currentVal = (current[field] as string) ?? "";
        copy[index] = { ...current, [field]: currentVal + symbol } as QA;
        return copy;
      });
    }
  };

  /* ---------- Add / Delete ---------- */
  const addExam = () => setExamQuestions([...examQuestions, { ...emptyQA }]);
  const addAct = () =>
    setActivityQuestions([...activityQuestions, { ...emptyQA }]);

  const delExam = (i: number) => {
    if (examQuestions.length === 1)
      return alert("Must have 1 Exam Minimum.");
    setExamQuestions(examQuestions.filter((_, x) => x !== i));
  };

  const delAct = (i: number) => {
    if (activityQuestions.length === 1)
      return alert("Must have 1 Activity Minimum.");
    setActivityQuestions(activityQuestions.filter((_, x) => x !== i));
  };

  /* ---------- SAVE ROOM ---------- */
  async function createRoom() {
    if (!roomName) return alert("Enter room name");

    if (!user?.uid) {
      alert("User not loaded yet. Please wait a moment and try again.");
      return;
    }

    if (
      examQuestions.some((q) => !q.q || !q.correct) ||
      activityQuestions.some((q) => !q.q || !q.correct)
    ) {
      return alert("Complete all questions first");
    }

    setSaving(true);

    // sanitize everything so NOTHING is undefined
    const safeSlides = (slides || []).filter(
      (s) => typeof s === "string" && s.trim().length > 0
    );

    const sanitizeQA = (x: QA) => ({
      number: 0, // temp – overridden when saving
      question: x.q ?? "",
      answers: [x.a1, x.a2, x.a3, x.a4].map((a) => a ?? ""),
      correct: x.correct ?? "",
      imageUrl: x.imageUrl ?? "",
    });

    try {
      // top level room doc
      await setDoc(doc(db, "rooms", roomId), {
        roomName: roomName ?? "",
        roomId: roomId ?? "",
        ownerUid: user.uid ?? "",
        createdAt: Date.now(),
        slides: safeSlides,
        startExam: false,
      });

      // exam questions
      await Promise.all(
        examQuestions.map((x, i) => {
          const data = sanitizeQA(x);
          return setDoc(doc(db, "rooms", roomId, "exam", `${i + 1}`), {
            ...data,
            number: i + 1,
          });
        })
      );

      // activity questions
      await Promise.all(
        activityQuestions.map((x, i) => {
          const data = sanitizeQA(x);
          return setDoc(doc(db, "rooms", roomId, "activity", `${i + 1}`), {
            ...data,
            number: i + 1,
          });
        })
      );

      router.push(`/teacher/game/${roomId}/creator`);
    } catch (err) {
      console.error("Error creating room:", err);
      alert(
        "Something went wrong saving the room. Check the browser console for details."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ======================= UI ======================= */
  return (
    <main style={page}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={header}
      >
        <h1 style={title}>Create Room</h1>
        <button style={saveBtn} onClick={createRoom}>
          {saving ? "Saving..." : "Create Room →"}
        </button>
      </motion.div>

      {/* ROOM SETTINGS */}
      <section style={section}>
        <h2 style={blockTitle}>Room Details</h2>
        <input
          style={input}
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <input
          style={{ ...input, background: "#1a2735" }}
          readOnly
          value={roomId}
        />
      </section>

      {/* Slides visible only in Activity Tab */}
      {activeTab === "activity" && (
        <section style={section}>
          <h2 style={blockTitle}>Upload Lesson Slides 📷</h2>
          <input
            type="file"
            accept="image/*"
            onChange={uploadSlide}
            style={fileInput}
          />
          {uploadingSlides && (
            <p style={{ color: "#00ffbf", fontSize: 13 }}>Uploading...</p>
          )}
          <div style={slidesWrap}>
            {slides.map((s, i) => (
              <img key={i} src={s} style={slideThumb} />
            ))}
          </div>
        </section>
      )}

      {/* TABS */}
      <div style={tabs}>
        <button
          style={tab(activeTab === "exam")}
          onClick={() => {
            setActiveTab("exam");
            setActiveField(null);
            setKeyboardOpen(false);
          }}
        >
          Exam Questions
        </button>
        <button
          style={tab(activeTab === "activity")}
          onClick={() => {
            setActiveTab("activity");
            setActiveField(null);
            setKeyboardOpen(false);
          }}
        >
          Activity Questions
        </button>
      </div>

      {/* EXAM UI */}
      {activeTab === "exam" && (
        <section style={section}>
          {examQuestions.map((q, i) => (
            <div key={i} style={card}>
              <div style={cardTop}>
                <span style={qNum}>EXAM #{i + 1}</span>
                <button style={deleteBtn} onClick={() => delExam(i)}>
                  ✕
                </button>
              </div>

              <input
                style={input}
                placeholder="Question"
                value={q.q}
                onChange={(e) => updateExam(i, "q", e.target.value)}
                onFocus={() => {
                  setActiveField({ type: "exam", index: i, field: "q" });
                  setKeyboardOpen(false);
                }}
              />

              <div style={imgRow}>
                {q.imageUrl ? (
                  <img
                    src={q.imageUrl}
                    style={imgThumb}
                    alt={`Exam ${i + 1} image`}
                  />
                ) : (
                  <div style={{ ...imgThumb, opacity: 0.3 }}>No image</div>
                )}

                <label style={imgUploadBtn}>
                  {q.imageUrl ? "Change Question Image" : "Upload Question Image"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => uploadQuestionImage("exam", i, e)}
                  />
                </label>
              </div>
              {uploadingQuestion &&
                uploadingQuestion.type === "exam" &&
                uploadingQuestion.index === i && (
                  <p style={imgUploadHint}>Uploading image...</p>
                )}

              <div style={row}>
                <input
                  style={half}
                  placeholder="A1"
                  value={q.a1}
                  onChange={(e) => updateExam(i, "a1", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "exam", index: i, field: "a1" });
                    setKeyboardOpen(false);
                  }}
                />
                <input
                  style={half}
                  placeholder="A2"
                  value={q.a2}
                  onChange={(e) => updateExam(i, "a2", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "exam", index: i, field: "a2" });
                    setKeyboardOpen(false);
                  }}
                />
              </div>
              <div style={row}>
                <input
                  style={half}
                  placeholder="A3"
                  value={q.a3}
                  onChange={(e) => updateExam(i, "a3", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "exam", index: i, field: "a3" });
                    setKeyboardOpen(false);
                  }}
                />
                <input
                  style={half}
                  placeholder="A4"
                  value={q.a4}
                  onChange={(e) => updateExam(i, "a4", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "exam", index: i, field: "a4" });
                    setKeyboardOpen(false);
                  }}
                />
              </div>

              <select
                style={select}
                value={q.correct}
                onChange={(e) => updateExam(i, "correct", e.target.value)}
                onFocus={() => {
                  setActiveField({ type: "exam", index: i, field: "correct" });
                  setKeyboardOpen(false);
                }}
              >
                <option value="">Correct Answer</option>
                {[q.a1, q.a2, q.a3, q.a4].map((x, j) => (
                  <option key={j} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button style={addBtn} onClick={addExam}>
            + Add Exam Question
          </button>
        </section>
      )}

      {/* ACTIVITY UI */}
      {activeTab === "activity" && (
        <section style={section}>
          {activityQuestions.map((q, i) => (
            <div key={i} style={card}>
              <div style={cardTop}>
                <span style={qNum}>ACTIVITY #{i + 1}</span>
                <button style={deleteBtn} onClick={() => delAct(i)}>
                  ✕
                </button>
              </div>

              <input
                style={input}
                placeholder="Question"
                value={q.q}
                onChange={(e) => updateAct(i, "q", e.target.value)}
                onFocus={() => {
                  setActiveField({ type: "activity", index: i, field: "q" });
                  setKeyboardOpen(false);
                }}
              />

              <div style={imgRow}>
                {q.imageUrl ? (
                  <img
                    src={q.imageUrl}
                    style={imgThumb}
                    alt={`Activity ${i + 1} image`}
                  />
                ) : (
                  <div style={{ ...imgThumb, opacity: 0.3 }}>No image</div>
                )}

                <label style={imgUploadBtn}>
                  {q.imageUrl ? "Change Question Image" : "Upload Question Image"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => uploadQuestionImage("activity", i, e)}
                  />
                </label>
              </div>
              {uploadingQuestion &&
                uploadingQuestion.type === "activity" &&
                uploadingQuestion.index === i && (
                  <p style={imgUploadHint}>Uploading image...</p>
                )}

              <div style={row}>
                <input
                  style={half}
                  placeholder="Option 1"
                  value={q.a1}
                  onChange={(e) => updateAct(i, "a1", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "activity", index: i, field: "a1" });
                    setKeyboardOpen(false);
                  }}
                />
                <input
                  style={half}
                  placeholder="Option 2"
                  value={q.a2}
                  onChange={(e) => updateAct(i, "a2", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "activity", index: i, field: "a2" });
                    setKeyboardOpen(false);
                  }}
                />
              </div>
              <div style={row}>
                <input
                  style={half}
                  placeholder="Option 3"
                  value={q.a3}
                  onChange={(e) => updateAct(i, "a3", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "activity", index: i, field: "a3" });
                    setKeyboardOpen(false);
                  }}
                />
                <input
                  style={half}
                  placeholder="Option 4"
                  value={q.a4}
                  onChange={(e) => updateAct(i, "a4", e.target.value)}
                  onFocus={() => {
                    setActiveField({ type: "activity", index: i, field: "a4" });
                    setKeyboardOpen(false);
                  }}
                />
              </div>

              <select
                style={select}
                value={q.correct}
                onChange={(e) => updateAct(i, "correct", e.target.value)}
                onFocus={() => {
                  setActiveField({
                    type: "activity",
                    index: i,
                    field: "correct",
                  });
                  setKeyboardOpen(false);
                }}
              >
                <option value="">Correct Answer</option>
                {[q.a1, q.a2, q.a3, q.a4].map((x, j) => (
                  <option key={j} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button style={addBtn} onClick={addAct}>
            + Add Activity Question
          </button>
        </section>
      )}

      {/* MINI MATH KEYBOARD */}
      {activeField && (
        <>
          <button
            type="button"
            style={fabButton}
            onClick={() => setKeyboardOpen((prev) => !prev)}
          >
            π
          </button>

          {keyboardOpen && (
            <div style={keyboardContainer}>
              <div style={keyboardHeader}>
                <span style={keyboardTitle}>
                  Math symbols →{" "}
                  {activeField.type === "exam" ? "Exam" : "Activity"} #
                  {activeField.index + 1}
                </span>
                <button
                  type="button"
                  style={keyboardCloseBtn}
                  onClick={() => setKeyboardOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div style={keyboardRow}>
                {MATH_SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    style={keyButton}
                    type="button"
                    onClick={() => insertSymbol(sym)}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/* ======================= STYLES ======================= */

const page: CSSProperties = {
  background: "#07101e",
  minHeight: "100vh",
  padding: 18,
  color: "white",
  position: "relative",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#0b2a23",
  padding: "14px 22px",
  borderRadius: 10,
  marginBottom: 15,
  boxShadow: "0 0 10px #00ffa35b",
};

const title: CSSProperties = {
  fontSize: 30,
  fontWeight: "900",
  color: "#00ffa3",
};

const saveBtn: CSSProperties = {
  padding: "12px 28px",
  background: "#00ffa3",
  borderRadius: 8,
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};

const section: CSSProperties = {
  background: "#0d1729",
  padding: 20,
  borderRadius: 12,
  marginBottom: 15,
  boxShadow: "0 0 10px #00ffa31d",
};

const blockTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 14,
  color: "#7dfff6",
};

const input: CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  background: "#112031",
  border: "1px solid #163040",
  color: "white",
  marginBottom: 10,
  fontSize: 15,
};

const half: CSSProperties = { ...input, width: "49%" };

const row: CSSProperties = { display: "flex", gap: "2%" };

const select: CSSProperties = {
  ...input,
  background: "#031c2a",
  color: "#00ffa3",
  fontWeight: "bold",
};

const fileInput: CSSProperties = {
  ...input,
  border: "1px dashed #00ffa3",
  cursor: "pointer",
};

const slidesWrap: CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
};

const slideThumb: CSSProperties = {
  width: 90,
  height: 90,
  borderRadius: 8,
  objectFit: "cover",
  border: "2px solid #00ffa3",
};

const tabs: CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 15,
  marginTop: 5,
};

const tab = (a: boolean): CSSProperties => ({
  flex: 1,
  padding: 14,
  textAlign: "center",
  borderRadius: 8,
  fontWeight: "bold",
  background: a ? "#00ffa3" : "#1f2c3d",
  color: a ? "#063326" : "#8cd8d1",
  cursor: "pointer",
});

const card: CSSProperties = {
  background: "#0f1827",
  padding: 18,
  borderRadius: 10,
  marginBottom: 12,
  boxShadow: "0 0 10px #00ffa31a",
};

const cardTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const qNum: CSSProperties = {
  fontSize: 17,
  fontWeight: "bold",
  color: "#00ffa3",
};

const deleteBtn: CSSProperties = {
  background: "#ff3d6c",
  border: "none",
  padding: "4px 12px",
  borderRadius: 6,
  fontWeight: "bold",
  cursor: "pointer",
};

const addBtn: CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  fontWeight: "bold",
  background: "#00ffc5",
  border: "none",
  fontSize: 16,
  cursor: "pointer",
};

const imgRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
  marginTop: 4,
};

const imgThumb: CSSProperties = {
  width: 70,
  height: 70,
  borderRadius: 8,
  objectFit: "cover",
  border: "2px solid #00ffa3",
  background: "#020617",
  fontSize: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imgUploadBtn: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px dashed #00ffa3",
  background: "transparent",
  color: "#a5f3fc",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const imgUploadHint: CSSProperties = {
  fontSize: 11,
  color: "#38bdf8",
  marginTop: -4,
  marginBottom: 6,
};

const fabButton: CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 48,
  height: 48,
  borderRadius: 999,
  border: "none",
  background:
    "radial-gradient(circle at 30% 20%, #22c55e, #14b8ff 60%, #0f172a 100%)",
  color: "white",
  fontSize: 22,
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 25px rgba(0,0,0,0.6)",
  cursor: "pointer",
  zIndex: 50,
};

const keyboardContainer: CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: 74,
  background: "#020617f0",
  borderRadius: 14,
  padding: "10px 12px 12px",
  boxShadow: "0 18px 35px rgba(0,0,0,0.7)",
  border: "1px solid rgba(148,163,184,0.4)",
  zIndex: 49,
  maxWidth: 280,
  width: "92vw",
  maxHeight: "55vh",
  overflowY: "auto",
};

const keyboardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const keyboardTitle: CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
};

const keyboardCloseBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  fontSize: 14,
  cursor: "pointer",
};

const keyboardRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const keyButton: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "none",
  background: "#0f172a",
  color: "#e5e7eb",
  fontSize: 14,
  cursor: "pointer",
};

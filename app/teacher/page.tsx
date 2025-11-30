"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState, CSSProperties } from "react";
import { auth } from "@/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function TeacherPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Online / offline state
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // 🔍 Check authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔌 Track online / offline status
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 🛡️ Guarded navigation – blocks when offline
  function navigateProtected(path: string) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setShowOfflineModal(true);
      return;
    }
    router.push(path);
  }

  if (loading) return <main style={loadingScreen}>Checking login...</main>;

  return (
    <main style={page}>
      <motion.h1
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          color: "white",
          fontSize: "42px",
          fontWeight: "900",
          marginBottom: "40px",
          textShadow: "0 0 25px #14b8ff",
        }}
      >
        TEACHER MODE
      </motion.h1>

      <div style={wrap}>
        {/* CREATE ROOM — only if logged in */}
        <MenuButton
          label={user ? "CREATE ROOM" : "LOGIN FIRST TO CREATE"}
          color={user ? "#00ffa3" : "#ff6ad5"}
          onClick={() => {
            if (!user) {
              navigateProtected("/auth/login");
            } else {
              navigateProtected("/teacher/create");
            }
          }}
        />

        <MenuButton
          label="JOIN ROOM"
          color="#14b8ff"
          onClick={() => navigateProtected("/teacher/join")}
        />

        {/* Show Login Button if not signed in */}
        {!user && (
          <MenuButton
            label="LOGIN WITH GOOGLE"
            color="white"
            onClick={() => navigateProtected("/auth/login")}
          />
        )}

        {user && (
          <p style={{ color: "#00ffa3", marginTop: 10 }}>
            Logged in as <b>{user.displayName}</b> ✔
          </p>
        )}

        {/* Small online/offline indicator */}
        <p
          style={{
            marginTop: 6,
            fontSize: 12,
            color: isOnline ? "#6ee7b7" : "#fecaca",
          }}
        >
          Status: {isOnline ? "Online" : "Offline mode"}
        </p>
      </div>

      {/* 🔔 Offline modal */}
      {showOfflineModal && (
        <div style={modalOverlay}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            style={modalCard}
          >
            <div style={modalIconWrap}>
              <span style={modalIcon}>📡</span>
            </div>

            <h2 style={modalTitle}>Internet Needed</h2>
            <p style={modalText}>
              Teacher features like <b>Create Room</b>, <b>Join Room</b>, and{" "}
              <b>Login</b> need an internet connection.
              <br />
              <span style={{ color: "#6ee7ff" }}>
                Please reconnect to continue.
              </span>
            </p>

            <button
              type="button"
              onClick={() => setShowOfflineModal(false)}
              style={modalButton}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}

/* =========== COMPONENT =========== */
function MenuButton({
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
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 200 }}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "18px",
        borderRadius: "14px",
        border: "none",
        fontSize: "20px",
        fontWeight: "bold",
        background: color,
        color: "#0a0f24",
        cursor: "pointer",
        boxShadow: `0 0 20px ${color}aa`,
      }}
    >
      {label}
    </motion.button>
  );
}

/* =========== STYLES =========== */
const page: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#0a0f24,#111827)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "25px",
};

const wrap: CSSProperties = {
  width: "100%",
  maxWidth: "330px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const loadingScreen: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
  background: "#0a0f24",
  fontSize: 22,
};

/* Modal styles */
const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modalCard: CSSProperties = {
  width: "90%",
  maxWidth: 360,
  borderRadius: 20,
  padding: "20px 18px 18px",
  background:
    "radial-gradient(circle at top, rgba(56,189,248,0.18), transparent 55%), linear-gradient(180deg,#020617,#020617f0)",
  border: "1px solid rgba(148,163,184,0.8)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.9)",
  textAlign: "center",
  color: "#e5e7eb",
};

const modalIconWrap: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 999,
  margin: "0 auto 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at top, rgba(56,189,248,0.45), rgba(15,23,42,0.95))",
  boxShadow: "0 0 20px rgba(56,189,248,0.7)",
};

const modalIcon: CSSProperties = {
  fontSize: 30,
};

const modalTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 6,
};

const modalText: CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
  lineHeight: 1.6,
  marginBottom: 16,
};

const modalButton: CSSProperties = {
  marginTop: 4,
  width: "100%",
  padding: "10px 14px",
  borderRadius: 999,
  border: "none",
  background:
    "linear-gradient(135deg,#38bdf8,#22c55e)",
  color: "#020617",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

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

  // 🔍 Check authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
            if (!user) return router.push("/auth/login");
            router.push("/teacher/create");
          }}
        />

        <MenuButton
          label="JOIN ROOM"
          color="#14b8ff"
          onClick={() => router.push("/teacher/join")}
        />

        {/* Show Login Button if not signed in */}
        {!user && (
          <MenuButton
            label="LOGIN WITH GOOGLE"
            color="white"
            onClick={() => router.push("/auth/login")}
          />
        )}

        {user && (
          <p style={{ color: "#00ffa3", marginTop: 10 }}>
            Logged in as <b>{user.displayName}</b> ✔
          </p>
        )}
      </div>
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

/* =========== FIXED TYPES BELOW =========== */
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

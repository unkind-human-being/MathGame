"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0f24, #111827)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        textAlign: "center",
      }}
    >
      {/* TITLE */}
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          fontSize: "52px",
          fontWeight: "900",
          color: "white",
          textShadow: "0 0 25px #00eaff, 0 0 45px #00eaff",
          letterSpacing: "3px",
          marginBottom: "50px",
        }}
      >
        ASMATH
      </motion.h1>

      {/* MENU BUTTONS */}
      <div
        style={{
          width: "100%",
          maxWidth: "330px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <MenuButton label="STUDENT" color="#00ffa3" onClick={() => router.push("/student")} />
        <MenuButton label="TEACHER" color="#14b8ff" onClick={() => router.push("/teacher")} />

        {/* 🔥 Google Login at Bottom */}
        <div style={{ marginTop: "25px" }}>
          <MenuButton
            label="LOGIN WITH GOOGLE"
            color="#ffffff"
            onClick={() => router.push("/auth/login")}
          />
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------
   BUTTON COMPONENT
-------------------------------------------------------------*/
function MenuButton({
  label,
  onClick,
  color,
}: {
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
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
        color: "#0a0f24",
        background: color,
        boxShadow: `0 0 20px ${color}99, 0 0 40px ${color}55`,
        cursor: "pointer",
      }}
    >
      {label}
    </motion.button>
  );
}

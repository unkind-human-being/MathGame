"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import BackgroundSymbols from "./components/BackgroundSymbols";

export default function Home() {
  const router = useRouter();

  return (
    <main style={mainStyle}>
      <BackgroundSymbols /> {/* Background layer */}

      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={title}
      >
        AZMATH
      </motion.h1>

      <div style={menuBox}>
        <Button label="STUDENT" color="#00FFA3" onClick={() => router.push("/student")} />
        <Button label="TEACHER" color="#14B8FF" onClick={() => router.push("/teacher")} />

        <div style={{ marginTop: 30 }}>
          <Button label="LOGIN WITH GOOGLE" color="#FFF" onClick={() => router.push("/auth/login")} />
        </div>
      </div>
    </main>
  );
}

/* BUTTON UI */
function Button({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 160 }}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "18px",
        borderRadius: 14,
        fontSize: 20,
        fontWeight: "bold",
        background: color,
        color: "#0B1120",
        border: "none",
        cursor: "pointer",
        boxShadow: `0 0 18px ${color}60`,
      }}
    >
      {label}
    </motion.button>
  );
}

/* STYLES */
const mainStyle: CSSProperties = {
  height: "100vh",
  background: "linear-gradient(180deg,#050B18,#0D1529,#111827)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  overflow: "hidden",
};

const title: CSSProperties = {
  fontSize: 60,
  fontWeight: 900,
  color: "#fff",
  textShadow: "0 0 25px #00E7FF, 0 0 70px #00E7FF",
  letterSpacing: 4,
  marginBottom: 55,
};

const menuBox: CSSProperties = {
  width: "100%",
  maxWidth: 350,
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

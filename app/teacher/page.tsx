"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeacherPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0a0f24,#111827)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "25px",
      }}
    >
      {/* TITLE */}
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

      <div
        style={{
          width: "100%",
          maxWidth: "330px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* CREATE BUTTON */}
        <MenuButton
          label="CREATE ROOM"
          color="#00ffa3"
          onClick={() => router.push("/teacher/create")}
        />

        {/* JOIN BUTTON */}
        <MenuButton
          label="JOIN ROOM"
          color="#14b8ff"
          onClick={() => router.push("/teacher/join")}
        />
      </div>
    </main>
  );
}

/* Beautiful Button */
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

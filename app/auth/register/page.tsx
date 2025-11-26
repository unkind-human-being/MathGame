"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/firebase/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullname || !email || !password) {
      alert("Please fill out all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;

      await setDoc(doc(db, "users", user.uid), {
        fullname,
        email,
        createdAt: Date.now(),
      });

      alert("Account created successfully!");
      router.push("/auth/login");
    } catch (err: any) {
      alert(err.message);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0f24, #111827)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "25px",
      }}
    >
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: "center",
          color: "white",
          marginBottom: "30px",
          fontSize: "32px",
          fontWeight: "800",
          textShadow: "0 0 20px #00eaff",
        }}
      >
        Create Account
      </motion.h1>

      <InputField label="Full Name" value={fullname} onChange={setFullname} />
      <InputField label="Email" value={email} onChange={setEmail} />
      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
      />

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleRegister}
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          marginTop: "20px",
          borderRadius: "12px",
          border: "none",
          background: "#00ffa3",
          color: "#0a0f24",
          fontWeight: "bold",
          fontSize: "18px",
          boxShadow: "0 0 15px #00ffa3cc",
          cursor: "pointer",
        }}
      >
        {loading ? "Creating..." : "Register"}
      </motion.button>

      <p
        style={{
          marginTop: "15px",
          color: "#9ca3af",
          fontSize: "14px",
          textAlign: "center",
        }}
      >
        Already have an account?{" "}
        <span
          onClick={() => router.push("/auth/login")}
          style={{ color: "#00ffa3", cursor: "pointer" }}
        >
          Login
        </span>
      </p>
    </main>
  );
}

/* INPUT FIELD - Inside same file */
function InputField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ color: "#a5b4fc", fontSize: "14px" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "6px",
          borderRadius: "12px",
          border: "none",
          outline: "none",
          background: "#1f2937",
          color: "white",
          fontSize: "16px",
        }}
      />
    </div>
  );
}

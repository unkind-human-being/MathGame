"use client";

import { useState } from "react";
import { auth, provider } from "@/firebase/firebaseConfig";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

/* ======================= LOGIN PAGE ======================= */
export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Track login session
  onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) setUser(currentUser);
  });

  /* GOOGLE LOGIN */
  async function loginGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("Google Login Success:", user.email);

      // After login → redirect to main screen (change if needed)
      router.push("/teacher/dashboard");
    } catch (err) {
      console.log("Login Failed:", err);
      alert("Google login failed. Try again.");
    }
  }

  function logoutAccount() {
    signOut(auth).then(() => setUser(null));
  }

  return (
    <main style={page}>
      <h1 style={title}>🔐 Welcome</h1>
      <p style={sub}>Sign in to continue to the game</p>

      {!user ? (
        <>
          <button onClick={loginGoogle} style={googleBtn}>
            <img src="/google.png" style={gIcon} />
            Sign in with Google
          </button>
        </>
      ) : (
        <>
          <p style={{ marginTop: 20, fontSize: 16 }}>
            Logged in as <b>{user.displayName}</b>
          </p>

          <button style={startBtn} onClick={() => router.push("/teacher/dashboard")}>
            Continue →
          </button>

          <button style={logoutBtn} onClick={logoutAccount}>
            Logout
          </button>
        </>
      )}
    </main>
  );
}

/* ======================= UI STYLE ======================= */
const page = {
  height: "100vh",
  background: "#0a0f24",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 30
} as const;

const title = { fontSize: 32, fontWeight: "bold" };
const sub = { opacity: 0.7, marginBottom: 20 };

const googleBtn = {
  background: "white",
  color: "#000",
  padding: "12px 20px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16
} as const;

const gIcon = { width: 24, height: 24 };

const logoutBtn = {
  marginTop: 15,
  background: "#ff4b4b",
  color: "white",
  padding: "10px 20px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer"
} as const;

const startBtn = {
  marginTop: 25,
  background: "#00ffa3",
  color: "#062e21",
  padding: "12px 26px",
  borderRadius: 8,
  fontWeight: "bold",
  fontSize: 17,
  cursor: "pointer"
} as const;

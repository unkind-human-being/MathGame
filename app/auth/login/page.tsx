"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function loginGoogle() {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/"); // redirect after success
    } catch (err) {
      console.log("Login failed:", err);
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight:"100vh", background:"#0a0f24", color:"white",
      display:"flex", flexDirection:"column", justifyContent:"center", 
      alignItems:"center", textAlign:"center", padding:"40px"
    }}>

      <motion.h2
        initial={{opacity:0, y:-10}}
        animate={{opacity:1,y:0}}
        transition={{duration:.5}}
        style={{fontSize:"36px",fontWeight:"bold",marginBottom:20}}
      >
        Login with Google
      </motion.h2>

      <motion.button
        whileTap={{scale:.94}}
        whileHover={{scale:1.04}}
        disabled={loading}
        onClick={loginGoogle}
        style={{
          background:"white", color:"#0a0f24", padding:"14px 28px",
          borderRadius:"10px", fontWeight:"bold", fontSize:"18px",
          cursor:"pointer", width:"240px"
        }}
      >
        {loading? "Signing in..." : "Continue with Google"}
      </motion.button>

      <button 
        onClick={()=>router.push("/")}
        style={{marginTop:30,color:"#00ffa3",fontSize:16}}
      >
        ← Back Home
      </button>
    </main>
  );
}

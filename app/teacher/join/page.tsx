"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { useRouter } from "next/navigation";

export default function JoinRoom() {
  const router = useRouter();

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerName, setPlayerName] = useState("");

  // Load rooms
  useEffect(() => {
    async function loadRooms() {
      const snap = await getDocs(collection(db, "rooms"));
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      setRooms(list);
    }
    loadRooms();
  }, []);

  async function joinRoom(id: string) {
    if (!playerName.trim()) return alert("Enter your name first.");

    // create random UID for guest players
    const userId = Math.random().toString(36).substring(2, 10);

    // ADD TO ATTENDANCE LIST
    await setDoc(doc(db, "rooms", id, "attendance", userId), {
      name: playerName,
      ready: false,
      score: 0,
      joinedAt: Date.now(),
    });

    // redirect to player screen
    router.push(`/teacher/game/${id}/player?uid=${userId}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0a0f24,#111827)",
        padding: "20px",
        color: "white",
      }}
    >
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: "center",
          fontSize: "34px",
          fontWeight: "900",
          marginBottom: "25px",
          textShadow: "0 0 20px #14b8ff",
        }}
      >
        JOIN ROOM
      </motion.h1>

      {/* NAME INPUT */}
      <label>Your Name</label>
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Enter your nickname"
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "12px",
          background: "#0f172a",
          color: "white",
          marginBottom: "20px",
        }}
      />

      {/* ROOM ID */}
      <label>Enter Room ID</label>
      <input
        value={roomIdInput}
        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
        placeholder="A1B2C3"
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "10px",
          background: "#0f172a",
          color: "white",
          marginTop: "5px",
        }}
      />

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => joinRoom(roomIdInput)}
        disabled={!roomIdInput || !playerName}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "15px",
          borderRadius: "12px",
          background: "#00ffa3",
          color: "#0a0f24",
          fontWeight: "bold",
          fontSize: "18px",
        }}
      >
        Join Room
      </motion.button>

      {/* Room List */}
      <h2 style={{ marginTop: "35px", color: "#6ee7ff" }}>
        Available Rooms
      </h2>

      {rooms.map((room, index) => (
        <motion.div
          key={index}
          whileHover={{ scale: 1.03 }}
          style={{
            background: "#1f2937",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "12px",
            cursor: "pointer",
          }}
          onClick={() => joinRoom(room.roomId)}
        >
          <strong>{room.roomName}</strong>
          <p style={{ color: "#6ee7ff" }}>ID: {room.roomId}</p>
        </motion.div>
      ))}
    </main>
  );
}

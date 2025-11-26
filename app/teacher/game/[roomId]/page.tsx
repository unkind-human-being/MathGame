"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { db, auth } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function GameRedirect() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;

  useEffect(() => {
    async function checkAccess() {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        alert("Room does not exist.");
        router.push("/teacher/join");
        return;
      }

      const roomData = snap.data();

      // --- HOST CHECK ---
      const user = auth.currentUser;

      if (user && user.uid === roomData.ownerUid) {
        // host is always redirected to creator control screen
        router.replace(`/teacher/game/${roomId}/creator`);
        return;
      }

      // --- PLAYER CHECK ---
      const uid = searchParams.get("uid");
      const name = searchParams.get("name");

      if (!uid) {
        // Player has no UID → force back to join page
        router.replace("/teacher/join");
        return;
      }

      // Redirect player to correct screen
      router.replace(`/teacher/game/${roomId}/player?uid=${uid}`);
    }

    checkAccess();
  }, [roomId, router, searchParams]);

  return (
    <main
      style={{
        height: "100vh",
        background: "black",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "20px",
      }}
    >
      Loading game...
    </main>
  );
}

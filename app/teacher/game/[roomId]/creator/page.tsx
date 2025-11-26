"use client";
import { useEffect, useState, CSSProperties } from "react";
import { motion } from "framer-motion";
import { db } from "@/firebase/firebaseConfig";
import { doc,onSnapshot,updateDoc,collection,getDocs,deleteDoc } from "firebase/firestore";
import { useParams,useRouter } from "next/navigation";

export default function CreatorScreen(){
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [roomInfo,setRoomInfo] = useState<any>(null);
  const [players,setPlayers] = useState<any[]>([]);
  const [publishing,setPublishing] = useState(false);
  const [loadingActivity,setLoadingActivity] = useState(false);
  const [loadingExam,setLoadingExam] = useState(false);
  const [showLeaderboard,setShowLeaderboard] = useState(false);
  const [stopping,setStopping] = useState(false);

  /* ========== LIVE LISTEN ROOM ========== */
  useEffect(()=>{
    return onSnapshot(doc(db,"rooms",roomId),(snap)=>{
      if(snap.exists()) setRoomInfo(snap.data());
    });
  },[roomId]);

  /* ========== LIVE PLAYERS ========== */
  useEffect(()=>{
    const ref = collection(db,"rooms",roomId,"attendance");
    return onSnapshot(ref,(snap)=>{
      const arr:any[]=[];
      snap.forEach(d=>arr.push({id:d.id,...d.data()}));
      setPlayers(arr);
    });
  },[roomId]);

  /* ========== START ACTIVITY ========== */
  async function startActivity(){
    setLoadingActivity(true);
    await updateDoc(doc(db,"rooms",roomId),{mode:"activity",resultsPublished:false});
    setLoadingActivity(false);
  }

  /* ========== START EXAM ========== */
  async function startExam(){
    setLoadingExam(true);
    await updateDoc(doc(db,"rooms",roomId),{mode:"exam"});
    setLoadingExam(false);
  }

  /* ========== PUBLISH LEADERBOARD (POPUP) ========== */
  async function publishLeaderboard(){
    setPublishing(true);

    const ranked = players.map(p=>({
      ...p,
      total:(p.activityScore??0)+(p.examScore??0)
    })).sort((a,b)=>b.total-a.total);

    await updateDoc(doc(db,"rooms",roomId),{
      leaderboard:ranked,
      resultsPublished:true
    });

    setPublishing(false);
    setShowLeaderboard(true);  // 🔥 SHOW POPUP UI
  }

  /* ========== DELETE ROOM ========== */
  async function stopRoom(){
    if(!confirm("Delete room permanently?")) return;
    setStopping(true);

    for(const c of ["attendance","activity","exam"]){
      const s=await getDocs(collection(db,"rooms",roomId,c));
      for(const d of s.docs) await deleteDoc(d.ref);
    }
    await deleteDoc(doc(db,"rooms",roomId));
    router.push("/");
  }

  /* =================== UI ==================== */
  return(
    <main style={page}>
      <motion.h1 initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} style={title}>
        HOST PANEL
      </motion.h1>

      {roomInfo && (
        <div style={roomBox}>
          <p style={{fontSize:22,fontWeight:"bold"}}>{roomInfo.roomName}</p>
          <p style={{color:"#00ffa3"}}>Room ID: {roomInfo.roomId}</p>
          <p style={{opacity:.6}}>MODE: <b>{roomInfo.mode || "Waiting"}</b></p>
        </div>
      )}

      <section style={card}>
        <h2 style={sub}>Controls</h2>

        <button style={btn("#00ffa3")} disabled={loadingActivity} onClick={startActivity}>
          {loadingActivity?"Starting...":"Start Activity 🟢"}
        </button>

        <button style={btn("#4dabff")} disabled={loadingExam} onClick={startExam}>
          {loadingExam?"Loading...":"Start Exam 📘"}
        </button>

        <button style={btn("#ffaa00")} disabled={publishing} onClick={publishLeaderboard}>
          {publishing?"Publishing...":"Publish Leaderboard 🏆"}
        </button>

        <button style={btn("#ff3b3b")} disabled={stopping} onClick={stopRoom}>
          {stopping?"Deleting...":"🛑 End & Delete"}
        </button>
      </section>

      <section style={card}>
        <h2 style={sub}>Players ({players.length})</h2>
        {players.map(p=>(
          <div style={playerRow} key={p.id}>
            <span style={name}>{p.name}</span>
            <span style={scoreBox}>A:{p.activityScore??0}</span>
            <span style={scoreBox}>E:{p.examScore??0}</span>
            <b style={{color:"#00ffa3"}}>
              {(p.activityScore??0)+(p.examScore??0)}
            </b>
          </div>
        ))}
      </section>


      {/* ================== POPUP LEADERBOARD ================== */}
      {showLeaderboard && (
        <div style={popupBg}>
          <motion.div initial={{scale:.6,opacity:0}}
            animate={{scale:1,opacity:1}} style={popupCard}>

            <h1 style={{fontSize:26,marginBottom:10}}>🏆 Leaderboard</h1>

            <table style={table}>
              <thead>
                <tr><th>Name</th><th>Activity</th><th>Exam</th><th>Total</th></tr>
              </thead>
              <tbody>
                {players
                  .sort((a,b)=>((b.activityScore??0)+(b.examScore??0)) - ((a.activityScore??0)+(a.examScore??0)))
                  .map(p=>(
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.activityScore ?? 0}</td>
                      <td>{p.examScore ?? 0}</td>
                      <td style={{color:"#00ffa3",fontWeight:"bold"}}>
                        {(p.activityScore??0)+(p.examScore??0)}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>

            <button style={btn("#ff6ad5")} onClick={()=>setShowLeaderboard(false)}>
              Close
            </button>
          </motion.div>
        </div>
      )}

    </main>
  );
}

/* ================= STYLE ================= */
const page:CSSProperties={background:"#07101e",minHeight:"100vh",padding:22,color:"white"};
const title:CSSProperties={fontSize:28,fontWeight:"900",textAlign:"center",marginBottom:10,color:"#00ffa3"};
const card:CSSProperties={background:"#0f1827",padding:18,borderRadius:12,marginBottom:16};
const sub:CSSProperties={fontSize:20,fontWeight:"bold",marginBottom:14,color:"#7dfff6"};
const roomBox:CSSProperties={background:"#101d30",padding:14,borderRadius:10,marginBottom:18,textAlign:"center"};
const btn=(c:string):CSSProperties=>({width:"100%",padding:14,borderRadius:10,background:c,
  color:"#031616",fontWeight:"bold",fontSize:18,marginBottom:10,border:"none",cursor:"pointer"});
const playerRow:CSSProperties={display:"flex",justifyContent:"space-between",padding:"8px 4px",borderBottom:"1px solid #12314a"};
const name:CSSProperties={fontWeight:"bold",fontSize:17};
const scoreBox:CSSProperties={fontSize:16,color:"#7dd3fc"};

const popupBg:CSSProperties={position:"fixed",inset:0,background:"rgba(0,0,0,.8)",
  display:"flex",alignItems:"center",justifyContent:"center",zIndex:999};
const popupCard:CSSProperties={background:"#101b2e",padding:25,borderRadius:12,width:"92%",maxWidth:450};
const table:CSSProperties={width:"100%",textAlign:"center",marginBottom:15,fontSize:17};

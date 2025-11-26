"use client";

import { useEffect, useState, CSSProperties, useRef } from "react";
import { db } from "@/firebase/firebaseConfig";
import { doc, onSnapshot, updateDoc, collection, getDocs } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ========= TYPES ========= */
type QSet = { number:number; question:string; answers:string[]; correct:string };
type Mode = "waiting" | "activity" | "waitingExam" | "exam" | "done" | "results";

/* ========= MAIN ========= */
export default function PlayerScreen(){
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const uid = searchParams.get("uid") as string;

  /* ========= STATE ========= */
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [activityQ, setActivityQ] = useState<QSet[]>([]);
  const [examQ, setExamQ] = useState<QSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [viewImg, setViewImg] = useState<string|null>(null);
  const [index, setIndex] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [mode, setMode] = useState<Mode>("waiting");

  /* ========= AUDIO ========= */
  const activityMusic = useRef<HTMLAudioElement|null>(null);
  const examMusic = useRef<HTMLAudioElement|null>(null);
  const clickFx = useRef<HTMLAudioElement|null>(null);

  const [musicEnabled,setMusicEnabled] = useState(true);
  const [fxEnabled,setFxEnabled] = useState(true);

  function stopMusic(){
    activityMusic.current?.pause();
    examMusic.current?.pause();
  }

  function playClick(){
    if(!fxEnabled || !clickFx.current) return;
    clickFx.current.currentTime = 0;
    clickFx.current.play().catch(()=>{});
  }

  useEffect(()=>{
    stopMusic();
    if(!musicEnabled) return;

    if(mode==="activity") activityMusic.current?.play().catch(()=>{});
    if(mode==="exam")     examMusic.current?.play().catch(()=>{});
  },[mode,musicEnabled]);

  /* ========= FIRESTORE REAL-TIME ========= */
  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"rooms",roomId),(snap)=>{
      if(!snap.exists()) return;
      const data=snap.data();
      setRoomInfo(data);

      if(data.mode==="activity"){ setIndex(0); setRoundScore(0); setMode("activity"); }
      if(data.mode==="exam"){ setIndex(0); setRoundScore(0); setMode("exam"); }
      if(data.resultsPublished){ setLeaderboard(data.leaderboard||[]); setMode("results"); }
    });
    return()=>unsub();
  },[]);

  /* ========= LOAD QUESTIONS ========= */
  useEffect(()=>{
    async function load(){
      const A = await getDocs(collection(db,"rooms",roomId,"activity"));
      const E = await getDocs(collection(db,"rooms",roomId,"exam"));
      const act:QSet[]=[], ex:QSet[]=[];
      A.forEach(d=>act.push(d.data() as QSet));
      E.forEach(d=>ex.push(d.data() as QSet));
      setActivityQ(act.sort((a,b)=>a.number-b.number));
      setExamQ(ex.sort((a,b)=>a.number-b.number));
    }
    load();
  },[]);

  /* ========= ANSWER ========= */
  async function select(ans:string){
    playClick();

    const list = mode==="activity" ? activityQ : examQ;
    const ok = ans===list[index].correct;
    const next = index+1===list.length;
    const score = roundScore + (ok?1:0);

    if(next){
      if(mode==="activity"){
        await updateDoc(doc(db,"rooms",roomId,"attendance",uid),{activityScore:score});
        setMode("waitingExam");
        setIndex(0); setRoundScore(0);
      } else {
        await updateDoc(doc(db,"rooms",roomId,"attendance",uid),{examScore:score});
        setMode("done");
      }
      return;
    }
    setRoundScore(score);
    setIndex(p=>p+1);
  }

  /* ========= SETTINGS MODAL ========= */
  const [showSettings,setShowSettings] = useState(false);

  const SettingsModal = () => !showSettings ? null : (
    <div style={overlay} onClick={()=>setShowSettings(false)}>
      <div style={settingsBox} onClick={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0,marginBottom:8}}>⚙ Sound Settings</h3>

        <div style={row} onClick={()=>setMusicEnabled(!musicEnabled)}>
          <span>🎵 Music</span>
          <Toggle enabled={musicEnabled}/>
        </div>
        <div style={row} onClick={()=>setFxEnabled(!fxEnabled)}>
          <span>🔊 Click Sound</span>
          <Toggle enabled={fxEnabled}/>
        </div>

        <button style={{...btn("#ff6ad5"),marginTop:15}} onClick={()=>setShowSettings(false)}>
          Close
        </button>
      </div>
    </div>
  );

  const PageWrap = (content:any)=>( 
    <main style={page}>
      <button style={settingsBtn} onClick={()=>setShowSettings(true)}>⚙</button>
      <SettingsModal/>
      {content}
      <AudioBlock/>
    </main>
  );

  /* ========= UI SCREENS (UNCHANGED) ========= */
  if(mode==="waiting") return PageWrap(<>
    <h1 style={big}>⏳ Waiting for Activity...</h1>
    <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg}/>
    {viewImg && <FullImage img={viewImg} close={()=>setViewImg(null)}/>}
  </>);

  if(mode==="waitingExam") return PageWrap(<>
    <h1 style={big}>💠 Activity done – waiting for Exam...</h1>
    <SlidesGrid roomInfo={roomInfo} setViewImg={setViewImg}/>
    {viewImg && <FullImage img={viewImg} close={()=>setViewImg(null)}/>}
  </>);

  if(mode==="activity") return PageWrap(<>
    <h1 style={big}>🟢 Activity</h1>
    <h3 style={small}>{index+1}/{activityQ.length}</h3>
    <div style={box}>{activityQ[index].question}</div>
    {activityQ[index].answers.map((a,i)=>(
      <button key={i} style={btn(colors[i])} onClick={()=>select(a)}>{a}</button>
    ))}
    <p style={{opacity:.5}}>Score: {roundScore}</p>
  </>);

  if(mode==="exam") return PageWrap(<>
    <h1 style={big}>📘 Exam</h1>
    <h3 style={small}>{index+1}/{examQ.length}</h3>
    <div style={box}>{examQ[index].question}</div>
    {examQ[index].answers.map((a,i)=>(
      <button key={i} style={btn(colors[i])} onClick={()=>select(a)}>{a}</button>
    ))}
  </>);

  if(mode==="done") return PageWrap(<h1 style={big}>✔ Finished — Waiting Results...</h1>);

  if(mode==="results"){
    const sorted=[...leaderboard].sort((a,b)=>(
      (b.activityScore??0)+(b.examScore??0) -
      ((a.activityScore??0)+(a.examScore??0))
    ));
    return PageWrap(<>
      <h1 style={big}>🏆 Final Leaderboard</h1>
      <table style={table}>
        <thead><tr><th>Name</th><th>Act</th><th>Exam</th><th>Total</th></tr></thead>
        <tbody>
          {sorted.map((p,i)=>{
            const T=(p.activityScore??0)+(p.examScore??0);
            return(
              <tr key={p.id} style={p.id===uid?{background:"#00ffaa33",fontWeight:"bold"}:{}}>
                <td>{i+1}. {p.name}</td>
                <td>{p.activityScore}</td>
                <td>{p.examScore}</td>
                <td style={{color:"#00ffa3"}}>{T}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button style={btn("#ff6ad5")} onClick={()=>router.push("/")}>Exit</button>
    </>);
  }

  return null;

  /* ========= AUDIO TAGS ========= */
  function AudioBlock(){
    return<>
      <audio ref={activityMusic} src="/sounds/activity_bg.wav" loop preload="auto"/>
      <audio ref={examMusic}    src="/sounds/exam_bg.wav" loop preload="auto"/>
      <audio ref={clickFx}      src="/sounds/click.wav" preload="auto"/>
    </>
  }
}


/* ========= COMPONENTS ========= */
const Toggle = ({enabled}:{enabled:boolean})=>(
  <div style={{
    width:48,height:24,borderRadius:30,background:enabled?"#00ffa3":"#777",
    position:"relative",transition:"0.2s"
  }}>
    <div style={{
      width:20,height:20,borderRadius:"50%",background:"white",
      position:"absolute",top:2,left:enabled?24:2,transition:"0.2s"
    }}/>
  </div>
);

const SlidesGrid = ({roomInfo,setViewImg}:{roomInfo:any,setViewImg:(img:string|null)=>void})=>
  !roomInfo?.slides ? null : (
    <div style={grid}>
      {roomInfo.slides.map((img:string,i:number)=>
        <img key={i} src={img} style={thumb} onClick={()=>setViewImg(img)}/>
      )}
    </div>
  );

const FullImage=({img,close}:{img:string;close:()=>void})=>(
  <div style={viewBox} onClick={close}><img src={img} style={fullImg}/></div>
);


/* ========= STYLES (SAME ECXCEPT ADDED MODAL) ========= */
const page:CSSProperties={minHeight:"100vh",background:"#0a0f24",color:"white",padding:25,textAlign:"center"};
const big:CSSProperties={fontSize:30,fontWeight:"900",marginBottom:10};
const small:CSSProperties={fontSize:18,opacity:.7,marginBottom:10};
const box:CSSProperties={background:"#152033",padding:20,borderRadius:8,marginBottom:15,fontSize:18};

const grid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,110px)",gap:10,justifyContent:"center"};
const thumb:CSSProperties={width:110,height:110,borderRadius:8,objectFit:"cover",border:"2px solid #00ffa3",cursor:"pointer"};

const viewBox:CSSProperties={position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99};
const fullImg:CSSProperties={maxWidth:"90vw",maxHeight:"90vh",borderRadius:8};

const table:CSSProperties={width:"100%",marginTop:10,borderCollapse:"collapse"};
const btn=(c:string):CSSProperties=>({padding:"14px",width:"100%",borderRadius:8,marginBottom:10,fontWeight:"bold",background:c,color:"#021512",border:"none",cursor:"pointer"});

const settingsBtn:CSSProperties={position:"absolute",top:10,right:10,fontSize:24,padding:"5px 12px",background:"#111",border:"2px solid #00ffa3",borderRadius:6,cursor:"pointer"};
const overlay:CSSProperties={position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999};
const settingsBox:CSSProperties={background:"#0b1220",padding:"20px 25px",borderRadius:12,border:"2px solid #00ffa3",width:260};
const row:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:18,padding:"6px 0",cursor:"pointer"};

const colors=["#00ffa3","#14b8ff","#ff6ad5","#ffae00"];

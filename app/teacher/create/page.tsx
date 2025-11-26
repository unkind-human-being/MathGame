"use client";

import { useState, useEffect, CSSProperties } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// CLOUDINARY CONFIG
const CLOUD_NAME = "dxo9ga32o";
const UPLOAD_PRESET = "budget_upload";

export default function CreateRoom() {
  const router = useRouter();
  const [user,setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u=>{
      if(!u) router.push("/auth/login");
      else setUser(u);
    });
    return () => unsub();
  }, []);

  const [roomName,setRoomName] = useState("");
  const [roomId] = useState(() => Math.random().toString(36).substring(2,8).toUpperCase());

  /* ------------------ QUESTIONS ------------------ */
  const [examQuestions,setExamQuestions] = useState([{q:"",a1:"",a2:"",a3:"",a4:"",correct:""}]);
  const [activityQuestions,setActivityQuestions] = useState([{q:"",a1:"",a2:"",a3:"",a4:"",correct:""}]);

  const [activeTab,setActiveTab] = useState<"exam"|"activity">("exam");

  /* ------------------ SLIDES (only 1 uploader for all) ------------------ */
  const [slides,setSlides] = useState<string[]>([]);
  const [uploading,setUploading] = useState(false);
  const [saving,setSaving] = useState(false);

  async function uploadSlide(e:any){
    const file = e.target.files?.[0];
    if(!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file",file);
    form.append("upload_preset",UPLOAD_PRESET);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{
      method:"POST",body:form
    }).then(res=>res.json());

    setSlides(prev=>[...prev,r.secure_url]);
    setUploading(false);
  }

  /* ---------- Update Fields ---------- */
  const updateExam=(i:number,key:string,val:string)=>{ const c=[...examQuestions]; (c[i] as any)[key]=val; setExamQuestions(c); };
  const updateAct =(i:number,key:string,val:string)=>{ const c=[...activityQuestions];(c[i] as any)[key]=val; setActivityQuestions(c); };

  /* ---------- Add / Delete ---------- */
  const addExam=()=> setExamQuestions([...examQuestions,{q:"",a1:"",a2:"",a3:"",a4:"",correct:""}]);
  const addAct =()=> setActivityQuestions([...activityQuestions,{q:"",a1:"",a2:"",a3:"",a4:"",correct:""}]);

  const delExam=(i:number)=>{ if(examQuestions.length===1) return alert("Must have 1 Exam Minimum."); setExamQuestions(examQuestions.filter((_,x)=>x!==i)); };
  const delAct =(i:number)=>{ if(activityQuestions.length===1) return alert("Must have 1 Activity Minimum."); setActivityQuestions(activityQuestions.filter((_,x)=>x!==i)); };

  /* ---------- SAVE ROOM ---------- */
  async function createRoom(){
    if(!roomName) return alert("Enter room name");
    if(examQuestions.some(q=>!q.q || !q.correct) || activityQuestions.some(q=>!q.q || !q.correct))
      return alert("Complete all questions first");

    setSaving(true);

    await setDoc(doc(db,"rooms",roomId),{
      roomName,roomId,ownerUid:user?.uid,createdAt:Date.now(),slides,startExam:false
    });

    examQuestions.forEach((x,i)=> 
      setDoc(doc(db,"rooms",roomId,"exam",`${i+1}`),{
        number:i+1,question:x.q,answers:[x.a1,x.a2,x.a3,x.a4],correct:x.correct
      })
    );

    activityQuestions.forEach((x,i)=> 
      setDoc(doc(db,"rooms",roomId,"activity",`${i+1}`),{
        number:i+1,question:x.q,answers:[x.a1,x.a2,x.a3,x.a4],correct:x.correct
      })
    );

    router.push(`/teacher/game/${roomId}/creator`);
  }

  /* ======================= UI ======================= */
  return (
    <main style={page}>

      <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} style={header}>
        <h1 style={title}>Create Room</h1>
        <button style={saveBtn} onClick={createRoom}>{saving?"Saving...":"Create Room →"}</button>
      </motion.div>

      {/* ---------------- ROOM SETTINGS ---------------- */}
      <section style={section}>
        <h2 style={blockTitle}>Room Details</h2>
        <input style={input} placeholder="Room Name" value={roomName} onChange={e=>setRoomName(e.target.value)}/>
        <input style={{...input,background:"#1a2735"}} readOnly value={roomId}/>
      </section>

      {/* Slides visible only in Activity Tab */}
      {activeTab==="activity" && (
      <section style={section}>
        <h2 style={blockTitle}>Upload Lesson Slides 📷</h2>
        <input type="file" accept="image/*" onChange={uploadSlide} style={fileInput}/>
        {uploading && <p style={{color:"#00ffbf"}}>Uploading...</p>}
        <div style={slidesWrap}>{slides.map((s,i)=><img key={i} src={s} style={slideThumb}/>)}</div>
      </section>
      )}

      {/* ---------------- TABS ---------------- */}
      <div style={tabs}>
        <button style={tab(activeTab==="exam")} onClick={()=>setActiveTab("exam")}>Exam Questions</button>
        <button style={tab(activeTab==="activity")} onClick={()=>setActiveTab("activity")}>Activity Questions</button>
      </div>

      {/* ---------------- EXAM UI ---------------- */}
      {activeTab==="exam" && (
      <section style={section}>
        {examQuestions.map((q,i)=>(
          <div key={i} style={card}>
            <div style={cardTop}>
              <span style={qNum}>EXAM #{i+1}</span>
              <button style={deleteBtn} onClick={()=>delExam(i)}>✕</button>
            </div>

            <input style={input} placeholder="Question" value={q.q} onChange={e=>updateExam(i,"q",e.target.value)}/>
            <div style={row}><input style={half} placeholder="A1" value={q.a1} onChange={e=>updateExam(i,"a1",e.target.value)}/><input style={half} placeholder="A2" value={q.a2} onChange={e=>updateExam(i,"a2",e.target.value)}/></div>
            <div style={row}><input style={half} placeholder="A3" value={q.a3} onChange={e=>updateExam(i,"a3",e.target.value)}/><input style={half} placeholder="A4" value={q.a4} onChange={e=>updateExam(i,"a4",e.target.value)}/></div>

            <select style={select} value={q.correct} onChange={e=>updateExam(i,"correct",e.target.value)}>
              <option value="">Correct Answer</option>
              {[q.a1,q.a2,q.a3,q.a4].map((x,j)=><option key={j} value={x}>{x}</option>)}
            </select>
          </div>
        ))}
        <button style={addBtn} onClick={addExam}>+ Add Exam Question</button>
      </section>)}

      {/* ---------------- ACTIVITY UI ---------------- */}
      {activeTab==="activity" && (
      <section style={section}>
        {activityQuestions.map((q,i)=>(
          <div key={i} style={card}>
            <div style={cardTop}>
              <span style={qNum}>ACTIVITY #{i+1}</span>
              <button style={deleteBtn} onClick={()=>delAct(i)}>✕</button>
            </div>

            <input style={input} placeholder="Question" value={q.q} onChange={e=>updateAct(i,"q",e.target.value)}/>
            <div style={row}><input style={half} placeholder="Option 1" value={q.a1} onChange={e=>updateAct(i,"a1",e.target.value)}/><input style={half} placeholder="Option 2" value={q.a2} onChange={e=>updateAct(i,"a2",e.target.value)}/></div>
            <div style={row}><input style={half} placeholder="Option 3" value={q.a3} onChange={e=>updateAct(i,"a3",e.target.value)}/><input style={half} placeholder="Option 4" value={q.a4} onChange={e=>updateAct(i,"a4",e.target.value)}/></div>

            <select style={select} value={q.correct} onChange={e=>updateAct(i,"correct",e.target.value)}>
              <option value="">Correct Answer</option>
              {[q.a1,q.a2,q.a3,q.a4].map((x,j)=><option key={j} value={x}>{x}</option>)}
            </select>
          </div>
        ))}
        <button style={addBtn} onClick={addAct}>+ Add Activity Question</button>
      </section>)}

    </main>
  );
}


/* ======================= STYLES ======================= */

const page:CSSProperties={background:"#07101e",minHeight:"100vh",padding:18,color:"white"};
const header:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",
  background:"#0b2a23",padding:"14px 22px",borderRadius:10,marginBottom:15,boxShadow:"0 0 10px #00ffa35b"};
const title:CSSProperties={fontSize:30,fontWeight:"900",color:"#00ffa3"};
const saveBtn:CSSProperties={padding:"12px 28px",background:"#00ffa3",borderRadius:8,fontWeight:"bold",border:"none",cursor:"pointer",fontSize:16};

const section:CSSProperties={background:"#0d1729",padding:20,borderRadius:12,marginBottom:15,boxShadow:"0 0 10px #00ffa31d"};
const blockTitle:CSSProperties={fontSize:20,fontWeight:"bold",marginBottom:14,color:"#7dfff6"};

const input:CSSProperties={width:"100%",padding:14,borderRadius:10,background:"#112031",
  border:"1px solid #163040",color:"white",marginBottom:10,fontSize:15};
const half:CSSProperties={...input,width:"49%"};
const row:CSSProperties={display:"flex",gap:"2%"};

const select:CSSProperties={...input,background:"#031c2a",color:"#00ffa3",fontWeight:"bold"};

const fileInput:{[k:string]:any}={...input,border:"1px dashed #00ffa3",cursor:"pointer"};
const slidesWrap:CSSProperties={display:"flex",gap:10,overflowX:"auto"};
const slideThumb:CSSProperties={width:90,height:90,borderRadius:8,objectFit:"cover",border:"2px solid #00ffa3"};

const tabs:CSSProperties={display:"flex",gap:10,marginBottom:15,marginTop:5};
const tab=(a:boolean):CSSProperties=>({flex:1,padding:14,textAlign:"center",borderRadius:8,fontWeight:"bold",
  background:a?"#00ffa3":"#1f2c3d",color:a?"#063326":"#8cd8d1",cursor:"pointer"});

const card:CSSProperties={background:"#0f1827",padding:18,borderRadius:10,marginBottom:12,boxShadow:"0 0 10px #00ffa31a"};
const cardTop:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10};
const qNum:CSSProperties={fontSize:17,fontWeight:"bold",color:"#00ffa3"};
const deleteBtn:CSSProperties={background:"#ff3d6c",border:"none",padding:"4px 12px",borderRadius:6,fontWeight:"bold",cursor:"pointer"};
const addBtn:CSSProperties={width:"100%",padding:12,borderRadius:8,fontWeight:"bold",
  background:"#00ffc5",border:"none",fontSize:16,cursor:"pointer"};

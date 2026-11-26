import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const POINTS = [
  { name:"Sol çit at", kind:"AT", x:987, y:871, min:11, px:.125, py:.275 },
  { name:"Sol çit", kind:"DISPATCH", x:1012, y:921, min:4, px:.222, py:.425 },
  { name:"BF monu at", kind:"AT", x:1017, y:981, min:9, px:.365, py:.475 },
  { name:"BF gate at", kind:"AT", x:1001, y:1038, min:11, px:.575, py:.480 },
  { name:"BF gate dispatch", kind:"DISPATCH", x:996, y:1045, min:6, px:.675, py:.385 },
  { name:"Orta çit", kind:"DISPATCH", x:1046, y:1007, min:4, px:.455, py:.665 },
  { name:"Karus giriş", kind:"DISPATCH", x:1101, y:991, min:6, px:.355, py:.875 },
  { name:"Ağaç altı", kind:"DISPATCH", x:972, y:1105, min:4, px:.745, py:.195 },
  { name:"Karus felo tepe", kind:"DISPATCH", x:1045, y:1080, min:6, px:.700, py:.770 },
  { name:"Sağ çit at", kind:"AT", x:1039, y:1100, min:9, px:.820, py:.695 }
];
const MONU = { px:.465, py:.435 };
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;
const freshState = () => Object.fromEntries(POINTS.map(p => [p.name, null]));
const fmt = n => { const s=Math.max(0,Math.ceil(n)); return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };
const validRoom = s => /^[A-Z0-9-]{4,24}$/.test(s);

function App(){
  const [roomInput,setRoomInput] = useState("");
  const [room,setRoom] = useState("");
  const [mode,setMode] = useState("map");
  const [mute,setMute] = useState(false);
  const [voiceVolume,setVoiceVolume] = useState(() => {
    const saved=Number(localStorage.getItem("saha-voice-volume"));
    return Number.isFinite(saved) && saved>=0 && saved<=1 ? saved : 0.8;
  });
  const [darkMode,setDarkMode] = useState(() => localStorage.getItem("saha-dark-mode") === "true");
  const [state,setState] = useState(freshState);
  const [now,setNow] = useState(Date.now());
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  const channelRef = useRef(null);
  const lastWarnRef = useRef({});
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("saha-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("saha-voice-volume", String(voiceVolume));
  }, [voiceVolume]);

  const save = async next => {
    setState(next); stateRef.current=next;
    if (!room) return;
    try {
      const r=await fetch("/api/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room,state:next})});
      if(!r.ok) throw new Error("Sunucuya kaydedilemedi");
      channelRef.current?.send({type:"broadcast",event:"state",payload:{state:next}});
      setStatus("Senkronize");
    } catch(e){ setStatus("Bağlantı sorunu — yeniden deneniyor"); }
  };

  const joinRoom = async e => {
    e?.preventDefault();
    const code=roomInput.trim().toUpperCase();
    if(!validRoom(code)){setStatus("Oda kodu 4–24 karakter olmalı (A-Z, 0-9, -).");return;}
    setBusy(true); setStatus("Odaya bağlanılıyor…");
    try{
      const r=await fetch(`/api/room?room=${encodeURIComponent(code)}`);
      if(!r.ok) throw new Error("Oda sunucusuna bağlanılamadı.");
      const data=await r.json();
      const initial=data.state || freshState();
      setState(initial); stateRef.current=initial; setRoom(code);
      localStorage.setItem("saha-room",code);
      setStatus("Odaya bağlandın");
    }catch(err){setStatus(err.message || "Bağlantı hatası");}
    finally{setBusy(false);}
  };

  useEffect(()=>{
    const saved=localStorage.getItem("saha-room");
    if(saved){setRoomInput(saved);setRoom(saved);}
  },[]);

  useEffect(()=>{
    if(!room || !supabase) return;
    const channel=supabase.channel(`saha-room-${room}`,{config:{broadcast:{self:false}}})
      .on("broadcast",{event:"state"},({payload})=>{
        if(payload?.state){setState(payload.state);stateRef.current=payload.state;}
      }).subscribe();
    channelRef.current=channel;
    let alive=true;
    const sync=async()=>{
      try{
        const r=await fetch(`/api/room?room=${encodeURIComponent(room)}`);
        if(!r.ok) return;
        const data=await r.json();
        if(alive && data.state){
          const remote=data.state;
          setState(remote);stateRef.current=remote;
        }
      }catch{}
    };
    sync();
    const poll=setInterval(sync,5000);
    return()=>{alive=false;clearInterval(poll);supabase.removeChannel(channel);channelRef.current=null;};
  },[room]);

  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id);},[]);

  useEffect(()=>{
    if(!room) return;
    const next={...stateRef.current}; let changed=false;
    for(const p of POINTS){
      const end=next[p.name];
      if(end && end<=now){next[p.name]=null;lastWarnRef.current[p.name]=null;changed=true;}
      const remain=next[p.name] ? Math.ceil((next[p.name]-now)/1000) : null;
      if(remain!==null && remain>0 && remain<=20 && lastWarnRef.current[p.name]!==next[p.name]){
        lastWarnRef.current[p.name]=next[p.name];
        if(!mute) speak(p.name,p.kind,voiceVolume);
      }
    }
    if(changed) save(next);
  },[now,room,mute,voiceVolume]);

  const startTimer = name => {
    const p=POINTS.find(x=>x.name===name);
    playKeyTone(voiceVolume);
    const next={...stateRef.current,[name]:Date.now()+p.min*60000};
    lastWarnRef.current[name]=null;
    save(next);
    if(!mute) { try { window.speechSynthesis?.resume(); } catch{} }
  };

  // 1-9 select points 1-9; 0 selects point 10.
  useEffect(()=>{
    if(!room) return;
    const onKeyDown = e => {
      if(e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      const target=e.target;
      const tag=target?.tagName?.toLowerCase();
      if(tag==="input" || tag==="textarea" || tag==="select" || target?.isContentEditable) return;
      if(!/^[0-9]$/.test(e.key)) return;
      const numberToName = {
        "1":"Sol çit at",
        "2":"Sol çit",
        "3":"BF monu at",
        "4":"Karus giriş",
        "5":"Orta çit",
        "6":"BF gate at",
        "7":"BF gate dispatch",
        "8":"Karus felo tepe",
        "9":"Ağaç altı",
        "0":"Sağ çit at"
      };
      const pointName=numberToName[e.key];
      if(!pointName) return;
      e.preventDefault();
      startTimer(pointName);
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[room, mute]);

  const resetAll=()=>{lastWarnRef.current={};save(freshState());};
  const leave=()=>{setRoom("");setState(freshState());localStorage.removeItem("saha-room");setStatus("");};

  if(!room) return <main className="join-wrap"><section className="join-card">
    <div className="brand-mark">SST</div><h1>SAHA SÜRE TAKİP</h1>
    <p>Aynı oda kodunu giren herkes aynı sayaçları görür.</p>
    <form onSubmit={joinRoom}><label>Oda kodu</label><input value={roomInput} onChange={e=>setRoomInput(e.target.value.toUpperCase())} placeholder="ÖRN: KARUS-01" maxLength={24}/><button disabled={busy}>{busy?"Bağlanıyor…":"Odaya gir"}</button></form>
    <small>{status || "Oda kodunu ekibinle paylaş."}</small>
    <label className="join-theme-toggle"><input type="checkbox" checked={darkMode} onChange={e=>setDarkMode(e.target.checked)}/> Dark Mode</label>
  </section></main>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="title">SAHA SÜRE TAKİP</div>
      <div className="legend"><span className="at-dot"/> AT <span className="dispatch-mark">|</span> DISPATCH</div>
      <div className="top-actions">
        <label className="check"><input type="checkbox" checked={darkMode} onChange={e=>setDarkMode(e.target.checked)}/> Dark Mode</label>
        <label className="check"><input type="checkbox" checked={mute} onChange={e=>setMute(e.target.checked)}/> Sesli komutu kapat</label>
        <label className="check" style={{display:"inline-flex",alignItems:"center",gap:6}}>
          Ses
          <input aria-label="Ses seviyesi" type="range" min="0" max="1" step="0.05" value={voiceVolume} onChange={e=>setVoiceVolume(Number(e.target.value))} style={{width:90,accentColor:"#3b82c4"}}/>
          <span style={{minWidth:32}}>{Math.round(voiceVolume*100)}%</span>
        </label>
        <button className="quiet" onClick={resetAll}>Sıfırla</button>
        <div className="mode-switch"><button className={mode==="map"?"selected":""} onClick={()=>setMode("map")}>Harita</button><button className={mode==="list"?"selected":""} onClick={()=>setMode("list")}>2. Mod</button></div>
      </div>
    </header>
    <div className="roombar"><span>Oda: <b>{room}</b></span><span className="status">{status}</span><button onClick={()=>{navigator.clipboard?.writeText(room);setStatus("Oda kodu kopyalandı");}}>Kodu kopyala</button><button onClick={leave}>Odadan çık</button></div>
    {mode==="map" ? <section className="map-area">
      <div className="map-canvas">
        <div className="map-grid"/>
        <div className="map-water water-a"/><div className="map-water water-b"/>
        <div className="map-caption">SAHA HARİTASI</div>
        <div className="monu" style={{left:`${MONU.px*100}%`,top:`${MONU.py*100}%`}}><b>✕</b><span>Monu</span></div>
        {POINTS.map(p=>{
          const end=state[p.name], remain=end?Math.max(0,Math.ceil((end-now)/1000)):p.min*60;
          return <div key={p.name} className="map-point" style={{left:`${p.px*100}%`,top:`${p.py*100}%`}}>
            <div className="point-head"><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:18,height:18,borderRadius:5,background:"#d7e8f5",color:"#10212b",fontWeight:900,fontSize:11,marginRight:4}}>{({ "Sol çit at":"1", "Sol çit":"2", "BF monu at":"3", "Karus giriş":"4", "Orta çit":"5", "BF gate at":"6", "BF gate dispatch":"7", "Karus felo tepe":"8", "Ağaç altı":"9", "Sağ çit at":"0" }[p.name])}</span><span className={p.kind==="AT"?"at-dot big":"dispatch-mark big"}>{p.kind==="DISPATCH"?"|":""}</span><b>{p.name==="BF gate dispatch"?"BF gate":p.name}</b></div>
            <div className="point-meta">({p.x}, {p.y})</div>
            <div className={`timer ${remain<=60 && end?"urgent":""}`}>{fmt(remain)}</div>
            <button className={`cut-btn ${p.kind.toLowerCase()}`} onClick={()=>startTimer(p.name)}>KESTİM</button>
          </div>;
        })}
      </div>
    </section> : <section className="list-area">
      <div className="list-heading"><span>KONUM</span><span>SÜRE</span><span>İŞLEM</span></div>
      {POINTS.map(p=>{const end=state[p.name],remain=end?Math.max(0,Math.ceil((end-now)/1000)):p.min*60;return <div className="list-row" key={p.name}>
        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:5,background:"#d7e8f5",color:"#10212b",fontWeight:900,fontSize:11,marginRight:6}}>{({ "Sol çit at":"1", "Sol çit":"2", "BF monu at":"3", "Karus giriş":"4", "Orta çit":"5", "BF gate at":"6", "BF gate dispatch":"7", "Karus felo tepe":"8", "Ağaç altı":"9", "Sağ çit at":"0" }[p.name])}</span><span className={`symbol ${p.kind.toLowerCase()}`}>{p.kind==="AT"?"●":"|"}</span>
        <div className="list-name"><b>{p.name}</b><small>({p.x}, {p.y})</small></div>
        <strong className={`list-time ${remain<=60&&end?"urgent":""}`}>{fmt(remain)}</strong>
        <button className={`cut-btn ${p.kind.toLowerCase()}`} onClick={()=>startTimer(p.name)}>KESTİM</button>
      </div>})}
      <div className="list-row monu-row"><span className="symbol">✕</span><div className="list-name"><b>Monu</b><small>Sadece işaret</small></div><strong>—</strong></div>
    </section>}
    <footer>Bağlantı açık olduğu sürece oda sayaçları cihazlar arasında paylaşılır.</footer>
  </div>;
}

function playKeyTone(volume=0.8){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx=new AudioCtx();
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001,Math.min(1,volume))*0.22,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.22);
    gain.connect(ctx.destination);
    [880,1175].forEach((frequency,index)=>{
      const osc=ctx.createOscillator();
      const start=ctx.currentTime+index*0.09;
      osc.type="sine";
      osc.frequency.setValueAtTime(frequency,start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start+0.12);
    });
    window.setTimeout(()=>ctx.close(),400);
  }catch{}
}

function speak(name,kind,volume=0.8){
  if(!("speechSynthesis" in window)) return;
  let clean=name.toLocaleLowerCase("tr-TR").endsWith(" at")?name.slice(0,-3):name;
  if(kind==="DISPATCH" && clean.toLocaleLowerCase("tr-TR").endsWith(" dispatch")) {
    clean=clean.slice(0,-9).trim();
  }
  const category=kind==="AT"?"at":"dispatch";
  const message=name==="BF gate dispatch" ? "BF gate dispatch, yirmi saniye!" : `${clean} ${category}, çıkışa 20 saniye!`;
  const utterance=new SpeechSynthesisUtterance(message);
  utterance.lang="tr-TR";utterance.rate=1;utterance.pitch=1.05;utterance.volume=Math.max(0,Math.min(1,volume));
  const voices=window.speechSynthesis.getVoices();
  const tr=voices.filter(v=>v.lang.toLowerCase().startsWith("tr"));
  const female=tr.find(v=>/female| kadın|emel|filiz|female/i.test(v.name));
  if(female || tr[0]) utterance.voice=female||tr[0];
  window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
}

createRoot(document.getElementById("root")).render(<App/>);

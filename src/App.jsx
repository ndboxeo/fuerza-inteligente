
// ═══════════════════════════════════════════════════════════════════════════════
// FUERZA INTELIGENTE V3 — Arquitectura Modular
// ═══════════════════════════════════════════════════════════════════════════════
//
//  MÓDULOS (cada bloque es independiente):
//  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
//  │  [M1] STORE     │  │  [M2] AUTH      │  │  [M3] USERS     │
//  │  Context global │  │  Login/sesión   │  │  CRUD usuarios  │
//  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
//           │                    │                     │
//  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
//  │  [M4] ROUTINES  │  │  [M5] TRAINING  │  │  [M6] PROGRESS  │
//  │  CRUD rutinas   │  │  Registro live  │  │  Gráficos       │
//  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
//           │                    │                     │
//  ┌────────▼────────┐  ┌────────▼────────┐
//  │  [M7] MESSAGES  │  │  [M8] IMPORT    │
//  │  Chat           │  │  CSV/XLSX       │
//  └─────────────────┘  └─────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useContext, createContext, useCallback, useRef, useEffect } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// [M1] STORE — Estado global compartido entre todos los módulos
// ───────────────────────────────────────────────────────────────────────────────
const AppContext = createContext(null);
const useStore = () => useContext(AppContext);

const INITIAL_STORE = {
  // Usuarios: superadmin → coach → alumno
  users: [
    { id:"sa1", role:"superadmin", name:"Admin Master", email:"admin@fi.com",  password:"admin123", gender:null,     coachId:null,  active:true, photo:null, phone:"", birthdate:"" },
    { id:"c1",  role:"coach",     name:"Martín López", email:"martin@fi.com", password:"1234",     gender:null,     coachId:"sa1", active:true, photo:null, phone:"+54 11 1234-5678", birthdate:"1988-03-15" },
    { id:"c2",  role:"coach",     name:"Sofía Ruiz",   email:"sofia@fi.com",  password:"1234",     gender:"female", coachId:"sa1", active:true, photo:null, phone:"+54 11 9876-5432", birthdate:"1992-07-22" },
    { id:"a1",  role:"alumno",    name:"Juan Pérez",   email:"juan@fi.com",   password:"1234",     gender:"male",   coachId:"c1",  active:true, photo:null, phone:"+54 11 5555-1234", birthdate:"1995-11-08" },
    { id:"a2",  role:"alumno",    name:"Laura García", email:"laura@fi.com",  password:"1234",     gender:"female", coachId:"c1",  active:true, photo:null, phone:"+54 11 4444-9999", birthdate:"1998-02-14" },
    { id:"a3",  role:"alumno",    name:"Diego Torres", email:"diego@fi.com",  password:"1234",     gender:"male",   coachId:"c2",  active:true, photo:null, phone:"", birthdate:"1993-06-30" },
  ],
  // Rutinas por alumno
  routines: {
    a1: [
      { id:"r1", alumnoId:"a1", semana:5, label:"Día 1 – Pierna Fuerza", status:"done", duracion:"75–90 min",
        exercises:[
          { id:"e1", name:"Sentadilla trasera", sets:5, reps:5,  pct:"85%", peso:"102.5 kg", descanso:"2–3 min", instruccion:"Baja controlada, sube explosivo" },
          { id:"e2", name:"Peso muerto rumano", sets:4, reps:6,  pct:"75%", peso:"90 kg",    descanso:"2 min",   instruccion:"Siente el estiramiento" },
          { id:"e3", name:"Prensa 45°",         sets:3, reps:8,  pct:"70%", peso:"180 kg",   descanso:"90 seg",  instruccion:"Recorrido completo" },
        ],
        logs:{ e1:[{kg:102.5,reps:5,rpe:8},{kg:102.5,reps:5,rpe:8},{kg:105,reps:4,rpe:9}], e2:[], e3:[] }
      },
      { id:"r2", alumnoId:"a1", semana:5, label:"Día 2 – Tirón", status:"today", duracion:"60–75 min",
        exercises:[
          { id:"e4", name:"Dominadas lastradas", sets:4, reps:6,  pct:"—",   peso:"+15 kg", descanso:"2 min",  instruccion:"" },
          { id:"e5", name:"Remo con barra",       sets:4, reps:8,  pct:"70%", peso:"70 kg",  descanso:"90 seg", instruccion:"" },
          { id:"e6", name:"Curl de bíceps",        sets:3, reps:12, pct:"—",   peso:"20 kg",  descanso:"45 seg", instruccion:"" },
        ],
        logs:{ e4:[], e5:[], e6:[] }
      },
      { id:"r3", alumnoId:"a1", semana:5, label:"Día 3 – Empuje", status:"upcoming", duracion:"65–80 min",
        exercises:[
          { id:"e7", name:"Press de banca",    sets:5, reps:5,  pct:"85%", peso:"85 kg", descanso:"2–3 min", instruccion:"" },
          { id:"e8", name:"Press inclinado",   sets:4, reps:8,  pct:"70%", peso:"60 kg", descanso:"90 seg",  instruccion:"" },
        ],
        logs:{ e7:[], e8:[] }
      },
    ],
    a2: [
      { id:"r4", alumnoId:"a2", semana:2, label:"Día 1 – Full Body A", status:"done", duracion:"50–60 min",
        exercises:[
          { id:"f1", name:"Sentadilla goblet", sets:4, reps:12, pct:"—", peso:"24 kg", descanso:"90 seg", instruccion:"" },
          { id:"f2", name:"Hip thrust",        sets:4, reps:12, pct:"—", peso:"60 kg", descanso:"90 seg", instruccion:"" },
        ],
        logs:{ f1:[], f2:[] }
      },
      { id:"r5", alumnoId:"a2", semana:2, label:"Día 2 – Full Body B", status:"today", duracion:"50–60 min",
        exercises:[
          { id:"f3", name:"Press banca",  sets:3, reps:10, pct:"—", peso:"35 kg", descanso:"2 min",  instruccion:"" },
          { id:"f4", name:"Plancha",      sets:3, reps:"45s", pct:"—", peso:"BW",descanso:"60 seg", instruccion:"" },
        ],
        logs:{ f3:[], f4:[] }
      },
    ],
    a3: [],
  },
  // Mensajes entre coach↔alumno
  messages: {
    "c1-a1": [
      { id:"m1", from:"c1", to:"a1", text:"¡Buena semana Juan! Seguí así con la sentadilla.", ts:"10:32" },
      { id:"m2", from:"a1", to:"c1", text:"Gracias! La espalda baja me costó un poco.", ts:"10:45" },
    ],
    "c1-a2": [
      { id:"m3", from:"c1", to:"a2", text:"Laura, foco en técnica del hip thrust esta semana.", ts:"09:15" },
    ],
    "c2-a3": [],
  },
  // Progreso histórico por alumno/ejercicio
  progress: {
    a1: {
      "Sentadilla trasera": [80,85,90,92.5,97.5,100,102.5],
      "Press de banca":     [60,65,67.5,70,72.5,75,77.5],
      "Peso muerto":        [100,105,112.5,115,120,122.5,125],
    },
    a2: {
      "Sentadilla goblet": [16,18,20,22,24],
      "Hip thrust":        [40,45,50,55,60],
    },
    a3: {},
  },
};

function StoreProvider({ children }) {
  const [store, setStore] = useState(INITIAL_STORE);

  const dispatch = useCallback((action, payload) => {
    setStore(prev => {
      switch (action) {
        // ── USERS ──
        case "ADD_USER": return { ...prev, users: [...prev.users, payload] };
        case "UPDATE_USER": return { ...prev, users: prev.users.map(u => u.id===payload.id ? {...u,...payload} : u) };
        case "DELETE_USER": return { ...prev, users: prev.users.map(u => u.id===payload ? {...u,active:false} : u) };
        // ── ROUTINES ──
        case "ADD_ROUTINE": {
          const aId = payload.alumnoId;
          return { ...prev, routines: { ...prev.routines, [aId]: [...(prev.routines[aId]||[]), payload] } };
        }
        case "UPDATE_ROUTINE": {
          const aId = payload.alumnoId;
          return { ...prev, routines: { ...prev.routines, [aId]: prev.routines[aId].map(r => r.id===payload.id ? {...r,...payload} : r) } };
        }
        case "DELETE_ROUTINE": {
          const aId = payload.alumnoId;
          return { ...prev, routines: { ...prev.routines, [aId]: prev.routines[aId].filter(r => r.id!==payload.id) } };
        }
        case "SAVE_LOG": {
          const { alumnoId, rutinaId, logs } = payload;
          return { ...prev, routines: { ...prev.routines, [alumnoId]: prev.routines[alumnoId].map(r => r.id===rutinaId ? {...r, logs, status:"done"} : r) } };
        }
        // ── MESSAGES ──
        case "ADD_MESSAGE": {
          const key = payload.key;
          return { ...prev, messages: { ...prev.messages, [key]: [...(prev.messages[key]||[]), payload.msg] } };
        }
        // ── PROGRESS ──
        case "ADD_PROGRESS": {
          const { alumnoId, exercise, value } = payload;
          const cur = prev.progress[alumnoId]?.[exercise] || [];
          return { ...prev, progress: { ...prev.progress, [alumnoId]: { ...(prev.progress[alumnoId]||{}), [exercise]: [...cur, value] } } };
        }
        default: return prev;
      }
    });
  }, []);

  return <AppContext.Provider value={{ store, dispatch }}>{children}</AppContext.Provider>;
}

// ───────────────────────────────────────────────────────────────────────────────
// THEMES
// ───────────────────────────────────────────────────────────────────────────────
const THEMES = {
  superadmin: { accent:"#f59e0b", accent2:"#fbbf24", dim:"#f59e0b22" },
  coach:      { accent:"#e63946", accent2:"#ff6b6b", dim:"#e6394622" },
  male:       { accent:"#2563eb", accent2:"#60a5fa", dim:"#2563eb22" },
  female:     { accent:"#7c3aed", accent2:"#a78bfa", dim:"#7c3aed22" },
};
const getTheme = (user) => {
  if (!user) return THEMES.male;
  if (user.role === "superadmin") return THEMES.superadmin;
  if (user.role === "coach") return THEMES.coach;
  return user.gender === "female" ? THEMES.female : THEMES.male;
};

// ───────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ───────────────────────────────────────────────────────────────────────────────
function GlobalStyle({ accent, dim }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:#080810;color:#e2e2ee;font-family:'DM Sans',sans-serif;min-height:100vh;}
      :root{
        --bg:#080810;--surface:#0f0f1a;--card:#16161f;--border:#22223a;
        --accent:${accent};--dim:${dim};
        --green:#22c55e;--red:#ef4444;--orange:#f97316;--yellow:#f59e0b;
        --text:#e2e2ee;--sub:#7b7b9a;--muted:#3a3a5a;
      }
      input,select,textarea{
        background:var(--surface);border:1px solid var(--border);color:var(--text);
        border-radius:8px;padding:8px 12px;font-family:'DM Sans',sans-serif;font-size:13px;
        width:100%;outline:none;transition:border .15s;
      }
      input:focus,select:focus,textarea:focus{border-color:var(--accent);}
      button{cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s;}
      button:hover{opacity:.82;}
      ::-webkit-scrollbar{width:3px;height:3px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
      .fade{animation:fadeIn .25s ease;}
      @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      @media(min-width:768px){
        .sidebar-fixed{transform:translateX(0)!important;position:relative!important;height:100vh!important;}
        .bottom-nav{display:none!important;}
        .right-panel{display:flex!important;}
      }
    `}</style>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// BASE UI COMPONENTS (shared across all modules)
// ───────────────────────────────────────────────────────────────────────────────
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background:"var(--card)", borderRadius:12, border:"1px solid var(--border)", padding:16, ...style, cursor:onClick?"pointer":"default" }}>{children}</div>
);
const H = ({ children, size=18, style }) => (
  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:size, letterSpacing:.5, ...style }}>{children}</div>
);
const Pill = ({ label, color, size=11 }) => (
  <span style={{ fontSize:size, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", color, background:color+"22", padding:"3px 9px", borderRadius:99, whiteSpace:"nowrap", flexShrink:0 }}>{label}</span>
);
const Btn = ({ children, onClick, v="primary", style, disabled, full }) => {
  const base = { border:"none", borderRadius:9, padding:"9px 18px", fontWeight:600, fontSize:13, ...style, ...(full?{width:"100%"}:{}) };
  const vs = {
    primary: { background:"var(--accent)", color:"#fff" },
    ghost:   { background:"transparent", color:"var(--sub)", border:"1px solid var(--border)" },
    danger:  { background:"#ef444411", color:"#ef4444", border:"1px solid #ef444433" },
    success: { background:"#22c55e11", color:"#22c55e", border:"1px solid #22c55e33" },
    sm:      { background:"var(--accent)", color:"#fff", padding:"5px 12px", fontSize:12 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], opacity:disabled?.45:1 }}>{children}</button>;
};
const Divider = ({ style }) => <div style={{ height:1, background:"var(--border)", margin:"12px 0", ...style }} />;
const Label = ({ children }) => <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:5 }}>{children}</div>;
const Tag = ({ children }) => <span style={{ background:"var(--surface)", padding:"2px 8px", borderRadius:5, fontSize:11, color:"var(--sub)" }}>{children}</span>;

function Avatar({ name, color, size=36, photo, onClick, editable=false }) {
  return (
    <div onClick={onClick} style={{ position:"relative", width:size, height:size, borderRadius:"50%", flexShrink:0, cursor:editable?"pointer":"default" }}>
      {photo
        ? <img src={photo} alt={name} style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover", border:`2px solid ${color}` }}/>
        : <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:size*.38, border:`2px solid ${color}` }}>
            {name?.[0]?.toUpperCase()}
          </div>
      }
      {editable && (
        <div style={{ position:"absolute", bottom:0, right:0, width:size*.32, height:size*.32, background:"var(--surface)", borderRadius:"50%", border:"1.5px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.18 }}>
          📷
        </div>
      )}
    </div>
  );
}

// Photo upload input helper
function PhotoUpload({ onPhoto, children }) {
  const ref = useRef();
  const handle = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => onPhoto(ev.target.result);
    reader.readAsDataURL(f);
  };
  return (
    <>
      <div onClick={() => ref.current.click()} style={{ cursor:"pointer" }}>{children}</div>
      <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={handle}/>
    </>
  );
}

function Sparkline({ data, color, w=100, h=36 }) {
  if (!data || data.length < 2) return null;
  const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*(w-4)+2},${h-((v-mn)/rng)*(h-4)-2}`).join(" ");
  const last = pts.split(" ").at(-1).split(",");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}/>
    </svg>
  );
}

function BarChart({ data, color, h=56 }) {
  if (!data?.length) return null;
  const mx = Math.max(...data);
  return (
    <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:h }}>
      {data.map((v,i) => (
        <div key={i} style={{ flex:1, background:i===data.length-1?color:color+"44", borderRadius:"3px 3px 0 0", height:`${(v/mx)*100}%`, minHeight:4, transition:"height .3s" }} title={`${v} kg`}/>
      ))}
    </div>
  );
}

const sc = s => s==="done"?"#22c55e":s==="today"?"#f97316":"#6b7280";
const sl = s => s==="done"?"✓ Completado":s==="today"?"● Hoy":"○ Próximo";
const rpeC = r => r<=6?"#22c55e":r<=8?"#f97316":"#ef4444";
function RPESel({ value, onChange, compact }) {
  return (
    <div style={{ display:"flex", gap:compact?2:4 }}>
      {[6,7,8,9,10].map(r => (
        <button key={r} onClick={()=>onChange(r)} style={{ width:compact?22:28, height:compact?22:28, borderRadius:6, border:`1.5px solid ${value===r?rpeC(r):"var(--border)"}`, background:value===r?rpeC(r)+"33":"var(--surface)", color:value===r?rpeC(r):"var(--muted)", fontSize:compact?10:12, fontWeight:700 }}>{r}</button>
      ))}
    </div>
  );
}

// Modal wrapper
function Modal({ title, onClose, children, width=480 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--card)", borderRadius:14, border:"1px solid var(--border)", width:"100%", maxWidth:width, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
          <H size={16}>{title}</H>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"var(--sub)", fontSize:20 }}>×</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M2] AUTH MODULE
// ───────────────────────────────────────────────────────────────────────────────
function AuthModule({ onLogin }) {
  const { store } = useStore();
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");

  const handle = () => {
    const u = store.users.find(u => u.email===email && u.password===pw && u.active);
    if (u) onLogin(u);
    else setErr("Credenciales incorrectas");
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080810", padding:20 }}>
      <GlobalStyle accent="#2563eb" dim="#2563eb22"/>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, marginBottom:10 }}>
            <div style={{ width:46, height:46, background:"var(--accent)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚡</div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:26, letterSpacing:2 }}>FUERZA</div>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:12, color:"var(--accent)", letterSpacing:5, marginTop:-4 }}>INTELIGENTE</div>
            </div>
          </div>
          <p style={{ color:"var(--sub)", fontSize:14 }}>Plataforma de entrenamiento personalizado</p>
        </div>
        <Card>
          <div style={{ marginBottom:12 }}>
            <Label>EMAIL</Label>
            <input placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          <div style={{ marginBottom:18 }}>
            <Label>CONTRASEÑA</Label>
            <input type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          {err && <p style={{ color:"var(--red)", fontSize:12, marginBottom:10 }}>{err}</p>}
          <Btn onClick={handle} full>Ingresar →</Btn>
          <div style={{ marginTop:16, background:"var(--surface)", borderRadius:9, padding:12 }}>
            <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, marginBottom:8 }}>DEMO — Cuentas de prueba</div>
            {[
              { label:"⭐ SuperAdmin", email:"admin@fi.com",  pw:"admin123" },
              { label:"🔴 Entrenador", email:"martin@fi.com", pw:"1234" },
              { label:"🔵 Alumno",    email:"juan@fi.com",   pw:"1234" },
              { label:"🟣 Alumna",    email:"laura@fi.com",  pw:"1234" },
            ].map((d,i) => (
              <button key={i} onClick={()=>{setEmail(d.email);setPw(d.pw);}} style={{ display:"block", width:"100%", background:"transparent", border:"none", textAlign:"left", fontSize:12, color:"var(--text)", padding:"3px 0", cursor:"pointer" }}>
                {d.label} — <span style={{ color:"var(--sub)" }}>{d.email}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M3] USERS MODULE
// ───────────────────────────────────────────────────────────────────────────────
function UsersModule({ currentUser }) {
  const { store, dispatch } = useStore();
  const theme = getTheme(currentUser);
  const [modal, setModal] = useState(null); // null | "add" | "edit"
  const [editing, setEditing]   = useState(null);
  const [form, setForm]   = useState({ name:"", email:"", password:"1234", role:"alumno", gender:"male", coachId:"" });
  const [filter, setFilter] = useState("all");

  // SuperAdmin ve todos; coach ve solo sus alumnos
  const visibleUsers = store.users.filter(u => {
    if (!u.active) return false;
    if (currentUser.role === "superadmin") return u.id !== currentUser.id;
    if (currentUser.role === "coach") return u.role === "alumno" && u.coachId === currentUser.id;
    return false;
  }).filter(u => filter === "all" || u.role === filter);

  const coaches = store.users.filter(u => u.role==="coach" && u.active);

  const openAdd = () => {
    setForm({ name:"", email:"", password:"1234", role: currentUser.role==="coach"?"alumno":"coach", gender:"male", coachId: currentUser.role==="coach"?currentUser.id:"" });
    setModal("add");
  };
  const openEdit = (u) => { setEditing(u); setForm({...u}); setModal("edit"); };

  const save = () => {
    if (!form.name || !form.email) return;
    if (modal === "add") {
      dispatch("ADD_USER", { ...form, id:"u"+Date.now(), active:true });
    } else {
      dispatch("UPDATE_USER", { ...form, id:editing.id });
    }
    setModal(null);
  };

  const roleLabel = { superadmin:"SuperAdmin", coach:"Entrenador", alumno:"Alumno/a" };
  const roleColor = { superadmin:"var(--yellow)", coach:"var(--red)", alumno:"var(--accent)" };

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <H size={20}>Usuarios</H>
        <Btn onClick={openAdd} v="sm">+ Nuevo</Btn>
      </div>

      {currentUser.role === "superadmin" && (
        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
          {["all","coach","alumno"].map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?"var(--accent)":"var(--card)", border:`1px solid ${filter===f?"var(--accent)":"var(--border)"}`, color:filter===f?"#fff":"var(--sub)", borderRadius:8, padding:"5px 14px", fontSize:12, fontWeight:600 }}>
              {f==="all"?"Todos":f==="coach"?"Entrenadores":"Alumnos"}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visibleUsers.map(u => {
          const uTheme = getTheme(u);
          return (
            <Card key={u.id} style={{ padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar name={u.name} color={uTheme.accent} size={40} photo={u.role!=="superadmin"?u.photo:null}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{u.name}</div>
                  <div style={{ fontSize:12, color:"var(--sub)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                  {u.coachId && <div style={{ fontSize:11, color:"var(--sub)", marginTop:1 }}>Coach: {store.users.find(c=>c.id===u.coachId)?.name}</div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                  <Pill label={roleLabel[u.role]} color={roleColor[u.role]} />
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn onClick={()=>openEdit(u)} v="ghost" style={{ padding:"3px 10px", fontSize:11 }}>✏️</Btn>
                    <Btn onClick={()=>dispatch("DELETE_USER", u.id)} v="danger" style={{ padding:"3px 10px", fontSize:11 }}>🗑</Btn>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {visibleUsers.length === 0 && <div style={{ textAlign:"center", color:"var(--sub)", padding:32 }}>No hay usuarios en esta categoría</div>}
      </div>

      {modal && (
        <Modal title={modal==="add"?"Nuevo Usuario":"Editar Usuario"} onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><Label>NOMBRE COMPLETO</Label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Nombre Apellido"/></div>
            <div><Label>EMAIL</Label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@ejemplo.com"/></div>
            <div><Label>CONTRASEÑA</Label><input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Contraseña"/></div>
            {currentUser.role === "superadmin" && (
              <div>
                <Label>ROL</Label>
                <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  <option value="coach">Entrenador</option>
                  <option value="alumno">Alumno</option>
                </select>
              </div>
            )}
            {(form.role === "alumno") && (
              <>
                <div>
                  <Label>GÉNERO</Label>
                  <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>
                <div>
                  <Label>ENTRENADOR ASIGNADO</Label>
                  <select value={form.coachId} onChange={e=>setForm(p=>({...p,coachId:e.target.value}))}>
                    <option value="">— Seleccionar —</option>
                    {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <Divider/>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="ghost" onClick={()=>setModal(null)} full>Cancelar</Btn>
              <Btn onClick={save} full disabled={!form.name||!form.email}>Guardar ✓</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M8] IMPORT MODULE — CSV / XLSX upload
// ───────────────────────────────────────────────────────────────────────────────
function ImportModule({ alumnoId, onImport, onClose }) {
  const [file, setFile]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep]   = useState("choose"); // choose | preview | done
  const fileRef = useRef();

  const CSV_TEMPLATE = `nombre_ejercicio,series,reps,porcentaje_1rm,peso_objetivo,descanso,instruccion
Sentadilla trasera,5,5,85%,102.5 kg,2-3 min,Baja controlada sube explosivo
Peso muerto rumano,4,6,75%,90 kg,2 min,Siente el estiramiento
Prensa 45,3,8,70%,180 kg,90 seg,Recorrido completo`;

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_rutina_fi.csv";
    a.click();
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) throw new Error("El archivo está vacío o mal formateado");
    const headers = lines[0].split(",").map(h=>h.trim().toLowerCase());
    const required = ["nombre_ejercicio","series","reps"];
    required.forEach(r => { if (!headers.includes(r)) throw new Error(`Falta columna: ${r}`); });
    return lines.slice(1).map((line, i) => {
      const vals = line.split(",").map(v=>v.trim());
      const row = {};
      headers.forEach((h,j) => { row[h] = vals[j]||""; });
      return {
        id: "imp_"+Date.now()+"_"+i,
        name:         row["nombre_ejercicio"] || `Ejercicio ${i+1}`,
        sets:         parseInt(row["series"])||3,
        reps:         row["reps"]||"8",
        pct:          row["porcentaje_1rm"]||"—",
        peso:         row["peso_objetivo"]||"—",
        descanso:     row["descanso"]||"90 seg",
        instruccion:  row["instruccion"]||"",
      };
    });
  };

  const handleFile = async (f) => {
    setFile(f); setError("");
    try {
      if (f.name.endsWith(".csv") || f.type.includes("text")) {
        const text = await f.text();
        setPreview(parseCSV(text));
        setStep("preview");
      } else if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
        // XLSX: leer como texto tabulado (simplificado para demo)
        const text = await f.text();
        // Intentar parse como CSV con tabs
        const csvLike = text.replace(/\t/g, ",");
        try { setPreview(parseCSV(csvLike)); setStep("preview"); }
        catch { setError("Para XLSX, guardá el archivo como CSV desde Google Sheets y volvé a subirlo."); }
      } else {
        setError("Formato no soportado. Usá .csv o .xlsx");
      }
    } catch(e) {
      setError(e.message);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    onImport({
      id: "r"+Date.now(),
      alumnoId,
      semana: 1,
      label: file.name.replace(/\.(csv|xlsx|xls)$/,"").replace(/_/g," "),
      status: "upcoming",
      duracion: "60–75 min",
      exercises: preview,
      logs: Object.fromEntries(preview.map(e=>[e.id,[]]))
    });
    setStep("done");
    setTimeout(onClose, 1500);
  };

  return (
    <div>
      {step === "choose" && (
        <>
          <div style={{ background:"var(--surface)", borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>📥 Paso 1 — Descargá la plantilla</div>
            <div style={{ fontSize:12, color:"var(--sub)", marginBottom:10 }}>Completá la plantilla en Google Sheets o Excel y guardala como CSV.</div>
            <Btn onClick={downloadTemplate} v="ghost" full>⬇ Descargar plantilla CSV</Btn>
          </div>
          <div style={{ background:"var(--surface)", borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>📤 Paso 2 — Subí el archivo completado</div>
            <div
              onClick={()=>fileRef.current.click()}
              onDragOver={e=>{e.preventDefault();}}
              onDrop={e=>{e.preventDefault(); handleFile(e.dataTransfer.files[0]);}}
              style={{ border:"2px dashed var(--border)", borderRadius:10, padding:"28px 20px", textAlign:"center", cursor:"pointer", transition:"border .2s" }}
            >
              <div style={{ fontSize:28, marginBottom:8 }}>📁</div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{file ? file.name : "Arrastrá o hacé click para subir"}</div>
              <div style={{ fontSize:12, color:"var(--sub)" }}>CSV o XLSX</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
          </div>
          {error && <div style={{ background:"#ef444411", border:"1px solid #ef444433", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13 }}>{error}</div>}
        </>
      )}

      {step === "preview" && preview && (
        <>
          <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:"10px 14px", color:"#22c55e", fontSize:13, marginBottom:14 }}>
            ✓ {preview.length} ejercicios detectados en "{file.name}"
          </div>
          <div style={{ overflowX:"auto", marginBottom:14 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:400 }}>
              <thead>
                <tr style={{ background:"var(--surface)" }}>
                  {["Ejercicio","Series","Reps","%1RM","Peso","Descanso"].map(h => (
                    <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, color:"var(--sub)", fontWeight:700, letterSpacing:.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((e,i) => (
                  <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                    <td style={{ padding:"7px 10px", fontWeight:600 }}>{e.name}</td>
                    <td style={{ padding:"7px 10px" }}>{e.sets}</td>
                    <td style={{ padding:"7px 10px" }}>{e.reps}</td>
                    <td style={{ padding:"7px 10px", color:"var(--accent)" }}>{e.pct}</td>
                    <td style={{ padding:"7px 10px" }}>{e.peso}</td>
                    <td style={{ padding:"7px 10px" }}>{e.descanso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn v="ghost" onClick={()=>{setStep("choose");setPreview(null);setFile(null);}} full>← Volver</Btn>
            <Btn onClick={confirmImport} full>Importar rutina ✓</Btn>
          </div>
        </>
      )}

      {step === "done" && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <H size={18}>¡Rutina importada!</H>
          <div style={{ fontSize:13, color:"var(--sub)", marginTop:6 }}>Cerrando...</div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M4] ROUTINES MODULE
// ───────────────────────────────────────────────────────────────────────────────
function RoutinesModule({ currentUser, targetAlumnoId }) {
  const { store, dispatch } = useStore();
  const alumnoId = targetAlumnoId || currentUser.id;
  const myRoutines = store.routines[alumnoId] || [];
  const [modal, setModal] = useState(null); // null | "add" | "import"
  const [form, setForm]   = useState({ label:"", duracion:"60–75 min", semana:1, exercises:[] });
  const canEdit = currentUser.role !== "alumno";

  const addEx = () => setForm(p=>({...p, exercises:[...p.exercises,{id:"ne"+Date.now(), name:"", sets:3, reps:8, pct:"—", peso:"", descanso:"90 seg", instruccion:""}]}));
  const updEx = (i,k,v) => setForm(p=>{const ex=[...p.exercises]; ex[i]={...ex[i],[k]:v}; return {...p,exercises:ex};});
  const remEx = (i) => setForm(p=>({...p, exercises:p.exercises.filter((_,j)=>j!==i)}));

  const saveRoutine = () => {
    if (!form.label || !form.exercises.length) return;
    const r = { ...form, id:"r"+Date.now(), alumnoId, status:"upcoming", logs:Object.fromEntries(form.exercises.map(e=>[e.id,[]])) };
    dispatch("ADD_ROUTINE", r);
    setModal(null);
    setForm({ label:"", duracion:"60–75 min", semana:1, exercises:[] });
  };

  const handleImport = (r) => { dispatch("ADD_ROUTINE", r); };

  const alumnoName = store.users.find(u=>u.id===alumnoId)?.name || "";

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <H size={20}>Rutinas</H>
          {targetAlumnoId && <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>→ {alumnoName}</div>}
        </div>
        {canEdit && (
          <div style={{ display:"flex", gap:6 }}>
            <Btn onClick={()=>setModal("import")} v="ghost" style={{ fontSize:12, padding:"6px 12px" }}>📤 Importar</Btn>
            <Btn onClick={()=>setModal("add")} v="sm">+ Nueva</Btn>
          </div>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {myRoutines.map(r => (
          <Card key={r.id}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <H size={14}>{r.label}</H>
                <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>⏱ {r.duracion} · {r.exercises.length} ejercicios</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                <Pill label={sl(r.status)} color={sc(r.status)}/>
                {canEdit && (
                  <Btn onClick={()=>dispatch("DELETE_ROUTINE",{id:r.id,alumnoId})} v="danger" style={{ padding:"3px 10px", fontSize:11 }}>🗑</Btn>
                )}
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {r.exercises.map((e,i) => <Tag key={i}>{e.name}</Tag>)}
            </div>
          </Card>
        ))}
        {myRoutines.length === 0 && (
          <div style={{ textAlign:"center", color:"var(--sub)", padding:32, background:"var(--card)", borderRadius:12, border:"1px dashed var(--border)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
            <div>No hay rutinas asignadas todavía</div>
            {canEdit && <div style={{ fontSize:12, marginTop:4 }}>Creá una nueva o importá desde CSV</div>}
          </div>
        )}
      </div>

      {/* ADD ROUTINE MODAL */}
      {modal === "add" && (
        <Modal title="Nueva Rutina" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><Label>NOMBRE DE LA RUTINA</Label><input placeholder="Ej: Día 1 – Pierna Fuerza" value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))}/></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div><Label>SEMANA</Label><input type="number" min="1" value={form.semana} onChange={e=>setForm(p=>({...p,semana:+e.target.value}))}/></div>
              <div><Label>DURACIÓN</Label><input placeholder="60–75 min" value={form.duracion} onChange={e=>setForm(p=>({...p,duracion:e.target.value}))}/></div>
            </div>
            <Divider/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Label>EJERCICIOS</Label>
              <Btn onClick={addEx} v="ghost" style={{ fontSize:12, padding:"4px 10px" }}>+ Agregar</Btn>
            </div>
            {form.exercises.map((ex,i) => (
              <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"var(--sub)" }}>Ejercicio {i+1}</span>
                  <button onClick={()=>remEx(i)} style={{ background:"none", border:"none", color:"var(--red)", fontSize:16 }}>×</button>
                </div>
                <input placeholder="Nombre del ejercicio" value={ex.name} onChange={e=>updEx(i,"name",e.target.value)} style={{ marginBottom:6 }}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5, marginBottom:5 }}>
                  <input type="number" placeholder="Series" value={ex.sets} onChange={e=>updEx(i,"sets",+e.target.value)}/>
                  <input placeholder="Reps" value={ex.reps} onChange={e=>updEx(i,"reps",e.target.value)}/>
                  <input placeholder="Peso" value={ex.peso} onChange={e=>updEx(i,"peso",e.target.value)}/>
                  <input placeholder="Descanso" value={ex.descanso} onChange={e=>updEx(i,"descanso",e.target.value)}/>
                </div>
                <input placeholder="Instrucción (opcional)" value={ex.instruccion} onChange={e=>updEx(i,"instruccion",e.target.value)}/>
              </div>
            ))}
            {form.exercises.length === 0 && (
              <div style={{ textAlign:"center", color:"var(--sub)", fontSize:13, padding:16, background:"var(--surface)", borderRadius:9 }}>Aún no hay ejercicios</div>
            )}
            <Divider/>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="ghost" onClick={()=>setModal(null)} full>Cancelar</Btn>
              <Btn onClick={saveRoutine} full disabled={!form.label||!form.exercises.length}>Guardar rutina ✓</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* IMPORT MODAL */}
      {modal === "import" && (
        <Modal title="Importar Rutina desde CSV / XLSX" onClose={()=>setModal(null)}>
          <ImportModule alumnoId={alumnoId} onImport={handleImport} onClose={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M5] TRAINING MODULE — registro en vivo
// ───────────────────────────────────────────────────────────────────────────────
function TrainingModule({ currentUser }) {
  const { store, dispatch } = useStore();
  const myRoutines = store.routines[currentUser.id] || [];
  const todayR = myRoutines.find(r=>r.status==="today") || myRoutines[0];
  const [activeId, setActiveId] = useState(todayR?.id);
  const [logs, setLogs] = useState({});
  const [rpeG, setRpeG] = useState(null);
  const [saved, setSaved] = useState(false);

  const active = myRoutines.find(r=>r.id===activeId);

  const upd = (exId, si, k, v) => {
    setLogs(prev => {
      const arr = [...(prev[exId]||[])];
      if (!arr[si]) arr[si] = { kg:"", reps:"", rpe:null };
      arr[si] = { ...arr[si], [k]:v };
      return { ...prev, [exId]: arr };
    });
    setSaved(false);
  };

  const save = () => {
    dispatch("SAVE_LOG", { alumnoId:currentUser.id, rutinaId:activeId, logs });
    // Update progress
    active?.exercises.forEach(ex => {
      const exLogs = logs[ex.id] || [];
      const maxKg = Math.max(...exLogs.map(l=>parseFloat(l.kg)||0));
      if (maxKg > 0) dispatch("ADD_PROGRESS", { alumnoId:currentUser.id, exercise:ex.name, value:maxKg });
    });
    setSaved(true);
  };

  if (!active) return (
    <div style={{ textAlign:"center", padding:48, color:"var(--sub)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🏋️</div>
      <H size={16}>No hay rutinas asignadas</H>
      <div style={{ fontSize:13, marginTop:6 }}>Pedile a tu entrenador que te asigne una rutina</div>
    </div>
  );

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:14 }}>Entrenamiento</H>

      {/* Selector */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:14 }}>
        {myRoutines.map(r => (
          <button key={r.id} onClick={()=>{setActiveId(r.id);setSaved(false);setLogs({});}} style={{ flexShrink:0, background:activeId===r.id?"var(--accent)":"var(--card)", border:`1px solid ${activeId===r.id?"var(--accent)":"var(--border)"}`, borderRadius:10, padding:"8px 14px", color:activeId===r.id?"#fff":"var(--text)", fontSize:13, fontWeight:600, textAlign:"left" }}>
            <div>{r.label}</div>
            <div style={{ fontSize:11, color:activeId===r.id?"rgba(255,255,255,.7)":sc(r.status), marginTop:2 }}>{sl(r.status)}</div>
          </button>
        ))}
      </div>

      {/* Plan table */}
      <Card style={{ marginBottom:12, padding:"12px 0", overflowX:"auto" }}>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, padding:"0 16px", marginBottom:8 }}>PLAN</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:460 }}>
          <thead>
            <tr style={{ background:"var(--surface)" }}>
              {["#","Ejercicio","Series","Reps","%1RM","Peso","Descanso","Instrucción"].map(h => (
                <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, color:"var(--sub)", fontWeight:700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.exercises.map((ex,i) => (
              <tr key={ex.id} style={{ borderTop:"1px solid var(--border)" }}>
                <td style={{ padding:"7px 10px", color:"var(--sub)", fontWeight:700 }}>{i+1}</td>
                <td style={{ padding:"7px 10px", fontWeight:600, color:"var(--accent)", whiteSpace:"nowrap" }}>{ex.name}</td>
                <td style={{ padding:"7px 10px" }}>{ex.sets}</td>
                <td style={{ padding:"7px 10px" }}>{ex.reps}</td>
                <td style={{ padding:"7px 10px" }}>{ex.pct}</td>
                <td style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>{ex.peso}</td>
                <td style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>{ex.descanso}</td>
                <td style={{ padding:"7px 10px", color:"var(--sub)", maxWidth:160 }}>{ex.instruccion||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Live logging */}
      <Card style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:12 }}>REGISTRO EN VIVO</div>
        {active.exercises.map(ex => {
          const exLogs = logs[ex.id] || [];
          return (
            <div key={ex.id} style={{ marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:6, display:"flex", justifyContent:"space-between" }}>
                <span>{ex.name}</span>
                <span style={{ fontSize:11, color:"var(--sub)" }}>{ex.sets}×{ex.reps} · {ex.peso}</span>
              </div>
              {Array.from({length:ex.sets}).map((_,si) => {
                const l = exLogs[si]||{};
                return (
                  <div key={si} style={{ display:"grid", gridTemplateColumns:"22px 80px 80px 1fr", gap:6, alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:11, color:"var(--sub)", fontWeight:700, textAlign:"center" }}>{si+1}</span>
                    <input type="number" placeholder="kg" value={l.kg||""} onChange={e=>upd(ex.id,si,"kg",e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
                    <input type="number" placeholder="reps" value={l.reps||""} onChange={e=>upd(ex.id,si,"reps",e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
                    <RPESel value={l.rpe} onChange={v=>upd(ex.id,si,"rpe",v)} compact/>
                  </div>
                );
              })}
              <Divider style={{ margin:"10px 0 4px" }}/>
            </div>
          );
        })}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>RPE global</div>
          <RPESel value={rpeG} onChange={setRpeG}/>
        </div>
        {saved
          ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:12, textAlign:"center", color:"#22c55e", fontWeight:600 }}>✓ ¡Guardado con éxito!</div>
          : <Btn onClick={save} full style={{ padding:13 }}>Guardar entrenamiento 💾</Btn>
        }
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M6] PROGRESS MODULE
// ───────────────────────────────────────────────────────────────────────────────
function ProgressModule({ currentUser, targetAlumnoId }) {
  const { store } = useStore();
  const alumnoId = targetAlumnoId || currentUser.id;
  const progData = store.progress[alumnoId] || {};
  const exercises = Object.keys(progData);
  const [sel, setSel] = useState(exercises[0]||"");

  useEffect(()=>{ if(!sel && exercises.length) setSel(exercises[0]); }, [exercises.join(",")]);

  const data = progData[sel] || [];

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:16 }}>Progreso</H>
      {exercises.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, color:"var(--sub)" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📈</div>
          <div>Aún no hay datos de progreso. ¡Registrá tu primer entrenamiento!</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:14 }}>
            <Label>EJERCICIO</Label>
            <select value={sel} onChange={e=>setSel(e.target.value)}>
              {exercises.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {data.length > 0 && (
            <>
              <Card style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, marginBottom:2 }}>MEJOR MARCA</div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:30, color:"var(--accent)" }}>{Math.max(...data)} kg</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, marginBottom:2 }}>PROYECCIÓN 1RM</div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:22, color:"var(--green)" }}>{Math.round(Math.max(...data)*1.22)} kg</div>
                  </div>
                </div>
                <BarChart data={data} color="var(--accent)" h={80}/>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--sub)", marginTop:4 }}>
                  <span>Inicio</span><span style={{ color:"var(--accent)", fontWeight:700 }}>Hoy · {data[data.length-1]} kg</span>
                </div>
              </Card>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { label:"Mejora total",    value:`+${(Math.max(...data)-data[0]).toFixed(1)} kg`, color:"var(--green)" },
                  { label:"Sesiones",        value:data.length, color:"var(--accent)" },
                  { label:"Promedio",        value:`${(data.reduce((a,b)=>a+b,0)/data.length).toFixed(1)} kg`, color:"var(--sub)" },
                  { label:"Tendencia",       value:"↑ Creciendo", color:"var(--green)" },
                ].map((s,i) => (
                  <Card key={i} style={{ textAlign:"center", padding:12 }}>
                    <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:22, color:s.color }}>{s.value}</div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// [M7] MESSAGES MODULE
// ───────────────────────────────────────────────────────────────────────────────
function MessagesModule({ currentUser }) {
  const { store, dispatch } = useStore();
  const [input, setInput] = useState("");
  const chatRef = useRef();

  // Determinar contraparte
  let pairs = [];
  if (currentUser.role === "alumno") {
    const coach = store.users.find(u => u.id === currentUser.coachId);
    if (coach) pairs = [coach];
  } else if (currentUser.role === "coach") {
    pairs = store.users.filter(u => u.role === "alumno" && u.coachId === currentUser.id && u.active);
  } else if (currentUser.role === "superadmin") {
    pairs = store.users.filter(u => u.role === "coach" && u.active);
  }

  const [selectedId, setSelectedId] = useState(pairs[0]?.id || "");
  useEffect(() => { if (!selectedId && pairs.length) setSelectedId(pairs[0].id); }, [pairs.map(p=>p.id).join(",")]);
  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [selectedId, store.messages]);

  const getKey = (a, b) => [a,b].sort().join("-");
  const key = getKey(currentUser.id, selectedId);
  const msgs = store.messages[key] || [];

  const send = () => {
    if (!input.trim() || !selectedId) return;
    dispatch("ADD_MESSAGE", { key, msg: { id:"msg"+Date.now(), from:currentUser.id, to:selectedId, text:input.trim(), ts:new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}) } });
    setInput("");
  };

  const selUser = store.users.find(u=>u.id===selectedId);
  const selTheme = getTheme(selUser);

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>
      <H size={20} style={{ marginBottom:12 }}>Mensajes</H>

      {pairs.length > 1 && (
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:10 }}>
          {pairs.map(p => {
            const pTheme = getTheme(p);
            const pKey = getKey(currentUser.id, p.id);
            const unread = (store.messages[pKey]||[]).filter(m=>m.from===p.id).length;
            return (
              <button key={p.id} onClick={()=>setSelectedId(p.id)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:8, background:selectedId===p.id?"var(--dim)":"var(--card)", border:`1px solid ${selectedId===p.id?"var(--accent)":"var(--border)"}`, borderRadius:10, padding:"8px 12px" }}>
                <Avatar name={p.name} color={pTheme.accent} size={28} photo={p.photo}/>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:selectedId===p.id?"var(--accent)":"var(--text)" }}>{p.name.split(" ")[0]}</div>
                  {unread > 0 && <div style={{ fontSize:10, color:"var(--accent)" }}>{unread} msgs</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Card style={{ flex:1, display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
        {selUser ? (
          <>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
              <Avatar name={selUser.name} color={selTheme.accent} size={30} photo={selUser.photo}/>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{selUser.name}</div>
                <div style={{ fontSize:11, color:"var(--green)" }}>● En línea</div>
              </div>
            </div>
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:8 }}>
              {msgs.map((m,i) => {
                const isMe = m.from === currentUser.id;
                return (
                  <div key={i} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
                    <div style={{ maxWidth:"76%", background:isMe?"var(--accent)":"var(--surface)", borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px", padding:"8px 12px" }}>
                      <div style={{ fontSize:13 }}>{m.text}</div>
                      <div style={{ fontSize:10, color:isMe?"rgba(255,255,255,.55)":"var(--muted)", marginTop:2, textAlign:"right" }}>{m.ts}</div>
                    </div>
                  </div>
                );
              })}
              {msgs.length === 0 && <div style={{ textAlign:"center", color:"var(--sub)", fontSize:13, padding:24 }}>No hay mensajes todavía. ¡Empezá la conversación!</div>}
            </div>
            <div style={{ padding:10, borderTop:"1px solid var(--border)", display:"flex", gap:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Escribí un mensaje..." style={{ flex:1 }}/>
              <Btn onClick={send} style={{ padding:"8px 14px", flexShrink:0 }}>→</Btn>
            </div>
          </>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:"var(--sub)", fontSize:13 }}>No tenés contactos asignados</div>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// OVERVIEW MODULE (coach + superadmin)
// ───────────────────────────────────────────────────────────────────────────────
function OverviewModule({ currentUser, onNavigate }) {
  const { store } = useStore();
  const isSA = currentUser.role === "superadmin";

  const myAlumnos = isSA
    ? store.users.filter(u=>u.role==="alumno"&&u.active)
    : store.users.filter(u=>u.role==="alumno"&&u.coachId===currentUser.id&&u.active);

  const myCoaches = isSA ? store.users.filter(u=>u.role==="coach"&&u.active) : [];
  const totalRoutines = myAlumnos.reduce((s,a)=>s+(store.routines[a.id]||[]).length, 0);
  const doneRoutines  = myAlumnos.reduce((s,a)=>s+(store.routines[a.id]||[]).filter(r=>r.status==="done").length, 0);

  const stats = isSA
    ? [
        { icon:"👥", label:"Entrenadores", value:myCoaches.length, color:"var(--yellow)" },
        { icon:"🏋️", label:"Alumnos totales", value:myAlumnos.length, color:"var(--accent)" },
        { icon:"📋", label:"Rutinas totales", value:totalRoutines, color:"var(--accent)" },
        { icon:"✓", label:"Completadas", value:doneRoutines, color:"var(--green)" },
      ]
    : [
        { icon:"🏋️", label:"Mis alumnos", value:myAlumnos.length, color:"var(--accent)" },
        { icon:"🔥", label:"Activos hoy", value:myAlumnos.filter(a=>(store.routines[a.id]||[]).some(r=>r.status==="today")).length, color:"var(--orange)" },
        { icon:"📋", label:"Rutinas asignadas", value:totalRoutines, color:"var(--accent)" },
        { icon:"✓", label:"Completadas", value:doneRoutines, color:"var(--green)" },
      ];

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:16 }}>Overview</H>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {stats.map((s,i) => (
          <Card key={i} style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:32, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:"var(--sub)" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {isSA && myCoaches.length > 0 && (
        <>
          <H size={15} style={{ marginBottom:10 }}>Entrenadores</H>
          {myCoaches.map(c => {
            const cAlumnos = store.users.filter(u=>u.role==="alumno"&&u.coachId===c.id&&u.active);
            return (
              <Card key={c.id} style={{ marginBottom:8, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar name={c.name} color={THEMES.coach.accent} size={36}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"var(--sub)" }}>{cAlumnos.length} alumnos</div>
                  </div>
                  <Pill label="Entrenador" color={THEMES.coach.accent}/>
                </div>
              </Card>
            );
          })}
          <Divider/>
        </>
      )}

      <H size={15} style={{ marginBottom:10 }}>Alumnos</H>
      {myAlumnos.map(a => {
        const aTheme = getTheme(a);
        const rs = store.routines[a.id] || [];
        const done = rs.filter(r=>r.status==="done").length;
        const today = rs.find(r=>r.status==="today");
        return (
          <Card key={a.id} style={{ marginBottom:8 }} onClick={()=>onNavigate&&onNavigate("routines",a.id)}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <Avatar name={a.name} color={aTheme.accent} size={38}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{a.name}</div>
                <div style={{ fontSize:12, color:"var(--sub)" }}>
                  {today ? `🔥 Hoy: ${today.label}` : "Sin sesión hoy"}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:18, color:"var(--green)" }}>{done}/{rs.length}</div>
                <div style={{ fontSize:10, color:"var(--sub)" }}>sesiones</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:3 }}>
              {rs.map(r => <div key={r.id} style={{ flex:1, height:5, borderRadius:3, background:sc(r.status) }} title={r.label}/>)}
              {rs.length === 0 && <div style={{ fontSize:12, color:"var(--muted)" }}>Sin rutinas asignadas</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// INICIO MODULE — dashboard personal del alumno
// ───────────────────────────────────────────────────────────────────────────────
function InicioModule({ currentUser, onNavigate }) {
  const { store } = useStore();
  const myRoutines = store.routines[currentUser.id] || [];
  const progData   = store.progress[currentUser.id] || {};
  const coachUser  = store.users.find(u=>u.id===currentUser.coachId);
  const todayR     = myRoutines.find(r=>r.status==="today");
  const doneCount  = myRoutines.filter(r=>r.status==="done").length;
  const theme = getTheme(currentUser);

  return (
    <div className="fade">
      <div style={{ marginBottom:20 }}>
        <H size={22}>Hola, {currentUser.name.split(" ")[0]} 👋</H>
        <div style={{ color:"var(--sub)", fontSize:14, marginTop:2 }}>{new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { label:"Sesiones", value:doneCount, sub:"completadas" },
          { label:"Esta semana", value:`${doneCount}/${myRoutines.length}`, sub:"completadas" },
          { label:"Racha", value:"5d", sub:"sin fallar" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:22, color:"var(--accent)" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"var(--sub)", marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Today */}
      {todayR ? (
        <Card style={{ marginBottom:12, border:"1.5px solid var(--accent)" }}>
          <div style={{ fontSize:11, color:"var(--accent)", fontWeight:700, letterSpacing:1, marginBottom:4 }}>ENTRENAMIENTO DE HOY</div>
          <H size={15} style={{ marginBottom:6 }}>{todayR.label}</H>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12 }}>
            {todayR.exercises.map((e,i) => <Tag key={i}>{e.name}</Tag>)}
          </div>
          <Btn onClick={()=>onNavigate&&onNavigate("training")} full>Empezar 🔥</Btn>
        </Card>
      ) : (
        <Card style={{ marginBottom:12, textAlign:"center", padding:20 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🌟</div>
          <div style={{ fontWeight:600 }}>¡Día de descanso!</div>
          <div style={{ fontSize:13, color:"var(--sub)", marginTop:4 }}>Aprovechá para recuperarte.</div>
        </Card>
      )}

      {/* Progress preview */}
      {Object.keys(progData).length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>PROGRESO RECIENTE</div>
          {Object.entries(progData).slice(0,2).map(([ex, vals]) => (
            <div key={ex} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, marginBottom:4 }}>
                <span>{ex}</span>
                <span style={{ color:"var(--green)" }}>{vals[vals.length-1]} kg</span>
              </div>
              <Sparkline data={vals} color="var(--accent)" w={200} h={28}/>
            </div>
          ))}
        </Card>
      )}

      {/* Weekly */}
      <Card>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>SEMANA</div>
        {myRoutines.map(r => (
          <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:sc(r.status), flexShrink:0 }}/>
            <div style={{ flex:1, fontSize:13 }}>{r.label}</div>
            <Pill label={sl(r.status)} color={sc(r.status)} size={10}/>
          </div>
        ))}
        {myRoutines.length === 0 && <div style={{ fontSize:13, color:"var(--sub)", padding:8 }}>Sin rutinas asignadas aún</div>}
      </Card>
    </div>
  );
}


// ───────────────────────────────────────────────────────────────────────────────
// [M9] CONFIG MODULE — perfil editable, foto, contraseña, datos personales
// ───────────────────────────────────────────────────────────────────────────────
function ConfigModule({ currentUser, onLogout, onUserUpdate }) {
  const theme = getTheme(currentUser);
  const isSA = currentUser.role === "superadmin";
  const [form, setForm] = useState({
    name:      currentUser.name,
    email:     currentUser.email,
    phone:     currentUser.phone || "",
    birthdate: currentUser.birthdate || "",
    lang:      "Español",
    photo:     currentUser.photo || null,
  });
  const [pwForm, setPwForm] = useState({ current:"", next:"", confirm:"" });
  const [saved, setSaved]   = useState(false);
  const [pwMsg, setPwMsg]   = useState("");
  const [section, setSection] = useState("perfil"); // perfil | seguridad

  const saveProfile = () => {
    onUserUpdate({ ...currentUser, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changePw = () => {
    if (pwForm.current !== currentUser.password) { setPwMsg("La contraseña actual es incorrecta"); return; }
    if (pwForm.next.length < 4) { setPwMsg("La nueva contraseña debe tener al menos 4 caracteres"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Las contraseñas no coinciden"); return; }
    onUserUpdate({ ...currentUser, password: pwForm.next });
    setPwMsg("✓ Contraseña actualizada correctamente");
    setPwForm({ current:"", next:"", confirm:"" });
  };

  const roleLabel = { superadmin:"⭐ SuperAdmin", coach:"🔴 Entrenador", alumno:"Alumno" };

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:16 }}>Configuración</H>

      {/* Section tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["perfil","seguridad"].map(s => (
          <button key={s} onClick={()=>setSection(s)} style={{ flex:1, background:section===s?"var(--accent)":"var(--card)", border:`1px solid ${section===s?"var(--accent)":"var(--border)"}`, color:section===s?"#fff":"var(--sub)", borderRadius:9, padding:"8px", fontSize:13, fontWeight:600, textTransform:"capitalize" }}>
            {s==="perfil"?"👤 Perfil":"🔒 Seguridad"}
          </button>
        ))}
      </div>

      {section === "perfil" && (
        <Card>
          {/* Photo upload — only for non-superadmin */}
          {!isSA && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20, gap:10 }}>
              <PhotoUpload onPhoto={photo => setForm(p=>({...p,photo}))}>
                <Avatar name={form.name} color={theme.accent} size={80} photo={form.photo} editable={true}/>
              </PhotoUpload>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{form.name}</div>
                <div style={{ fontSize:11, color:"var(--sub)" }}>{roleLabel[currentUser.role]}</div>
                <div style={{ fontSize:11, color:"var(--sub)", marginTop:2 }}>Tocá la foto para cambiarla</div>
              </div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <Label>NOMBRE COMPLETO</Label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Tu nombre"/>
            </div>
            <div>
              <Label>EMAIL</Label>
              <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@ejemplo.com"/>
            </div>
            <div>
              <Label>NÚMERO DE CELULAR</Label>
              <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+54 11 1234-5678"/>
            </div>
            <div>
              <Label>FECHA DE NACIMIENTO</Label>
              <input type="date" value={form.birthdate} onChange={e=>setForm(p=>({...p,birthdate:e.target.value}))}/>
            </div>
            <div>
              <Label>IDIOMA</Label>
              <select value={form.lang} onChange={e=>setForm(p=>({...p,lang:e.target.value}))}>
                <option>Español</option>
                <option>English</option>
                <option>Português</option>
              </select>
            </div>
            <div style={{ background:"var(--surface)", borderRadius:9, padding:"10px 14px" }}>
              <div style={{ fontSize:11, color:"var(--sub)", marginBottom:2 }}>ROL</div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--accent)" }}>{roleLabel[currentUser.role]}</div>
            </div>
          </div>

          <Divider style={{ margin:"16px 0" }}/>
          {saved
            ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:"10px 14px", color:"#22c55e", fontWeight:600, textAlign:"center" }}>✓ Cambios guardados</div>
            : <Btn onClick={saveProfile} full>Guardar cambios</Btn>
          }
        </Card>
      )}

      {section === "seguridad" && (
        <Card>
          <H size={15} style={{ marginBottom:14 }}>Cambiar contraseña</H>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <Label>CONTRASEÑA ACTUAL</Label>
              <input type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))} placeholder="••••••••"/>
            </div>
            <div>
              <Label>NUEVA CONTRASEÑA</Label>
              <input type="password" value={pwForm.next} onChange={e=>setPwForm(p=>({...p,next:e.target.value}))} placeholder="••••••••"/>
            </div>
            <div>
              <Label>CONFIRMAR NUEVA CONTRASEÑA</Label>
              <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} placeholder="••••••••"/>
            </div>
          </div>
          {pwMsg && (
            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, fontSize:13, background:pwMsg.startsWith("✓")?"#22c55e11":"#ef444411", color:pwMsg.startsWith("✓")?"#22c55e":"#ef4444", border:`1px solid ${pwMsg.startsWith("✓")?"#22c55e33":"#ef444433"}` }}>
              {pwMsg}
            </div>
          )}
          <Divider style={{ margin:"16px 0" }}/>
          <Btn onClick={changePw} full>Actualizar contraseña 🔒</Btn>
        </Card>
      )}

      <Divider style={{ margin:"20px 0" }}/>
      <Btn v="danger" onClick={onLogout} full>Cerrar sesión</Btn>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// SHELL — Layout principal con sidebar + nav
// ───────────────────────────────────────────────────────────────────────────────
function AppShell({ currentUser: initUser, onLogout }) {
  const { dispatch } = useStore();
  const [currentUser, setCurrentUserLocal] = useState(initUser);
  const theme = getTheme(currentUser);
  const [page, setPage]     = useState("inicio");
  const [sideOpen, setSideOpen] = useState(false);
  const [targetAlumno, setTargetAlumno] = useState(null); // para coach viendo rutinas de alumno

  const setCurrentUser = (updated) => {
    dispatch("UPDATE_USER", updated);
    setCurrentUserLocal(updated);
  };

  const navigate = (p, alumnoId=null) => {
    setPage(p);
    setTargetAlumno(alumnoId);
  };

  const isAlumno   = currentUser.role === "alumno";
  const isCoach    = currentUser.role === "coach";
  const isSA       = currentUser.role === "superadmin";

  const navItems = isAlumno
    ? [
        { id:"inicio",    icon:"⊞",  label:"Inicio" },
        { id:"training",  icon:"🏋️", label:"Entreno" },
        { id:"progress",  icon:"📈", label:"Progreso" },
        { id:"routines",  icon:"📋", label:"Rutinas" },
        { id:"messages",  icon:"💬", label:"Mensajes" },
        { id:"config",    icon:"⚙️", label:"Config" },
      ]
    : isCoach
    ? [
        { id:"overview",  icon:"📊", label:"Overview" },
        { id:"users",     icon:"👥", label:"Alumnos" },
        { id:"routines",  icon:"📋", label:"Rutinas" },
        { id:"messages",  icon:"💬", label:"Mensajes" },
        { id:"config",    icon:"⚙️", label:"Config" },
      ]
    : [ // superadmin
        { id:"overview",  icon:"📊", label:"Overview" },
        { id:"users",     icon:"👥", label:"Usuarios" },
        { id:"routines",  icon:"📋", label:"Rutinas" },
        { id:"messages",  icon:"💬", label:"Mensajes" },
        { id:"config",    icon:"⚙️", label:"Config" },
      ];

  const roleLabel = { superadmin:"⭐ SuperAdmin", coach:"🔴 Entrenador", alumno:"Alumno" };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>
      <GlobalStyle accent={theme.accent} dim={theme.dim}/>

      {/* Overlay mobile */}
      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:"fixed", inset:0, background:"#00000088", zIndex:40 }}/>}

      {/* SIDEBAR */}
      <aside className="sidebar-fixed" style={{
        width:220, flexShrink:0, background:"var(--surface)", borderRight:"1px solid var(--border)",
        display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, height:"100vh", zIndex:50,
        transform:sideOpen?"translateX(0)":"translateX(-100%)", transition:"transform .25s ease",
      }}>
        <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, background:"var(--accent)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
            <div>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, letterSpacing:1 }}>FUERZA</div>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:10, color:"var(--accent)", letterSpacing:3, marginTop:-2 }}>INTELIGENTE</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Avatar name={currentUser.name} color={theme.accent} size={34} photo={currentUser.role!=="superadmin"?currentUser.photo:null}/>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{currentUser.name.split(" ")[0]}</div>
              <div style={{ fontSize:11, color:"var(--accent)", fontWeight:600 }}>{roleLabel[currentUser.role]}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={()=>{ navigate(n.id); setSideOpen(false); }} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px",
              borderRadius:9, border:"none", marginBottom:2, textAlign:"left",
              background: page===n.id ? "var(--dim)" : "transparent",
              color: page===n.id ? "var(--accent)" : "var(--sub)",
              fontSize:14, fontWeight: page===n.id ? 600 : 400,
            }}>
              <span style={{ width:22, textAlign:"center" }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:12, borderTop:"1px solid var(--border)" }}>
          <Btn v="ghost" onClick={onLogout} style={{ width:"100%", fontSize:12 }}>⏏ Cerrar sesión</Btn>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* TOP BAR */}
        <header style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"0 16px", height:54, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:30, flexShrink:0 }}>
          <button onClick={()=>setSideOpen(true)} style={{ background:"transparent", border:"none", color:"var(--sub)", fontSize:22, padding:2, lineHeight:1 }}>☰</button>
          <div style={{ flex:1 }}>
            <H size={15}>{navItems.find(n=>n.id===page)?.label || page}</H>
          </div>
          <Pill label={roleLabel[currentUser.role]} color={theme.accent}/>
          <Avatar name={currentUser.name} color={theme.accent} size={30} photo={currentUser.role!=="superadmin"?currentUser.photo:null}/>
        </header>

        {/* PAGE CONTENT */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          {page === "inicio"   && <InicioModule   currentUser={currentUser} onNavigate={navigate}/>}
          {page === "training" && <TrainingModule currentUser={currentUser}/>}
          {page === "progress" && <ProgressModule currentUser={currentUser} targetAlumnoId={targetAlumno}/>}
          {page === "routines" && <RoutinesModule currentUser={currentUser} targetAlumnoId={targetAlumno}/>}
          {page === "users"    && <UsersModule    currentUser={currentUser}/>}
          {page === "overview" && <OverviewModule currentUser={currentUser} onNavigate={navigate}/>}
          {page === "messages" && <MessagesModule currentUser={currentUser}/>}
          {page === "config"   && (
            <ConfigModule currentUser={currentUser} onLogout={onLogout} onUserUpdate={setCurrentUser}/>
          )}
        </div>

        {/* BOTTOM NAV (mobile) */}
        <nav className="bottom-nav" style={{ background:"var(--surface)", borderTop:"1px solid var(--border)", display:"flex" }}>
          {navItems.slice(0,5).map(n => (
            <button key={n.id} onClick={()=>navigate(n.id)} style={{
              flex:1, background:"transparent", border:"none", padding:"7px 4px",
              color:page===n.id?"var(--accent)":"var(--muted)",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2
            }}>
              <span style={{ fontSize:17 }}>{n.icon}</span>
              <span style={{ fontSize:9, fontWeight:600 }}>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* RESPONSIVE overrides */}
      <style>{`
        @media(min-width:768px){
          .sidebar-fixed{transform:translateX(0)!important;position:relative!important;height:100vh!important;}
          .bottom-nav{display:none!important;}
        }
      `}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// ROOT — Entry point
// ───────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  return (
    <StoreProvider>
      {!user
        ? <AuthModule onLogin={setUser}/>
        : <AppShell currentUser={user} onLogout={()=>setUser(null)}/>
      }
    </StoreProvider>
  );
}

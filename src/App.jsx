
// ═══════════════════════════════════════════════════════════════════════════════
// FUERZA INTELIGENTE V7 — Arquitectura Modular
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
// HOLIDAYS API — feriados por país via date.nager.at (gratis, sin key)
// ───────────────────────────────────────────────────────────────────────────────
const COUNTRY_LIST = [
  { code:"AR", name:"Argentina" }, { code:"UY", name:"Uruguay" },
  { code:"CL", name:"Chile" },     { code:"BR", name:"Brasil" },
  { code:"CO", name:"Colombia" },  { code:"MX", name:"México" },
  { code:"ES", name:"España" },    { code:"US", name:"Estados Unidos" },
  { code:"GB", name:"Reino Unido"},{ code:"IT", name:"Italia" },
  { code:"DE", name:"Alemania" },  { code:"FR", name:"Francia" },
];

async function fetchHolidays(countryCode, year) {
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(h => h.date); // ["2025-01-01", ...]
  } catch { return []; }
}

const DOW_NAMES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DOW_FULL  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function buildSchedule(startDate, trainingDays, totalSessions) {
  // trainingDays: [1,3,5] (Mon=1,...,Sun=0)
  const result = [];
  let cursor = new Date(startDate + "T12:00:00");
  let found = 0;
  let safety = 0;
  while (found < totalSessions && safety < 500) {
    const dow = cursor.getDay(); // 0=Sun
    if (trainingDays.includes(dow)) {
      result.push(cursor.toISOString().split("T")[0]);
      found++;
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }
  return result;
}

// ───────────────────────────────────────────────────────────────────────────────
// [M1] STORE — Estado global compartido entre todos los módulos
// ───────────────────────────────────────────────────────────────────────────────
const AppContext = createContext(null);
const useStore = () => useContext(AppContext);
const useLang = (user) => {
  const code = LANG_CODES[user?.lang] || "es";
  return (key) => T[code]?.[key] || T.es[key] || key;
};
const useUnits = (user) => user?.units || "kg";


// ───────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE OBJETIVOS (del documento de estructura)
// ───────────────────────────────────────────────────────────────────────────────
const OBJECTIVES_CATALOG = [
  // 🔴 Fuerza
  { id:"fuerza_max",   label:"Fuerza Máxima",        cat:"Fuerza",       emoji:"🔴", desc:"Desarrollo de la mayor capacidad de fuerza con cargas altas (85–95% 1RM)." },
  { id:"fuerza_base",  label:"Fuerza Base",           cat:"Fuerza",       emoji:"🔴", desc:"Construcción de una base sólida de fuerza con cargas medias." },
  { id:"fuerza_expl",  label:"Fuerza Explosiva",      cat:"Fuerza",       emoji:"🔴", desc:"Aplicación rápida de fuerza con velocidad de ejecución." },
  { id:"potencia",     label:"Potencia",              cat:"Fuerza",       emoji:"🔴", desc:"Producción máxima de fuerza en el menor tiempo posible." },
  // 🟠 Muscular
  { id:"hipertrofia",  label:"Hipertrofia",           cat:"Muscular",     emoji:"🟠", desc:"Aumento de masa muscular mediante volumen y tensión mecánica." },
  { id:"hip_func",     label:"Hipertrofia Funcional", cat:"Muscular",     emoji:"🟠", desc:"Ganancia muscular orientada a rendimiento deportivo." },
  { id:"res_musc",     label:"Resistencia Muscular",  cat:"Muscular",     emoji:"🟠", desc:"Capacidad de sostener esfuerzos prolongados con fatiga." },
  // 🟡 Energía
  { id:"aerobico",     label:"Capacidad Aeróbica",    cat:"Energía",      emoji:"🟡", desc:"Mejora del sistema cardiovascular para esfuerzos prolongados." },
  { id:"anaerobico",   label:"Potencia Anaeróbica",   cat:"Energía",      emoji:"🟡", desc:"Generar esfuerzos intensos en cortos períodos de tiempo." },
  { id:"res_anaer",    label:"Resistencia Anaeróbica",cat:"Energía",      emoji:"🟡", desc:"Mantener esfuerzos de alta intensidad durante más tiempo." },
  { id:"acond_gral",   label:"Acondicionamiento General", cat:"Energía",  emoji:"🟡", desc:"Mejora global del estado físico para soportar cargas más exigentes." },
  // 🔵 Control
  { id:"core",         label:"Estabilidad y Core",    cat:"Control",      emoji:"🔵", desc:"Control del tronco para mejorar transferencia de fuerza." },
  { id:"movilidad",    label:"Movilidad",             cat:"Control",      emoji:"🔵", desc:"Mejora del rango de movimiento articular." },
  { id:"tecnica",      label:"Técnica de Ejecución",  cat:"Control",      emoji:"🔵", desc:"Perfeccionamiento de patrones de movimiento en ejercicios clave." },
  { id:"prev_lesion",  label:"Prevención de Lesiones",cat:"Control",      emoji:"🔵", desc:"Reducción del riesgo mediante control de cargas y técnica." },
  // 🟣 Composición
  { id:"desc_grasa",   label:"Descenso de Grasa",     cat:"Composición",  emoji:"🟣", desc:"Reducción de tejido adiposo manteniendo masa muscular." },
  { id:"mant_peso",    label:"Mantenimiento de Peso", cat:"Composición",  emoji:"🟣", desc:"Estabilización del peso mientras se mejora el rendimiento." },
  { id:"recomp",       label:"Recomposición Corporal",cat:"Composición",  emoji:"🟣", desc:"Disminución de grasa y aumento de músculo simultáneamente." },
  // ⚫ Rendimiento
  { id:"prep_comp",    label:"Prep. para Competencia",cat:"Rendimiento",  emoji:"⚫", desc:"Ajuste final del rendimiento con foco en el deporte específico." },
  { id:"peaking",      label:"Puesta a Punto (Peaking)",cat:"Rendimiento",emoji:"⚫", desc:"Maximización del rendimiento reduciendo la fatiga acumulada." },
  { id:"transfer",     label:"Transferencia Deportiva",cat:"Rendimiento", emoji:"⚫", desc:"Adaptación de la fuerza y potencia al gesto deportivo." },
  // ⚪ Recuperación
  { id:"deload",       label:"Descarga (Deload)",     cat:"Recuperación", emoji:"⚪", desc:"Reducción del volumen/intensidad para facilitar la recuperación." },
  { id:"rec_activa",   label:"Recuperación Activa",   cat:"Recuperación", emoji:"⚪", desc:"Trabajo de baja intensidad para favorecer la regeneración." },
];

const OBJ_CAT_COLORS = {
  "Fuerza":"#ef4444", "Muscular":"#f97316", "Energía":"#eab308",
  "Control":"#3b82f6", "Composición":"#a855f7", "Rendimiento":"#6b7280", "Recuperación":"#9ca3af"
};

const INITIAL_STORE = {
  // Usuarios: superadmin → coach → alumno
  users: [
    { id:"sa1", role:"superadmin", name:"Admin Master", email:"admin@fi.com",  password:"admin123", gender:null,     coachId:null,  active:true, photo:null, phone:"", birthdate:"" },
    { id:"c1", suspended:false, suspendedAt:null, themePreset:"d-red", themeInverted:false, role:"coach", name:"Martín López", email:"martin@fi.com", password:"1234", gender:null, coachId:"sa1", active:true, photo:null, phone:"+54 11 1234-5678", birthdate:"1988-03-15", alumnoLimit:null, expiresAt:null, lang:"es", units:"kg" },
    { id:"c2", suspended:false, suspendedAt:null, themePreset:"d-red", themeInverted:false, role:"coach", name:"Sofía Ruiz", email:"sofia@fi.com", password:"1234", gender:"female", coachId:"sa1", active:true, photo:null, phone:"+54 11 9876-5432", birthdate:"1992-07-22", alumnoLimit:20, expiresAt:null, lang:"es", units:"kg" },
    { id:"a1", suspended:false, suspendedAt:null, themePreset:"d-blue", themeInverted:false, role:"alumno", name:"Juan Pérez", email:"juan@fi.com", password:"1234", gender:"male", coachId:"c1", active:true, photo:null, phone:"+54 11 5555-1234", birthdate:"1995-11-08", objectives:[{id:"fuerza_max",priority:"principal",completed:false},{id:"hipertrofia",priority:"secundario",completed:false},{id:"core",priority:"secundario",completed:false}], pesoInicial:82, pesoObj:88, altura:178, lang:"es", units:"kg", registeredAt:"2024-11-08" },
    { id:"a2", suspended:false, suspendedAt:null, themePreset:"d-purple", themeInverted:false, role:"alumno", name:"Laura García", email:"laura@fi.com", password:"1234", gender:"female", coachId:"c1", active:true, photo:null, phone:"+54 11 4444-9999", birthdate:"1998-02-14", objectives:[{id:"desc_grasa",priority:"principal",completed:false},{id:"hipertrofia",priority:"secundario",completed:false}], pesoInicial:65, pesoObj:58, altura:163, lang:"es", units:"kg", registeredAt:"2024-02-14" },
    { id:"a3", suspended:false, suspendedAt:null, themePreset:"d-blue", themeInverted:false, role:"alumno", name:"Diego Torres", email:"diego@fi.com", password:"1234", gender:"male", coachId:"c2", active:true, photo:null, phone:"", birthdate:"1993-06-30", objectives:[], pesoInicial:null, pesoObj:null, altura:null, lang:"es", units:"kg", registeredAt:"2024-06-30" },
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
  // Repositorio de rutinas por entrenador (coachId → [routine templates])
  repository: {
    c1: [
      { id:"repo1", coachId:"c1", label:"Pierna Fuerza A", duracion:"75-90 min", exercises:[
        {id:"re1",name:"Sentadilla trasera",sets:5,reps:5,pct:"85%",peso:"",descanso:"2-3 min",instruccion:"Baja controlada"},
        {id:"re2",name:"Peso muerto rumano",sets:4,reps:6,pct:"75%",peso:"",descanso:"2 min",instruccion:""},
      ]},
      { id:"repo2", coachId:"c1", label:"Tirón B", duracion:"60-75 min", exercises:[
        {id:"re3",name:"Dominadas lastradas",sets:4,reps:6,pct:"—",peso:"",descanso:"2 min",instruccion:""},
        {id:"re4",name:"Remo con barra",sets:4,reps:8,pct:"70%",peso:"",descanso:"90 seg",instruccion:""},
      ]},
    ],
    c2: [],
  },
  // Métricas de seguimiento por objetivo (M11)
  // Structure: { alumnoId: { objId: [{date, fields...}] } }
  metrics: { a1:{}, a2:{}, a3:{} },
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

  // Run auto-expire and purge on mount
  useEffect(() => {
    setStore(prev => {
      const now = new Date().toISOString();
      const cutoff = new Date(Date.now() - 90*24*60*60*1000).toISOString();
      const msgCutoff = new Date(Date.now() - 90*24*60*60*1000);

      // 1. Auto-expire coaches whose expiresAt passed
      let users = prev.users.map(u => {
        if (u.role==="coach" && u.expiresAt && u.expiresAt < now && !u.suspended)
          return {...u, suspended:true, suspendedAt:now};
        return u;
      });

      // 2. Cascade suspension to alumnos of newly suspended coaches
      const newlySuspCoaches = users
        .filter(u => u.role==="coach" && u.suspended && !prev.users.find(p=>p.id===u.id)?.suspended)
        .map(u=>u.id);
      users = users.map(u =>
        newlySuspCoaches.includes(u.coachId) ? {...u, suspended:true, suspendedAt:now} : u
      );

      // 3. Purge rules:
      //    - Coaches suspended 90+ days → delete account + cascade delete their suspended alumnos
      //    - Alumnos suspended 90+ days → delete account
      //    - Active users → NEVER delete account
      const suspendedCoachesToPurge = users
        .filter(u => u.role==="coach" && u.suspended && u.suspendedAt && u.suspendedAt < cutoff)
        .map(u => u.id);

      // Alumnos to purge: either suspended 90+ days themselves, OR belong to a purged coach and are also suspended
      const alumnosToPurge = users
        .filter(u => u.role==="alumno" && u.suspended && u.suspendedAt && u.suspendedAt < cutoff)
        .map(u => u.id);

      const purgedIds = [...suspendedCoachesToPurge, ...alumnosToPurge];

      users = users.filter(u => !purgedIds.includes(u.id));

      // 4. Delete routines of purged users
      const routines = Object.fromEntries(
        Object.entries(prev.routines).filter(([id]) => !purgedIds.includes(id))
      );

      // 5. Purge messages older than 90 days — for ALL users
      const messages = Object.fromEntries(
        Object.entries(prev.messages).map(([k, msgs]) => [
          k,
          msgs.filter(m => !m.date || new Date(m.date) > msgCutoff)
        ])
      );

      return {...prev, users, routines, messages};
    });
  }, []);

  const dispatch = useCallback((action, payload) => {
    setStore(prev => {
      switch (action) {
        // ── USERS ──
        case "ADD_USER": return { ...prev, users: [...prev.users, payload] };
        case "UPDATE_USER": return { ...prev, users: prev.users.map(u => u.id===payload.id ? {...u,...payload} : u) };
        case "DELETE_USER": return { ...prev, users: prev.users.map(u => u.id===payload ? {...u,active:false} : u) };
        case "SUSPEND_USER": {
          const now = new Date().toISOString();
          // If suspending a coach, cascade to all their alumnos
          let updatedUsers = prev.users.map(u => {
            if (u.id === payload.id) return {...u, suspended:payload.val, suspendedAt: payload.val ? now : null};
            if (payload.role === "coach" && u.coachId === payload.id) return {...u, suspended:payload.val, suspendedAt: payload.val ? now : null};
            return u;
          });
          return { ...prev, users: updatedUsers };
        }
        case "RESCHEDULE_ROUTINE": {
          // Move a routine's scheduled date
          const { alumnoId, rutinaId, newDate } = payload;
          return { ...prev, routines: { ...prev.routines, [alumnoId]: prev.routines[alumnoId].map(r =>
            r.id===rutinaId ? {...r, scheduledDate:newDate} : r
          )}};
        }
        case "PURGE_EXPIRED": {
          const now = new Date();
          const cutoff = new Date(now - 90*24*60*60*1000).toISOString();
          const msgCutoff = new Date(now - 90*24*60*60*1000);

          // Coaches suspended 90+ days → purge
          const suspendedCoachesToPurge = prev.users
            .filter(u => u.role==="coach" && u.suspended && u.suspendedAt && u.suspendedAt < cutoff)
            .map(u => u.id);

          // Alumnos suspended 90+ days → purge
          const alumnosToPurge = prev.users
            .filter(u => u.role==="alumno" && u.suspended && u.suspendedAt && u.suspendedAt < cutoff)
            .map(u => u.id);

          const purgedIds = [...suspendedCoachesToPurge, ...alumnosToPurge];

          // Active users are NEVER purged regardless of anything
          const users = prev.users.filter(u => !purgedIds.includes(u.id));
          const routines = Object.fromEntries(Object.entries(prev.routines).filter(([id]) => !purgedIds.includes(id)));

          // Messages older than 90 days → purge for everyone
          const messages = Object.fromEntries(Object.entries(prev.messages).map(([k,msgs]) => [
            k, msgs.filter(m => !m.date || new Date(m.date) > msgCutoff)
          ]));

          return { ...prev, users, routines, messages };
        }
        case "AUTO_EXPIRE": {
          // Suspend coaches whose expiresAt has passed
          const now = new Date().toISOString();
          const updatedUsers = prev.users.map(u => {
            if (u.role === "coach" && u.expiresAt && u.expiresAt < now && !u.suspended) {
              return {...u, suspended:true, suspendedAt:now};
            }
            return u;
          });
          // Cascade to alumnos of newly suspended coaches
          const newlySuspendedCoaches = updatedUsers.filter((u,i) => u.role==="coach" && u.suspended && !prev.users[i]?.suspended).map(u=>u.id);
          const finalUsers = updatedUsers.map(u => {
            if (u.role==="alumno" && newlySuspendedCoaches.includes(u.coachId)) return {...u, suspended:true, suspendedAt:now};
            return u;
          });
          return { ...prev, users: finalUsers };
        }
        case "SET_OBJECTIVES": return { ...prev, users: prev.users.map(u => u.id===payload.alumnoId ? {...u, objectives:payload.objectives} : u) };
        case "COMPLETE_OBJECTIVE": return { ...prev, users: prev.users.map(u => u.id===payload.alumnoId ? {...u, objectives:(u.objectives||[]).map(o => o.id===payload.objId ? {...o, completed:payload.val} : o)} : u) };
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
          const updatedRoutines = prev.routines[alumnoId].map(r => r.id===rutinaId ? {...r, logs, status:"done"} : r);
          const allDone = updatedRoutines.every(r => r.status === "done");
          const updatedUsers = allDone
            ? prev.users.map(u => u.id===alumnoId ? {...u, objectives:(u.objectives||[]).map(o => ({...o, completed:true}))} : u)
            : prev.users;
          return { ...prev, routines: { ...prev.routines, [alumnoId]: updatedRoutines }, users: updatedUsers };
        }
        // ── MESSAGES ──
        case "MARK_READ": {
          // Mark all messages from a sender as read
          const { key, fromId } = payload;
          return { ...prev, messages: { ...prev.messages, [key]: (prev.messages[key]||[]).map(m => m.from===fromId ? {...m, read:true} : m) } };
        }
        case "ADD_MESSAGE": {
          const key = payload.key;
          return { ...prev, messages: { ...prev.messages, [key]: [...(prev.messages[key]||[]), payload.msg] } };
        }
        // ── PROGRESS ──
        case "ADD_REPO_ROUTINE": return { ...prev, repository: { ...prev.repository, [payload.coachId]: [...(prev.repository[payload.coachId]||[]), payload] } };
        case "UPDATE_REPO_ROUTINE": return { ...prev, repository: { ...prev.repository, [payload.coachId]: (prev.repository[payload.coachId]||[]).map(r=>r.id===payload.id?{...r,...payload}:r) } };
        case "DELETE_REPO_ROUTINE": return { ...prev, repository: { ...prev.repository, [payload.coachId]: (prev.repository[payload.coachId]||[]).filter(r=>r.id!==payload.id) } };
        case "ADD_METRIC": {
          // payload: { alumnoId, objId, entry: {date, ...fields} }
          const { alumnoId, objId, entry } = payload;
          const prev_metrics = prev.metrics || {};
          const alumno_metrics = prev_metrics[alumnoId] || {};
          const obj_metrics = alumno_metrics[objId] || [];
          return { ...prev, metrics: { ...prev_metrics, [alumnoId]: { ...alumno_metrics, [objId]: [...obj_metrics, entry] } } };
        }
        case "DELETE_METRIC": {
          const { alumnoId, objId, entryIdx } = payload;
          const prev_metrics = prev.metrics || {};
          const alumno_metrics = prev_metrics[alumnoId] || {};
          const obj_metrics = (alumno_metrics[objId] || []).filter((_,i)=>i!==entryIdx);
          return { ...prev, metrics: { ...prev_metrics, [alumnoId]: { ...alumno_metrics, [objId]: obj_metrics } } };
        }
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
// THEME PRESETS — 11 cuadraditos (5 dark + 5 light + 1 split)
// ───────────────────────────────────────────────────────────────────────────────
const THEME_PRESETS = [
  // Dark themes (fondo oscuro + acento color)
  { id:"d-red",    bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#e63946", label:"Negro / Rojo",    dark:true  },
  { id:"d-blue",   bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#2563eb", label:"Negro / Azul",    dark:true  },
  { id:"d-purple", bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#7c3aed", label:"Negro / Violeta", dark:true  },
  { id:"d-green",  bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#059669", label:"Negro / Verde",   dark:true  },
  { id:"d-orange", bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#f97316", label:"Negro / Naranja", dark:true  },
  // Light themes (fondo claro + acento color)
  { id:"l-red",    bg:"#f8f8fc", surface:"#ffffff", card:"#ffffff", text:"#1a1a2e", sub:"#6b6b8a", border:"#e0e0f0", accent:"#e63946", label:"Blanco / Rojo",    dark:false },
  { id:"l-blue",   bg:"#f8f8fc", surface:"#ffffff", card:"#ffffff", text:"#1a1a2e", sub:"#6b6b8a", border:"#e0e0f0", accent:"#2563eb", label:"Blanco / Azul",    dark:false },
  { id:"l-purple", bg:"#f8f8fc", surface:"#ffffff", card:"#ffffff", text:"#1a1a2e", sub:"#6b6b8a", border:"#e0e0f0", accent:"#7c3aed", label:"Blanco / Violeta", dark:false },
  { id:"l-green",  bg:"#f8f8fc", surface:"#ffffff", card:"#ffffff", text:"#1a1a2e", sub:"#6b6b8a", border:"#e0e0f0", accent:"#059669", label:"Blanco / Verde",   dark:false },
  { id:"l-orange", bg:"#f8f8fc", surface:"#ffffff", card:"#ffffff", text:"#1a1a2e", sub:"#6b6b8a", border:"#e0e0f0", accent:"#f97316", label:"Blanco / Naranja", dark:false },
  // Split: negro/blanco inverso
  { id:"split",    bg:"#0a0a0f", surface:"#13131a", card:"#16161f", text:"#e2e2ee", sub:"#7b7b9a", border:"#22223a", accent:"#ffffff", label:"Negro / Blanco",   dark:true, split:true },
];

// Get inverted preset for a given preset id
const getInverted = (presetId) => {
  const p = THEME_PRESETS.find(t=>t.id===presetId);
  if (!p) return null;
  if (p.split) return { ...p, id:"split-inv", bg:"#ffffff", surface:"#f0f0f8", card:"#ffffff", text:"#0a0a0f", sub:"#6b6b8a", border:"#e0e0f0", accent:"#0a0a0f", label:"Blanco / Negro", split:true, inverted:true };
  if (p.dark) {
    // find light version
    const colorKey = presetId.replace("d-","");
    const light = THEME_PRESETS.find(t=>t.id===`l-${colorKey}`);
    return light ? { ...light, id:presetId+"-inv", inverted:true } : null;
  } else {
    const colorKey = presetId.replace("l-","");
    const dark = THEME_PRESETS.find(t=>t.id===`d-${colorKey}`);
    return dark ? { ...dark, id:presetId+"-inv", inverted:true } : null;
  }
};

function applyThemePreset(preset) {
  if (!preset) return;
  const root = document.documentElement;
  root.style.setProperty("--bg",      preset.bg);
  root.style.setProperty("--surface", preset.surface);
  root.style.setProperty("--card",    preset.card);
  root.style.setProperty("--border",  preset.border);
  root.style.setProperty("--text",    preset.text);
  root.style.setProperty("--sub",     preset.sub);
  root.style.setProperty("--accent",  preset.accent);
  root.style.setProperty("--dim",     preset.accent+"22");
  document.body.style.background = preset.bg;
  document.body.style.color = preset.text;
}

// ───────────────────────────────────────────────────────────────────────────────
// [I18N] TRANSLATIONS
// ───────────────────────────────────────────────────────────────────────────────
const T = {
  es: {
    lang:"Español", inicio:"Inicio", entreno:"Entreno", progreso:"Progreso",
    metricas:"Métricas", rutinas:"Rutinas", mensajes:"Mensajes", config:"Config",
    resumen:"Resumen", alumnos:"Alumnos", usuarios:"Usuarios", overview:"Resumen",
    cerrarSesion:"Cerrar sesión", guardar:"Guardar cambios", perfil:"Perfil",
    seguridad:"Seguridad", nombre:"Nombre completo", email:"Email",
    celular:"Número de celular", nacimiento:"Fecha de nacimiento",
    idioma:"Idioma", unidades:"Unidades de peso", rol:"Rol",
    pesoInicial:"Peso inicial", altura:"Altura", pesoObj:"Peso objetivo (opcional)",
    imc:"IMC calculado", hoy:"Hola", descanso:"¡Día de descanso!",
    sinRutinas:"Sin rutinas asignadas aún", nuevaRutina:"Nueva rutina",
    importar:"Importar", guardarEnt:"Guardar entrenamiento 💾",
    guardado:"✓ ¡Guardado con éxito!", registrarMetricas:"Registrar métricas",
    progresoReciente:"Progreso reciente", objetivosCiclo:"Objetivos del ciclo",
    entrenamientoHoy:"Entrenamiento de hoy", empezar:"Empezar 🔥",
    repositorio:"Repositorio", asignarAlumno:"Asignar a alumno",
    copiarPersonalizar:"Copiar y personalizar", asignarOriginal:"Asignar original",
    diasEntrenamiento:"Días de entrenamiento", frecuenciaSemanal:"Frecuencia semanal",
    puntoPartida:"Punto de partida", kg:"kg", lbs:"lbs",
  },
  en: {
    lang:"English", inicio:"Home", entreno:"Training", progreso:"Progress",
    metricas:"Metrics", rutinas:"Routines", mensajes:"Messages", config:"Settings",
    resumen:"Overview", alumnos:"Students", usuarios:"Users", overview:"Overview",
    cerrarSesion:"Sign out", guardar:"Save changes", perfil:"Profile",
    seguridad:"Security", nombre:"Full name", email:"Email",
    celular:"Phone number", nacimiento:"Date of birth",
    idioma:"Language", unidades:"Weight units", rol:"Role",
    pesoInicial:"Initial weight", altura:"Height", pesoObj:"Target weight (optional)",
    imc:"Calculated BMI", hoy:"Hello", descanso:"Rest day!",
    sinRutinas:"No routines assigned yet", nuevaRutina:"New routine",
    importar:"Import", guardarEnt:"Save training 💾",
    guardado:"✓ Saved successfully!", registrarMetricas:"Log metrics",
    progresoReciente:"Recent progress", objetivosCiclo:"Cycle objectives",
    entrenamientoHoy:"Today's training", empezar:"Start 🔥",
    repositorio:"Repository", asignarAlumno:"Assign to student",
    copiarPersonalizar:"Copy & customize", asignarOriginal:"Assign original",
    diasEntrenamiento:"Training days", frecuenciaSemanal:"Weekly frequency",
    puntoPartida:"Starting point", kg:"kg", lbs:"lbs",
  },
  pt: {
    lang:"Português", inicio:"Início", entreno:"Treino", progreso:"Progresso",
    metricas:"Métricas", rutinas:"Rotinas", mensajes:"Mensagens", config:"Config",
    resumen:"Resumo", alumnos:"Alunos", usuarios:"Usuários", overview:"Resumo",
    cerrarSesion:"Sair", guardar:"Salvar alterações", perfil:"Perfil",
    seguridad:"Segurança", nombre:"Nome completo", email:"E-mail",
    celular:"Número de celular", nacimiento:"Data de nascimento",
    idioma:"Idioma", unidades:"Unidades de peso", rol:"Função",
    pesoInicial:"Peso inicial", altura:"Altura", pesoObj:"Peso alvo (opcional)",
    imc:"IMC calculado", hoy:"Olá", descanso:"Dia de descanso!",
    sinRutinas:"Sem rotinas atribuídas", nuevaRutina:"Nova rotina",
    importar:"Importar", guardarEnt:"Salvar treino 💾",
    guardado:"✓ Salvo com sucesso!", registrarMetricas:"Registrar métricas",
    progresoReciente:"Progresso recente", objetivosCiclo:"Objetivos do ciclo",
    entrenamientoHoy:"Treino de hoje", empezar:"Começar 🔥",
    repositorio:"Repositório", asignarAlumno:"Atribuir a aluno",
    copiarPersonalizar:"Copiar e personalizar", asignarOriginal:"Atribuir original",
    diasEntrenamiento:"Dias de treino", frecuenciaSemanal:"Frequência semanal",
    puntoPartida:"Ponto de partida", kg:"kg", lbs:"lbs",
  },
  ru: {
    lang:"Русский", inicio:"Главная", entreno:"Тренировка", progreso:"Прогресс",
    metricas:"Метрики", rutinas:"Программы", mensajes:"Сообщения", config:"Настройки",
    resumen:"Обзор", alumnos:"Ученики", usuarios:"Пользователи", overview:"Обзор",
    cerrarSesion:"Выйти", guardar:"Сохранить", perfil:"Профиль",
    seguridad:"Безопасность", nombre:"Полное имя", email:"Эл. почта",
    celular:"Номер телефона", nacimiento:"Дата рождения",
    idioma:"Язык", unidades:"Единицы веса", rol:"Роль",
    pesoInicial:"Начальный вес", altura:"Рост", pesoObj:"Целевой вес (необяз.)",
    imc:"Рассчитанный ИМТ", hoy:"Привет", descanso:"День отдыха!",
    sinRutinas:"Программы не назначены", nuevaRutina:"Новая программа",
    importar:"Импорт", guardarEnt:"Сохранить тренировку 💾",
    guardado:"✓ Сохранено!", registrarMetricas:"Записать метрики",
    progresoReciente:"Недавний прогресс", objetivosCiclo:"Цели цикла",
    entrenamientoHoy:"Тренировка сегодня", empezar:"Начать 🔥",
    repositorio:"Репозиторий", asignarAlumno:"Назначить ученику",
    copiarPersonalizar:"Копировать и изменить", asignarOriginal:"Назначить оригинал",
    diasEntrenamiento:"Дни тренировок", frecuenciaSemanal:"Частота в неделю",
    puntoPartida:"Отправная точка", kg:"кг", lbs:"фунты",
  },
};
const LANG_CODES = { "Español":"es", "English":"en", "Português":"pt", "Русский":"ru" };

// Weight conversion helpers
const toDisplay = (kg, unit) => unit==="lbs" ? +(kg*2.20462).toFixed(1) : +kg;
const toKg      = (val, unit) => unit==="lbs" ? +(val/2.20462).toFixed(2) : +val;
const fmtWeight = (kg, unit) => `${toDisplay(kg,unit)} ${unit}`;

// BMI calculator
const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const bmi = weightKg / Math.pow(heightCm/100, 2);
  return +bmi.toFixed(1);
};
const bmiCategory = (bmi, lang="es") => {
  if (!bmi) return "";
  const cats = {
    es: bmi<18.5?"Bajo peso":bmi<25?"Normal":bmi<30?"Sobrepeso":"Obesidad",
    en: bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese",
    pt: bmi<18.5?"Abaixo do peso":bmi<25?"Normal":bmi<30?"Sobrepeso":"Obesidade",
    ru: bmi<18.5?"Недостаток веса":bmi<25?"Норма":bmi<30?"Избыток веса":"Ожирение",
  };
  return cats[lang]||cats.es;
};

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

// ───────────────────────────────────────────────────────────────────────────────
// [M10] OBJECTIVES SELECTOR — usado en UsersModule al crear/editar alumno
// ───────────────────────────────────────────────────────────────────────────────
function ObjectivesSelector({ value, onChange }) {
  const MAX = 3;
  const byCategory = OBJECTIVES_CATALOG.reduce((acc, o) => {
    if (!acc[o.cat]) acc[o.cat] = [];
    acc[o.cat].push(o);
    return acc;
  }, {});

  const isSelected = (id) => value.some(v => v.id === id);
  const getObj = (id) => value.find(v => v.id === id);
  const principal = value.find(v => v.priority === "principal");

  const toggle = (obj) => {
    if (isSelected(obj.id)) {
      onChange(value.filter(v => v.id !== obj.id));
    } else {
      if (value.length >= MAX) return; // max 3
      const newObj = { id:obj.id, priority: !principal ? "principal" : "secundario", completed:false };
      onChange([...value, newObj]);
    }
  };

  const setPriority = (id, priority) => {
    // only one principal allowed
    onChange(value.map(v => {
      if (v.id === id) return { ...v, priority };
      if (priority === "principal" && v.priority === "principal") return { ...v, priority:"secundario" };
      return v;
    }));
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <Label>OBJETIVOS DEL CICLO</Label>
        <span style={{ fontSize:11, color: value.length >= MAX ? "var(--red)" : "var(--sub)" }}>
          {value.length}/{MAX} seleccionados
        </span>
      </div>
      <div style={{ fontSize:11, color:"var(--sub)", marginBottom:10 }}>
        Máx. 3 objetivos · 1 principal + hasta 2 secundarios
      </div>

      {/* Selected objectives summary */}
      {value.length > 0 && (
        <div style={{ marginBottom:12, display:"flex", flexDirection:"column", gap:5 }}>
          {value.map(v => {
            const obj = OBJECTIVES_CATALOG.find(o=>o.id===v.id);
            return (
              <div key={v.id} style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface)", borderRadius:8, padding:"7px 10px", border:`1px solid ${v.priority==="principal"?"var(--accent)":"var(--border)"}` }}>
                <span>{obj?.emoji}</span>
                <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{obj?.label}</span>
                <select value={v.priority} onChange={e=>setPriority(v.id, e.target.value)} style={{ width:"auto", fontSize:11, padding:"2px 6px" }}>
                  <option value="principal">Principal</option>
                  <option value="secundario">Secundario</option>
                </select>
                <button onClick={()=>toggle(obj)} style={{ background:"none", border:"none", color:"var(--red)", fontSize:16, padding:"0 2px" }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Catalog by category */}
      <div style={{ maxHeight:240, overflowY:"auto", border:"1px solid var(--border)", borderRadius:9 }}>
        {Object.entries(byCategory).map(([cat, objs]) => (
          <div key={cat}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"var(--sub)", padding:"7px 12px 4px", background:"var(--surface)", position:"sticky", top:0 }}>
              {objs[0].emoji} {cat.toUpperCase()}
            </div>
            {objs.map(obj => {
              const sel = isSelected(obj.id);
              const disabled = !sel && value.length >= MAX;
              return (
                <button key={obj.id} onClick={()=>!disabled&&toggle(obj)} style={{
                  display:"flex", alignItems:"flex-start", gap:8, width:"100%",
                  background: sel ? "var(--dim)" : "transparent",
                  border:"none", borderBottom:"1px solid var(--border)",
                  padding:"8px 12px", textAlign:"left", opacity: disabled ? .4 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}>
                  <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${sel?"var(--accent)":"var(--border)"}`, background:sel?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                    {sel && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:sel?700:400, color:sel?"var(--accent)":"var(--text)" }}>{obj.label}</div>
                    <div style={{ fontSize:11, color:"var(--sub)", marginTop:1 }}>{obj.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersModule({ currentUser }) {
  const { store, dispatch } = useStore();
  const theme = getTheme(currentUser);
  const [modal, setModal] = useState(null); // null | "add" | "edit"
  const [editing, setEditing]   = useState(null);
  const [form, setForm]   = useState({ name:"", email:"", password:"1234", role:"alumno", gender:"male", coachId:"", alumnoLimit:null, expiresAt:null, expiresInDays:"", pesoInicial:"", pesoObj:"", altura:"", lang:"es", units:"kg" });
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
    setForm({ name:"", email:"", password:"1234", role: currentUser.role==="coach"?"alumno":"coach", gender:"male", coachId: currentUser.role==="coach"?currentUser.id:"", alumnoLimit:null, expiresAt:null, expiresInDays:"", pesoInicial:"", pesoObj:"", altura:"", lang:"es", units:"kg" });
    setModal("add");
  };
  const openEdit = (u) => { setEditing(u); setForm({...u}); setModal("edit"); };

  const save = () => {
    if (!form.name || !form.email) return;
    // Compute expiresAt from expiresInDays if provided
    let expiresAt = form.expiresAt || null;
    if (form.expiresInDays && !isNaN(parseInt(form.expiresInDays))) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(form.expiresInDays));
      expiresAt = d.toISOString();
    }
    const payload = { ...form, expiresAt, suspended: form.suspended||false, suspendedAt: form.suspendedAt||null };
    delete payload.expiresInDays;
    if (modal === "add") {
      dispatch("ADD_USER", { ...payload, id:"u"+Date.now(), active:true });
    } else {
      dispatch("UPDATE_USER", { ...payload, id:editing.id });
    }
    setModal(null);
  };

  // Check alumno limit for coach
  const coachAtLimit = (coachId) => {
    const coach = store.users.find(u=>u.id===coachId);
    if (!coach || coach.alumnoLimit === null || coach.alumnoLimit === undefined) return false;
    const count = store.users.filter(u=>u.role==="alumno"&&u.coachId===coachId&&u.active).length;
    return count >= coach.alumnoLimit;
  };

  const roleLabel = { superadmin:"SuperAdmin", coach:"Entrenador", alumno:"Alumno" };
  const roleColor = { superadmin:"var(--yellow)", coach:"var(--red)", alumno:"var(--accent)" };

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <H size={20}>Usuarios</H>
        {currentUser.role==="coach" && coachAtLimit(currentUser.id)
          ? <div style={{ fontSize:12, color:"var(--red)", fontWeight:600, padding:"6px 12px", background:"#ef444411", borderRadius:8, border:"1px solid #ef444433" }}>⚠️ Límite alcanzado</div>
          : <Btn onClick={openAdd} v="sm">+ Nuevo</Btn>
        }
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
                  {u.role==="coach" && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:3 }}>
                      <span style={{ fontSize:10, color:"var(--sub)" }}>
                        👥 {u.alumnoLimit===null||u.alumnoLimit===undefined ? "Ilimitado" : `Máx. ${u.alumnoLimit} alumnos`}
                        {" · "}{store.users.filter(a=>a.role==="alumno"&&a.coachId===u.id&&a.active).length} actuales
                      </span>
                      {u.expiresAt && (
                        <span style={{ fontSize:10, color: new Date(u.expiresAt) < new Date() ? "var(--red)" : "var(--orange)" }}>
                          ⏰ {new Date(u.expiresAt) < new Date() ? "Vencido" : `Vence ${new Date(u.expiresAt).toLocaleDateString("es")}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <Pill label={roleLabel[u.role]} color={roleColor[u.role]} />
                    {u.suspended && <Pill label="Suspendido" color="var(--orange)" size={10}/>}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn onClick={()=>openEdit(u)} v="ghost" style={{ padding:"3px 10px", fontSize:11 }}>✏️</Btn>
                    {(u.role === "alumno" || (u.role === "coach" && currentUser.role === "superadmin")) && (
                      <Btn
                        onClick={()=>dispatch("SUSPEND_USER",{id:u.id, val:!u.suspended, role:u.role})}
                        v={u.suspended ? "success" : "ghost"}
                        style={{ padding:"3px 10px", fontSize:11 }}
                        title={u.suspended ? "Reactivar" : u.role==="coach" ? "Suspender (cascada a alumnos)" : "Suspender"}
                      >{u.suspended ? "▶ Reactivar" : "⏸ Suspender"}</Btn>
                    )}
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
                  {currentUser.role === "superadmin" ? (
                    <select value={form.coachId} onChange={e=>setForm(p=>({...p,coachId:e.target.value}))}>
                      <option value="">— Seleccionar —</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ background:"var(--surface)", borderRadius:8, padding:"8px 12px", fontSize:13, color:"var(--sub)", border:"1px solid var(--border)" }}>
                      {store.users.find(u=>u.id===currentUser.id)?.name} <span style={{ color:"var(--muted)", fontSize:11 }}>(asignado automáticamente)</span>
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Coach-specific fields: alumno limit + expiry */}
            {form.role === "coach" && (
              <>
                <Divider/>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:8, letterSpacing:.5 }}>⚙️ CONFIGURACIÓN DEL ENTRENADOR</div>
                <div>
                  <Label>LÍMITE DE ALUMNOS</Label>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input
                      type="number" min="1"
                      placeholder="Ej: 20"
                      value={form.alumnoLimit||""}
                      onChange={e=>setForm(p=>({...p, alumnoLimit: e.target.value===""?null:parseInt(e.target.value)}))}
                      style={{ flex:1 }}
                    />
                    <button onClick={()=>setForm(p=>({...p,alumnoLimit:null}))} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:12, color:form.alumnoLimit===null?"var(--accent)":"var(--sub)", fontWeight:600 }}>
                      {form.alumnoLimit===null?"✓ Ilimitado":"Ilimitado"}
                    </button>
                  </div>
                  <div style={{ fontSize:11, color:"var(--sub)", marginTop:4 }}>
                    {form.alumnoLimit===null ? "Sin límite de alumnos" : `Máximo ${form.alumnoLimit} alumnos`}
                  </div>
                </div>
                <div>
                  <Label>VENCIMIENTO DE ACCESO</Label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>Fecha exacta</div>
                      <input type="date" value={form.expiresAt ? form.expiresAt.split("T")[0] : ""} onChange={e=>setForm(p=>({...p, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null, expiresInDays:""}))}/>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>O en X días</div>
                      <input type="number" min="1" placeholder="Ej: 30" value={form.expiresInDays||""} onChange={e=>setForm(p=>({...p, expiresInDays:e.target.value, expiresAt:null}))}/>
                    </div>
                  </div>
                  {(form.expiresAt || form.expiresInDays) && (
                    <div style={{ fontSize:11, color:"var(--orange)", marginTop:4, display:"flex", justifyContent:"space-between" }}>
                      <span>
                        {form.expiresInDays ? `Vence en ${form.expiresInDays} días (${new Date(Date.now()+parseInt(form.expiresInDays)*86400000).toLocaleDateString("es")})` : `Vence el ${new Date(form.expiresAt).toLocaleDateString("es")}`}
                      </span>
                      <button onClick={()=>setForm(p=>({...p,expiresAt:null,expiresInDays:""}))} style={{ background:"none", border:"none", color:"var(--sub)", fontSize:12, cursor:"pointer" }}>× Sin vencimiento</button>
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Starting point — only for alumnos */}
            {form.role === "alumno" && (
              <>
                <Divider/>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:8 }}>📍 PUNTO DE PARTIDA</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <Label>PESO INICIAL (kg)</Label>
                    <input type="number" step="0.1" placeholder="Ej: 75.5" value={form.pesoInicial||""} onChange={e=>setForm(p=>({...p,pesoInicial:e.target.value}))}/>
                  </div>
                  <div>
                    <Label>ALTURA (cm)</Label>
                    <input type="number" placeholder="Ej: 175" value={form.altura||""} onChange={e=>setForm(p=>({...p,altura:e.target.value}))}/>
                  </div>
                </div>
                <div>
                  <Label>PESO OBJETIVO (kg) — opcional</Label>
                  <input type="number" step="0.1" placeholder="Ej: 80" value={form.pesoObj||""} onChange={e=>setForm(p=>({...p,pesoObj:e.target.value}))}/>
                </div>
                {form.pesoInicial && form.altura && (() => {
                  const bmi = calcBMI(parseFloat(form.pesoInicial), parseFloat(form.altura));
                  return bmi ? (
                    <div style={{ background:"var(--surface)", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                      <span style={{ color:"var(--sub)" }}>IMC calculado: </span>
                      <span style={{ fontWeight:700, color:"var(--accent)" }}>{bmi}</span>
                      <span style={{ color:"var(--sub)", marginLeft:6 }}>({bmiCategory(bmi)})</span>
                    </div>
                  ) : null;
                })()}
                <Divider/>
                <ObjectivesSelector
                  value={form.objectives||[]}
                  onChange={v=>setForm(p=>({...p,objectives:v}))}
                />
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
  const fileRef = useRef();
  // Steps: choose → schedule → preview → done
  const [step, setStep]         = useState("choose");
  const [file, setFile]         = useState(null);
  const [sheets, setSheets]     = useState([]);
  const [editSheets, setEditSheets] = useState([]); // editable copy
  const [editingSheet, setEditingSheet] = useState(null); // index being edited
  const [error, setError]       = useState("");
  const [importing, setImporting] = useState(false);
  const [previewSheet, setPreviewSheet] = useState(0);

  // Schedule config
  const [startDate, setStartDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [trainingDays, setTrainingDays] = useState([1,3,5]); // Mon Wed Fri
  const [country, setCountry]           = useState("AR");
  const [holidays, setHolidays]         = useState([]);
  const [schedule, setSchedule]         = useState([]); // computed dates
  const [conflicts, setConflicts]       = useState([]); // holiday conflicts
  const [rescheduled, setRescheduled]   = useState({}); // {idx: newDate}

  const DOW_LABELS = [{v:1,l:"Lun"},{v:2,l:"Mar"},{v:3,l:"Mié"},{v:4,l:"Jue"},{v:5,l:"Vie"},{v:6,l:"Sáb"},{v:0,l:"Dom"}];

  const toggleDay = (d) => setTrainingDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d].sort());

  const computeSchedule = (hols) => {
    if (!trainingDays.length || !sheets.length) return;
    const sched = buildSchedule(startDate, trainingDays, sheets.length);
    setSchedule(sched);
    const conf = sched.map((date, i) => hols.includes(date) ? i : null).filter(x=>x!==null);
    setConflicts(conf);
    setRescheduled({});
  };

  const loadHolidays = async () => {
    const year = new Date(startDate).getFullYear();
    const h = await fetchHolidays(country, year);
    // also fetch next year in case plan spans year boundary
    const h2 = await fetchHolidays(country, year+1);
    const all = [...new Set([...h,...h2])];
    setHolidays(all);
    return all;
  };

  const goToSchedule = async () => {
    const hols = await loadHolidays();
    computeSchedule(hols);
    setEditSheets(sheets.map(s=>({...s, exercises:[...s.exercises.map(e=>({...e}))]})));
    setStep("schedule");
  };

  useEffect(() => {
    if (step==="schedule" && trainingDays.length && startDate) computeSchedule(holidays);
  }, [trainingDays, startDate]);

  // Available dates to reschedule a conflicted session
  const getAvailableDates = (sessionIdx) => {
    const sessionDate = schedule[sessionIdx];
    const usedDates = new Set([...schedule, ...Object.values(rescheduled)]);
    usedDates.delete(sessionDate);
    const candidates = [];
    // Look for free days in ±14 day window that are not training days and not already used
    for (let d=-1; d>=-(14); d--) {
      const candidate = addDays(sessionDate, d);
      const dow = new Date(candidate+"T12:00:00").getDay();
      if (!trainingDays.includes(dow) && !usedDates.has(candidate) && candidate >= startDate) {
        candidates.push(candidate);
      }
    }
    for (let d=1; d<=14; d++) {
      const candidate = addDays(sessionDate, d);
      const dow = new Date(candidate+"T12:00:00").getDay();
      if (!trainingDays.includes(dow) && !usedDates.has(candidate)) {
        candidates.push(candidate);
      }
    }
    return candidates.slice(0,8);
  };

  const reschedule = (sessionIdx, newDate) => {
    setRescheduled(p => ({...p, [sessionIdx]: newDate}));
    setConflicts(p => p.filter(c=>c!==sessionIdx));
  };

  // ── Parse CSV/XLSX ────────────────────────────────────────────────────────
  const parseRows = (rows, sheetName) => {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(h => String(h||"").trim().toLowerCase());
    return rows.slice(1).filter(r => r.some(Boolean)).map((r, i) => {
      const row = {};
      headers.forEach((h, j) => { row[h] = String(r[j]||"").trim(); });
      return {
        id: `imp_${sheetName}_${i}_${Date.now()}`,
        name:        row["nombre_ejercicio"] || `Ejercicio ${i+1}`,
        sets:        parseInt(row["series"]) || 3,
        reps:        row["reps"] || "8",
        pct:         row["porcentaje_1rm"] || "—",
        peso:        row["peso_objetivo"] || "—",
        descanso:    row["descanso"] || "90 seg",
        instruccion: row["instruccion"] || "",
      };
    });
  };

  const handleFile = async (f) => {
    setFile(f); setError(""); setSheets([]);
    setImporting(true);
    try {
      if (!window.XLSX) {
        await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
      }
      const XLSX = window.XLSX;
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array" });
      const parsed = wb.SheetNames.map(name => {
        const ws   = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
        return { name, exercises: parseRows(rows, name) };
      }).filter(s => s.exercises.length > 0);
      if (!parsed.length) throw new Error("No se encontraron hojas con datos válidos");
      setSheets(parsed);
      setStep("schedule");
      const hols = await loadHolidays();
      const sched = buildSchedule(startDate, trainingDays, parsed.length);
      setSchedule(sched);
      const conf = sched.map((date,i) => hols.includes(date)?i:null).filter(x=>x!==null);
      setConflicts(conf);
      setEditSheets(parsed.map(s=>({...s, exercises:[...s.exercises.map(e=>({...e}))]})));
    } catch(e) { setError("Error al leer el archivo: " + e.message); }
    finally { setImporting(false); }
  };

  const downloadTemplate = async () => {
    if (!window.XLSX) {
      await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    for (let d=1; d<=3; d++) {
      const data = [
        ["nombre_ejercicio","series","reps","porcentaje_1rm","peso_objetivo","descanso","instruccion"],
        ["Sentadilla trasera",5,5,"85%","102.5 kg","2-3 min","Baja controlada"],
        ["Peso muerto rumano",4,6,"75%","90 kg","2 min","Siente el estiramiento"],
        ["Press de banca",3,8,"70%","80 kg","90 seg","Recorrido completo"],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), `Dia_${d}`);
    }
    XLSX.writeFile(wb, "plantilla_rutina_trimestral.xlsx");
  };

  // ── Confirm import ────────────────────────────────────────────────────────
  const confirmImport = () => {
    const ts = Date.now();
    const finalSheets = editSheets.length ? editSheets : sheets;
    finalSheets.forEach((sheet, i) => {
      const semana = Math.floor(i / 3) + 1;
      const scheduledDate = rescheduled[i] || schedule[i] || null;
      onImport({
        id:            `r${ts}_${i}`,
        alumnoId,
        semana,
        label:         sheet.name.replace(/_/g," "),
        status:        "upcoming",
        duracion:      "60–75 min",
        scheduledDate,
        exercises:     sheet.exercises,
        logs:          Object.fromEntries(sheet.exercises.map(e=>[e.id,[]])),
      });
    });
    setStep("done");
    setTimeout(onClose, 2000);
  };

  // ── Edit sheet exercises inline ───────────────────────────────────────────
  const updEditEx = (si, ei, k, v) => {
    setEditSheets(prev => {
      const ss = prev.map(s=>({...s, exercises:[...s.exercises]}));
      ss[si].exercises[ei] = {...ss[si].exercises[ei], [k]:v};
      return ss;
    });
  };
  const addEditEx = (si) => {
    setEditSheets(prev => {
      const ss = prev.map(s=>({...s, exercises:[...s.exercises]}));
      ss[si].exercises.push({id:"e"+Date.now(), name:"", sets:3, reps:"8", pct:"—", peso:"", descanso:"90 seg", instruccion:""});
      return ss;
    });
  };
  const remEditEx = (si, ei) => {
    setEditSheets(prev => {
      const ss = prev.map(s=>({...s, exercises:[...s.exercises]}));
      ss[si].exercises.splice(ei,1);
      return ss;
    });
  };

  const cur = (editSheets.length ? editSheets : sheets)[previewSheet];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── STEP: CHOOSE ── */}
      {step === "choose" && (
        <>
          <div style={{ background:"var(--surface)", borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>📥 Paso 1 — Descargá la plantilla</div>
            <div style={{ fontSize:12, color:"var(--sub)", marginBottom:10 }}>Cada hoja = un día. Podés tener hasta 36 hojas (Dia_1 a Dia_36).</div>
            <Btn onClick={downloadTemplate} v="ghost" full>⬇ Descargar plantilla XLSX</Btn>
          </div>
          <div style={{ background:"var(--surface)", borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>📤 Paso 2 — Subí el archivo completado</div>
            <div onClick={()=>fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
              style={{ border:"2px dashed var(--border)", borderRadius:10, padding:"28px 20px", textAlign:"center", cursor:"pointer" }}>
              {importing
                ? <div style={{ color:"var(--sub)", fontSize:13 }}>⏳ Leyendo archivo...</div>
                : <><div style={{ fontSize:28, marginBottom:8 }}>📁</div>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{file?file.name:"Arrastrá o hacé click para subir"}</div>
                    <div style={{ fontSize:12, color:"var(--sub)" }}>CSV o XLSX (multi-hoja)</div></>
              }
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
          </div>
          {error && <div style={{ background:"#ef444411", border:"1px solid #ef444433", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13 }}>{error}</div>}
        </>
      )}

      {/* ── STEP: SCHEDULE ── */}
      {step === "schedule" && (
        <>
          <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:"10px 14px", color:"#22c55e", fontSize:13, marginBottom:14 }}>
            ✓ {sheets.length} días detectados — ahora configurá el calendario
          </div>

          {/* Country + start date */}
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:10 }}>📅 CONFIGURACIÓN DEL CALENDARIO</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <Label>PAÍS (para feriados)</Label>
                <select value={country} onChange={e=>{setCountry(e.target.value); loadHolidays().then(h=>computeSchedule(h));}}>
                  {COUNTRY_LIST.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>FECHA DE INICIO</Label>
                <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value); computeSchedule(holidays);}}/>
              </div>
            </div>

            {/* Training days selector */}
            <Label>DÍAS DE ENTRENAMIENTO</Label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {DOW_LABELS.map(d=>(
                <button key={d.v} onClick={()=>toggleDay(d.v)} style={{
                  padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700,
                  background:trainingDays.includes(d.v)?"var(--accent)":"var(--surface)",
                  border:`1px solid ${trainingDays.includes(d.v)?"var(--accent)":"var(--border)"}`,
                  color:trainingDays.includes(d.v)?"#fff":"var(--sub)"
                }}>{d.l}</button>
              ))}
            </div>
            {trainingDays.length === 0 && <div style={{ fontSize:12, color:"var(--red)", marginBottom:8 }}>Seleccioná al menos un día</div>}
          </Card>

          {/* Conflict alerts */}
          {conflicts.length > 0 && (
            <Card style={{ marginBottom:12, border:"1px solid var(--orange)44" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--orange)", marginBottom:10 }}>⚠️ {conflicts.length} SESIÓN{conflicts.length>1?"ES":""} EN FERIADO</div>
              {conflicts.map(ci => (
                <div key={ci} style={{ marginBottom:10, padding:"8px 10px", background:"var(--surface)", borderRadius:8, borderLeft:"3px solid var(--orange)" }}>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:5 }}>
                    {(editSheets[ci]||sheets[ci])?.name.replace(/_/g," ")} — {new Date((rescheduled[ci]||schedule[ci])+"T12:00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}
                    <span style={{ color:"var(--orange)", marginLeft:6, fontSize:11 }}>🎉 Feriado</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--sub)", marginBottom:6 }}>Mover a:</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {getAvailableDates(ci).map(d=>(
                      <button key={d} onClick={()=>reschedule(ci,d)} style={{
                        background:"var(--card)", border:"1px solid var(--border)", borderRadius:6,
                        padding:"4px 8px", fontSize:11, color:"var(--text)", cursor:"pointer"
                      }}>{new Date(d+"T12:00:00").toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})}</button>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Schedule preview — show first 6 sessions */}
          {schedule.length > 0 && (
            <Card style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:8 }}>PRIMERAS SESIONES PROGRAMADAS</div>
              {schedule.slice(0,6).map((date,i) => {
                const finalDate = rescheduled[i] || date;
                const isConflict = holidays.includes(date) && !rescheduled[i];
                const isRescheduled = !!rescheduled[i];
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ fontSize:12 }}>
                      <span style={{ fontWeight:600, color:"var(--sub)" }}>Sem {Math.floor(i/trainingDays.length)+1} · </span>
                      {(editSheets[i]||sheets[i])?.name.replace(/_/g," ")}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:11, color:isConflict?"var(--orange)":isRescheduled?"var(--green)":"var(--sub)" }}>
                        {new Date(finalDate+"T12:00:00").toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})}
                      </span>
                      {isConflict && <span style={{ fontSize:10 }}>⚠️</span>}
                      {isRescheduled && <span style={{ fontSize:10, color:"var(--green)" }}>✓</span>}
                    </div>
                  </div>
                );
              })}
              {schedule.length > 6 && <div style={{ fontSize:11, color:"var(--sub)", textAlign:"center", marginTop:8 }}>+{schedule.length-6} sesiones más...</div>}
            </Card>
          )}

          {/* Routine editor — sheet tabs + inline edit */}
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:8 }}>✏️ REVISAR Y EDITAR RUTINAS</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
              {(editSheets.length?editSheets:sheets).map((sh,i)=>(
                <button key={i} onClick={()=>{setPreviewSheet(i);setEditingSheet(editingSheet===i?null:i);}} style={{
                  background:previewSheet===i?"var(--accent)":"var(--surface)",
                  border:`1px solid ${previewSheet===i?"var(--accent)":"var(--border)"}`,
                  color:previewSheet===i?"#fff":"var(--sub)",
                  borderRadius:7, padding:"4px 10px", fontSize:11, fontWeight:600,
                }}>{sh.name.replace(/_/g," ")}</button>
              ))}
            </div>

            {cur && editingSheet === previewSheet ? (
              // Edit mode
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:8 }}>{cur.name.replace(/_/g," ")} — Editando</div>
                {cur.exercises.map((ex,ei)=>(
                  <div key={ei} style={{ background:"var(--surface)", borderRadius:9, padding:10, marginBottom:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:11, color:"var(--sub)", fontWeight:600 }}>Ejercicio {ei+1}</span>
                      <button onClick={()=>remEditEx(previewSheet,ei)} style={{ background:"none", border:"none", color:"var(--red)", fontSize:15, cursor:"pointer" }}>×</button>
                    </div>
                    <input value={ex.name} onChange={e=>updEditEx(previewSheet,ei,"name",e.target.value)} placeholder="Nombre" style={{ marginBottom:5 }}/>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5 }}>
                      <input type="number" value={ex.sets} onChange={e=>updEditEx(previewSheet,ei,"sets",e.target.value)} placeholder="Series"/>
                      <input value={ex.reps} onChange={e=>updEditEx(previewSheet,ei,"reps",e.target.value)} placeholder="Reps"/>
                      <input value={ex.peso} onChange={e=>updEditEx(previewSheet,ei,"peso",e.target.value)} placeholder="Peso"/>
                      <input value={ex.descanso} onChange={e=>updEditEx(previewSheet,ei,"descanso",e.target.value)} placeholder="Descanso"/>
                    </div>
                  </div>
                ))}
                <Btn onClick={()=>addEditEx(previewSheet)} v="ghost" full style={{ fontSize:12, marginTop:4 }}>+ Agregar ejercicio</Btn>
                <Btn onClick={()=>setEditingSheet(null)} v="success" full style={{ fontSize:12, marginTop:6 }}>✓ Listo</Btn>
              </div>
            ) : cur ? (
              // View mode
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)" }}>{cur.name.replace(/_/g," ")} — {cur.exercises.length} ejercicios</div>
                  <Btn onClick={()=>setEditingSheet(previewSheet)} v="ghost" style={{ fontSize:11, padding:"4px 10px" }}>✏️ Editar</Btn>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:380 }}>
                    <thead><tr style={{ background:"var(--card)" }}>
                      {["Ejercicio","Series","Reps","%1RM","Peso","Descanso"].map(h=>(
                        <th key={h} style={{ padding:"5px 8px", textAlign:"left", color:"var(--sub)", fontWeight:700 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {cur.exercises.map((e,i)=>(
                        <tr key={i} style={{ borderTop:"1px solid var(--border)" }}>
                          <td style={{ padding:"6px 8px", fontWeight:600 }}>{e.name}</td>
                          <td style={{ padding:"6px 8px" }}>{e.sets}</td>
                          <td style={{ padding:"6px 8px" }}>{e.reps}</td>
                          <td style={{ padding:"6px 8px", color:"var(--accent)" }}>{e.pct}</td>
                          <td style={{ padding:"6px 8px" }}>{e.peso}</td>
                          <td style={{ padding:"6px 8px" }}>{e.descanso}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </Card>

          {conflicts.length > 0 && (
            <div style={{ background:"#f9731611", border:"1px solid #f9731633", borderRadius:9, padding:"10px 14px", fontSize:12, color:"var(--orange)", marginBottom:12 }}>
              ⚠️ Tenés {conflicts.length} sesión{conflicts.length>1?"es":""} en feriado sin resolver. Podés importar igual o moverlas arriba.
            </div>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <Btn v="ghost" onClick={()=>{setStep("choose");setSheets([]);setFile(null);}} full>← Volver</Btn>
            <Btn onClick={confirmImport} full disabled={!trainingDays.length}>Importar {sheets.length} días ✓</Btn>
          </div>
        </>
      )}

      {step === "done" && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <H size={18}>¡{sheets.length} rutinas importadas!</H>
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
  const t = useLang(currentUser);
  const isCoach  = currentUser.role === "coach";
  const isAlumno = currentUser.role === "alumno";
  const alumnoId = targetAlumnoId || (isAlumno ? currentUser.id : null);

  // Tab: "repo" (coach managing their library) | "alumno" (viewing/editing assigned)
  const [tab, setTab] = useState(alumnoId && !targetAlumnoId ? "alumno" : isCoach ? "repo" : "alumno");

  // ── REPOSITORY state ──────────────────────────────────────────────────────
  const coachId   = isCoach ? currentUser.id : store.users.find(u=>u.id===alumnoId)?.coachId;
  const repoItems = store.repository?.[coachId] || [];
  const [repoModal, setRepoModal] = useState(null); // null | "add" | "edit" | "import"
  const [repoForm, setRepoForm]   = useState({ label:"", duracion:"60–75 min", exercises:[] });
  const [editingRepoId, setEditingRepoId] = useState(null);

  // ── ASSIGN state ──────────────────────────────────────────────────────────
  const [assignModal, setAssignModal]   = useState(null); // null | routineId
  const [assignAlumnoId, setAssignAlumnoId] = useState(alumnoId||"");
  const [assignMode, setAssignMode]     = useState("copy"); // "copy" | "original"
  const [assignDays, setAssignDays]     = useState([1,3,5]);
  const [assignStart, setAssignStart]   = useState(() => new Date().toISOString().split("T")[0]);

  // ── ALUMNO ROUTINES state ─────────────────────────────────────────────────
  const myRoutines = alumnoId ? (store.routines[alumnoId] || []) : [];
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm]   = useState({ label:"", duracion:"60–75 min", semana:1, exercises:[] });

  const canEdit = !isAlumno;
  const alumnos = store.users.filter(u=>u.role==="alumno"&&u.coachId===currentUser.id&&u.active);

  // ── REPO helpers ──────────────────────────────────────────────────────────
  const addRepoEx  = () => setRepoForm(p=>({...p,exercises:[...p.exercises,{id:"re"+Date.now(),name:"",sets:3,reps:8,pct:"—",peso:"",descanso:"90 seg",instruccion:""}]}));
  const updRepoEx  = (i,k,v) => setRepoForm(p=>{const ex=[...p.exercises];ex[i]={...ex[i],[k]:v};return {...p,exercises:ex};});
  const remRepoEx  = (i) => setRepoForm(p=>({...p,exercises:p.exercises.filter((_,j)=>j!==i)}));

  const saveRepo = () => {
    if (!repoForm.label) return;
    if (repoModal==="edit") {
      dispatch("UPDATE_REPO_ROUTINE", {...repoForm, id:editingRepoId, coachId});
    } else {
      dispatch("ADD_REPO_ROUTINE", {...repoForm, id:"repo"+Date.now(), coachId});
    }
    setRepoModal(null);
    setRepoForm({label:"",duracion:"60–75 min",exercises:[]});
  };

  // ── ASSIGN helpers ────────────────────────────────────────────────────────
  const DOW_LABELS = [{v:1,l:"Lun"},{v:2,l:"Mar"},{v:3,l:"Mié"},{v:4,l:"Jue"},{v:5,l:"Vie"},{v:6,l:"Sáb"},{v:0,l:"Dom"}];
  const toggleAssignDay = d => setAssignDays(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d].sort());

  const confirmAssign = () => {
    const routine = repoItems.find(r=>r.id===assignModal);
    if (!routine || !assignAlumnoId) return;
    const sched = buildSchedule(assignStart, assignDays, 1);
    const scheduledDate = sched[0] || null;
    const exercises = routine.exercises.map(e=>({...e, id:"a"+Date.now()+Math.random().toString(36).slice(2)}));
    const newR = {
      id: "r"+Date.now(),
      alumnoId: assignAlumnoId,
      semana: 1,
      label: routine.label,
      duracion: routine.duracion,
      status: "upcoming",
      scheduledDate,
      fromRepo: assignMode==="original" ? routine.id : null,
      exercises: assignMode==="copy" ? exercises : routine.exercises,
      logs: Object.fromEntries((assignMode==="copy"?exercises:routine.exercises).map(e=>[e.id,[]])),
    };
    dispatch("ADD_ROUTINE", newR);
    setAssignModal(null);
  };

  // ── ALUMNO ROUTINE edit ───────────────────────────────────────────────────
  const addEditEx  = () => setEditForm(p=>({...p,exercises:[...p.exercises,{id:"e"+Date.now(),name:"",sets:3,reps:8,pct:"—",peso:"",descanso:"90 seg",instruccion:""}]}));
  const updEditEx  = (i,k,v) => setEditForm(p=>{const ex=[...p.exercises];ex[i]={...ex[i],[k]:v};return {...p,exercises:ex};});
  const remEditEx  = (i) => setEditForm(p=>({...p,exercises:p.exercises.filter((_,j)=>j!==i)}));

  const saveEdit = () => {
    if (!editForm.label) return;
    dispatch("UPDATE_ROUTINE", {...editForm, alumnoId});
    setEditModal(null);
  };

  const alumnoName = store.users.find(u=>u.id===alumnoId)?.name||"";

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <H size={20}>{t("rutinas")}</H>
          {alumnoId && <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>→ {alumnoName}</div>}
        </div>
      </div>

      {/* Tabs: Repositorio | Asignadas */}
      {isCoach && (
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {[
            { id:"repo",   label:`📦 ${t("repositorio")}` },
            { id:"alumno", label:`👤 ${alumnoId?alumnoName:"Asignadas"}` },
          ].map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
              flex:1, background:tab===tb.id?"var(--accent)":"var(--card)",
              border:`1px solid ${tab===tb.id?"var(--accent)":"var(--border)"}`,
              color:tab===tb.id?"#fff":"var(--sub)", borderRadius:9, padding:"8px", fontSize:12, fontWeight:600,
            }}>{tb.label}</button>
          ))}
        </div>
      )}

      {/* ── TAB: REPOSITORIO ── */}
      {tab==="repo" && isCoach && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:12, color:"var(--sub)" }}>{repoItems.length} rutinas en el repositorio</div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn onClick={()=>setRepoModal("import")} v="ghost" style={{ fontSize:12, padding:"6px 12px" }}>📤 Importar</Btn>
              <Btn onClick={()=>{setRepoModal("add");setRepoForm({label:"",duracion:"60–75 min",exercises:[]});}} v="sm">+ Nueva</Btn>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {repoItems.map(r=>(
              <Card key={r.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <H size={14}>{r.label}</H>
                    <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>⏱ {r.duracion} · {r.exercises.length} ejercicios</div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn onClick={()=>{setAssignModal(r.id);setAssignAlumnoId(alumnoId||"");}} v="sm" style={{ fontSize:11, padding:"4px 10px" }}>→ Asignar</Btn>
                    <Btn onClick={()=>{setRepoModal("edit");setEditingRepoId(r.id);setRepoForm({...r,exercises:[...r.exercises]});}} v="ghost" style={{ padding:"4px 10px", fontSize:11 }}>✏️</Btn>
                    <Btn onClick={()=>dispatch("DELETE_REPO_ROUTINE",{id:r.id,coachId})} v="danger" style={{ padding:"4px 10px", fontSize:11 }}>🗑</Btn>
                  </div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {r.exercises.map((e,i)=><Tag key={i}>{e.name}</Tag>)}
                </div>
              </Card>
            ))}
            {repoItems.length===0 && (
              <div style={{ textAlign:"center", color:"var(--sub)", padding:32, background:"var(--card)", borderRadius:12, border:"1px dashed var(--border)" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📦</div>
                <div>El repositorio está vacío</div>
                <div style={{ fontSize:12, marginTop:4 }}>Creá o importá rutinas para luego asignarlas a tus alumnos</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: ASIGNADAS AL ALUMNO ── */}
      {tab==="alumno" && (
        <>
          {canEdit && !alumnoId && (
            <div style={{ marginBottom:10 }}>
              <Label>SELECCIONAR ALUMNO</Label>
              <select value={assignAlumnoId} onChange={e=>setAssignAlumnoId(e.target.value)}>
                <option value="">— Elegir alumno —</option>
                {alumnos.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          {(() => {
            const aid = alumnoId || assignAlumnoId;
            const routines = aid ? (store.routines[aid]||[]) : [];
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {routines.map(r=>(
                  <Card key={r.id}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <H size={14}>{r.label}</H>
                        <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>⏱ {r.duracion} · {r.exercises.length} ejercicios</div>
                        {r.scheduledDate && <div style={{ fontSize:11, color:"var(--accent)", marginTop:2 }}>📅 {new Date(r.scheduledDate+"T12:00:00").toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})}</div>}
                        {r.fromRepo && <div style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>📦 Del repositorio (copia independiente)</div>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                        <Pill label={sl(r.status)} color={sc(r.status)}/>
                        {canEdit && (
                          <div style={{ display:"flex", gap:4 }}>
                            <Btn onClick={()=>{setEditModal(r.id);setEditForm({...r,exercises:[...r.exercises]});}} v="ghost" style={{ padding:"3px 10px", fontSize:11 }}>✏️</Btn>
                            <Btn onClick={()=>dispatch("DELETE_ROUTINE",{id:r.id,alumnoId:aid})} v="danger" style={{ padding:"3px 10px", fontSize:11 }}>🗑</Btn>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {r.exercises.map((e,i)=><Tag key={i}>{e.name}</Tag>)}
                    </div>
                  </Card>
                ))}
                {routines.length===0 && (
                  <div style={{ textAlign:"center", color:"var(--sub)", padding:32, background:"var(--card)", borderRadius:12, border:"1px dashed var(--border)" }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                    <div>No hay rutinas asignadas</div>
                    {canEdit && <div style={{ fontSize:12, marginTop:4 }}>Andá al Repositorio y asignale una rutina</div>}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <Modal title="Asignar rutina a alumno" onClose={()=>setAssignModal(null)} width={500}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <Label>ALUMNO</Label>
              <select value={assignAlumnoId} onChange={e=>setAssignAlumnoId(e.target.value)}>
                <option value="">— Elegir alumno —</option>
                {alumnos.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label>MODALIDAD</Label>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  {id:"copy",    label:"📋 Copiar y personalizar", desc:"Copia independiente. Cambios solo para este alumno."},
                  {id:"original",label:"🔗 Asignar original",      desc:"Vinculado al repositorio. Sin personalización."},
                ].map(m=>(
                  <button key={m.id} onClick={()=>setAssignMode(m.id)} style={{
                    flex:1, background:assignMode===m.id?"var(--dim)":"var(--surface)",
                    border:`2px solid ${assignMode===m.id?"var(--accent)":"var(--border)"}`,
                    borderRadius:10, padding:"10px 8px", textAlign:"left", cursor:"pointer",
                  }}>
                    <div style={{ fontSize:12, fontWeight:700, color:assignMode===m.id?"var(--accent)":"var(--text)", marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:11, color:"var(--sub)" }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>FECHA DE INICIO</Label>
              <input type="date" value={assignStart} onChange={e=>setAssignStart(e.target.value)}/>
            </div>
            <div>
              <Label>{t("diasEntrenamiento").toUpperCase()}</Label>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {DOW_LABELS.map(d=>(
                  <button key={d.v} onClick={()=>toggleAssignDay(d.v)} style={{
                    padding:"5px 11px", borderRadius:7, fontSize:12, fontWeight:700,
                    background:assignDays.includes(d.v)?"var(--accent)":"var(--surface)",
                    border:`1px solid ${assignDays.includes(d.v)?"var(--accent)":"var(--border)"}`,
                    color:assignDays.includes(d.v)?"#fff":"var(--sub)",
                  }}>{d.l}</button>
                ))}
              </div>
              <div style={{ fontSize:11, color:"var(--sub)", marginTop:5 }}>
                {assignDays.length} día{assignDays.length!==1?"s":""} por semana seleccionado{assignDays.length!==1?"s":""}
              </div>
            </div>
            <Divider/>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="ghost" onClick={()=>setAssignModal(null)} full>Cancelar</Btn>
              <Btn onClick={confirmAssign} full disabled={!assignAlumnoId||!assignDays.length}>Asignar ✓</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REPO ADD/EDIT MODAL ── */}
      {(repoModal==="add"||repoModal==="edit") && (
        <Modal title={repoModal==="edit"?"Editar rutina del repositorio":"Nueva rutina en repositorio"} onClose={()=>setRepoModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><Label>NOMBRE</Label><input placeholder="Ej: Pierna Fuerza A" value={repoForm.label} onChange={e=>setRepoForm(p=>({...p,label:e.target.value}))}/></div>
            <div><Label>DURACIÓN</Label><input placeholder="60–75 min" value={repoForm.duracion} onChange={e=>setRepoForm(p=>({...p,duracion:e.target.value}))}/></div>
            <Divider/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Label>EJERCICIOS</Label>
              <Btn onClick={addRepoEx} v="ghost" style={{ fontSize:12, padding:"4px 10px" }}>+ Agregar</Btn>
            </div>
            {repoForm.exercises.map((ex,i)=>(
              <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"var(--sub)" }}>Ejercicio {i+1}</span>
                  <button onClick={()=>remRepoEx(i)} style={{ background:"none",border:"none",color:"var(--red)",fontSize:16 }}>×</button>
                </div>
                <input placeholder="Nombre" value={ex.name} onChange={e=>updRepoEx(i,"name",e.target.value)} style={{ marginBottom:5 }}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5, marginBottom:5 }}>
                  <input type="number" placeholder="Series" value={ex.sets} onChange={e=>updRepoEx(i,"sets",+e.target.value)}/>
                  <input placeholder="Reps" value={ex.reps} onChange={e=>updRepoEx(i,"reps",e.target.value)}/>
                  <input placeholder="Peso ref." value={ex.peso} onChange={e=>updRepoEx(i,"peso",e.target.value)}/>
                  <input placeholder="Descanso" value={ex.descanso} onChange={e=>updRepoEx(i,"descanso",e.target.value)}/>
                </div>
                <input placeholder="Instrucción (opcional)" value={ex.instruccion} onChange={e=>updRepoEx(i,"instruccion",e.target.value)}/>
              </div>
            ))}
            {repoForm.exercises.length===0 && <div style={{ textAlign:"center",color:"var(--sub)",fontSize:13,padding:16,background:"var(--surface)",borderRadius:9 }}>Sin ejercicios todavía</div>}
            <Divider/>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="ghost" onClick={()=>setRepoModal(null)} full>Cancelar</Btn>
              <Btn onClick={saveRepo} full disabled={!repoForm.label}>Guardar ✓</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── IMPORT TO REPO MODAL ── */}
      {repoModal==="import" && (
        <Modal title="Importar al Repositorio" onClose={()=>setRepoModal(null)}>
          <ImportModule alumnoId={null} coachId={coachId} onImport={(r)=>{dispatch("ADD_REPO_ROUTINE",{...r,id:"repo"+Date.now(),coachId,label:r.label});}} onClose={()=>setRepoModal(null)} toRepo={true}/>
        </Modal>
      )}

      {/* ── EDIT ASSIGNED ROUTINE MODAL ── */}
      {editModal && (
        <Modal title="Editar rutina asignada" onClose={()=>setEditModal(null)}>
          <div style={{ background:"#f9731611", border:"1px solid #f9731633", borderRadius:8, padding:"8px 12px", fontSize:12, color:"var(--orange)", marginBottom:12 }}>
            ✏️ Modificás solo la copia de este alumno — el repositorio no cambia
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><Label>NOMBRE</Label><input value={editForm.label} onChange={e=>setEditForm(p=>({...p,label:e.target.value}))}/></div>
            <div><Label>DURACIÓN</Label><input value={editForm.duracion} onChange={e=>setEditForm(p=>({...p,duracion:e.target.value}))}/></div>
            <Divider/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Label>EJERCICIOS</Label>
              <Btn onClick={addEditEx} v="ghost" style={{ fontSize:12, padding:"4px 10px" }}>+ Agregar</Btn>
            </div>
            {editForm.exercises.map((ex,i)=>(
              <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:"var(--sub)" }}>Ejercicio {i+1}</span>
                  <button onClick={()=>remEditEx(i)} style={{ background:"none",border:"none",color:"var(--red)",fontSize:16 }}>×</button>
                </div>
                <input value={ex.name} onChange={e=>updEditEx(i,"name",e.target.value)} style={{ marginBottom:5 }}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5, marginBottom:5 }}>
                  <input type="number" value={ex.sets} onChange={e=>updEditEx(i,"sets",+e.target.value)} placeholder="Series"/>
                  <input value={ex.reps} onChange={e=>updEditEx(i,"reps",e.target.value)} placeholder="Reps"/>
                  <input value={ex.peso} onChange={e=>updEditEx(i,"peso",e.target.value)} placeholder="Peso"/>
                  <input value={ex.descanso} onChange={e=>updEditEx(i,"descanso",e.target.value)} placeholder="Descanso"/>
                </div>
                <input value={ex.instruccion||""} onChange={e=>updEditEx(i,"instruccion",e.target.value)} placeholder="Instrucción"/>
              </div>
            ))}
            <Divider/>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="ghost" onClick={()=>setEditModal(null)} full>Cancelar</Btn>
              <Btn onClick={saveEdit} full disabled={!editForm.label}>Guardar cambios ✓</Btn>
            </div>
          </div>
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
    setShowMetrics(true);
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
                    <input type="number" placeholder="repeticiones" value={l.reps||""} onChange={e=>upd(ex.id,si,"reps",e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
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
        {saved && showMetrics && (() => {
          const meUser = store.users.find(u=>u.id===currentUser.id);
          const myObjs = (meUser?.objectives||[]).map(o=>({...o,...OBJECTIVES_CATALOG.find(c=>c.id===o.id)}));
          return myObjs.length > 0 ? (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:8 }}>📊 Registrá tus métricas del ciclo</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {myObjs.map(o=><MetricEntryCard key={o.id} objId={o.id} alumnoId={currentUser.id}/>)}
              </div>
            </div>
          ) : null;
        })()}
      </Card>
    </div>
  );
}


// ───────────────────────────────────────────────────────────────────────────────
// [M11] METRICS CONFIG — qué anota cada objetivo y cómo se compara
// ───────────────────────────────────────────────────────────────────────────────
const OBJ_METRICS = {
  // 🔴 Fuerza
  fuerza_max:  { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps",       type:"number"}, {key:"rpe", label:"RPE", type:"rpe"}], tip:"Si el peso sube y el RPE baja → progresás", chart:"peso" },
  fuerza_base: { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps",       type:"number"}, {key:"rpe", label:"RPE", type:"rpe"}], tip:"Buscá subir el peso manteniendo buena técnica", chart:"peso" },
  fuerza_expl: { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps",       type:"number"}, {key:"rpe", label:"RPE", type:"rpe"}], tip:"Enfocate en la velocidad de ejecución", chart:"peso" },
  potencia:    { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps",       type:"number"}, {key:"rpe", label:"RPE", type:"rpe"}], tip:"Buscá más fuerza en menos tiempo", chart:"peso" },
  // 🟠 Muscular
  hipertrofia: { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps reales", type:"number"}, {key:"rpe", label:"RPE última serie", type:"rpe"}], tip:"Intentá hacer más reps o más peso que la semana pasada", chart:"peso" },
  hip_func:    { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"reps",  label:"Reps reales", type:"number"}, {key:"rpe", label:"RPE última serie", type:"rpe"}], tip:"Más reps o más peso = progreso funcional", chart:"peso" },
  res_musc:    { fields:[{key:"reps",    label:"Reps totales",    type:"number"}, {key:"tiempo", label:"Tiempo sostenido", type:"number", unit:"seg"}], tip:"Hacé más reps o descansá menos que la semana pasada", chart:"reps" },
  // 🟡 Energía
  aerobico:    { fields:[{key:"tiempo",  label:"Tiempo total",    type:"number", unit:"min"}, {key:"distancia", label:"Distancia", type:"number", unit:"km"}, {key:"sensacion", label:"Sensación", type:"select", options:["Fácil","Medio","Difícil"]}], tip:"Más tiempo o distancia con la misma sensación = progreso", chart:"tiempo" },
  anaerobico:  { fields:[{key:"tiempo",  label:"Tiempo del esfuerzo", type:"number", unit:"seg"}, {key:"sensacion", label:"Explosividad", type:"select", options:["Baja","Media","Alta"]}], tip:"Buscá ser más rápido, no más cansado", chart:"tiempo" },
  res_anaer:   { fields:[{key:"rondas",  label:"Rondas completadas", type:"number"}, {key:"completo", label:"¿Terminó todo?", type:"select", options:["Sí","Casi","No"]}], tip:"Mantené el rendimiento sin caerte en las últimas rondas", chart:"rondas" },
  acond_gral:  { fields:[{key:"rondas",  label:"Rondas totales",  type:"number"}, {key:"tiempo",    label:"Tiempo total",  type:"number", unit:"min"}], tip:"Más trabajo en el mismo tiempo = progreso", chart:"rondas" },
  // 🔵 Control
  core:        { fields:[{key:"tiempo",  label:"Tiempo sostenido", type:"number", unit:"seg"}, {key:"sensacion", label:"Dificultad", type:"select", options:["Fácil","Medio","Difícil"]}], tip:"Cada vez más estable o más tiempo", chart:"tiempo" },
  movilidad:   { fields:[{key:"rango",   label:"¿Llegaste más profundo?", type:"select", options:["Sí","Igual","No"]}, {key:"sensacion", label:"Sensación", type:"select", options:["Tirante","Normal","Cómodo"]}], tip:"Buscá moverte mejor, no más fuerte", chart:null },
  tecnica:     { fields:[{key:"calidad", label:"Calidad técnica (1-5)", type:"number"}], tip:"Que cada repetición se vea mejor que la anterior", chart:"calidad" },
  prev_lesion: { fields:[{key:"dolor",   label:"Nivel de molestia (0-10)", type:"number"}, {key:"sensacion", label:"Sensación general", type:"select", options:["Bien","Regular","Mal"]}], tip:"Si baja el dolor y mejora la sensación, vamos bien", chart:"dolor" },
  // 🟣 Composición
  desc_grasa:  { fields:[{key:"peso",    label:"Peso corporal",   type:"number", unit:"kg"}, {key:"cintura", label:"Cintura (opcional)", type:"number", unit:"cm"}], tip:"Buscamos tendencia, no el número de un día", chart:"peso" },
  mant_peso:   { fields:[{key:"peso",    label:"Peso corporal",   type:"number", unit:"kg"}, {key:"rendimiento", label:"Rendimiento en gym", type:"select", options:["Subió","Igual","Bajó"]}], tip:"Peso estable + rendimiento igual o mejor = éxito", chart:"peso" },
  recomp:      { fields:[{key:"peso",    label:"Peso corporal",   type:"number", unit:"kg"}, {key:"carga",   label:"Carga en ejercicio clave", type:"number", unit:"kg"}], tip:"Si levantás más y no subís de peso, vamos bien", chart:"carga" },
  // ⚫ Rendimiento
  prep_comp:   { fields:[{key:"resultado", label:"Resultado específico", type:"text"}, {key:"sensacion", label:"Sensación", type:"select", options:["Listo","Regular","Lejos"]}], tip:"Medí lo que pasa en tu deporte, no solo en el gym", chart:null },
  peaking:     { fields:[{key:"resultado", label:"Rendimiento pico", type:"text"}, {key:"fatiga", label:"Fatiga (1-10)", type:"number"}], tip:"Máximo rendimiento con mínima fatiga", chart:null },
  transfer:    { fields:[{key:"resultado", label:"Resultado deportivo", type:"text"}], tip:"¿Se nota la mejora en tu deporte?", chart:null },
  // ⚪ Recuperación
  deload:      { fields:[{key:"peso",    label:"Peso usado",      type:"number", unit:"kg"}, {key:"rpe", label:"RPE", type:"rpe"}], tip:"Tiene que sentirse fácil — si no, bajá más la carga", chart:"rpe" },
  rec_activa:  { fields:[{key:"sensacion", label:"Sensación general", type:"select", options:["Cansado","Bien","Muy bien"]}], tip:"Si te sentís mejor que antes de empezar, cumplió el objetivo", chart:null },
};

// Field renderer for metric entry forms
function MetricFieldInput({ field, value, onChange }) {
  if (field.type === "rpe") return (
    <div>
      <Label>{field.label}</Label>
      <RPESel value={value} onChange={onChange}/>
    </div>
  );
  if (field.type === "select") return (
    <div>
      <Label>{field.label}</Label>
      <select value={value||""} onChange={e=>onChange(e.target.value)}>
        <option value="">— Elegir —</option>
        {field.options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  return (
    <div>
      <Label>{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
      <input type={field.type==="text"?"text":"number"} step="0.1" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.unit||""}/>
    </div>
  );
}

// Mini metrics entry card (used inline in InicioModule and TrainingModule)
function MetricEntryCard({ objId, alumnoId, onSaved }) {
  const { dispatch } = useStore();
  const cfg = OBJ_METRICS[objId];
  const obj = OBJECTIVES_CATALOG.find(o=>o.id===objId);
  const [vals, setVals] = useState({});
  const [saved, setSaved] = useState(false);

  if (!cfg || !obj) return null;

  const save = () => {
    if (!Object.values(vals).some(Boolean)) return;
    dispatch("ADD_METRIC", {
      alumnoId,
      objId,
      entry: { ...vals, date: new Date().toISOString(), dateLabel: new Date().toLocaleDateString("es",{day:"numeric",month:"short"}) }
    });
    setSaved(true);
    if (onSaved) onSaved();
    setTimeout(()=>setSaved(false), 2000);
    setVals({});
  };

  return (
    <div style={{ background:"var(--surface)", borderRadius:10, padding:12, border:"1px solid var(--border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <span style={{ fontSize:16 }}>{obj.emoji}</span>
        <span style={{ fontSize:13, fontWeight:700 }}>{obj.label}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns: cfg.fields.length > 2 ? "1fr 1fr" : "1fr", gap:8, marginBottom:10 }}>
        {cfg.fields.map(f=>(
          <MetricFieldInput key={f.key} field={f} value={vals[f.key]} onChange={v=>setVals(p=>({...p,[f.key]:v}))}/>
        ))}
      </div>
      <div style={{ fontSize:11, color:"var(--sub)", marginBottom:8, fontStyle:"italic" }}>💡 {cfg.tip}</div>
      {saved
        ? <div style={{ fontSize:12, color:"var(--green)", fontWeight:600, textAlign:"center" }}>✓ Guardado</div>
        : <Btn onClick={save} full style={{ fontSize:12, padding:"7px" }}>Guardar registro</Btn>
      }
    </div>
  );
}

// Full metrics history + chart for one objective
function MetricHistory({ objId, alumnoId }) {
  const { store, dispatch } = useStore();
  const cfg = OBJ_METRICS[objId];
  const obj = OBJECTIVES_CATALOG.find(o=>o.id===objId);
  const entries = (store.metrics?.[alumnoId]?.[objId] || []);

  if (!cfg || !obj) return null;

  const chartField = cfg.chart;
  const chartData  = chartField ? entries.map(e=>parseFloat(e[chartField])||0).filter(Boolean) : [];

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{obj.emoji}</span>
        <H size={15}>{obj.label}</H>
        <Pill label={`${entries.length} registros`} color="var(--sub)" size={10}/>
      </div>

      {chartData.length > 1 && (
        <Card style={{ marginBottom:10, padding:12 }}>
          <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, marginBottom:6 }}>
            EVOLUCIÓN — {cfg.fields.find(f=>f.key===chartField)?.label}
          </div>
          <BarChart data={chartData} color="var(--accent)" h={56}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--sub)", marginTop:4 }}>
            <span>{entries[0]?.dateLabel}</span>
            <span style={{ color:"var(--accent)", fontWeight:700 }}>{chartData[chartData.length-1]} {cfg.fields.find(f=>f.key===chartField)?.unit||""}</span>
          </div>
        </Card>
      )}

      {entries.length === 0
        ? <div style={{ textAlign:"center", color:"var(--sub)", fontSize:13, padding:16, background:"var(--card)", borderRadius:10, border:"1px dashed var(--border)" }}>Sin registros todavía</div>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {[...entries].reverse().map((e,i)=>(
              <div key={i} style={{ background:"var(--card)", borderRadius:9, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>{e.dateLabel}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {cfg.fields.map(f => e[f.key] != null && e[f.key] !== "" ? (
                      <span key={f.key} style={{ fontSize:12 }}>
                        <span style={{ color:"var(--sub)" }}>{f.label}: </span>
                        <span style={{ fontWeight:600 }}>{e[f.key]}{f.unit?" "+f.unit:""}</span>
                      </span>
                    ) : null)}
                  </div>
                </div>
                <button onClick={()=>dispatch("DELETE_METRIC",{alumnoId,objId,entryIdx:entries.length-1-i})} style={{ background:"none",border:"none",color:"var(--muted)",fontSize:15,cursor:"pointer",padding:"0 2px" }}>×</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// Full MetricsModule — sección propia con tabs por objetivo
function MetricsModule({ currentUser }) {
  const { store } = useStore();
  const meUser = store.users.find(u=>u.id===currentUser.id);
  const myObjectives = (meUser?.objectives||[]).map(o=>({
    ...o, ...OBJECTIVES_CATALOG.find(c=>c.id===o.id)
  }));
  const [activeObj, setActiveObj] = useState(myObjectives[0]?.id||null);
  const [showEntry, setShowEntry] = useState(false);

  if (myObjectives.length === 0) return (
    <div className="fade" style={{ textAlign:"center", padding:48, color:"var(--sub)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
      <H size={16}>Sin objetivos asignados</H>
      <div style={{ fontSize:13, marginTop:6 }}>Tu entrenador todavía no te asignó objetivos del ciclo</div>
    </div>
  );

  const cur = myObjectives.find(o=>o.id===activeObj);

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:16 }}>Mis Métricas</H>

      {/* Objective tabs */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:14 }}>
        {myObjectives.map(o=>(
          <button key={o.id} onClick={()=>{setActiveObj(o.id);setShowEntry(false);}} style={{
            flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:9,
            background:activeObj===o.id?"var(--accent)":"var(--card)",
            border:`1px solid ${activeObj===o.id?"var(--accent)":"var(--border)"}`,
            color:activeObj===o.id?"#fff":"var(--sub)", fontSize:12, fontWeight:600,
          }}>
            <span>{o.emoji}</span>{o.label}
            {o.priority==="principal" && <span style={{ fontSize:9, background:"rgba(255,255,255,.2)", borderRadius:4, padding:"1px 5px" }}>★</span>}
          </button>
        ))}
      </div>

      {cur && (
        <>
          {/* New entry toggle */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:12, color:"var(--sub)" }}>
              {OBJ_METRICS[cur.id]?.tip && <span>💡 {OBJ_METRICS[cur.id].tip}</span>}
            </div>
            <Btn onClick={()=>setShowEntry(p=>!p)} v={showEntry?"ghost":"sm"} style={{ fontSize:12, padding:"6px 14px", flexShrink:0 }}>
              {showEntry?"× Cancelar":"+ Nuevo registro"}
            </Btn>
          </div>

          {showEntry && (
            <Card style={{ marginBottom:14, border:"1px solid var(--accent)44" }}>
              <MetricEntryCard objId={cur.id} alumnoId={currentUser.id} onSaved={()=>setShowEntry(false)}/>
            </Card>
          )}

          <MetricHistory objId={cur.id} alumnoId={currentUser.id}/>
        </>
      )}
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
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [mediaMode, setMediaMode] = useState(false); // image/video attach mode
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const mediaRef = useRef();
  const chatRef = useRef();

  // Determine pairs
  let allPairs = [];
  if (currentUser.role === "alumno") {
    const coach = store.users.find(u=>u.id===currentUser.coachId);
    if (coach) allPairs = [coach];
  } else if (currentUser.role === "coach") {
    allPairs = store.users.filter(u=>u.role==="alumno"&&u.coachId===currentUser.id&&u.active);
  } else if (currentUser.role === "superadmin") {
    allPairs = store.users.filter(u=>u.role==="coach"&&u.active);
  }

  const getKey = (a,b) => [a,b].sort().join("-");

  // Sort by last message time
  const sortedPairs = [...allPairs].sort((a,b)=>{
    const ka = getKey(currentUser.id,a.id), kb = getKey(currentUser.id,b.id);
    const la = (store.messages[ka]||[]).at(-1)?.date||"";
    const lb = (store.messages[kb]||[]).at(-1)?.date||"";
    return lb.localeCompare(la);
  });

  const filteredPairs = search
    ? sortedPairs.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    : sortedPairs;

  const visiblePairs = showAll ? filteredPairs : filteredPairs.slice(0,3);
  const hasMore = filteredPairs.length > 3;

  const [selectedId, setSelectedId] = useState(sortedPairs[0]?.id||"");
  useEffect(()=>{ if(!selectedId&&sortedPairs.length) setSelectedId(sortedPairs[0].id); },[sortedPairs.map(p=>p.id).join(",")]);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[selectedId,store.messages]);

  // Mark as read when opening conversation
  useEffect(()=>{
    if (!selectedId) return;
    const key = getKey(currentUser.id, selectedId);
    dispatch("MARK_READ", { key, fromId:selectedId });
  },[selectedId]);

  const key = getKey(currentUser.id, selectedId);
  const msgs = store.messages[key]||[];

  const sendMsg = (msgData) => {
    if (!selectedId) return;
    dispatch("ADD_MESSAGE", { key, msg:{ id:"msg"+Date.now(), from:currentUser.id, to:selectedId, ts:new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}), date:new Date().toISOString(), read:false, ...msgData } });
  };

  const send = () => {
    if (!input.trim()) return;
    sendMsg({ text:input.trim(), type:"text" });
    setInput("");
  };

  const sendLink = () => {
    if (!linkInput.trim()) return;
    // Detect YouTube/Instagram/TikTok
    const isYT = linkInput.includes("youtube.com")||linkInput.includes("youtu.be");
    const isIG = linkInput.includes("instagram.com");
    const isTT = linkInput.includes("tiktok.com");
    sendMsg({ text:linkInput.trim(), type:"link", linkType:isYT?"youtube":isIG?"instagram":isTT?"tiktok":"link" });
    setLinkInput(""); setLinkMode(false);
  };

  const handleMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const isVideo = file.type.startsWith("video/");
      sendMsg({ text:"", type:isVideo?"video":"image", mediaData:ev.target.result, fileName:file.name });
    };
    reader.readAsDataURL(file);
  };

  const selUser = store.users.find(u=>u.id===selectedId);
  const selTheme = getTheme(selUser);

  const renderMessage = (m, i) => {
    const isMe = m.from === currentUser.id;
    const bubbleStyle = { maxWidth:"76%", background:isMe?"var(--accent)":"var(--surface)", borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px", padding:"8px 12px", overflow:"hidden" };
    return (
      <div key={i} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
        <div style={bubbleStyle}>
          {m.type==="image" && m.mediaData && (
            <img src={m.mediaData} alt="foto" style={{ width:"100%", maxWidth:200, borderRadius:8, display:"block", marginBottom:4 }} onClick={()=>window.open(m.mediaData)}/>
          )}
          {m.type==="video" && m.mediaData && (
            <video src={m.mediaData} controls style={{ width:"100%", maxWidth:220, borderRadius:8, display:"block", marginBottom:4 }}/>
          )}
          {m.type==="link" && (
            <div style={{ marginBottom:4 }}>
              <a href={m.text} target="_blank" rel="noreferrer" style={{ color:isMe?"#fff":"var(--accent)", fontSize:12, wordBreak:"break-all" }}>
                {m.linkType==="youtube"?"🎬":m.linkType==="instagram"?"📸":m.linkType==="tiktok"?"🎵":"🔗"} {m.text.length>50?m.text.slice(0,50)+"...":m.text}
              </a>
            </div>
          )}
          {m.text && m.type!=="link" && <div style={{ fontSize:13 }}>{m.text}</div>}
          <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:4, marginTop:2 }}>
            <span style={{ fontSize:10, color:isMe?"rgba(255,255,255,.55)":"var(--muted)" }}>{m.ts}</span>
            {isMe && <span style={{ fontSize:11, color:m.read?"#60a5fa":"rgba(255,255,255,.4)" }}>{m.read?"✓✓":"✓"}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>
      <H size={20} style={{ marginBottom:12 }}>Mensajes</H>

      {/* Contact list: last 3 + search + show all */}
      {allPairs.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {allPairs.length > 3 && (
            <div style={{ position:"relative", marginBottom:8 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por nombre..." style={{ fontSize:12, padding:"6px 12px" }}/>
            </div>
          )}
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            {visiblePairs.map(p=>{
              const pTheme = getTheme(p);
              const pKey = getKey(currentUser.id, p.id);
              const unread = (store.messages[pKey]||[]).filter(m=>m.from===p.id&&!m.read).length;
              const lastMsg = (store.messages[pKey]||[]).at(-1);
              return (
                <button key={p.id} onClick={()=>setSelectedId(p.id)} style={{
                  flexShrink:0, display:"flex", alignItems:"center", gap:8,
                  background:selectedId===p.id?"var(--dim)":"var(--card)",
                  border:`1px solid ${selectedId===p.id?"var(--accent)":"var(--border)"}`,
                  borderRadius:10, padding:"8px 12px", maxWidth:160, position:"relative",
                }}>
                  <div style={{ position:"relative" }}>
                    <Avatar name={p.name} color={pTheme.accent} size={28} photo={p.photo}/>
                    {unread>0 && <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, background:"var(--accent)", borderRadius:"50%", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{unread}</span>}
                  </div>
                  <div style={{ textAlign:"left", minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:selectedId===p.id?"var(--accent)":"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name.split(" ")[0]}</div>
                    {lastMsg && <div style={{ fontSize:10, color:"var(--sub)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:80 }}>{lastMsg.text||"📎 Archivo"}</div>}
                  </div>
                </button>
              );
            })}
            {hasMore && !showAll && (
              <button onClick={()=>setShowAll(true)} style={{ flexShrink:0, background:"var(--surface)", border:"1px dashed var(--border)", borderRadius:10, padding:"8px 14px", fontSize:12, color:"var(--sub)" }}>
                +{filteredPairs.length-3} más
              </button>
            )}
            {showAll && filteredPairs.length>3 && (
              <button onClick={()=>setShowAll(false)} style={{ flexShrink:0, background:"var(--surface)", border:"1px dashed var(--border)", borderRadius:10, padding:"8px 14px", fontSize:12, color:"var(--sub)" }}>
                Menos ↑
              </button>
            )}
          </div>
        </div>
      )}

      <Card style={{ flex:1, display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
        {selUser ? (
          <>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
              <Avatar name={selUser.name} color={selTheme.accent} size={30} photo={selUser.photo}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{selUser.name}</div>
                <div style={{ fontSize:11, color:"var(--green)" }}>● En línea</div>
              </div>
            </div>
            <div ref={chatRef} style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:8 }}>
              {msgs.map(renderMessage)}
              {msgs.length===0 && <div style={{ textAlign:"center", color:"var(--sub)", fontSize:13, padding:24 }}>No hay mensajes todavía. ¡Empezá la conversación!</div>}
            </div>

            {/* Link input */}
            {linkMode && (
              <div style={{ padding:"8px 10px", borderTop:"1px solid var(--border)", display:"flex", gap:6 }}>
                <input value={linkInput} onChange={e=>setLinkInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendLink()} placeholder="Pegá el link de YouTube, Instagram o TikTok..." style={{ flex:1, fontSize:12 }}/>
                <Btn onClick={sendLink} style={{ padding:"6px 12px", fontSize:12 }}>Enviar</Btn>
                <Btn v="ghost" onClick={()=>setLinkMode(false)} style={{ padding:"6px 10px", fontSize:12 }}>×</Btn>
              </div>
            )}

            {/* Input bar */}
            <div style={{ padding:"8px 10px", borderTop:"1px solid var(--border)", display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={()=>{setMediaMode(!mediaMode);setLinkMode(false);}} style={{ background:"transparent", border:"none", fontSize:20, color:"var(--sub)", cursor:"pointer", padding:"0 2px" }} title="Adjuntar imagen/video">📎</button>
              <button onClick={()=>{setLinkMode(!linkMode);setMediaMode(false);}} style={{ background:"transparent", border:"none", fontSize:18, color:"var(--sub)", cursor:"pointer", padding:"0 2px" }} title="Pegar link">🔗</button>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Escribí un mensaje..." style={{ flex:1, fontSize:13 }}/>
              <Btn onClick={send} style={{ padding:"7px 14px", flexShrink:0 }}>→</Btn>
              <input ref={mediaRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleMedia}/>
              {mediaMode && (
                <div style={{ position:"absolute", bottom:70, left:16, right:16, background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:12, display:"flex", gap:10, zIndex:10 }}>
                  <button onClick={()=>{mediaRef.current.click();setMediaMode(false);}} style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:9, padding:"12px 8px", cursor:"pointer", fontSize:13 }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>🖼️</div>Imagen/Video
                  </button>
                  <button onClick={()=>{setLinkMode(true);setMediaMode(false);}} style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:9, padding:"12px 8px", cursor:"pointer", fontSize:13 }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>🔗</div>Link externo
                  </button>
                </div>
              )}
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

// ─── SUPERADMIN DASHBOARD ─────────────────────────────────────────────────────
function SADashboard() {
  const { store } = useStore();
  const [notes, setNotes] = useState([
    { id:1, text:"Revisar vencimiento de Sofía el 30/06", color:"#f59e0b" },
    { id:2, text:"Pendiente: onboarding de nuevo entrenador", color:"#3b82f6" },
  ]);
  const [newNote, setNewNote] = useState("");
  const [noteColor, setNoteColor] = useState("#f59e0b");
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const coaches    = store.users.filter(u=>u.role==="coach"&&u.active);
  const alumnos    = store.users.filter(u=>u.role==="alumno"&&u.active);
  const suspended  = store.users.filter(u=>u.suspended&&u.active);
  const now        = new Date();

  const expiring = coaches.filter(c => {
    if (!c.expiresAt) return false;
    const d = new Date(c.expiresAt);
    const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 30;
  }).sort((a,b) => new Date(a.expiresAt)-new Date(b.expiresAt));

  const expired = coaches.filter(c => c.expiresAt && new Date(c.expiresAt) < now);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(p => [...p, { id:Date.now(), text:newNote.trim(), color:noteColor }]);
    setNewNote("");
  };
  const removeNote = (id) => setNotes(p => p.filter(n=>n.id!==id));
  const onDragStart = (id) => setDragId(id);
  const onDragEnd   = () => { setDragId(null); setDragOver(null); };
  const onDrop      = (targetId) => {
    if (dragId === targetId) return;
    const arr = [...notes];
    const from = arr.findIndex(n=>n.id===dragId);
    const to   = arr.findIndex(n=>n.id===targetId);
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    setNotes(arr);
    setDragId(null); setDragOver(null);
  };

  const NOTE_COLORS = ["#f59e0b","#3b82f6","#22c55e","#e63946","#7c3aed","#f97316"];

  return (
    <div className="fade">
      <div style={{ marginBottom:20 }}>
        <H size={22}>Panel SuperAdmin 👑</H>
        <div style={{ color:"var(--sub)", fontSize:14, marginTop:2 }}>{now.toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      {/* Metrics */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[
          { icon:"🏋️", label:"Entrenadores activos", value:coaches.filter(c=>!c.suspended).length, color:"var(--accent)" },
          { icon:"👥", label:"Alumnos activos",       value:alumnos.filter(a=>!a.suspended).length, color:"var(--green)" },
          { icon:"⏸",  label:"Cuentas suspendidas",   value:suspended.length,                       color:"var(--orange)" },
          { icon:"⏰",  label:"Vencen en 30 días",     value:expiring.length,                        color:"var(--yellow)" },
        ].map((s,i) => (
          <Card key={i} style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:32, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"var(--sub)" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Upcoming expirations */}
      {(expiring.length > 0 || expired.length > 0) && (
        <Card style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>⏰ VENCIMIENTOS</div>
          {expired.map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Avatar name={c.name} color={THEMES.coach.accent} size={28}/>
                <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
              </div>
              <Pill label="Vencido" color="var(--red)" size={10}/>
            </div>
          ))}
          {expiring.map(c => {
            const days = Math.ceil((new Date(c.expiresAt)-now)/(1000*60*60*24));
            return (
              <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={c.name} color={THEMES.coach.accent} size={28}/>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                </div>
                <Pill label={`${days}d restantes`} color={days<=7?"var(--red)":"var(--orange)"} size={10}/>
              </div>
            );
          })}
        </Card>
      )}

      {/* Coaches overview */}
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>ENTRENADORES</div>
        {coaches.map(coach => {
          const alumCount = alumnos.filter(a=>a.coachId===coach.id).length;
          const limit = coach.alumnoLimit;
          const pct = limit ? Math.min((alumCount/limit)*100, 100) : null;
          return (
            <div key={coach.id} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={coach.name} color={THEMES.coach.accent} size={28} photo={coach.photo}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{coach.name}</div>
                    <div style={{ fontSize:11, color:"var(--sub)" }}>{alumCount} alumnos {limit ? `/ ${limit}` : "(ilimitado)"}</div>
                  </div>
                </div>
                {coach.suspended
                  ? <Pill label="Suspendido" color="var(--orange)" size={10}/>
                  : coach.expiresAt && new Date(coach.expiresAt) < now
                    ? <Pill label="Vencido" color="var(--red)" size={10}/>
                    : <Pill label="Activo" color="var(--green)" size={10}/>
                }
              </div>
              {pct !== null && (
                <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:pct>=90?"var(--red)":pct>=70?"var(--orange)":"var(--green)", borderRadius:2 }}/>
                </div>
              )}
            </div>
          );
        })}
        {coaches.length===0 && <div style={{ fontSize:13, color:"var(--sub)", textAlign:"center", padding:16 }}>No hay entrenadores aún</div>}
      </Card>

      <PizarraBoard/>
    </div>
  );
}

// ─── PIZARRA COMPONENT (SA + Coach) ──────────────────────────────────────────
function PizarraBoard() {
  const [notes, setNotes] = useState([
    { id:1, text:"Revisar vencimiento de Sofía el 30/06", color:"#f59e0b", x:20, y:20 },
    { id:2, text:"Onboarding nuevo entrenador", color:"#3b82f6", x:180, y:30 },
    { id:3, text:"Llamar a proveedor de suplementos", color:"#22c55e", x:60, y:160 },
  ]);
  const [newNote, setNewNote] = useState("");
  const [noteColor, setNoteColor] = useState("#f59e0b");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});
  const boardRef = useRef();

  const NOTE_COLORS = ["#f59e0b","#3b82f6","#22c55e","#e63946","#7c3aed","#f97316","#ec4899","#06b6d4"];

  const addNote = () => {
    if (!newNote.trim()) return;
    const x = 20 + (notes.length%4)*160;
    const y = 20 + Math.floor(notes.length/4)*140;
    setNotes(p=>[...p,{id:Date.now(),text:newNote.trim(),color:noteColor,x,y}]);
    setNewNote("");
  };

  const startDrag = (e, id) => {
    e.preventDefault();
    const note = notes.find(n=>n.id===id);
    const board = boardRef.current.getBoundingClientRect();
    const clientX = e.touches?e.touches[0].clientX:e.clientX;
    const clientY = e.touches?e.touches[0].clientY:e.clientY;
    setDragging(id);
    setDragOffset({x:clientX-board.left-note.x, y:clientY-board.top-note.y});
  };

  const onDragMove = (e) => {
    if (!dragging||!boardRef.current) return;
    const board = boardRef.current.getBoundingClientRect();
    const clientX = e.touches?e.touches[0].clientX:e.clientX;
    const clientY = e.touches?e.touches[0].clientY:e.clientY;
    const x = Math.max(0, Math.min(clientX-board.left-dragOffset.x, board.width-140));
    const y = Math.max(0, Math.min(clientY-board.top-dragOffset.y, board.height-100));
    setNotes(p=>p.map(n=>n.id===dragging?{...n,x,y}:n));
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1 }}>📌 PIZARRA</div>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {NOTE_COLORS.map(col=>(
            <button key={col} onClick={()=>setNoteColor(col)} style={{ width:16, height:16, borderRadius:3, background:col, border:noteColor===col?"2px solid var(--text)":"1.5px solid transparent", cursor:"pointer" }}/>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} placeholder="Nueva nota..." style={{ flex:1, fontSize:12, padding:"6px 10px" }}/>
        <Btn onClick={addNote} style={{ padding:"6px 14px", fontSize:12 }}>+</Btn>
      </div>
      <div
        ref={boardRef}
        onMouseMove={onDragMove} onTouchMove={onDragMove}
        onMouseUp={()=>setDragging(null)} onTouchEnd={()=>setDragging(null)}
        style={{ position:"relative", height:320, background:"var(--surface)", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden", userSelect:"none" }}
      >
        {notes.length===0 && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)", fontSize:13 }}>La pizarra está vacía — agregá tu primera nota</div>}
        {notes.map(n=>(
          <div
            key={n.id}
            onMouseDown={e=>startDrag(e,n.id)}
            onTouchStart={e=>startDrag(e,n.id)}
            style={{
              position:"absolute", left:n.x, top:n.y,
              width:140, minHeight:80,
              background:n.color+"ee", borderRadius:8,
              padding:"8px 10px", cursor:dragging===n.id?"grabbing":"grab",
              boxShadow:dragging===n.id?"0 8px 24px #0008":"0 2px 8px #0004",
              transition:dragging===n.id?"none":"box-shadow .2s",
              zIndex:dragging===n.id?10:1,
            }}
          >
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:4 }}>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setNotes(p=>p.filter(x=>x.id!==n.id))} style={{ background:"rgba(0,0,0,.2)", border:"none", borderRadius:4, color:"#fff", fontSize:12, width:18, height:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>
            {editingId===n.id ? (
              <textarea
                autoFocus
                value={editText}
                onChange={e=>setEditText(e.target.value)}
                onBlur={()=>{setNotes(p=>p.map(x=>x.id===n.id?{...x,text:editText}:x));setEditingId(null);}}
                onMouseDown={e=>e.stopPropagation()}
                style={{ width:"100%", background:"transparent", border:"none", fontSize:12, color:"#000", resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif" }}
              />
            ) : (
              <div onDoubleClick={()=>{setEditingId(n.id);setEditText(n.text);}} style={{ fontSize:12, color:"#1a1a2e", lineHeight:1.4, wordBreak:"break-word" }}>
                {n.text}
                <div style={{ fontSize:10, color:"rgba(0,0,0,.4)", marginTop:4 }}>Doble click para editar</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COACH DASHBOARD ──────────────────────────────────────────────────────────
function CoachDashboard({ currentUser, onNavigate }) {
  const { store } = useStore();
  const theme = getTheme(currentUser);
  const now = new Date();
  const myAlumnos = store.users.filter(u=>u.role==="alumno"&&u.coachId===currentUser.id&&u.active);
  const activos   = myAlumnos.filter(a=>!a.suspended);
  const suspendidos = myAlumnos.filter(a=>a.suspended);

  const alumnosHoy = activos.filter(a => (store.routines[a.id]||[]).some(r=>r.status==="today"));
  const alumnosSinRutina = activos.filter(a => (store.routines[a.id]||[]).length===0);

  return (
    <div className="fade">
      <div style={{ marginBottom:20 }}>
        <H size={22}>Hola, {currentUser.name.split(" ")[0]} 👋</H>
        <div style={{ color:"var(--sub)", fontSize:14, marginTop:2 }}>{now.toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[
          { icon:"👥", label:"Alumnos activos",    value:activos.length,    color:"var(--accent)" },
          { icon:"🔥", label:"Entrenan hoy",        value:alumnosHoy.length, color:"var(--orange)" },
          { icon:"⏸",  label:"Suspendidos",         value:suspendidos.length,color:"var(--red)" },
          { icon:"⚠️", label:"Sin rutina asignada", value:alumnosSinRutina.length, color:"var(--yellow)" },
        ].map((s,i) => (
          <Card key={i} style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:28, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"var(--sub)", marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Alumnos que entrenan hoy */}
      {alumnosHoy.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>🔥 ENTRENAN HOY</div>
          {alumnosHoy.map(a => {
            const aTheme = getTheme(a);
            const todayR = (store.routines[a.id]||[]).find(r=>r.status==="today");
            return (
              <div key={a.id} onClick={()=>onNavigate("routines",a.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid var(--border)", cursor:"pointer" }}>
                <Avatar name={a.name} color={aTheme.accent} size={32} photo={a.photo}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{a.name}</div>
                  <div style={{ fontSize:12, color:"var(--sub)" }}>{todayR?.label}</div>
                </div>
                <span style={{ fontSize:12, color:"var(--sub)" }}>→</span>
              </div>
            );
          })}
        </Card>
      )}

      {/* All alumnos summary */}
      <Card style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>MIS ALUMNOS</div>
        {myAlumnos.length === 0
          ? <div style={{ textAlign:"center", color:"var(--sub)", fontSize:13, padding:16 }}>No tenés alumnos asignados aún</div>
          : myAlumnos.map(a => {
            const aTheme = getTheme(a);
            const rs = store.routines[a.id]||[];
            const done = rs.filter(r=>r.status==="done").length;
            return (
              <div key={a.id} onClick={()=>onNavigate("routines",a.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid var(--border)", cursor:"pointer" }}>
                <Avatar name={a.name} color={aTheme.accent} size={32} photo={a.photo}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{a.name}</div>
                  <div style={{ display:"flex", gap:4, marginTop:3 }}>
                    {rs.map(r=><div key={r.id} style={{ width:8, height:8, borderRadius:2, background:sc(r.status) }}/>)}
                    {rs.length===0 && <span style={{ fontSize:11, color:"var(--muted)" }}>Sin rutinas</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  {a.suspended
                    ? <Pill label="Suspendido" color="var(--orange)" size={10}/>
                    : <span style={{ fontSize:12, color:"var(--green)", fontWeight:600 }}>{done}/{rs.length}</span>
                  }
                </div>
              </div>
            );
          })
        }
      </Card>

      <PizarraBoard/>

      {/* Sin rutina warning */}
      {alumnosSinRutina.length > 0 && (
        <Card style={{ border:"1px solid var(--yellow)33" }}>
          <div style={{ fontSize:11, color:"var(--yellow)", fontWeight:600, letterSpacing:1, marginBottom:8 }}>⚠️ SIN RUTINA ASIGNADA</div>
          {alumnosSinRutina.map(a => (
            <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ fontSize:13 }}>{a.name}</div>
              <Btn v="sm" onClick={()=>onNavigate("routines",a.id)} style={{ fontSize:11, padding:"4px 10px" }}>Asignar →</Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── ALUMNO DASHBOARD ─────────────────────────────────────────────────────────
function InicioModule({ currentUser, onNavigate }) {
  const { store, dispatch } = useStore();
  const myRoutines  = store.routines[currentUser.id] || [];
  const progData    = store.progress[currentUser.id] || {};
  const todayR      = myRoutines.find(r=>r.status==="today");
  const doneCount   = myRoutines.filter(r=>r.status==="done").length;
  const allDone     = myRoutines.length > 0 && myRoutines.every(r=>r.status==="done");
  const theme       = getTheme(currentUser);
  const meUser      = store.users.find(u=>u.id===currentUser.id);
  const myObjectives = (meUser?.objectives||[]).map(o => ({
    ...o,
    ...OBJECTIVES_CATALOG.find(c=>c.id===o.id),
  }));

  const toggleComplete = (objId, val) => {
    dispatch("COMPLETE_OBJECTIVE", { alumnoId:currentUser.id, objId, val });
  };

  return (
    <div className="fade">
      <div style={{ marginBottom:20 }}>
        <H size={22}>Hola, {currentUser.name.split(" ")[0]} 👋</H>
        <div style={{ color:"var(--sub)", fontSize:14, marginTop:2 }}>{new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { label:"Sesiones", value:doneCount },
          { label:"Esta semana", value:`${doneCount}/${myRoutines.length}` },
          { label:"Racha", value:"5d" },
        ].map((s,i) => (
          <Card key={i} style={{ padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:22, color:"var(--accent)" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"var(--sub)", marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

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

      {myObjectives.length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>
            OBJETIVOS DEL CICLO
            {allDone && <span style={{ marginLeft:8, color:"var(--green)", fontSize:10 }}>● Todas las rutinas completadas</span>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {myObjectives.map((o,i) => {
              const catColor = OBJ_CAT_COLORS[o.cat] || "#6b7280";
              return (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, background:"var(--surface)", borderRadius:9, padding:"10px 12px", borderLeft:`3px solid ${o.completed?"var(--green)":o.priority==="principal"?"var(--accent)":"var(--border)"}`, opacity:o.completed?.75:1 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{o.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:700, textDecoration:o.completed?"line-through":"none" }}>{o.label}</span>
                      <Pill label={o.priority} color={o.priority==="principal"?"var(--accent)":"var(--sub)"} size={10}/>
                      <Pill label={o.cat} color={catColor} size={10}/>
                    </div>
                    <div style={{ fontSize:12, color:"var(--sub)", marginTop:3 }}>{o.desc}</div>
                  </div>
                  <button onClick={()=>toggleComplete(o.id,!o.completed)} style={{ flexShrink:0, width:26, height:26, borderRadius:"50%", border:`2px solid ${o.completed?"var(--green)":"var(--border)"}`, background:o.completed?"var(--green)":"transparent", color:"#fff", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {o.completed?"✓":""}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {Object.keys(progData).length > 0 && (
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1 }}>PROGRESO RECIENTE</div>
            <Btn onClick={()=>onNavigate&&onNavigate("metrics")} v="ghost" style={{ fontSize:11, padding:"3px 10px" }}>Ver métricas →</Btn>
          </div>
          {Object.entries(progData).slice(0,2).map(([ex, vals]) => (
            <div key={ex} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, marginBottom:4 }}>
                <span>{ex}</span><span style={{ color:"var(--green)" }}>{vals[vals.length-1]} kg</span>
              </div>
              <Sparkline data={vals} color="var(--accent)" w={200} h={28}/>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div style={{ fontSize:11, color:"var(--sub)", fontWeight:600, letterSpacing:1, marginBottom:10 }}>SEMANA</div>
        {myRoutines.map(r => (
          <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:sc(r.status), flexShrink:0 }}/>
            <div style={{ flex:1, fontSize:13 }}>{r.label}</div>
            <Pill label={sl(r.status)} color={sc(r.status)} size={10}/>
          </div>
        ))}
        {myRoutines.length===0 && <div style={{ fontSize:13, color:"var(--sub)", padding:8 }}>Sin rutinas asignadas aún</div>}
      </Card>
    </div>
  );
}


function ConfigModule({ currentUser, onLogout, onUserUpdate }) {
  const theme = getTheme(currentUser);
  const t = useLang(currentUser);
  const isSA = currentUser.role === "superadmin";
  const isAlumno = currentUser.role === "alumno";
  const [form, setForm] = useState({
    name:      currentUser.name,
    email:     currentUser.email,
    phone:     currentUser.phone || "",
    birthdate: currentUser.birthdate || "",
    lang:      currentUser.lang || "Español",
    units:     currentUser.units || "kg",
    photo:     currentUser.photo || null,
    pesoInicial: currentUser.pesoInicial || "",
    pesoObj:     currentUser.pesoObj || "",
    altura:      currentUser.altura || "",
    themePreset:   currentUser.themePreset || "d-blue",
    themeInverted: currentUser.themeInverted || false,
  });
  const [pwForm, setPwForm] = useState({ current:"", next:"", confirm:"" });
  const [saved, setSaved]   = useState(false);
  const [pwMsg, setPwMsg]   = useState("");
  const [section, setSection] = useState("perfil");

  const bmi = calcBMI(parseFloat(form.pesoInicial), parseFloat(form.altura));
  const langCode = LANG_CODES[form.lang] || "es";

  const age = currentUser.birthdate
    ? Math.floor((new Date() - new Date(currentUser.birthdate)) / (365.25*24*60*60*1000))
    : null;

  const saveProfile = () => {
    const updated = { ...currentUser, ...form };
    onUserUpdate(updated);
    // Apply theme immediately
    if (form.themePreset) {
      const preset = form.themeInverted ? getInverted(form.themePreset) : THEME_PRESETS.find(p=>p.id===form.themePreset);
      if (preset) applyThemePreset(preset);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changePw = () => {
    if (pwForm.current !== currentUser.password) { setPwMsg("Contraseña actual incorrecta"); return; }
    if (pwForm.next.length < 4) { setPwMsg("Mínimo 4 caracteres"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Las contraseñas no coinciden"); return; }
    onUserUpdate({ ...currentUser, password: pwForm.next });
    setPwMsg("✓ Contraseña actualizada");
    setPwForm({ current:"", next:"", confirm:"" });
  };

  const roleLabel = { superadmin:"⭐ SuperAdmin", coach:"🔴 Entrenador", alumno:"Alumno" };
  const sections = isAlumno
    ? ["perfil","cuerpo","unidades","diseno","seguridad"]
    : ["perfil","unidades","diseno","seguridad"];

  const sectionLabels = { perfil:"👤 "+t("perfil"), cuerpo:"📍 "+t("puntoPartida"), unidades:"⚖️ "+t("unidades"), diseno:"🎨 Diseño", seguridad:"🔒 "+t("seguridad") };

  return (
    <div className="fade">
      <H size={20} style={{ marginBottom:16 }}>{t("config")}</H>

      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
        {sections.map(s => (
          <button key={s} onClick={()=>setSection(s)} style={{ flexShrink:0, background:section===s?"var(--accent)":"var(--card)", border:`1px solid ${section===s?"var(--accent)":"var(--border)"}`, color:section===s?"#fff":"var(--sub)", borderRadius:9, padding:"7px 14px", fontSize:12, fontWeight:600 }}>
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      {/* ── PERFIL ── */}
      {section === "perfil" && (
        <Card>
          {!isSA && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20, gap:8 }}>
              <PhotoUpload onPhoto={photo=>setForm(p=>({...p,photo}))}>
                <Avatar name={form.name} color={theme.accent} size={80} photo={form.photo} editable={true}/>
              </PhotoUpload>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{form.name}</div>
                <div style={{ fontSize:11, color:"var(--sub)" }}>{roleLabel[currentUser.role]}{age?` · ${age} años`:""}</div>
                <div style={{ fontSize:11, color:"var(--sub)", marginTop:1 }}>Tocá la foto para cambiarla</div>
              </div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <div><Label>{t("nombre").toUpperCase()}</Label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
            <div><Label>{t("email").toUpperCase()}</Label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
            <div><Label>{t("celular").toUpperCase()}</Label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+54 11 ..."/></div>
            <div><Label>{t("nacimiento").toUpperCase()}</Label><input type="date" value={form.birthdate} onChange={e=>setForm(p=>({...p,birthdate:e.target.value}))}/></div>
            <div>
              <Label>{t("idioma").toUpperCase()}</Label>
              <select value={form.lang} onChange={e=>setForm(p=>({...p,lang:e.target.value}))}>
                {Object.values(T).map(tl=><option key={tl.lang} value={tl.lang}>{tl.lang}</option>)}
              </select>
            </div>
            <div style={{ background:"var(--surface)", borderRadius:9, padding:"9px 12px", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"var(--sub)" }}>{t("rol").toUpperCase()}</span>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--accent)" }}>{roleLabel[currentUser.role]}</span>
            </div>
          </div>
          <Divider style={{ margin:"14px 0" }}/>
          {saved ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:10, color:"#22c55e", fontWeight:600, textAlign:"center" }}>✓ {t("guardar")}</div>
                 : <Btn onClick={saveProfile} full>{t("guardar")}</Btn>}
        </Card>
      )}

      {/* ── PUNTO DE PARTIDA (alumno only) ── */}
      {section === "cuerpo" && isAlumno && (
        <Card>
          <div style={{ fontSize:12, color:"var(--sub)", marginBottom:14 }}>Datos registrados al inicio. Sirven como referencia de evolución.</div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <Label>{t("pesoInicial").toUpperCase()} (kg)</Label>
                <input type="number" step="0.1" value={form.pesoInicial} onChange={e=>setForm(p=>({...p,pesoInicial:e.target.value}))} placeholder="Ej: 75"/>
              </div>
              <div>
                <Label>{t("altura").toUpperCase()} (cm)</Label>
                <input type="number" value={form.altura} onChange={e=>setForm(p=>({...p,altura:e.target.value}))} placeholder="Ej: 175"/>
              </div>
            </div>
            <div>
              <Label>{t("pesoObj").toUpperCase()}</Label>
              <input type="number" step="0.1" value={form.pesoObj} onChange={e=>setForm(p=>({...p,pesoObj:e.target.value}))} placeholder="Opcional"/>
            </div>
            {bmi && (
              <div style={{ background:"var(--surface)", borderRadius:9, padding:"10px 14px" }}>
                <div style={{ fontSize:11, color:"var(--sub)", marginBottom:4 }}>{t("imc").toUpperCase()}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:28, color:"var(--accent)" }}>{bmi}</span>
                  <span style={{ fontSize:13, color:"var(--sub)" }}>{bmiCategory(bmi, langCode)}</span>
                </div>
                <div style={{ height:6, background:"var(--border)", borderRadius:3, marginTop:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((bmi/40)*100,100)}%`, background:bmi<18.5?"#3b82f6":bmi<25?"#22c55e":bmi<30?"#f97316":"#ef4444", borderRadius:3 }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--muted)", marginTop:3 }}>
                  <span>Bajo peso</span><span>Normal</span><span>Sobrepeso</span><span>Obesidad</span>
                </div>
              </div>
            )}
            {currentUser.registeredAt && (
              <div style={{ background:"var(--surface)", borderRadius:9, padding:"8px 12px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"var(--sub)" }}>Fecha de registro</span>
                <span style={{ fontSize:12, fontWeight:600 }}>{new Date(currentUser.registeredAt).toLocaleDateString("es",{day:"numeric",month:"long",year:"numeric"})}</span>
              </div>
            )}
          </div>
          <Divider style={{ margin:"14px 0" }}/>
          {saved ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:10, color:"#22c55e", fontWeight:600, textAlign:"center" }}>✓ Guardado</div>
                 : <Btn onClick={saveProfile} full>{t("guardar")}</Btn>}
        </Card>
      )}

      {/* ── UNIDADES ── */}
      {section === "unidades" && (
        <Card>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Elegí las unidades para registrar pesos en rutinas, progreso y métricas corporales.</div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {["kg","lbs"].map(u=>(
              <button key={u} onClick={()=>setForm(p=>({...p,units:u}))} style={{
                flex:1, padding:"16px", borderRadius:12,
                background:form.units===u?"var(--accent)":"var(--surface)",
                border:`2px solid ${form.units===u?"var(--accent)":"var(--border)"}`,
                color:form.units===u?"#fff":"var(--sub)", fontSize:16, fontWeight:700,
              }}>
                {u === "kg" ? "🇰🇬 Kilogramos" : "🇺🇸 Libras"}
                <div style={{ fontSize:11, fontWeight:400, marginTop:4, opacity:.8 }}>
                  {u==="kg"?"Sistema métrico internacional":"Sistema imperial"}
                </div>
              </button>
            ))}
          </div>
          {form.units === "lbs" && (
            <div style={{ background:"var(--surface)", borderRadius:9, padding:"10px 14px", fontSize:12, color:"var(--sub)", marginBottom:14 }}>
              💡 1 kg = 2.205 lbs — Los valores se convierten automáticamente en toda la app
            </div>
          )}
          <div style={{ background:"var(--surface)", borderRadius:9, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"var(--sub)", marginBottom:6 }}>EJEMPLOS DE CONVERSIÓN</div>
            {[60,80,100,120].map(kg=>(
              <div key={kg} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:12 }}>
                <span>{kg} kg</span>
                <span style={{ color:"var(--accent)", fontWeight:600 }}>{toDisplay(kg, form.units)} {form.units}</span>
              </div>
            ))}
          </div>
          {saved ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:10, color:"#22c55e", fontWeight:600, textAlign:"center" }}>✓ Guardado</div>
                 : <Btn onClick={saveProfile} full>{t("guardar")}</Btn>}
        </Card>
      )}

      {/* ── DISEÑO ── */}
      {section === "diseno" && (
        <Card>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Elegí tu combinación de colores</div>
          <div style={{ fontSize:12, color:"var(--sub)", marginBottom:14 }}>Hacé click una vez para aplicar. Hacé click de nuevo para invertir los colores.</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {THEME_PRESETS.map(p => {
              const isActive = form.themePreset===p.id || form.themePreset===(p.id+"-inv");
              const isInverted = form.themeInverted && (form.themePreset===p.id||form.themePreset===(p.id+"-inv"));
              const displayPreset = isActive && isInverted ? (getInverted(p.id)||p) : p;
              return (
                <button key={p.id} onClick={()=>{
                  if (form.themePreset===p.id && !form.themeInverted) {
                    setForm(prev=>({...prev,themePreset:p.id,themeInverted:true}));
                    const inv = getInverted(p.id);
                    if (inv) applyThemePreset(inv);
                  } else if (form.themePreset===p.id && form.themeInverted) {
                    setForm(prev=>({...prev,themePreset:p.id,themeInverted:false}));
                    applyThemePreset(p);
                  } else {
                    setForm(prev=>({...prev,themePreset:p.id,themeInverted:false}));
                    applyThemePreset(p);
                  }
                }} style={{
                  width:60, height:60, borderRadius:10, overflow:"hidden", cursor:"pointer",
                  border:`3px solid ${form.themePreset===p.id?"var(--accent)":"transparent"}`,
                  position:"relative", padding:0,
                }}>
                  {p.split ? (
                    <div style={{ width:"100%", height:"100%", display:"flex" }}>
                      <div style={{ flex:1, background: form.themeInverted&&form.themePreset===p.id?"#ffffff":"#0a0a0f" }}/>
                      <div style={{ flex:1, background: form.themeInverted&&form.themePreset===p.id?"#0a0a0f":"#ffffff" }}/>
                    </div>
                  ) : (
                    <>
                      <div style={{ width:"100%", height:"100%", background:isActive&&isInverted?displayPreset.bg:p.bg }}/>
                      <div style={{ position:"absolute", bottom:6, right:6, width:18, height:18, borderRadius:4, background:isActive&&isInverted?displayPreset.accent:p.accent }}/>
                    </>
                  )}
                  {form.themePreset===p.id && <div style={{ position:"absolute", top:2, right:2, fontSize:10, background:"var(--accent)", color:"#fff", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✓</div>}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:"var(--sub)", marginBottom:14 }}>
            Tema actual: <span style={{ fontWeight:700, color:"var(--accent)" }}>{THEME_PRESETS.find(p=>p.id===form.themePreset)?.label || "Por defecto"}{form.themeInverted?" (invertido)":""}</span>
          </div>
          {saved ? <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:9, padding:10, color:"#22c55e", fontWeight:600, textAlign:"center" }}>✓ Guardado</div>
                 : <Btn onClick={saveProfile} full>Guardar diseño</Btn>}
        </Card>
      )}

      {/* ── SEGURIDAD ── */}
      {section === "seguridad" && (
        <Card>
          <H size={15} style={{ marginBottom:14 }}>🔒 {t("seguridad")}</H>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><Label>CONTRASEÑA ACTUAL</Label><input type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))} placeholder="••••••••"/></div>
            <div><Label>NUEVA CONTRASEÑA</Label><input type="password" value={pwForm.next} onChange={e=>setPwForm(p=>({...p,next:e.target.value}))} placeholder="••••••••"/></div>
            <div><Label>CONFIRMAR</Label><input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} placeholder="••••••••"/></div>
          </div>
          {pwMsg && <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, fontSize:13, background:pwMsg.startsWith("✓")?"#22c55e11":"#ef444411", color:pwMsg.startsWith("✓")?"#22c55e":"#ef4444", border:`1px solid ${pwMsg.startsWith("✓")?"#22c55e33":"#ef444433"}` }}>{pwMsg}</div>}
          <Divider style={{ margin:"14px 0" }}/>
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
  const { store, dispatch } = useStore();
  const [currentUser, setCurrentUserLocal] = useState(initUser);
  const theme = getTheme(currentUser);

  // Apply user's saved theme preset on mount and change
  useEffect(() => {
    const presetId = currentUser.themePreset;
    const inverted = currentUser.themeInverted;
    if (presetId) {
      const base = THEME_PRESETS.find(t=>t.id===presetId);
      const preset = inverted ? getInverted(presetId) : base;
      if (preset) applyThemePreset(preset);
    }
  }, [currentUser.themePreset, currentUser.themeInverted]);
  const isSuspendedInit = initUser.suspended === true;
  const [page, setPage] = useState(isSuspendedInit ? "messages" : "inicio");
  const [sideOpen, setSideOpen] = useState(false);
  const [targetAlumno, setTargetAlumno] = useState(null); // para coach viendo rutinas de alumno

  const setCurrentUser = (updated) => {
    dispatch("UPDATE_USER", updated);
    setCurrentUserLocal(updated);
  };

  const navigate = (p, alumnoId=null) => {
    const susp = store.users.find(u=>u.id===currentUser.id)?.suspended;
    if (susp && p !== "messages" && p !== "config") return;
    setPage(p);
    setTargetAlumno(alumnoId);
  };

  const t = useLang(currentUser);
  const isAlumno   = currentUser.role === "alumno";
  const isCoach    = currentUser.role === "coach";
  const isSA       = currentUser.role === "superadmin";

  const isSuspended = store.users.find(u=>u.id===currentUser.id)?.suspended === true;
  // Unread messages count
  const getUnread = () => {
    let pairs = [];
    if (currentUser.role === "alumno") pairs = [currentUser.coachId];
    else if (currentUser.role === "coach") pairs = store.users.filter(u=>u.role==="alumno"&&u.coachId===currentUser.id&&u.active).map(u=>u.id);
    else if (currentUser.role === "superadmin") pairs = store.users.filter(u=>u.role==="coach"&&u.active).map(u=>u.id);
    const getKey = (a,b) => [a,b].sort().join("-");
    return pairs.reduce((total, pid) => {
      const key = getKey(currentUser.id, pid);
      const msgs = store.messages[key] || [];
      return total + msgs.filter(m => m.from === pid && !m.read).length;
    }, 0);
  };
  const unreadCount = getUnread();

  const navItems = isAlumno
    ? isSuspended
      ? [
          { id:"messages", icon:"💬", label:"Mensajes", badge: unreadCount },
          { id:"config",   icon:"⚙️", label:"Config" },
        ]
      : [
          { id:"inicio",    icon:"⊞",  label:"Inicio" },
          { id:"training",  icon:"🏋️", label:"Entreno" },
          { id:"progress",  icon:"📈", label:"Progreso" },
          { id:"routines",  icon:"📋", label:"Rutinas" },
          { id:"metrics",   icon:"📊", label:"Métricas" },
          { id:"messages",  icon:"💬", label:"Mensajes", badge: unreadCount },
          { id:"config",    icon:"⚙️", label:"Config" },
        ]
    : isCoach
    ? [
        { id:"overview",  icon:"📊", label:"Resumen" },
        { id:"users",     icon:"👥", label:"Alumnos" },
        { id:"routines",  icon:"📋", label:"Rutinas" },
        { id:"messages",  icon:"💬", label:"Mensajes" },
        { id:"config",    icon:"⚙️", label:"Config" },
      ]
    : [ // superadmin
        { id:"overview",  icon:"📊", label:"Resumen" },
        { id:"users",     icon:"👥", label:"Usuarios" },
        { id:"routines",  icon:"📋", label:"Rutinas" },
        { id:"messages",  icon:"💬", label:"Mensajes", badge: unreadCount },
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
              <span style={{ width:22, textAlign:"center" }}>{n.icon}</span>
              {n.label}
              {n.badge > 0 && <span style={{ marginLeft:"auto", background:"var(--accent)", color:"#fff", borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 7px", minWidth:18, textAlign:"center" }}>{n.badge}</span>}
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

          {page === "inicio" && (
            isAlumno ? <InicioModule currentUser={currentUser} onNavigate={navigate}/> :
            isCoach  ? <CoachDashboard currentUser={currentUser} onNavigate={navigate}/> :
            isSA     ? <SADashboard/> : null
          )}
          {page === "training" && <TrainingModule currentUser={currentUser}/>}
          {page === "progress" && <ProgressModule currentUser={currentUser} targetAlumnoId={targetAlumno}/>}
          {page === "metrics"  && isAlumno && <MetricsModule currentUser={currentUser}/>}
          {page === "routines" && <RoutinesModule currentUser={currentUser} targetAlumnoId={targetAlumno}/>}
          {page === "users"    && <UsersModule    currentUser={currentUser}/>}
          {page === "overview" && <OverviewModule currentUser={currentUser} onNavigate={navigate}/>}
          {page === "messages" && (
            <>
              {isSuspended && isAlumno && (
                <div style={{ background:"#f9731611", border:"1px solid #f9731633", borderRadius:10, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#f97316" }}>Cuenta suspendida</div>
                    <div style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>Tu cuenta está suspendida. Escribile a tu entrenador para más información.</div>
                  </div>
                </div>
              )}
              <MessagesModule currentUser={currentUser}/>
            </>
          )}
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
              display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative"
            }}>
              <span style={{ fontSize:17 }}>{n.icon}</span>
              {n.badge > 0 && <span style={{ position:"absolute", top:2, right:"calc(50% - 16px)", background:"var(--accent)", color:"#fff", borderRadius:99, fontSize:9, fontWeight:700, padding:"1px 5px", minWidth:16, textAlign:"center" }}>{n.badge}</span>}
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

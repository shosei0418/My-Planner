import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_OPTIONS = ["😄","😊","😐","😔","😤"];
const DEFAULT_HABITS = ["💪 Gym","📚 English","⏰ Wake up 6am"];
const GOAL_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];
const EVENT_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#222"];
const PRIORITY_COLOR = { High:"#e53935", Med:"#FB8C00", Low:"#43A047" };
const GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function getWAHolidays(year) {
  const a=year%19,b=Math.floor(year/100),c=year%100,d2=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d2-g+15)%30;
  const ii=Math.floor(c/4),k=c%4,l=(32+2*e+2*ii-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const mo=Math.floor((h+l-7*m+114)/31),dy=((h+l-7*m+114)%31)+1;
  const es=new Date(year,mo-1,dy);
  const add=(dt,n)=>{const r=new Date(dt);r.setDate(r.getDate()+n);return r;};
  const fmt=dt=>dt.toISOString().slice(0,10);
  const nth=(y,mo2,wd,n)=>{const dt=new Date(y,mo2-1,1);let cnt=0;while(true){if(dt.getDay()===wd)cnt++;if(cnt===n)return fmt(dt);dt.setDate(dt.getDate()+1);}};
  const last=(y,mo2,wd)=>{const dt=new Date(y,mo2,0);while(dt.getDay()!==wd)dt.setDate(dt.getDate()-1);return fmt(dt);};
  const set=new Set([
    fmt(add(es,-2)),fmt(add(es,-1)),fmt(es),fmt(add(es,1)),
    `${year}-04-25`,
    nth(year,6,1,1),
    last(year,9,1),
  ]);
  // New Year's
  const ny=new Date(year,0,1);
  if(ny.getDay()===0)set.add(`${year}-01-02`);
  else if(ny.getDay()===6)set.add(`${year}-01-03`);
  else set.add(`${year}-01-01`);
  // Australia Day
  const ad=new Date(year,0,26);
  if(ad.getDay()===0)set.add(`${year}-01-27`);
  else if(ad.getDay()===6)set.add(`${year}-01-28`);
  else set.add(`${year}-01-26`);
  // Christmas/Boxing
  const xm=new Date(year,11,25);
  if(xm.getDay()===0){set.add(`${year}-12-27`);set.add(`${year}-12-26`);}
  else if(xm.getDay()===6){set.add(`${year}-12-27`);set.add(`${year}-12-28`);}
  else{set.add(`${year}-12-25`);set.add(`${year}-12-26`);}
  return set;
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("Home");
  const [events, setEvents] = useState(() => load("pl_events", []));
  const [tasks, setTasks] = useState(() => load("pl_tasks", []));
  const [diary, setDiary] = useState(() => load("pl_diary", {}));
  const [goals, setGoals] = useState(() => load("pl_goals", []));
  const [habits, setHabits] = useState(() => load("pl_habits", DEFAULT_HABITS));

  useEffect(() => save("pl_events", events), [events]);
  useEffect(() => save("pl_tasks", tasks), [tasks]);
  useEffect(() => save("pl_diary", diary), [diary]);
  useEffect(() => save("pl_goals", goals), [goals]);
  useEffect(() => save("pl_habits", habits), [habits]);

  return (
    <div style={{
      position:"fixed", inset:0, background:"#fff",
      display:"flex", flexDirection:"column",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",
      overflow:"hidden"
    }}>
      <div style={{ flexShrink:0, position:"sticky", top:0, zIndex:50, background:"#fff" }}>
        <TopNav tab={tab} setTab={setTab} />
      </div>
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch", background:"#fff" }}>
        {tab==="Home" && <HomeTab events={events} setEvents={setEvents} tasks={tasks} setTasks={setTasks} />}
        {tab==="Diary" && <DiaryTab diary={diary} setDiary={setDiary} habits={habits} setHabits={setHabits} />}
        {tab==="Goals" && <GoalsTab goals={goals} setGoals={setGoals} />}
        <div style={{height:32}} />
      </div>
    </div>
  );
}

// ── Top Nav ────────────────────────────────────────────────────────────────
function TopNav({ tab, setTab }) {
  return (
    <div style={{ padding:"14px 16px 10px", background:"#fff", borderBottom:"1px solid #f0f0f0", flexShrink:0 }}>
      <div style={{ display:"flex", gap:6, background:"#f2f2f2", borderRadius:100, padding:4 }}>
        {["Home","Diary","Goals"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:"8px 0", borderRadius:100, border:"none", cursor:"pointer",
            background: tab===t ? "#000" : "transparent",
            color: tab===t ? "#fff" : "#888",
            fontSize:14, fontWeight: tab===t ? 600 : 400,
            transition:"all 0.2s"
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────
function HomeTab({ events, setEvents, tasks, setTasks }) {
  return (
    <div>
      <CalendarSection events={events} setEvents={setEvents} />
      <div style={{ height:1, background:"#f0f0f0", margin:"16px 0" }} />
      <TaskSection tasks={tasks} setTasks={setTasks} />
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────
function CalendarSection({ events, setEvents }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const holidays = getWAHolidays(year);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const prevM = month===0 ? {y:year-1,m:11} : {y:year,m:month-1};
  const nextM = month===11 ? {y:year+1,m:0} : {y:year,m:month+1};
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const offset = i - firstDay;
    if (offset < 0) cells.push({ day: prevDays+offset+1, month: prevM.m, year: prevM.y, current: false });
    else if (offset >= daysInMonth) cells.push({ day: offset-daysInMonth+1, month: nextM.m, year: nextM.y, current: false });
    else cells.push({ day: offset+1, month, year, current: true });
  }

  const getDateStr = c => `${c.year}-${String(c.month+1).padStart(2,"0")}-${String(c.day).padStart(2,"0")}`;
  const getEvents = ds => events.filter(e => e.date===ds);
  const tod = todayStr();

  const handleCellClick = c => {
    const ds = getDateStr(c);
    if (!c.current) { setYear(c.year); setMonth(c.month); }
    setSelectedDate(ds);
  };

  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 10px" }}>
        <button onClick={prevMonth} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", padding:"4px 8px", color:"#333" }}>‹</button>
        <span style={{ fontWeight:700, fontSize:17 }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", padding:"4px 8px", color:"#333" }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#f8f8f8", borderTop:"1px solid #eee", borderBottom:"1px solid #eee" }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{
            padding:"6px 0", textAlign:"center", fontSize:11, fontWeight:600,
            color: i===0?"#e53935":i===6?"#1565C0":"#888"
          }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:"#eee" }}>
        {cells.map((c, i) => {
          const ds = getDateStr(c);
          const dow = new Date(ds+"T00:00:00").getDay();
          const isRed = dow===0 || holidays.has(ds);
          const isBlue = dow===6;
          const isToday = ds===tod;
          const isSel = ds===selectedDate;
          const dayEvents = getEvents(ds);
          const numColor = isRed?"#e53935":isBlue?"#1565C0":"#222";

          return (
            <div key={i} onClick={() => handleCellClick(c)} style={{
              background: isSel?"#f5f5f5":"#fff",
              height:68, overflow:"hidden", cursor:"pointer",
              position:"relative", opacity: c.current?1:0.3,
              boxSizing:"border-box"
            }}>
              <span style={{
                position:"absolute", top:4, right:5, fontSize:12,
                fontWeight: isToday?700:400,
                color: isToday?"#fff":numColor,
                background: isToday?"#000":"transparent",
                borderRadius:"50%", width:isToday?20:undefined,
                height:isToday?20:undefined,
                display:"flex", alignItems:"center", justifyContent:"center",
                lineHeight:1
              }}>{c.day}</span>

              <div style={{ position:"absolute", top:22, left:2, right:2, display:"flex", flexDirection:"column", gap:1 }}>
                {dayEvents.slice(0,3).map(e => (
                  <div key={e.id} style={{
                    background: e.color||"#222", color:"#fff",
                    fontSize:8, fontWeight:600, borderRadius:2,
                    padding:"0px 3px", lineHeight:"14px", overflow:"hidden",
                    whiteSpace:"nowrap"
                  }}>{e.title}</div>
                ))}
                {dayEvents.length>3 && <div style={{ fontSize:8, color:"#999", paddingLeft:2 }}>+{dayEvents.length-3}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <EventModal
          date={selectedDate}
          events={events}
          setEvents={setEvents}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function EventModal({ date, events, setEvents, onClose }) {
  const dayEvents = events.filter(e => e.date===date);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [color, setColor] = useState("#222");
  const fmted = new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"});

  const saveEvent = () => {
    if (!title.trim()) return;
    if (editId) {
      setEvents(evs => evs.map(e => e.id===editId?{...e,title:title.trim(),time,color}:e));
    } else {
      setEvents(evs => [...evs,{id:Date.now(),date,title:title.trim(),time,color}]);
    }
    setTitle(""); setTime(""); setColor("#222"); setAdding(false); setEditId(null);
  };

  const startEdit = e => { setEditId(e.id);setTitle(e.title);setTime(e.time||"");setColor(e.color||"#222");setAdding(true); };
  const del = id => setEvents(evs => evs.filter(e => e.id!==id));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"flex-end", zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", padding:"20px 16px 40px", maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontWeight:700, fontSize:16 }}>{fmted}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#333" }}>×</button>
        </div>

        {dayEvents.map(e => (
          <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, padding:"10px 12px", background:"#f8f8f8", borderRadius:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:e.color||"#222", flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{e.title}</div>
              {e.time && <div style={{ fontSize:12, color:"#999" }}>{e.time}</div>}
            </div>
            <button onClick={() => startEdit(e)} style={{ background:"none", border:"none", fontSize:15, cursor:"pointer", color:"#666" }}>✎</button>
            <button onClick={() => del(e.id)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#ccc" }}>×</button>
          </div>
        ))}

        {adding ? (
          <div style={{ marginTop:8 }}>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Event title"
              style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"1.5px solid #e0e0e0", borderRadius:12, marginBottom:8, boxSizing:"border-box", outline:"none" }}
            />
            <input value={time} onChange={e=>setTime(e.target.value)} type="time"
              style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"1.5px solid #e0e0e0", borderRadius:12, marginBottom:8, boxSizing:"border-box", outline:"none" }}
            />
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width:26, height:26, borderRadius:"50%", background:c, border:color===c?"3px solid #333":"2px solid transparent", cursor:"pointer" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => {setAdding(false);setEditId(null);setTitle("");setTime("");}} style={{ flex:1, padding:"11px", background:"#f0f0f0", border:"none", borderRadius:12, fontSize:14, cursor:"pointer" }}>Cancel</button>
              <button onClick={saveEvent} style={{ flex:1, padding:"11px", background:"#000", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ width:"100%", padding:"12px", background:"#000", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:8 }}>+ Add Event</button>
        )}
      </div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function TaskSection({ tasks, setTasks }) {
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const dragIdx = useRef(null);
  const taskRefs = useRef([]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(ts => [...ts, {id:Date.now(), title:newTask.trim(), memo:newMemo.trim(), deadline:newDeadline}]);
    setNewTask(""); setNewMemo(""); setNewDeadline(""); setAdding(false);
  };

  const check = id => setTasks(ts => ts.filter(t => t.id!==id));
  const startEdit = t => { setEditId(t.id); setEditText(t.title); setEditMemo(t.memo||""); setEditDeadline(t.deadline||""); };
  const saveEdit = () => { setTasks(ts=>ts.map(t=>t.id===editId?{...t,title:editText,memo:editMemo,deadline:editDeadline}:t)); setEditId(null); };

  const handleTouchStart = (e, i) => { dragIdx.current = i; };
  const handleTouchEnd = (e) => {
    if (dragIdx.current === null) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el?.closest("[data-taskidx]");
    if (target) {
      const toIdx = parseInt(target.dataset.taskidx);
      if (toIdx !== dragIdx.current) {
        const copy = [...tasks];
        const [rem] = copy.splice(dragIdx.current, 1);
        copy.splice(toIdx, 0, rem);
        setTasks(copy);
      }
    }
    dragIdx.current = null;
  };

  const inStyle = { width:"100%", fontSize:16, padding:"9px 11px", border:"1px solid #e0e0e0", borderRadius:10, boxSizing:"border-box", marginBottom:8, outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ padding:"0 16px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontWeight:700, fontSize:15 }}>Tasks</span>
        <button onClick={() => setAdding(a=>!a)} style={{ background:"#000", color:"#fff", border:"none", borderRadius:20, padding:"5px 14px", fontSize:13, cursor:"pointer" }}>+ Add</button>
      </div>

      {adding && (
        <div style={{ marginBottom:12, padding:12, background:"#f8f8f8", borderRadius:14 }}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Task title"
            style={inStyle} onKeyDown={e=>e.key==="Enter"&&addTask()} autoFocus
          />
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:12, color:"#aaa", whiteSpace:"nowrap" }}>📅 Due</span>
            <input value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} type="date"
              style={{ flex:1, fontSize:14, padding:"6px 8px", border:"1px solid #e0e0e0", borderRadius:8, outline:"none" }}
            />
          </div>
          <input value={newMemo} onChange={e=>setNewMemo(e.target.value)} placeholder="Memo (optional)"
            style={{ ...inStyle, marginBottom:10 }}
          />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ flex:1, padding:"9px", background:"#e8e8e8", border:"none", borderRadius:10, cursor:"pointer", fontSize:13 }}>Cancel</button>
            <button onClick={addTask} style={{ flex:1, padding:"9px", background:"#000", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Add</button>
          </div>
        </div>
      )}

      {tasks.map((t, i) => (
        editId===t.id ? (
          <div key={t.id} style={{ marginBottom:8, padding:12, background:"#f8f8f8", borderRadius:12 }}>
            <input value={editText} onChange={e=>setEditText(e.target.value)} style={inStyle} />
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:12, color:"#aaa", whiteSpace:"nowrap" }}>📅 Due</span>
              <input value={editDeadline} onChange={e=>setEditDeadline(e.target.value)} type="date"
                style={{ flex:1, fontSize:14, padding:"6px 8px", border:"1px solid #e0e0e0", borderRadius:8, outline:"none" }}
              />
            </div>
            <input value={editMemo} onChange={e=>setEditMemo(e.target.value)} placeholder="Memo..."
              style={{ ...inStyle, marginBottom:10 }}
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditId(null)} style={{ flex:1, padding:"7px", background:"#e8e8e8", border:"none", borderRadius:8, cursor:"pointer", fontSize:12 }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, padding:"7px", background:"#000", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600 }}>Save</button>
            </div>
          </div>
        ) : (
          <div key={t.id}
            data-taskidx={i}
            ref={el => taskRefs.current[i]=el}
            onTouchStart={e=>handleTouchStart(e,i)}
            onTouchEnd={handleTouchEnd}
            style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8, padding:"11px 12px", background:"#f8f8f8", borderRadius:12, userSelect:"none" }}
          >
            <button onClick={() => check(t.id)} style={{ width:20, height:20, borderRadius:"50%", border:"2px solid #ccc", background:"transparent", cursor:"pointer", flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{t.title}</div>
              {t.deadline && <div style={{ fontSize:11, color:"#999", marginTop:2 }}>📅 {t.deadline}</div>}
              {t.memo && <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{t.memo}</div>}
            </div>
            <button onClick={() => startEdit(t)} style={{ background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:14, padding:4 }}>✎</button>
          </div>
        )
      ))}

      {tasks.length===0 && !adding && (
        <div style={{ textAlign:"center", color:"#ccc", fontSize:14, padding:"24px 0" }}>No tasks yet</div>
      )}
    </div>
  );
}

// ── Diary ──────────────────────────────────────────────────────────────────
function DiaryTab({ diary, setDiary, habits, setHabits }) {
  const [view, setView] = useState("Write");
  const [editDate, setEditDate] = useState(null); // null = today
  const [detailDate, setDetailDate] = useState(null);

  const handleSelectHistory = (date) => {
    setDetailDate(date);
  };

  const handleEditFromDetail = (date) => {
    setDetailDate(null);
    setEditDate(date);
    setView("Write");
  };

  const handleTabChange = (v) => {
    setView(v);
    if (v === "Write") setEditDate(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", borderBottom:"1px solid #f0f0f0", padding:"0 16px", background:"#fff" }}>
        {["Write","History"].map(v => (
          <button key={v} onClick={() => handleTabChange(v)} style={{
            padding:"10px 20px", background:"none", border:"none", cursor:"pointer",
            fontSize:14, fontWeight:view===v?700:400,
            color:view===v?"#000":"#aaa",
            borderBottom:view===v?"2px solid #000":"2px solid transparent"
          }}>{v}</button>
        ))}
      </div>

      {view==="Write" && <DiaryWrite diary={diary} setDiary={setDiary} habits={habits} setHabits={setHabits} date={editDate} onBackToToday={() => setEditDate(null)} />}
      {view==="History" && <DiaryHistory diary={diary} setDiary={setDiary} onSelect={handleSelectHistory} />}

      {detailDate && (
        <DiaryDetailModal date={detailDate} diary={diary} setDiary={setDiary} onClose={() => setDetailDate(null)} onEdit={handleEditFromDetail} />
      )}
    </div>
  );
}

function DiaryWrite({ diary, setDiary, habits, setHabits, date: dateProp, onBackToToday }) {
  const date = dateProp || todayStr();
  const isToday = date === todayStr();
  const entry = diary[date] || {};

  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [showDone, setShowDone] = useState(isToday && !!entry.submitted);

  const update = fields => setDiary(d => ({...d, [date]:{...d[date],...fields}}));

  const mood = entry.mood || "";
  const checkedHabits = entry.habits || [];
  const text = entry.text || "";
  const photos = entry.photos || [];

  const toggleHabit = h => {
    const hs = checkedHabits.includes(h) ? checkedHabits.filter(x=>x!==h) : [...checkedHabits,h];
    update({ habits:hs });
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    setHabits(hs => [...hs, newHabit.trim()]);
    setNewHabit(""); setAddingHabit(false);
  };

  const addPhoto = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => update({ photos:[...photos, ev.target.result] });
    reader.readAsDataURL(file);
  };

  const calcStreak = () => {
    let streak=0; const d=new Date();
    while (true) {
      const k = d.toISOString().slice(0,10);
      if (!diary[k]?.submitted) break;
      streak++; d.setDate(d.getDate()-1);
    }
    return streak;
  };

  const submit = () => {
    update({ submitted:true, submittedAt:new Date().toISOString() });
    if (isToday) setShowDone(true);
  };

  // Done screen (today only)
  if (isToday && (showDone || entry.submitted)) {
    const streak = calcStreak();
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🌙</div>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>今日もお疲れ様</div>
        <div style={{ fontSize:14, color:"#888", lineHeight:1.6, marginBottom:20 }}>
          一日一日の積み重ねが大きな変化を生む。<br/>明日も全力で。
        </div>
        {streak > 0 && (
          <div style={{ background:"#FFF3E0", borderRadius:20, padding:"6px 18px", fontSize:14, fontWeight:700, color:"#E65100", marginBottom:20 }}>
            🔥 {streak} day{streak>1?"s":""} in a row
          </div>
        )}
        {checkedHabits.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
            {checkedHabits.map((h,i) => (
              <span key={i} style={{ background:"#000", color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:12 }}>{h}</span>
            ))}
          </div>
        )}
        <button onClick={() => { setShowDone(false); update({submitted:false}); }} style={{
          padding:"11px 24px", background:"none", border:"1.5px solid #e0e0e0", borderRadius:20, fontSize:14, cursor:"pointer"
        }}>✎ Edit today's entry</button>
      </div>
    );
  }

  const fmtedDate = !isToday ? new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"}) : null;

  return (
    <div style={{ padding:"16px 16px 80px" }}>
      {/* Mood */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#aaa", letterSpacing:1, marginBottom:8 }}>MOOD</div>
        <div style={{ display:"flex", gap:6 }}>
          {MOOD_OPTIONS.map(m => (
            <button key={m} onClick={() => update({mood:m})} style={{
              fontSize:26, background:mood===m?"#f0f0f0":"transparent",
              border:"none", borderRadius:10, padding:"6px 8px", cursor:"pointer",
              opacity:mood&&mood!==m?0.35:1, transition:"all 0.15s"
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* Habits */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#aaa", letterSpacing:1, marginBottom:8 }}>HABITS</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {habits.map(h => (
            <button key={h} onClick={() => toggleHabit(h)} style={{
              padding:"6px 14px", borderRadius:20, border:"1.5px solid",
              borderColor:checkedHabits.includes(h)?"#000":"#e0e0e0",
              background:checkedHabits.includes(h)?"#000":"#fff",
              color:checkedHabits.includes(h)?"#fff":"#666",
              fontSize:13, cursor:"pointer"
            }}>{h}</button>
          ))}
          {addingHabit ? (
            <div style={{ display:"flex", gap:4 }}>
              <input value={newHabit} onChange={e=>setNewHabit(e.target.value)} placeholder="Habit name"
                style={{ fontSize:16, padding:"5px 10px", border:"1px solid #e0e0e0", borderRadius:20, outline:"none", width:110 }}
                onKeyDown={e=>e.key==="Enter"&&addHabit()} autoFocus
              />
              <button onClick={addHabit} style={{ background:"#000", color:"#fff", border:"none", borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>+</button>
            </div>
          ) : (
            <button onClick={() => setAddingHabit(true)} style={{ padding:"6px 14px", borderRadius:20, border:"1.5px dashed #ccc", background:"transparent", color:"#aaa", fontSize:13, cursor:"pointer" }}>+ Add</button>
          )}
        </div>
      </div>

      {/* Text */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#aaa", letterSpacing:1, marginBottom:8 }}>TODAY</div>
        <textarea value={text} onChange={e=>update({text:e.target.value})} placeholder="Write about your day..."
          style={{ width:"100%", minHeight:130, fontSize:16, padding:"12px", border:"1.5px solid #ebebeb", borderRadius:14, resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.6, fontFamily:"inherit" }}
        />
      </div>

      {/* Photos */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#aaa", letterSpacing:1, marginBottom:8 }}>PHOTOS</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position:"relative", width:80, height:80 }}>
              <img src={p} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:10 }} />
              <button onClick={() => update({photos:photos.filter((_,j)=>j!==i)})} style={{ position:"absolute", top:-4, right:-4, background:"#e53935", color:"#fff", border:"none", borderRadius:"50%", width:18, height:18, cursor:"pointer", fontSize:11 }}>×</button>
            </div>
          ))}
          <label style={{ width:80, height:80, border:"1.5px dashed #ddd", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#ccc", fontSize:26 }}>
            +<input type="file" accept="image/*" onChange={addPhoto} style={{ display:"none" }} />
          </label>
        </div>
      </div>

      {isToday
        ? <button onClick={submit} style={{ width:"100%", padding:"14px", background:"#000", color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:700, cursor:"pointer" }}>Submit ✓</button>
        : <button onClick={onBackToToday} style={{ width:"100%", padding:"14px", background:"#f0f0f0", color:"#333", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer" }}>← Back</button>
      }
    </div>
  );
}

// ── Diary History (BeReal style) ───────────────────────────────────────────
function DiaryHistory({ diary, setDiary, onSelect }) {
  const entries = Object.entries(diary)
    .filter(([,v]) => v.submitted || v.text || (v.photos?.length))
    .sort(([a],[b]) => b.localeCompare(a));

  if (entries.length===0) {
    return <div style={{ textAlign:"center", color:"#ccc", fontSize:14, padding:48 }}>No entries yet</div>;
  }

  return (
    <div style={{ padding:"12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, paddingBottom:80 }}>
      {entries.map(([date, entry]) => (
        <BeRealCard key={date} date={date} entry={entry} onClick={() => onSelect(date)} />
      ))}
    </div>
  );
}

function BeRealCard({ date, entry, onClick }) {
  const fmted = new Date(date+"T00:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short"});
  const photo = entry.photos?.[0];
  const grad = GRADIENTS[date.charCodeAt(8) % GRADIENTS.length];

  return (
    <div onClick={onClick} style={{ borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"3/4", cursor:"pointer", background:photo?"#111":grad, boxShadow:"0 2px 12px rgba(0,0,0,0.1)" }}>
      {photo ? (
        <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      ) : (
        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>
          {entry.mood || "📝"}
        </div>
      )}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"30px 10px 10px", background:"linear-gradient(transparent,rgba(0,0,0,0.65))" }}>
        <div style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{fmted}</div>
        {entry.mood && <div style={{ fontSize:18, lineHeight:1.2 }}>{entry.mood}</div>}
        {entry.habits?.length > 0 && (
          <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginTop:3 }}>
            {entry.habits.slice(0,2).map((h,i) => (
              <span key={i} style={{ background:"rgba(255,255,255,0.25)", color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:600 }}>{h}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiaryDetailModal({ date, diary, setDiary, onClose, onEdit }) {
  const entry = diary[date] || {};
  const fmted = new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const [lightbox, setLightbox] = useState(null);

  const del = () => {
    if (window.confirm("Delete this entry?")) {
      setDiary(d => { const n={...d}; delete n[date]; return n; });
      onClose();
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"22px 22px 0 0", width:"100%", maxHeight:"88vh", overflowY:"auto", padding:"22px 18px 48px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{fmted}</div>
            {entry.mood && <div style={{ fontSize:28, marginTop:4 }}>{entry.mood}</div>}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button onClick={() => onEdit(date)} style={{ background:"none", border:"none", cursor:"pointer", color:"#1565C0", fontSize:13 }}>Edit</button>
            <button onClick={del} style={{ background:"none", border:"none", cursor:"pointer", color:"#e53935", fontSize:13 }}>Delete</button>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#333" }}>×</button>
          </div>
        </div>

        {entry.habits?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
            {entry.habits.map((h,i) => <span key={i} style={{ background:"#000", color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:12 }}>{h}</span>)}
          </div>
        )}
        {entry.text && <p style={{ fontSize:15, lineHeight:1.7, color:"#333", marginBottom:16, whiteSpace:"pre-wrap" }}>{entry.text}</p>}
        {entry.photos?.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
            {entry.photos.map((p,i) => (
              <img key={i} src={p} alt="" onClick={e=>{e.stopPropagation();setLightbox(p);}}
                style={{ width:"100%", aspectRatio:"1", objectFit:"cover", borderRadius:10, cursor:"pointer" }} />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
          <button onClick={()=>setLightbox(null)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"#fff", fontSize:32, cursor:"pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

// ── Goals ──────────────────────────────────────────────────────────────────
function GoalsTab({ goals, setGoals }) {
  const [period, setPeriod] = useState("Month");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(GOAL_COLORS[0]);
  const [newMemo, setNewMemo] = useState("");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const filtered = period==="🏆"
    ? goals.filter(g => g.achieved)
    : goals.filter(g => g.period===period && !g.achieved);

  const addGoal = () => {
    if (!newTitle.trim()) return;
    setGoals(gs => [...gs, {id:Date.now(), title:newTitle.trim(), color:newColor, memo:newMemo, period, achieved:false}]);
    setNewTitle(""); setNewMemo(""); setShowAdd(false);
  };

  const toggle = id => setGoals(gs => gs.map(g => g.id===id ? {...g, achieved:!g.achieved} : g));
  const del = id => setGoals(gs => gs.filter(g => g.id!==id));
  const startEdit = g => { setEditId(g.id); setEditTitle(g.title); setEditMemo(g.memo||""); };
  const saveEdit = () => { setGoals(gs => gs.map(g => g.id===editId ? {...g, title:editTitle, memo:editMemo} : g)); setEditId(null); };

  return (
    <div style={{ padding:"16px 16px 80px" }}>
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["Month","Year","🏆"].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            flex:1, padding:"8px", borderRadius:20, border:"none", cursor:"pointer",
            background:period===p?"#000":"#f0f0f0",
            color:period===p?"#fff":"#666",
            fontSize:p==="🏆"?18:14, fontWeight:period===p?600:400
          }}>{p}</button>
        ))}
      </div>

      {filtered.map(g => (
        editId===g.id ? (
          <div key={g.id} style={{ marginBottom:10, padding:14, background:"#f8f8f8", borderRadius:14 }}>
            <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
              style={{ width:"100%", fontSize:14, padding:"8px 10px", border:"1px solid #e0e0e0", borderRadius:10, boxSizing:"border-box", marginBottom:8, outline:"none" }}
            />
            <textarea value={editMemo} onChange={e=>setEditMemo(e.target.value)} placeholder="Notes..."
              style={{ width:"100%", fontSize:13, padding:"8px 10px", border:"1px solid #e0e0e0", borderRadius:10, boxSizing:"border-box", resize:"none", height:60, outline:"none", fontFamily:"inherit" }}
            />
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <button onClick={() => setEditId(null)} style={{ flex:1, padding:"8px", background:"#e8e8e8", border:"none", borderRadius:10, cursor:"pointer", fontSize:13 }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, padding:"8px", background:"#000", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Save</button>
            </div>
          </div>
        ) : (
          <div key={g.id} style={{ display:"flex", gap:10, marginBottom:10, padding:"13px 14px", background:"#f8f8f8", borderRadius:14 }}>
            <button onClick={() => toggle(g.id)} style={{ width:22, height:22, borderRadius:"50%", border:`2.5px solid ${g.color}`, background:g.achieved?g.color:"transparent", cursor:"pointer", flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, textDecoration:g.achieved?"line-through":"none", color:g.achieved?"#bbb":"#111" }}>{g.title}</div>
              {g.memo && <div style={{ fontSize:13, color:"#999", marginTop:2 }}>{g.memo}</div>}
            </div>
            {!g.achieved && (
              <button onClick={() => startEdit(g)} style={{ background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:14, padding:"2px 4px" }}>✎</button>
            )}
            <button onClick={() => del(g.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ddd", fontSize:18, padding:"2px 4px" }}>×</button>
          </div>
        )
      ))}

      {filtered.length===0 && (
        <div style={{ textAlign:"center", color:"#ccc", padding:"32px 0", fontSize:14 }}>
          {period==="🏆" ? "No achievements yet 🏅" : "No goals for this period"}
        </div>
      )}

      {period!=="🏆" && (
        showAdd ? (
          <div style={{ marginTop:8, padding:14, background:"#f8f8f8", borderRadius:14 }}>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Goal title"
              style={{ width:"100%", fontSize:14, padding:"9px 11px", border:"1px solid #e0e0e0", borderRadius:10, boxSizing:"border-box", marginBottom:8, outline:"none" }}
            />
            <textarea value={newMemo} onChange={e=>setNewMemo(e.target.value)} placeholder="Notes (optional)"
              style={{ width:"100%", fontSize:13, padding:"9px 11px", border:"1px solid #e0e0e0", borderRadius:10, boxSizing:"border-box", resize:"none", height:60, marginBottom:10, outline:"none", fontFamily:"inherit" }}
            />
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {GOAL_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)} style={{ width:26, height:26, borderRadius:"50%", background:c, border:newColor===c?"3px solid #333":"2px solid transparent", cursor:"pointer" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:"10px", background:"#e8e8e8", border:"none", borderRadius:10, cursor:"pointer", fontSize:13 }}>Cancel</button>
              <button onClick={addGoal} style={{ flex:1, padding:"10px", background:"#000", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Add Goal</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{ width:"100%", padding:"13px", background:"#000", color:"#fff", border:"none", borderRadius:14, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:8 }}>+ Add Goal</button>
        )
      )}
    </div>
  );
}

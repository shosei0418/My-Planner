import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MOOD_OPTIONS = ["😄","😊","😐","😔","😤"];
const DEFAULT_HABITS = ["💪 ジム","📚 英語","⏰ 朝6時起き"];
const GOAL_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];
const EVENT_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#222"];
const GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
];
const REPEAT_OPTIONS = ["none","daily","weekly"];
const REPEAT_LABELS = { none:"None", daily:"Every day", weekly:"Every week" };

// ── Design tokens (from Figma) ─────────────────────────────────────────────
const C = {
  fg:       "#030213",
  muted:    "#ececf0",
  mutedFg:  "#717182",
  border:   "rgba(0,0,0,0.08)",
  inputBg:  "#f3f3f5",
  accent:   "#e9ebef",
};
const card = { background:"#fff", borderRadius:16, padding:16, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" };
const Check = ({ done, color }) => (
  <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${done?(color||C.fg):C.mutedFg}`, background:done?(color||C.fg):"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
    {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
  </div>
);

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
    `${year}-04-25`,nth(year,6,1,1),last(year,9,1),
  ]);
  const ny=new Date(year,0,1);
  if(ny.getDay()===0)set.add(`${year}-01-02`);
  else if(ny.getDay()===6)set.add(`${year}-01-03`);
  else set.add(`${year}-01-01`);
  const ad=new Date(year,0,26);
  if(ad.getDay()===0)set.add(`${year}-01-27`);
  else if(ad.getDay()===6)set.add(`${year}-01-28`);
  else set.add(`${year}-01-26`);
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
  const [completedTasks, setCompletedTasks] = useState(() => load("pl_completed", []));
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  useEffect(() => save("pl_events", events), [events]);
  useEffect(() => save("pl_tasks", tasks), [tasks]);
  useEffect(() => save("pl_diary", diary), [diary]);
  useEffect(() => save("pl_goals", goals), [goals]);
  useEffect(() => save("pl_habits", habits), [habits]);
  useEffect(() => save("pl_completed", completedTasks), [completedTasks]);

  useEffect(() => {
    const today = todayStr();
    const dow = new Date().getDay();
    const key = "pl_recurring_" + today;
    if (load(key, false)) return;
    setTasks(ts => {
      const recurring = ts.filter(t => t.repeat === "daily" || (t.repeat === "weekly" && t.repeatDay === dow));
      if (recurring.length === 0) return ts;
      save(key, true);
      const newOnes = recurring.map(t => ({
        id: Date.now() + Math.random(),
        title: t.title, memo: t.memo || "",
        deadline: today, repeat: "none", addedDate: today, fromRecurring: true
      }));
      return [...ts, ...newOnes];
    });
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", display:"flex", flexDirection:"column", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", overflow:"hidden" }}>
      <div style={{ flexShrink:0, position:"sticky", top:0, zIndex:50, background:"#fff" }}>
        <TopNav tab={tab} setTab={setTab} />
      </div>
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch", background:"#fff" }}>
        {tab==="Home" && (
          <HomeTab
            events={events} setEvents={setEvents}
            tasks={tasks} setTasks={setTasks}
            diary={diary} habits={habits}
            completedTasks={completedTasks} setCompletedTasks={setCompletedTasks}
            onWeeklyReview={() => setShowWeeklyReview(true)}
          />
        )}
        {tab==="Diary" && <DiaryTab diary={diary} setDiary={setDiary} habits={habits} setHabits={setHabits} />}
        {tab==="Goals" && <GoalsTab goals={goals} setGoals={setGoals} />}
        <div style={{height:32}} />
      </div>
      {showWeeklyReview && (
        <WeeklyReviewModal diary={diary} habits={habits} completedTasks={completedTasks} onClose={() => setShowWeeklyReview(false)} />
      )}
    </div>
  );
}

// ── Top Nav ────────────────────────────────────────────────────────────────
function TopNav({ tab, setTab }) {
  return (
    <div style={{ padding:"14px 20px 10px", background:"#fff", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", gap:4, background:C.muted, borderRadius:14, padding:4 }}>
        {["Home","Diary","Goals"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:"8px 0", borderRadius:10, border:"none", cursor:"pointer",
            background: tab===t ? "#fff" : "transparent",
            color: tab===t ? C.fg : C.mutedFg,
            fontSize:14, fontWeight: tab===t ? 600 : 400,
            boxShadow: tab===t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition:"all 0.2s"
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────
function HomeTab({ events, setEvents, tasks, setTasks, diary, habits, completedTasks, setCompletedTasks, onWeeklyReview }) {
  return (
    <div>
      <ScoreDashboard diary={diary} habits={habits} tasks={tasks} completedTasks={completedTasks} onWeeklyReview={onWeeklyReview} />
      <div style={{ height:1, background:"#f0f0f0" }} />
      <CalendarSection events={events} setEvents={setEvents} />
      <div style={{ height:1, background:"#f0f0f0", margin:"16px 0" }} />
      <TaskSection tasks={tasks} setTasks={setTasks} completedTasks={completedTasks} setCompletedTasks={setCompletedTasks} />
    </div>
  );
}

// ── Score Dashboard ────────────────────────────────────────────────────────
function ScoreDashboard({ diary, habits, completedTasks, onWeeklyReview }) {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const dateLabel = `${now.getDate()} ${MONTHS_SHORT[now.getMonth()]}`;
  return (
    <div style={{ padding:"16px 20px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:C.fg }}>{dayName}, {dateLabel}</div>
      <button onClick={onWeeklyReview} style={{ background:C.muted, border:"none", borderRadius:20, padding:"7px 16px", fontSize:13, fontWeight:500, cursor:"pointer", color:C.fg }}>
        Weekly Review
      </button>
    </div>
  );
}

// ── Weekly Review Modal ────────────────────────────────────────────────────
function WeeklyReviewModal({ diary, habits, completedTasks, onClose }) {
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const habitRate = days.map(date => {
    const entry = diary[date] || {};
    if (habits.length === 0) return 0;
    return Math.round(((entry.habits||[]).length / habits.length) * 100);
  });
  const moods = days.map(date => diary[date]?.mood || null);
  const submitted = days.map(date => !!diary[date]?.submitted);
  const tasksDone = days.map(date => completedTasks.filter(t => t.completedDate === date).length);
  const avgHabit = Math.round(habitRate.reduce((a,b)=>a+b,0)/7);
  const diaryStreak = submitted.filter(Boolean).length;
  const totalTasks = tasksDone.reduce((a,b)=>a+b,0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"85vh", overflowY:"auto", padding:"22px 18px 48px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:18 }}>Weekly Review</div>
            <div style={{ fontSize:13, color:"#aaa" }}>Past 7 days</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:26, cursor:"pointer", color:"#333" }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          <SummaryCard emoji="💪" label="Habit avg" value={`${avgHabit}%`} />
          <SummaryCard emoji="📓" label="Diary days" value={`${diaryStreak}/7`} />
          <SummaryCard emoji="✅" label="Tasks done" value={totalTasks} />
        </div>
        <div style={{ fontSize:12, fontWeight:600, color:"#aaa", letterSpacing:1, marginBottom:10 }}>DAILY BREAKDOWN</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
          {days.map((date, i) => {
            const d = new Date(date+"T00:00:00");
            return (
              <div key={date} style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#aaa", marginBottom:4 }}>{DAYS[d.getDay()].slice(0,1)}</div>
                <div style={{ fontSize:11, fontWeight:600, marginBottom:6 }}>{d.getDate()}</div>
                <div style={{ fontSize:16, marginBottom:4, minHeight:22 }}>{moods[i] || "—"}</div>
                <div style={{ height:3, background:"#f0f0f0", borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                  <div style={{ width:`${habitRate[i]}%`, height:"100%", background:"#000", borderRadius:2 }} />
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:submitted[i]?"#000":"#f0f0f0", margin:"0 auto", marginBottom:3 }} />
                <div style={{ fontSize:9, color:"#aaa" }}>{tasksDone[i]>0?`${tasksDone[i]}✓`:""}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, fontSize:11, color:"#aaa" }}>
          <span>— Mood</span><span>▬ Habits</span><span>● Diary</span><span>✓ Tasks</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ emoji, label, value }) {
  return (
    <div style={{ background:"#f8f8f8", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
      <div style={{ fontSize:20, marginBottom:4 }}>{emoji}</div>
      <div style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:11, color:"#aaa" }}>{label}</div>
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
  const handleCellClick = c => { const ds=getDateStr(c); if(!c.current){setYear(c.year);setMonth(c.month);} setSelectedDate(ds); };
  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  return (
    <div style={{ padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:12 }}>
        <button onClick={prevMonth} style={{ background:C.muted, border:"none", fontSize:16, cursor:"pointer", padding:"6px 10px", color:C.fg, borderRadius:10 }}>‹</button>
        <span style={{ fontWeight:600, fontSize:15, color:C.fg }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background:C.muted, border:"none", fontSize:16, cursor:"pointer", padding:"6px 10px", color:C.fg, borderRadius:10 }}>›</button>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}` }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ padding:"6px 0", textAlign:"center", fontSize:10, fontWeight:600, color:i===0?"#e53935":i===6?"#1565C0":C.mutedFg }}>{d}</div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((c, i) => {
            const ds = getDateStr(c);
            const dow = new Date(ds+"T00:00:00").getDay();
            const isRed = dow===0||holidays.has(ds); const isBlue = dow===6;
            const isToday = ds===tod; const isSel = ds===selectedDate;
            const dayEvents = getEvents(ds);
            const numColor = isRed?"#e53935":isBlue?"#1565C0":C.fg;
            return (
              <div key={i} onClick={() => handleCellClick(c)} style={{ background:isSel?C.muted:"#fff", height:62, overflow:"hidden", cursor:"pointer", position:"relative", opacity:c.current?1:0.3, borderBottom:`0.5px solid ${C.border}`, borderRight:`0.5px solid ${C.border}` }}>
                <span style={{ position:"absolute", top:4, right:4, fontSize:11, fontWeight:isToday?700:400, color:isToday?"#fff":numColor, background:isToday?C.fg:"transparent", borderRadius:"50%", width:isToday?19:undefined, height:isToday?19:undefined, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>{c.day}</span>
                <div style={{ position:"absolute", top:22, left:2, right:2, display:"flex", flexDirection:"column", gap:1 }}>
                  {dayEvents.slice(0,3).map(e => (
                    <div key={e.id} style={{ background:e.color||C.fg, color:"#fff", fontSize:7, fontWeight:600, borderRadius:2, padding:"0px 3px", lineHeight:"13px", overflow:"hidden", whiteSpace:"nowrap" }}>{e.title}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDate && <EventModal date={selectedDate} events={events} setEvents={setEvents} onClose={() => setSelectedDate(null)} />}
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
    if (editId) { setEvents(evs => evs.map(e => e.id===editId?{...e,title:title.trim(),time,color}:e)); }
    else { setEvents(evs => [...evs,{id:Date.now(),date,title:title.trim(),time,color}]); }
    setTitle(""); setTime(""); setColor("#222"); setAdding(false); setEditId(null);
  };
  const startEdit = e => { setEditId(e.id);setTitle(e.title);setTime(e.time||"");setColor(e.color||"#222");setAdding(true); };
  const del = id => setEvents(evs => evs.filter(e => e.id!==id));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"flex-end", zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"22px 22px 0 0", width:"100%", padding:"22px 20px 44px", maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontWeight:600, fontSize:17, color:C.fg }}>{fmted}</span>
          <button onClick={onClose} style={{ background:C.muted, border:"none", fontSize:16, cursor:"pointer", color:C.fg, width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        {dayEvents.map(e => (
          <div key={e.id} style={{ ...card, display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:e.color||C.fg, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.fg }}>{e.title}</div>
              {e.time && <div style={{ fontSize:12, color:C.mutedFg }}>{e.time}</div>}
            </div>
            <button onClick={() => startEdit(e)} style={{ background:"none", border:"none", fontSize:15, cursor:"pointer", color:C.mutedFg }}>✎</button>
            <button onClick={() => del(e.id)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:C.mutedFg }}>×</button>
          </div>
        ))}
        {adding ? (
          <div style={{ marginTop:8 }}>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Event title"
              style={{ width:"100%", fontSize:16, padding:"12px 14px", border:"none", borderRadius:12, marginBottom:8, boxSizing:"border-box", outline:"none", background:C.inputBg }}
            />
            <input value={time} onChange={e=>setTime(e.target.value)} type="time"
              style={{ width:"100%", fontSize:16, padding:"12px 14px", border:"none", borderRadius:12, marginBottom:10, boxSizing:"border-box", outline:"none", background:C.inputBg }}
            />
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, border:color===c?"3px solid #333":"2px solid transparent", cursor:"pointer" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => {setAdding(false);setEditId(null);setTitle("");setTime("");}} style={{ flex:1, padding:"12px", background:C.muted, border:"none", borderRadius:12, fontSize:14, cursor:"pointer", color:C.fg }}>Cancel</button>
              <button onClick={saveEvent} style={{ flex:1, padding:"12px", background:C.fg, color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ width:"100%", padding:"13px", background:C.fg, color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:8 }}>+ Add Event</button>
        )}
      </div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function TaskSection({ tasks, setTasks, completedTasks, setCompletedTasks }) {
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const dragIdx = useRef(null);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(ts => [...ts, {id:Date.now(), title:newTask.trim(), memo:newMemo.trim(), deadline:newDeadline}]);
    setNewTask(""); setNewMemo(""); setNewDeadline(""); setAdding(false);
  };

  const check = (t) => {
    setCompletedTasks(cs => [...cs, { id:t.id, title:t.title, completedDate:todayStr() }]);
    setTasks(ts => ts.filter(x => x.id!==t.id));
  };

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
    <div style={{ padding:"0 20px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontWeight:600, fontSize:17, color:C.fg }}>Tasks</span>
        <button onClick={() => setAdding(a=>!a)} style={{ width:32, height:32, borderRadius:"50%", background:C.fg, color:"#fff", border:"none", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>+</button>
      </div>
      {adding && (
        <div style={{ ...card, marginBottom:12 }}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add new task..." style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"none", borderRadius:10, boxSizing:"border-box", marginBottom:8, outline:"none", fontFamily:"inherit", background:C.inputBg }} onKeyDown={e=>e.key==="Enter"&&addTask()} autoFocus />
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, background:C.inputBg, borderRadius:10, padding:"8px 12px" }}>
            <span style={{ fontSize:13, color:C.mutedFg, whiteSpace:"nowrap" }}>📅 Due</span>
            <input value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} type="date" style={{ flex:1, fontSize:14, border:"none", outline:"none", background:"transparent" }} />
          </div>
          <input value={newMemo} onChange={e=>setNewMemo(e.target.value)} placeholder="Memo (optional)" style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"none", borderRadius:10, boxSizing:"border-box", marginBottom:10, outline:"none", fontFamily:"inherit", background:C.inputBg }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ flex:1, padding:"10px", background:C.muted, border:"none", borderRadius:10, cursor:"pointer", fontSize:14, color:C.fg, fontWeight:500 }}>Cancel</button>
            <button onClick={addTask} style={{ flex:1, padding:"10px", background:C.fg, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:600 }}>Add</button>
          </div>
        </div>
      )}
      {tasks.map((t, i) => (
        editId===t.id ? (
          <div key={t.id} style={{ ...card, marginBottom:8 }}>
            <input value={editText} onChange={e=>setEditText(e.target.value)} style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"none", borderRadius:10, boxSizing:"border-box", marginBottom:8, outline:"none", fontFamily:"inherit", background:C.inputBg }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, background:C.inputBg, borderRadius:10, padding:"8px 12px" }}>
              <span style={{ fontSize:13, color:C.mutedFg, whiteSpace:"nowrap" }}>📅 Due</span>
              <input value={editDeadline} onChange={e=>setEditDeadline(e.target.value)} type="date" style={{ flex:1, fontSize:14, border:"none", outline:"none", background:"transparent" }} />
            </div>
            <input value={editMemo} onChange={e=>setEditMemo(e.target.value)} placeholder="Memo..." style={{ width:"100%", fontSize:16, padding:"10px 12px", border:"none", borderRadius:10, boxSizing:"border-box", marginBottom:10, outline:"none", fontFamily:"inherit", background:C.inputBg }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditId(null)} style={{ flex:1, padding:"9px", background:C.muted, border:"none", borderRadius:10, cursor:"pointer", fontSize:13, color:C.fg }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, padding:"9px", background:C.fg, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Save</button>
            </div>
          </div>
        ) : (
          <div key={t.id} data-taskidx={i} onTouchStart={e=>handleTouchStart(e,i)} onTouchEnd={handleTouchEnd}
            style={{ ...card, display:"flex", alignItems:"flex-start", gap:12, marginBottom:8, userSelect:"none" }}>
            <button onClick={() => check(t)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", marginTop:1, flexShrink:0 }}>
              <Check done={false} />
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:500, color:C.fg }}>{t.title}</div>
              {t.deadline && <div style={{ fontSize:12, color:C.mutedFg, marginTop:3 }}>📅 {t.deadline}</div>}
              {t.memo && <div style={{ fontSize:13, color:C.mutedFg, marginTop:2 }}>{t.memo}</div>}
            </div>
            <button onClick={() => startEdit(t)} style={{ background:"none", border:"none", cursor:"pointer", color:C.mutedFg, fontSize:15, padding:4 }}>✎</button>
          </div>
        )
      ))}
      {tasks.length===0 && !adding && (
        <div style={{ textAlign:"center", color:C.mutedFg, fontSize:14, padding:"28px 0" }}>No tasks yet</div>
      )}
    </div>
  );
}

// ── Diary ──────────────────────────────────────────────────────────────────
function DiaryTab({ diary, setDiary, habits, setHabits }) {
  const [view, setView] = useState("Write");
  const [editDate, setEditDate] = useState(null);
  const [detailDate, setDetailDate] = useState(null);
  const handleSelectHistory = (date) => { setDetailDate(date); };
  const handleEditFromDetail = (date) => { setDetailDate(null); setEditDate(date); setView("Write"); };
  const handleTabChange = (v) => { setView(v); if (v === "Write") setEditDate(null); };
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", borderBottom:"1px solid #f0f0f0", padding:"0 16px", background:"#fff" }}>
        {["Write","History"].map(v => (
          <button key={v} onClick={() => handleTabChange(v)} style={{
            padding:"10px 20px", background:"none", border:"none", cursor:"pointer",
            fontSize:14, fontWeight:view===v?700:400, color:view===v?"#000":"#aaa",
            borderBottom:view===v?"2px solid #000":"2px solid transparent"
          }}>{v}</button>
        ))}
      </div>
      {view==="Write" && <DiaryWrite diary={diary} setDiary={setDiary} habits={habits} setHabits={setHabits} date={editDate} onBackToToday={() => setEditDate(null)} />}
      {view==="History" && <DiaryHistory diary={diary} setDiary={setDiary} onSelect={handleSelectHistory} />}
      {detailDate && <DiaryDetailModal date={detailDate} diary={diary} setDiary={setDiary} onClose={() => setDetailDate(null)} onEdit={handleEditFromDetail} />}
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
    setHabits(hs => [...hs, newHabit.trim()]); setNewHabit(""); setAddingHabit(false);
  };
  const addPhoto = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => update({ photos:[...photos, ev.target.result] });
    reader.readAsDataURL(file);
  };
  const removePhoto = (i) => update({ photos: photos.filter((_,j)=>j!==i) });
  const getPhotoSrc = p => typeof p === "string" ? p : p.src;

  const calcStreak = () => {
    let streak=0; const d=new Date();
    while (true) { const k=d.toISOString().slice(0,10); if(!diary[k]?.submitted) break; streak++; d.setDate(d.getDate()-1); }
    return streak;
  };
  const submit = () => { update({ submitted:true, submittedAt:new Date().toISOString() }); if (isToday) setShowDone(true); };

  if (isToday && (showDone || entry.submitted)) {
    const streak = calcStreak();
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🌙</div>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>今日もお疲れ様</div>
        <div style={{ fontSize:14, color:"#888", lineHeight:1.6, marginBottom:20 }}>一日一日の積み重ねが大きな変化を生む。<br/>明日も全力で。</div>
        {streak > 0 && <div style={{ background:"#FFF3E0", borderRadius:20, padding:"6px 18px", fontSize:14, fontWeight:700, color:"#E65100", marginBottom:20 }}>🔥 {streak} day{streak>1?"s":""} in a row</div>}
        {checkedHabits.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
            {checkedHabits.map((h,i) => <span key={i} style={{ background:"#000", color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:12 }}>{h}</span>)}
          </div>
        )}
        <button onClick={() => { setShowDone(false); update({submitted:false}); }} style={{ padding:"11px 24px", background:"none", border:"1.5px solid #e0e0e0", borderRadius:20, fontSize:14, cursor:"pointer" }}>✎ Edit today's entry</button>
      </div>
    );
  }

  const fmtedDate = !isToday ? new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"}) : null;

  return (
    <div style={{ padding:"16px 16px 80px" }}>
      {!isToday && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={onBackToToday} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#888" }}>‹</button>
          <span style={{ fontSize:13, fontWeight:600, color:"#888" }}>{fmtedDate}</span>
        </div>
      )}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.mutedFg, letterSpacing:0.5, marginBottom:8 }}>MOOD</div>
        <div style={{ display:"flex", gap:6 }}>
          {MOOD_OPTIONS.map(m => (
            <button key={m} onClick={() => update({mood:m})} style={{
              width:42, height:42, borderRadius:"50%", border:"none", cursor:"pointer",
              background: mood===m ? C.fg : C.muted,
              fontSize:20, transition:"all 0.15s", transform: mood===m ? "scale(0.92)" : "scale(1)"
            }}>{m}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.mutedFg, letterSpacing:0.5, marginBottom:8 }}>HABITS</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {habits.map(h => {
            const on = checkedHabits.includes(h);
            return (
              <button key={h} onClick={() => toggleHabit(h)} style={{
                padding:"5px 12px", borderRadius:20, border:"1.5px solid",
                borderColor: on ? C.fg : C.border,
                background: on ? C.fg : "transparent",
                color: on ? "#fff" : C.mutedFg,
                fontSize:13, cursor:"pointer", transition:"all 0.15s",
                textDecoration: on ? "line-through" : "none"
              }}>{h}</button>
            );
          })}
          {addingHabit ? (
            <div style={{ display:"flex", gap:6 }}>
              <input value={newHabit} onChange={e=>setNewHabit(e.target.value)} placeholder="Habit name"
                style={{ fontSize:16, padding:"5px 10px", border:`1px solid ${C.border}`, borderRadius:20, outline:"none", background:C.inputBg, width:110, fontFamily:"inherit" }}
                onKeyDown={e=>e.key==="Enter"&&addHabit()} autoFocus />
              <button onClick={addHabit} style={{ background:C.fg, color:"#fff", border:"none", borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:13 }}>+</button>
            </div>
          ) : (
            <button onClick={() => setAddingHabit(true)} style={{ padding:"5px 12px", borderRadius:20, border:`1.5px dashed ${C.border}`, background:"transparent", color:C.mutedFg, fontSize:13, cursor:"pointer" }}>+ Add</button>
          )}
        </div>
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.mutedFg, letterSpacing:0.5, marginBottom:10 }}>TODAY</div>
        <textarea value={text} onChange={e=>update({text:e.target.value})} placeholder="What's on your mind today?"
          style={{ width:"100%", minHeight:130, fontSize:16, padding:"14px", border:"none", borderRadius:14, resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.6, fontFamily:"inherit", background:C.inputBg, color:C.fg }} />
      </div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.mutedFg, letterSpacing:0.5, marginBottom:10 }}>PHOTOS</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position:"relative" }}>
              <img src={getPhotoSrc(p)} alt="" style={{ width:"100%", maxHeight:220, objectFit:"cover", borderRadius:14 }} />
              <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>
          ))}
          <label style={{ width:80, height:80, border:`1.5px dashed ${C.border}`, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.mutedFg, fontSize:26, background:C.muted }}>
            +<input type="file" accept="image/*" onChange={addPhoto} style={{ display:"none" }} />
          </label>
        </div>
      </div>
      {isToday
        ? <button onClick={submit} style={{ width:"100%", padding:"15px", background:C.fg, color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer" }}>Save Entry</button>
        : <button onClick={onBackToToday} style={{ width:"100%", padding:"15px", background:C.muted, color:C.fg, border:"none", borderRadius:14, fontSize:15, fontWeight:500, cursor:"pointer" }}>← Back</button>
      }
    </div>
  );
}

function DiaryHistory({ diary, setDiary, onSelect }) {
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "photos"
  const entries = Object.entries(diary).filter(([,v]) => v.submitted || v.text || (v.photos?.length)).sort(([a],[b]) => b.localeCompare(a));

  // Collect all photos grouped by month
  const allPhotos = [];
  entries.forEach(([date, entry]) => {
    (entry.photos || []).forEach(p => {
      const src = typeof p === "string" ? p : p.src;
      allPhotos.push({ src, date });
    });
  });
  const byMonth = {};
  allPhotos.forEach(p => { const m = p.date.slice(0,7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(p); });
  const months = Object.keys(byMonth).sort((a,b) => b.localeCompare(a));

  const [lightbox, setLightbox] = useState(null);

  return (
    <div>
      {/* Toggle */}
      <div style={{ display:"flex", gap:6, padding:"10px 12px 4px", justifyContent:"flex-end" }}>
        <button onClick={() => setViewMode("cards")} style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, background:viewMode==="cards"?"#000":"#f0f0f0", color:viewMode==="cards"?"#fff":"#666" }}>Cards</button>
        <button onClick={() => setViewMode("photos")} style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, background:viewMode==="photos"?"#000":"#f0f0f0", color:viewMode==="photos"?"#fff":"#666" }}>Photos</button>
      </div>

      {viewMode==="cards" && (
        entries.length===0
          ? <div style={{ textAlign:"center", color:"#ccc", fontSize:14, padding:48 }}>No entries yet</div>
          : <div style={{ padding:"8px 12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, paddingBottom:80 }}>
              {entries.map(([date, entry]) => <BeRealCard key={date} date={date} entry={entry} onClick={() => onSelect(date)} />)}
            </div>
      )}

      {viewMode==="photos" && (
        allPhotos.length===0
          ? <div style={{ textAlign:"center", color:"#ccc", fontSize:14, padding:48 }}>No photos yet</div>
          : <div style={{ paddingBottom:80 }}>
              {months.map(m => {
                const [y, mo] = m.split("-");
                return (
                  <div key={m}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#aaa", padding:"14px 14px 8px", letterSpacing:0.5 }}>{MONTHS[parseInt(mo)-1]} {y}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
                      {byMonth[m].map((p, i) => (
                        <img key={i} src={p.src} alt="" onClick={() => setLightbox(p.src)}
                          style={{ width:"100%", aspectRatio:"1", objectFit:"cover", cursor:"pointer" }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth:"100%", maxHeight:"90vh", objectFit:"contain" }} />
          <button onClick={() => setLightbox(null)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"#fff", fontSize:32, cursor:"pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

function BeRealCard({ date, entry, onClick }) {
  const fmted = new Date(date+"T00:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short"});
  const photoItem = entry.photos?.[0];
  const photo = photoItem ? (typeof photoItem === "string" ? photoItem : photoItem.src) : null;
  const grad = GRADIENTS[date.charCodeAt(8) % GRADIENTS.length];
  return (
    <div onClick={onClick} style={{ borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"3/4", cursor:"pointer", background:photo?"#111":grad, boxShadow:"0 2px 12px rgba(0,0,0,0.1)" }}>
      {photo ? <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>{entry.mood || "📝"}</div>}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"30px 10px 10px", background:"linear-gradient(transparent,rgba(0,0,0,0.65))" }}>
        <div style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{fmted}</div>
        {entry.mood && <div style={{ fontSize:18, lineHeight:1.2 }}>{entry.mood}</div>}
        {entry.habits?.length > 0 && (
          <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginTop:3 }}>
            {entry.habits.slice(0,2).map((h,i) => <span key={i} style={{ background:"rgba(255,255,255,0.25)", color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:600 }}>{h}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function DiaryPhotos({ diary }) {
  const [lightbox, setLightbox] = useState(null);
  const allPhotos = [];
  Object.entries(diary).sort(([a],[b]) => b.localeCompare(a)).forEach(([date, entry]) => {
    (entry.photos || []).forEach(p => {
      const src = typeof p === "string" ? p : p.src;
      const caption = typeof p === "string" ? "" : (p.caption || "");
      allPhotos.push({ src, caption, date });
    });
  });
  const byMonth = {};
  allPhotos.forEach(p => { const m = p.date.slice(0,7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(p); });
  const months = Object.keys(byMonth).sort((a,b) => b.localeCompare(a));
  if (allPhotos.length === 0) return <div style={{ textAlign:"center", color:"#ccc", fontSize:14, padding:48 }}>No photos yet</div>;
  return (
    <div style={{ paddingBottom:80 }}>
      {months.map(m => {
        const [y, mo] = m.split("-");
        return (
          <div key={m} style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#aaa", padding:"14px 14px 8px", letterSpacing:0.5 }}>{MONTHS[parseInt(mo)-1]} {y}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
              {byMonth[m].map((p, i) => (
                <div key={i} onClick={() => setLightbox(p)} style={{ position:"relative", cursor:"pointer" }}>
                  <img src={p.src} alt="" style={{ width:"100%", aspectRatio:"1", objectFit:"cover" }} />
                  {p.caption && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.55)", color:"#fff", fontSize:9, padding:"3px 5px", lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{p.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt="" style={{ maxWidth:"100%", maxHeight:"80vh", objectFit:"contain" }} />
          {lightbox.caption && <div style={{ color:"#fff", fontSize:13, marginTop:12, textAlign:"center", padding:"0 20px" }}>{lightbox.caption}</div>}
          <button onClick={() => setLightbox(null)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"#fff", fontSize:32, cursor:"pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

function DiaryDetailModal({ date, diary, setDiary, onClose, onEdit }) {
  const entry = diary[date] || {};
  const fmted = new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const [lightbox, setLightbox] = useState(null);
  const del = () => { if (window.confirm("Delete this entry?")) { setDiary(d => { const n={...d}; delete n[date]; return n; }); onClose(); } };
  const getPhotoSrc = p => typeof p === "string" ? p : p.src;
  const getPhotoCaption = p => typeof p === "string" ? "" : (p.caption || "");
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
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {entry.photos.map((p,i) => (
              <div key={i}>
                <img src={getPhotoSrc(p)} alt="" onClick={e=>{e.stopPropagation();setLightbox(p);}} style={{ width:"100%", borderRadius:10, cursor:"pointer", maxHeight:220, objectFit:"cover" }} />
                {getPhotoCaption(p) && <div style={{ fontSize:12, color:"#888", marginTop:4, paddingLeft:2 }}>{getPhotoCaption(p)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }} onClick={()=>setLightbox(null)}>
          <img src={getPhotoSrc(lightbox)} alt="" style={{ maxWidth:"100%", maxHeight:"80vh", objectFit:"contain" }} />
          {getPhotoCaption(lightbox) && <div style={{ color:"#fff", fontSize:13, marginTop:12, textAlign:"center", padding:"0 20px" }}>{getPhotoCaption(lightbox)}</div>}
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
  const [newTarget, setNewTarget] = useState("");
  const [newCurrent, setNewCurrent] = useState("0");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editTarget, setEditTarget] = useState("");

  const [showAchieved, setShowAchieved] = useState(false);

  const filtered = showAchieved
    ? goals.filter(g => g.achieved)
    : goals.filter(g => g.period===period && !g.achieved);

  const avgProgress = (!showAchieved && filtered.length > 0)
    ? Math.round(filtered.reduce((sum, g) => {
        const p = g.target > 0 ? Math.min(100, Math.round((g.current||0)/g.target*100)) : (g.achieved?100:0);
        return sum + p;
      }, 0) / filtered.length)
    : 0;
  const completedCount = (!showAchieved && filtered.length > 0) ? filtered.filter(g => g.achieved || (g.target > 0 && (g.current||0) >= g.target)).length : 0;

  const addGoal = () => {
    if (!newTitle.trim()) return;
    setGoals(gs => [...gs, {
      id:Date.now(), title:newTitle.trim(), color:newColor,
      memo:newMemo, period, achieved:false,
      target: parseFloat(newTarget)||0, current: parseFloat(newCurrent)||0
    }]);
    setNewTitle(""); setNewMemo(""); setNewTarget(""); setNewCurrent("0"); setShowAdd(false);
  };

  const toggle = id => setGoals(gs => gs.map(g => g.id===id ? {...g, achieved:!g.achieved} : g));
  const del = id => setGoals(gs => gs.filter(g => g.id!==id));
  const startEdit = g => { setEditId(g.id); setEditTitle(g.title); setEditMemo(g.memo||""); setEditCurrent(String(g.current||0)); setEditTarget(String(g.target||"")); };
  const saveEdit = () => {
    setGoals(gs => gs.map(g => g.id===editId ? {...g, title:editTitle, memo:editMemo, current:parseFloat(editCurrent)||0, target:parseFloat(editTarget)||0} : g));
    setEditId(null);
  };

  const getProgress = g => g.target > 0 ? Math.min(100, Math.round(((g.current||0)/g.target)*100)) : (g.achieved?100:0);
  const inNum = { fontSize:16, padding:"9px 12px", border:"none", borderRadius:10, outline:"none", background:C.inputBg, width:"100%", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ padding:"20px 20px 80px" }}>
      {/* Period Toggle + Trophy button */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <div style={{ flex:1, display:"flex", gap:4, background:C.muted, borderRadius:14, padding:4 }}>
          {["Month","Year"].map(p => (
            <button key={p} onClick={() => { setPeriod(p); setShowAchieved(false); }} style={{ flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer", background:(!showAchieved&&period===p)?"#fff":"transparent", color:(!showAchieved&&period===p)?C.fg:C.mutedFg, fontSize:14, fontWeight:(!showAchieved&&period===p)?600:400, boxShadow:(!showAchieved&&period===p)?"0 1px 3px rgba(0,0,0,0.1)":"none", transition:"all 0.2s" }}>{p}</button>
          ))}
        </div>
        <button onClick={() => setShowAchieved(a=>!a)} style={{ width:38, height:38, borderRadius:"50%", border:"none", cursor:"pointer", background:showAchieved?C.fg:C.muted, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>🏆</button>
      </div>

      {/* Stats Overview Card */}
      {!showAchieved && filtered.length > 0 && (
        <div style={{ ...card, display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ textAlign:"center", flex:1 }}>
            <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Total</div>
            <div style={{ fontSize:24, fontWeight:600, color:C.fg }}>{filtered.length}</div>
          </div>
          <div style={{ width:1, background:C.border }} />
          <div style={{ textAlign:"center", flex:1 }}>
            <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Avg Progress</div>
            <div style={{ fontSize:24, fontWeight:600, color:C.fg }}>{avgProgress}%</div>
          </div>
          <div style={{ width:1, background:C.border }} />
          <div style={{ textAlign:"center", flex:1 }}>
            <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Done</div>
            <div style={{ fontSize:24, fontWeight:600, color:C.fg }}>{completedCount}</div>
          </div>
        </div>
      )}

      {/* Goal Cards */}
      {filtered.map(g => {
        const pct = getProgress(g);
        return editId===g.id ? (
          <div key={g.id} style={{ ...card, marginBottom:12 }}>
            <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Goal title"
              style={{ ...inNum, marginBottom:8 }} />
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Current</div>
                <input value={editCurrent} onChange={e=>setEditCurrent(e.target.value)} type="number" style={inNum} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Target</div>
                <input value={editTarget} onChange={e=>setEditTarget(e.target.value)} type="number" style={inNum} />
              </div>
            </div>
            <textarea value={editMemo} onChange={e=>setEditMemo(e.target.value)} placeholder="Notes..."
              style={{ width:"100%", fontSize:14, padding:"9px 12px", border:"none", borderRadius:10, boxSizing:"border-box", resize:"none", height:56, outline:"none", fontFamily:"inherit", background:C.inputBg, marginBottom:10 }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditId(null)} style={{ flex:1, padding:"10px", background:C.muted, border:"none", borderRadius:10, cursor:"pointer", fontSize:13, color:C.fg }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex:1, padding:"10px", background:C.fg, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Save</button>
            </div>
          </div>
        ) : (
          <div key={g.id} style={{ ...card, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:g.achieved?C.mutedFg:C.fg, textDecoration:g.achieved?"line-through":"none", marginBottom:2 }}>{g.title}</div>
                {g.memo && <div style={{ fontSize:13, color:C.mutedFg }}>{g.memo}</div>}
              </div>
              {g.target > 0 && (
                <div style={{ fontSize:13, color:C.mutedFg, marginLeft:12, flexShrink:0 }}>{g.current||0}/{g.target}</div>
              )}
            </div>

            {/* Progress Bar */}
            {g.target > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ height:6, background:C.muted, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:g.color||C.fg, borderRadius:3, transition:"width 0.4s" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ fontSize:12, color:C.mutedFg }}>{pct}% complete</span>
                  <button onClick={() => startEdit(g)} style={{ fontSize:12, color:C.fg, background:"none", border:"none", cursor:"pointer", fontWeight:500 }}>Update →</button>
                </div>
              </div>
            )}

            {g.target === 0 || !g.target ? (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <button onClick={() => toggle(g.id)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  <Check done={g.achieved} color={g.color} />
                  <span style={{ fontSize:13, color:C.mutedFg }}>{g.achieved ? "Completed" : "Mark done"}</span>
                </button>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => startEdit(g)} style={{ background:"none", border:"none", cursor:"pointer", color:C.mutedFg, fontSize:14 }}>✎</button>
                  <button onClick={() => del(g.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.mutedFg, fontSize:16 }}>×</button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                <button onClick={() => toggle(g.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  <Check done={g.achieved} color={g.color} />
                </button>
                <button onClick={() => del(g.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.mutedFg, fontSize:16 }}>×</button>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length===0 && (
        <div style={{ textAlign:"center", color:C.mutedFg, padding:"40px 0", fontSize:14 }}>
          {showAchieved ? "No achievements yet 🏅" : "No goals yet"}
        </div>
      )}

      {!showAchieved && (
        showAdd ? (
          <div style={{ ...card, marginTop:8 }}>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Goal title"
              style={{ ...inNum, marginBottom:8 }} />
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Current</div>
                <input value={newCurrent} onChange={e=>setNewCurrent(e.target.value)} type="number" style={inNum} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.mutedFg, marginBottom:4 }}>Target (optional)</div>
                <input value={newTarget} onChange={e=>setNewTarget(e.target.value)} type="number" placeholder="—" style={inNum} />
              </div>
            </div>
            <textarea value={newMemo} onChange={e=>setNewMemo(e.target.value)} placeholder="Notes (optional)"
              style={{ width:"100%", fontSize:14, padding:"9px 12px", border:"none", borderRadius:10, boxSizing:"border-box", resize:"none", height:56, marginBottom:12, outline:"none", fontFamily:"inherit", background:C.inputBg }} />
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {GOAL_COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width:26, height:26, borderRadius:"50%", background:c, border:newColor===c?"3px solid #333":"2px solid transparent", cursor:"pointer" }} />)}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:"11px", background:C.muted, border:"none", borderRadius:10, cursor:"pointer", fontSize:14, color:C.fg }}>Cancel</button>
              <button onClick={addGoal} style={{ flex:1, padding:"11px", background:C.fg, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:600 }}>Add Goal</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{ width:"100%", padding:"14px", background:C.fg, color:"#fff", border:"none", borderRadius:14, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:8 }}>+ Add Goal</button>
        )
      )}
    </div>
  );
}

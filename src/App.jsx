import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_S = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const EVENT_COLORS = ["#5B6EF5","#FF6B6B","#51C87A","#F5A623","#9B59B6","#1ABC9C","#E67E22"];
const TASK_CATS = [
  { id:"work",     label:"Work",     color:"#5B6EF5", bg:"#F0F1FF" },
  { id:"personal", label:"Personal", color:"#51C87A", bg:"#F0FFF5" },
  { id:"health",   label:"Health",   color:"#FF6B6B", bg:"#FFF0F0" },
  { id:"study",    label:"Study",    color:"#F5A623", bg:"#FFF8EE" },
  { id:"other",    label:"Other",    color:"#888",    bg:"#F5F5F5" },
];
const CAT_MAP = Object.fromEntries(TASK_CATS.map(c=>[c.id,c]));
const GOAL_PERIODS = ["week","month","year"];
const MOODS = [{e:"😄",l:"Great"},{e:"🙂",l:"Good"},{e:"😐",l:"OK"},{e:"😔",l:"Low"},{e:"😤",l:"Rough"}];

// ── Helpers ────────────────────────────────────────────────
function toKey(d){ return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; }
function todayKey(){ return toKey(new Date()); }
function p2(n){ return String(n).padStart(2,"0"); }
function parseKey(k){ const[y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d); }
function fmtShort(k){ const[,m,d]=k.split("-"); return `${m}/${d}`; }
function uid(){ return Math.random().toString(36).slice(2,9); }

const STORAGE_KEY = "planner-v2";
async function load(){ try{ const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):null; }catch{ return null; } }
async function save(data){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch{} }

function emptyState(){
  return {
    events: [],  // {id,title,date,time,endTime,color,note}
    tasks:  [],  // {id,title,done,cat,priority,dueDate,note}
    goals:  [],  // {id,title,period,current,target,unit,color}
    journal:{},  // dateKey:{text,photos,mood}
  };
}

// ── App ────────────────────────────────────────────────────
export default function App(){
  const[data,setData]=useState(emptyState());
  const[loaded,setLoaded]=useState(false);
  const[tab,setTab]=useState("home");

  useEffect(()=>{ load().then(d=>{ if(d) setData(d); setLoaded(true); }); },[]);
  useEffect(()=>{ if(loaded) save(data); },[data,loaded]);

  function upd(patch){ setData(p=>({...p,...patch})); }
  const addEvent  = ev  => upd({events:[...data.events,{id:uid(),...ev}]});
  const editEvent = (id,p) => upd({events:data.events.map(e=>e.id===id?{...e,...p}:e)});
  const delEvent  = id  => upd({events:data.events.filter(e=>e.id!==id)});
  const addTask   = t   => upd({tasks:[...data.tasks,{id:uid(),done:false,...t}]});
  const editTask  = (id,p) => upd({tasks:data.tasks.map(t=>t.id===id?{...t,...p}:t)});
  const delTask   = id  => upd({tasks:data.tasks.filter(t=>t.id!==id)});
  const reorderTasks = (fromId, toId) => {
    const arr=[...data.tasks];
    const fi=arr.findIndex(t=>t.id===fromId);
    const ti=arr.findIndex(t=>t.id===toId);
    if(fi<0||ti<0||fi===ti) return;
    const [moved]=arr.splice(fi,1);
    arr.splice(ti,0,moved);
    upd({tasks:arr});
  };
  const addGoal   = g   => upd({goals:[...data.goals,{id:uid(),current:0,...g}]});
  const editGoal  = (id,p) => upd({goals:data.goals.map(g=>g.id===id?{...g,...p}:g)});
  const delGoal   = id  => upd({goals:data.goals.filter(g=>g.id!==id)});
  const updJournal= (key,p) => upd({journal:{...data.journal,[key]:{...(data.journal[key]||{}),...p}}});

  if(!loaded) return <div style={{...S.page,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc",fontSize:13}}>Loading...</div>;

  const props={data,addEvent,editEvent,delEvent,addTask,editTask,delTask,reorderTasks,addGoal,editGoal,delGoal,updJournal};

  return(
    <div style={S.page}>
      <TopNav tab={tab} setTab={setTab}/>
      <div style={S.content}>
        {tab==="home"    && <Home    {...props}/>}
        {tab==="journal" && <Journal {...props}/>}
        {tab==="goals"   && <Goals   {...props}/>}
      </div>
    </div>
  );
}

// ── Top Nav ────────────────────────────────────────────────
function TopNav({tab,setTab}){
  const tabs=[
    {id:"home",    label:"Home"},
    {id:"journal", label:"Diary"},
    {id:"goals",   label:"Goals"},
  ];
  return(
    <div style={{background:"#fff",borderBottom:"1px solid #efefef",padding:"16px 20px 0",position:"sticky",top:0,zIndex:50}}>
      <div style={{display:"flex",gap:0}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1, padding:"10px 0", background:"none", border:"none",
            borderBottom: tab===t.id ? "2px solid #111":"2px solid transparent",
            color: tab===t.id ? "#111":"#bbb",
            fontSize:14, fontWeight: tab===t.id ? 700:400,
            cursor:"pointer", fontFamily:"inherit", letterSpacing:-0.2
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Australian (WA) Public Holidays ───────────────────────
function easterSunday(y){
  const a=y%19,b=Math.floor(y/100),c=y%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31);
  const day=((h+l-7*m+114)%31)+1;
  return new Date(y,month-1,day);
}
function waHolidays(y){
  const shift=(d,n)=>{ const r=new Date(d); r.setDate(r.getDate()+n); return r; };
  const fmt=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  // If falls on Sat → sub Mon (+2), if Sun → sub Mon (+1)
  const obs=d=>{ const dw=d.getDay(); return dw===6?shift(d,2):dw===0?shift(d,1):d; };
  const add=(...dates)=>dates.forEach(d=>{ set.add(fmt(d)); const o=obs(d); if(fmt(o)!==fmt(d)) set.add(fmt(o)); });

  const easter=easterSunday(y);

  // First Monday in June (WA Day)
  const jun1=new Date(y,5,1);
  const dow1=jun1.getDay();
  const waDay=shift(jun1, dow1===1?0:(8-dow1)%7);

  // Queen's/King's Birthday - last Monday in September (WA)
  const sep30=new Date(y,8,30);
  const kbDay=shift(sep30,-(sep30.getDay()===0?6:sep30.getDay()-1));

  const set=new Set();
  add(
    new Date(y,0,1),    // New Year's Day
    new Date(y,0,26),   // Australia Day
    shift(easter,-2),   // Good Friday
    shift(easter,-1),   // Easter Saturday
    easter,             // Easter Sunday
    shift(easter,1),    // Easter Monday
    new Date(y,3,25),   // Anzac Day
    waDay,              // WA Day (first Mon in June)
    kbDay,              // King's Birthday (last Mon in Sep, WA)
    new Date(y,11,25),  // Christmas Day
    new Date(y,11,26),  // Boxing Day
  );

  // Christmas/Boxing Day clash fix
  // If Dec 25 is Fri → Dec 26 (Sat) observed Mon Dec 28
  // If Dec 25 is Sat → obs Mon Dec 27, Dec 26 Sun obs Tue Dec 28
  // If Dec 25 is Sun → obs Mon Dec 26, Boxing Day (Dec 26 Mon) obs Tue Dec 27
  const xmas=new Date(y,11,25);
  const xdow=xmas.getDay();
  if(xdow===5){ set.add(`${y}-12-28`); } // Boxing Day substitute
  if(xdow===6){ set.add(`${y}-12-27`); set.add(`${y}-12-28`); }
  if(xdow===0){ set.add(`${y}-12-26`); set.add(`${y}-12-27`); }

  return set;
}


const PRIORITY_ORDER = {high:0, med:1, low:2};

function Home({data,addEvent,editEvent,delEvent,addTask,editTask,delTask,reorderTasks}){
  const today = todayKey();
  const now   = new Date();
  const[calYear,setCalYear]=useState(now.getFullYear());
  const[calMonth,setCalMonth]=useState(now.getMonth());
  const[dayModal,setDayModal]=useState(null);
  const[eventModal,setEventModal]=useState(null);
  const[taskModal,setTaskModal]=useState(null);
  const[headerText,setHeaderText]=useState("My Planner");
  const[editingHeader,setEditingHeader]=useState(false);
  function shiftMonth(delta){
    let m=calMonth+delta,y=calYear;
    if(m<0){m=11;y--;} if(m>11){m=0;y++;}
    setCalMonth(m); setCalYear(y);
  }

  // Build calendar cells with prev/next month fill
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const prevDim=new Date(calYear,calMonth,0).getDate();
  const allCells=[];
  // prev month fill
  for(let i=0;i<firstDay;i++){
    const d=prevDim-firstDay+1+i;
    const m=calMonth-1<0?11:calMonth-1;
    const y=calMonth-1<0?calYear-1:calYear;
    allCells.push({d,m,y,faded:true});
  }
  // current month
  for(let d=1;d<=dim;d++) allCells.push({d,m:calMonth,y:calYear,faded:false});
  // next month fill to complete row
  const rem=(7-allCells.length%7)%7;
  for(let d=1;d<=rem;d++){
    const m=calMonth+1>11?0:calMonth+1;
    const y=calMonth+1>11?calYear+1:calYear;
    allCells.push({d,m,y,faded:true});
  }

  const holidays=waHolidays(calYear);

  // Tasks: pending in array order, done at bottom
  // drag state
  const[dragId,setDragId]=useState(null);
  const[overCol,setOverCol]=useState(null); // 'now'|'later'
  const[overId,setOverId]=useState(null);
  const longPressTimer=useRef(null);
  const isDragging=useRef(false);

  function onTaskPointerDown(e,id){
    isDragging.current=false;
    longPressTimer.current=setTimeout(()=>{
      isDragging.current=true;
      setDragId(id);
      if(navigator.vibrate) navigator.vibrate(40);
    },350);
  }
  function onTaskPointerUp(id, targetCol){
    clearTimeout(longPressTimer.current);
    if(isDragging.current&&dragId){
      if(overId&&dragId!==overId){
        reorderTasks(dragId,overId);
      } else if(targetCol&&dragId!==id){
        // moved to other column → change priority
        const isNow=targetCol==="now";
        editTask(dragId,{priority:isNow?"high":"med"});
      }
    }
    isDragging.current=false;
    setDragId(null); setOverId(null); setOverCol(null);
  }
  function onTaskPointerEnter(id){ if(isDragging.current) setOverId(id); }

  const nowTasks=data.tasks.filter(t=>!t.done&&t.priority==="high");
  const laterTasks=data.tasks.filter(t=>!t.done&&t.priority!=="high");
  const pendingTasks=[...nowTasks,...laterTasks];
  const doneTasks=data.tasks.filter(t=>t.done);

  const dayEvents = dayModal ? data.events.filter(e=>e.date===dayModal).sort((a,b)=>a.time?.localeCompare(b.time||"")||0) : [];

  return(
    <div style={S.body}>

      {/* Editable header */}
      <div style={{marginBottom:18}}>
        {editingHeader
          ? <input value={headerText} onChange={e=>setHeaderText(e.target.value)}
              onBlur={()=>setEditingHeader(false)}
              onKeyDown={e=>e.key==="Enter"&&setEditingHeader(false)}
              autoFocus
              style={{fontSize:24,fontWeight:800,color:"#111",letterSpacing:-0.8,border:"none",borderBottom:"2px solid #111",outline:"none",background:"none",fontFamily:"inherit",width:"100%",padding:"2px 0"}}/>
          : <div onClick={()=>setEditingHeader(true)} style={{fontSize:24,fontWeight:800,color:"#111",letterSpacing:-0.8,cursor:"text"}}>{headerText} <span style={{fontSize:14,color:"#ddd",fontWeight:400}}>✎</span></div>
        }
      </div>

      {/* ── Calendar ── */}
      <div style={{background:"#fff",border:"1px solid #efefef",borderRadius:18,marginBottom:14,boxShadow:BOX,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 10px"}}>
          <button onClick={()=>shiftMonth(-1)} style={S.arrow}>‹</button>
          <span style={{fontSize:14,fontWeight:700,color:"#111"}}>{MONTHS[calMonth]} {calYear}</span>
          <button onClick={()=>shiftMonth(1)} style={S.arrow}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderTop:"1px solid #f0f0f0",borderBottom:"1px solid #f0f0f0"}}>
          {DAYS_S.map((d,i)=>(
            <div key={i} style={{textAlign:"center",fontSize:9,color:i===0?"#E03A3A":i===6?"#3A6FE0":"#bbb",padding:"5px 0",borderRight:i<6?"1px solid #f0f0f0":"none",fontWeight:i===0||i===6?600:400,letterSpacing:-0.3}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {allCells.map(({d,m,y,faded},i)=>{
            const key=`${y}-${p2(m+1)}-${p2(d)}`;
            const evs=data.events.filter(e=>e.date===key);
            const isToday=key===today;
            const col=(i+1)%7;
            const dow=new Date(y,m,d).getDay();
            const isHoliday=!faded&&holidays.has(key);
            const numColor=faded?"#ccc":isToday?"#fff":isHoliday||dow===0?"#E03A3A":dow===6?"#3A6FE0":"#555";
            return(
              <button key={`${key}-${faded}`} onClick={()=>{
                if(faded){ // navigate to that month
                  setCalMonth(m); setCalYear(y);
                } else {
                  setDayModal(key);
                }
              }} style={{
                minHeight:68, border:"none", cursor:"pointer", padding:"4px 5px",
                borderRight:col!==0?"1px solid #f0f0f0":"none",
                borderBottom:"1px solid #f0f0f0",
                background:isToday?"#fafafa":"#fff",
                display:"flex",flexDirection:"column",alignItems:"flex-end", gap:2
              }}>
                <span style={{
                  fontSize:11, fontWeight:isToday?800:400, lineHeight:1,
                  background:isToday?"#111":"none",
                  color:numColor,
                  width:isToday?17:undefined, height:isToday?17:undefined,
                  borderRadius:isToday?"50%":undefined,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>{d}</span>
                {!faded&&(
                  <div style={{width:"100%",display:"flex",flexDirection:"column",gap:2}}>
                    {evs.slice(0,2).map(ev=>(
                      <div key={ev.id} style={{fontSize:9,fontWeight:600,color:"#fff",background:ev.color||EVENT_COLORS[0],borderRadius:3,padding:"1px 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{ev.title}</div>
                    ))}
                    {evs.length>2&&<div style={{fontSize:9,color:"#bbb",textAlign:"left",paddingLeft:2}}>+{evs.length-2}</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tasks ── */}
      <div style={{background:"#fff",border:"1px solid #efefef",borderRadius:18,padding:"14px 16px",marginBottom:14,boxShadow:BOX}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:700,color:"#111"}}>Tasks{pendingTasks.length>0?` · ${pendingTasks.length}`:""}</span>
          <IconBtn onClick={()=>setTaskModal("add")}>＋</IconBtn>
        </div>

        {data.tasks.length===0
          ? <Empty text="No tasks yet — tap ＋ to add"/>
          : <>
            {/* Two-column split */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom: doneTasks.length>0?12:0}}>
              {/* Now */}
              <div
                onPointerEnter={()=>{ if(isDragging.current) setOverCol("now"); }}
                onPointerUp={()=>onTaskPointerUp(null,"now")}
                style={{background: overCol==="now"&&dragId?"#f0f7ff":"#f9f9f9",borderRadius:12,padding:"10px 10px 6px",transition:"background 0.15s",minHeight:60}}>
                <div style={{fontSize:10,fontWeight:700,color:"#111",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>⚡ Now</div>
                {nowTasks.length===0
                  ? <div style={{fontSize:11,color:"#ddd",padding:"8px 0"}}>—</div>
                  : nowTasks.map(t=>(
                    <div key={t.id}
                      onPointerDown={e=>onTaskPointerDown(e,t.id)}
                      onPointerEnter={()=>onTaskPointerEnter(t.id)}
                      onPointerUp={()=>onTaskPointerUp(t.id,"now")}
                      style={{opacity:dragId===t.id?0.35:1,background:overId===t.id&&dragId&&dragId!==t.id?"#e8f0ff":"transparent",borderRadius:6,transition:"all 0.1s",touchAction:"none",userSelect:"none"}}>
                      <MiniTaskRow task={t} onToggle={()=>delTask(t.id)} onTap={()=>{ if(!isDragging.current) setTaskModal(t); }}/>
                    </div>
                  ))
                }
              </div>
              {/* Later */}
              <div
                onPointerEnter={()=>{ if(isDragging.current) setOverCol("later"); }}
                onPointerUp={()=>onTaskPointerUp(null,"later")}
                style={{background: overCol==="later"&&dragId?"#fff8f0":"#f9f9f9",borderRadius:12,padding:"10px 10px 6px",transition:"background 0.15s",minHeight:60}}>
                <div style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Later</div>
                {laterTasks.length===0
                  ? <div style={{fontSize:11,color:"#ddd",padding:"8px 0"}}>—</div>
                  : laterTasks.map(t=>(
                    <div key={t.id}
                      onPointerDown={e=>onTaskPointerDown(e,t.id)}
                      onPointerEnter={()=>onTaskPointerEnter(t.id)}
                      onPointerUp={()=>onTaskPointerUp(t.id,"later")}
                      style={{opacity:dragId===t.id?0.35:1,background:overId===t.id&&dragId&&dragId!==t.id?"#fff4e0":"transparent",borderRadius:6,transition:"all 0.1s",touchAction:"none",userSelect:"none"}}>
                      <MiniTaskRow task={t} onToggle={()=>delTask(t.id)} onTap={()=>{ if(!isDragging.current) setTaskModal(t); }}/>
                    </div>
                  ))
                }
              </div>
            </div>
          </>
        }
      </div>

      {/* Day modal */}
      {dayModal&&(
        <Modal onClose={()=>setDayModal(null)} title={`${fmtShort(dayModal)}${dayModal===today?" · Today":""}`}>
          {dayEvents.length===0
            ? <div style={{color:"#ccc",fontSize:13,textAlign:"center",padding:"12px 0 16px"}}>No events</div>
            : dayEvents.map(ev=>(
              <div key={ev.id} onClick={()=>{setEventModal(ev);setDayModal(null);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f5",cursor:"pointer"}}>
                <div style={{width:3,height:32,borderRadius:2,background:ev.color||EVENT_COLORS[0],flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#111"}}>{ev.title}</div>
                  {ev.time&&<div style={{fontSize:11,color:"#bbb",marginTop:1}}>{ev.time}{ev.endTime?` – ${ev.endTime}`:""}</div>}
                </div>
                <span style={{fontSize:13,color:"#ddd"}}>›</span>
              </div>
            ))
          }
          <button onClick={()=>{setEventModal({date:dayModal});setDayModal(null);}} style={{width:"100%",marginTop:14,padding:"13px",background:"#111",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Add Event</button>
        </Modal>
      )}


      {/* Event / Task modals */}
      {eventModal&&(
        <EventModal
          ev={eventModal.id?eventModal:{date:eventModal.date||today}}
          isNew={!eventModal.id}
          onSave={eventModal.id?(p)=>editEvent(eventModal.id,p):addEvent}
          onDelete={eventModal.id?()=>{delEvent(eventModal.id);setEventModal(null);}:null}
          onClose={()=>setEventModal(null)}
        />
      )}
      {taskModal&&(
        <TaskModal
          task={taskModal==="add"?{}:taskModal}
          isNew={taskModal==="add"}
          onSave={taskModal==="add"?addTask:(p)=>editTask(taskModal.id,p)}
          onDelete={taskModal!=="add"?()=>{delTask(taskModal.id);setTaskModal(null);}:null}
          onClose={()=>setTaskModal(null)}
        />
      )}
    </div>
  );
}

function TaskRow({task:t,onToggle,onTap}){
  const cat=CAT_MAP[t.cat];
  const today=todayKey();
  const overdue=t.dueDate&&t.dueDate<today&&!t.done;
  return(
    <div onClick={onTap} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f8f8f8",cursor:"pointer"}}>
      <button onClick={e=>{e.stopPropagation();onToggle();}} style={{
        width:20,height:20,borderRadius:"50%",flexShrink:0,cursor:"pointer",
        border:t.done?"none":"1.5px solid #ddd",background:t.done?"#111":"none",
        display:"flex",alignItems:"center",justifyContent:"center"
      }}>
        {t.done&&<span style={{fontSize:9,color:"#fff"}}>✓</span>}
      </button>
      <div style={{flex:1}}>
        <div style={{fontSize:13,color:t.done?"#ccc":"#333",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {(cat||t.dueDate)&&(
          <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
            {cat&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:cat.bg,color:cat.color,fontWeight:600}}>{cat.label}</span>}
            {t.dueDate&&<span style={{fontSize:10,color:overdue?"#FF6B6B":"#bbb"}}>{overdue?"⚠ ":""}Due {fmtShort(t.dueDate)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniTaskRow({task:t, onToggle, onTap}){
  const cat=CAT_MAP[t.cat];
  return(
    <div onClick={onTap} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"6px 0",borderBottom:"1px solid #f0f0f0",cursor:"pointer"}}>
      <button onClick={e=>{e.stopPropagation();onToggle();}} style={{
        width:16,height:16,borderRadius:"50%",flexShrink:0,marginTop:1,cursor:"pointer",
        border:"1.5px solid #ddd",background:"none",
        display:"flex",alignItems:"center",justifyContent:"center"
      }}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,color:"#333",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
        {cat&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:6,background:cat.bg,color:cat.color,fontWeight:600}}>{cat.label}</span>}
      </div>
    </div>
  );
}

// ── GOALS ──────────────────────────────────────────────────
const GOAL_PERIODS_NEW = ["month","year"];

function Goals({data,addGoal,editGoal,delGoal}){
  const[modal,setModal]=useState(null);
  const[period,setPeriod]=useState("month");

  const active=data.goals.filter(g=>g.period===period&&!g.done);
  const achieved=data.goals.filter(g=>g.period===period&&g.done);
  const allAchieved=data.goals.filter(g=>g.done);
  const showAchieved=period==="achieved";

  return(
    <div style={S.body}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{fontSize:24,fontWeight:800,color:"#111",letterSpacing:-0.5}}>Goals</span>
        <IconBtn onClick={()=>setModal("add")}>＋</IconBtn>
      </div>

      {/* Period tabs */}
      <div style={{display:"flex",background:"#fff",border:"1px solid #efefef",borderRadius:12,padding:3,marginBottom:18,gap:3,boxShadow:BOX}}>
        {[...GOAL_PERIODS_NEW,"achieved"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",background:period===p?"#111":"none",color:period===p?"#fff":"#bbb",fontSize:12,fontWeight:period===p?700:400,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{p==="achieved"?"🏆":p}</button>
        ))}
      </div>

      {/* Achieved tab */}
      {showAchieved&&(
        <>
          {allAchieved.length===0
            ? <Empty text="No achieved goals yet"/>
            : allAchieved.map(g=>(
              <GoalRow key={g.id} goal={g} onToggle={()=>editGoal(g.id,{done:false})} onTap={()=>setModal(g)} done/>
            ))
          }
        </>
      )}

      {/* Active goals */}
      {!showAchieved&&(
        <>
          {active.length===0
            ? <Empty text={`No ${period}ly goals — tap ＋ to add`}/>
            : active.map(g=>(
              <GoalRow key={g.id} goal={g} onToggle={()=>editGoal(g.id,{done:true})} onTap={()=>setModal(g)}/>
            ))
          }
        </>
      )}

      {modal&&(
        <GoalModal
          goal={modal==="add"?{period}:modal}
          isNew={modal==="add"}
          onSave={modal==="add"?addGoal:(p)=>editGoal(modal.id,p)}
          onDelete={modal!=="add"?()=>{delGoal(modal.id);setModal(null);}:null}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}

function GoalRow({goal:g, onToggle, onTap, done}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"#fff",border:"1px solid #efefef",borderRadius:14,marginBottom:8,boxShadow:BOX,opacity:done?0.6:1}}>
      <button onClick={e=>{e.stopPropagation();onToggle();}} style={{
        width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:1,cursor:"pointer",
        border:done?"none":"2px solid",borderColor:g.color||"#ddd",
        background:done?g.color||"#111":"none",
        display:"flex",alignItems:"center",justifyContent:"center"
      }}>
        {done&&<span style={{fontSize:10,color:"#fff"}}>✓</span>}
      </button>
      <div style={{flex:1,cursor:"pointer"}} onClick={onTap}>
        <div style={{fontSize:14,fontWeight:600,color:done?"#aaa":"#111",textDecoration:done?"line-through":"none"}}>{g.title}</div>
        {g.memo&&<div style={{fontSize:12,color:"#bbb",marginTop:3,lineHeight:1.4}}>{g.memo}</div>}
      </div>
      <span style={{fontSize:14,color:"#e0e0e0",marginTop:1}}>›</span>
    </div>
  );
}

// ── JOURNAL ────────────────────────────────────────────────
const DEFAULT_HABITS=[
  {id:"gym",     label:"Gym",     emoji:"🏋️"},
  {id:"english", label:"English", emoji:"📖"},
  {id:"wake6",   label:"Wake 6am",emoji:"⏰"},
];

function Journal({data,updJournal}){
  const[selKey,setSelKey]=useState(todayKey());
  const[view,setView]=useState("write");
  const[calYear,setCalYear]=useState(new Date().getFullYear());
  const[calMonth,setCalMonth]=useState(new Date().getMonth());
  const[detailKey,setDetailKey]=useState(null);
  const[newHabit,setNewHabit]=useState("");
  const[addingHabit,setAddingHabit]=useState(false);
  const fileRef=useRef();
  const today=todayKey();
  const entry=data.journal[selKey]||{};

  // custom habits stored per-user in journal meta
  const customHabits=data.journal["__habits"]?.list||[];
  const allHabits=[...DEFAULT_HABITS,...customHabits];

  function addCustomHabit(){
    if(!newHabit.trim()) return;
    const h={id:"c_"+uid(),label:newHabit.trim(),emoji:"✦"};
    updJournal("__habits",{list:[...customHabits,h]});
    setNewHabit(""); setAddingHabit(false);
  }
  function removeCustomHabit(id){
    updJournal("__habits",{list:customHabits.filter(h=>h.id!==id)});
  }

  function shiftDay(d){ const dt=parseKey(selKey); dt.setDate(dt.getDate()+d); setSelKey(toKey(dt)); }
  function handlePhotos(e){
    Array.from(e.target.files).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>updJournal(selKey,{photos:[...(data.journal[selKey]?.photos||entry.photos||[]),ev.target.result]});
      r.readAsDataURL(file);
    });
  }
  function removePhoto(idx){
    const photos=[...(entry.photos||[])]; photos.splice(idx,1);
    updJournal(selKey,{photos});
  }
  function toggleHabit(id){
    const h=entry.habits||[];
    updJournal(selKey,{habits:h.includes(id)?h.filter(x=>x!==id):[...h,id]});
  }
  function deleteEntry(){
    updJournal(selKey,{text:"",photos:[],mood:null,habits:[]});
  }
  function shiftHistMonth(delta){
    let m=calMonth+delta,y=calYear;
    if(m<0){m=11;y--;} if(m>11){m=0;y++;}
    setCalMonth(m); setCalYear(y);
  }

  // History calendar
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const prevDim=new Date(calYear,calMonth,0).getDate();
  const histCells=[];
  for(let i=0;i<firstDay;i++) histCells.push({d:prevDim-firstDay+1+i,faded:true,idx:i});
  for(let d=1;d<=dim;d++) histCells.push({d,faded:false,idx:firstDay+d-1});
  const rem2=(7-histCells.length%7)%7;
  for(let d=1;d<=rem2;d++) histCells.push({d,faded:true,idx:histCells.length});

  // Streak: consecutive submitted days up to selKey
  const streak=(()=>{
    let count=0, d=new Date(selKey==="__habits"?todayKey():selKey);
    while(true){
      const k=toKey(d);
      if(data.journal[k]?.submitted) count++;
      else break;
      d.setDate(d.getDate()-1);
    }
    return count;
  })();

  const detailEntry=detailKey?data.journal[detailKey]||{}:null;
  const hasContent=entry.text||entry.photos?.length>0||(entry.habits||[]).length>0||entry.mood;

  return(
    <div style={S.body}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{fontSize:24,fontWeight:800,color:"#111",letterSpacing:-0.5}}>Diary</span>
        <div style={{display:"flex",background:"#f0f0f0",borderRadius:8,padding:2,gap:2}}>
          {["write","history"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:view===v?"#fff":"none",color:view===v?"#111":"#bbb",fontSize:11,fontWeight:view===v?700:400,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{v==="write"?"Write":"History"}</button>
          ))}
        </div>
      </div>

      {view==="write"&&!entry.submitted&&(
        <>
          {/* Date nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",border:"1px solid #efefef",borderRadius:14,padding:"11px 16px",marginBottom:12,boxShadow:BOX}}>
            <button onClick={()=>shiftDay(-1)} style={S.arrow}>‹</button>
            <div style={{fontSize:14,fontWeight:700,color:"#111"}}>
              {selKey===today?"Today":parseKey(selKey).toLocaleDateString("en-AU",{weekday:"short",month:"short",day:"numeric"})}
            </div>
            <button onClick={()=>shiftDay(1)} disabled={selKey>=today} style={{...S.arrow,opacity:selKey>=today?0.2:1}}>›</button>
          </div>

          {/* Today: Mood + Habits */}
          <div style={{background:"#fff",border:"1px solid #efefef",borderRadius:16,padding:"14px 16px",marginBottom:12,boxShadow:BOX}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={S.sectionLabel}>Today</div>
              <button onClick={()=>setAddingHabit(true)} style={{fontSize:11,color:"#bbb",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>＋ Add habit</button>
            </div>
            {/* Mood */}
            <div style={{display:"flex",gap:5,marginBottom:12}}>
              {MOODS.map(m=>(
                <button key={m.l} onClick={()=>updJournal(selKey,{mood:entry.mood===m.l?null:m.l})} style={{
                  flex:1,padding:"6px 2px",borderRadius:8,
                  border:entry.mood===m.l?"1.5px solid #111":"1.5px solid #eee",
                  background:entry.mood===m.l?"#111":"#fff",
                  cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2
                }}>
                  <span style={{fontSize:14}}>{m.e}</span>
                  <span style={{fontSize:8,color:entry.mood===m.l?"#fff":"#bbb",fontWeight:600}}>{m.l}</span>
                </button>
              ))}
            </div>
            {/* Habits compact */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {allHabits.map(h=>{
                const done=(entry.habits||[]).includes(h.id);
                const isCustom=!DEFAULT_HABITS.find(d=>d.id===h.id);
                return(
                  <div key={h.id} style={{display:"flex",alignItems:"center",gap:0}}>
                    <button onClick={()=>toggleHabit(h.id)} style={{
                      display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,
                      border:done?"1.5px solid #111":"1.5px solid #eee",
                      background:done?"#111":"#fafafa",
                      cursor:"pointer",fontFamily:"inherit"
                    }}>
                      <span style={{fontSize:12}}>{h.emoji}</span>
                      <span style={{fontSize:12,fontWeight:600,color:done?"#fff":"#777"}}>{h.label}</span>
                    </button>
                    {isCustom&&(
                      <button onClick={()=>removeCustomHabit(h.id)} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px",marginLeft:2}}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Add habit inline */}
            {addingHabit&&(
              <div style={{display:"flex",gap:6,marginTop:10}}>
                <input value={newHabit} onChange={e=>setNewHabit(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addCustomHabit()}
                  placeholder="Habit name..." autoFocus
                  style={{...S.input,flex:1,fontSize:13,padding:"7px 10px"}}/>
                <button onClick={addCustomHabit} style={{padding:"7px 12px",borderRadius:10,border:"none",background:"#111",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add</button>
                <button onClick={()=>{setAddingHabit(false);setNewHabit("");}} style={{padding:"7px 10px",borderRadius:10,border:"1px solid #eee",background:"none",color:"#bbb",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
              </div>
            )}
          </div>

          {/* Entry */}
          <div style={{background:"#fff",border:"1px solid #efefef",borderRadius:16,padding:"14px 16px",marginBottom:12,boxShadow:BOX}}>
            <div style={S.sectionLabel}>Entry</div>
            <textarea value={entry.text||""} onChange={e=>updJournal(selKey,{text:e.target.value})}
              placeholder="今日どうだった？..." rows={6}
              style={{width:"100%",background:"none",border:"none",resize:"none",color:"#333",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",lineHeight:1.8}}/>
          </div>

          {/* Photos */}
          <div style={{background:"#fff",border:"1px solid #efefef",borderRadius:16,padding:"14px 16px",marginBottom:12,boxShadow:BOX}}>
            <div style={S.sectionLabel}>Photos</div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{display:"none"}}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {(entry.photos||[]).map((src,i)=>(
                <div key={i} style={{position:"relative",paddingTop:"100%"}}>
                  <img src={src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:8}}/>
                  <button onClick={()=>removePhoto(i)} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <button onClick={()=>fileRef.current.click()} style={{paddingTop:"100%",position:"relative",background:"#fafafa",border:"1.5px dashed #e8e8e8",borderRadius:8,cursor:"pointer"}}>
                <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc",fontSize:20}}>＋</span>
              </button>
            </div>
          </div>

          {/* Delete entry */}
          {hasContent&&(
            <button onClick={deleteEntry} style={{width:"100%",padding:"12px",background:"none",border:"1px solid #fce0e0",borderRadius:12,color:"#e08080",fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
              Delete entry
            </button>
          )}

          {/* Submit */}
          <button onClick={()=>updJournal(selKey,{submitted:true})} style={{width:"100%",padding:"15px",background:"#111",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:16}}>
            Submit ✓
          </button>
        </>
      )}

      {/* ── Submitted screen ── */}
      {view==="write"&&entry.submitted&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px 32px",textAlign:"center",minHeight:"70vh"}}>
          <div style={{fontSize:64,marginBottom:20}}>🌙</div>
          <div style={{fontSize:26,fontWeight:800,color:"#111",letterSpacing:-0.5,marginBottom:10}}>
            {selKey===today?"今日もお疲れ様":"よく頑張ったね"}
          </div>

          {/* Streak */}
          {streak>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff8f0",border:"1.5px solid #ffe0b0",borderRadius:20,padding:"8px 20px",marginBottom:16}}>
              <span style={{fontSize:22}}>🔥</span>
              <span style={{fontSize:22,fontWeight:800,color:"#f5a623"}}>{streak}</span>
              <span style={{fontSize:13,color:"#c87d00",fontWeight:600}}>{streak===1?"day streak":"days in a row"}</span>
            </div>
          )}
          <div style={{fontSize:15,color:"#888",lineHeight:1.7,marginBottom:8,whiteSpace:"pre-line"}}>
            {selKey===today
              ? "一日一日の積み重ねが\n大きな変化を生む。"
              : "その日の自分を振り返れた。\nそれだけで十分。"}
          </div>
          <div style={{fontSize:13,color:"#bbb",marginBottom:36}}>
            {selKey===today?"明日も全力で。":"記録は続いている。"}
          </div>

          {/* Habits summary */}
          {(entry.habits||[]).length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginBottom:32}}>
              {(entry.habits||[]).map(hid=>{
                const h=allHabits.find(x=>x.id===hid);
                return h?<span key={hid} style={{padding:"5px 12px",borderRadius:20,background:"#f5f5f5",color:"#555",fontSize:12,fontWeight:600}}>{h.emoji} {h.label}</span>:null;
              })}
            </div>
          )}

          <button onClick={()=>updJournal(selKey,{submitted:false})} style={{width:"100%",maxWidth:320,padding:"14px",background:"none",border:"1.5px solid #eee",borderRadius:12,color:"#888",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
            ✎ Edit today's entry
          </button>
          <button onClick={()=>setView("history")} style={{width:"100%",maxWidth:320,padding:"14px",background:"none",border:"none",color:"#bbb",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            View history
          </button>
        </div>
      )}

      {view==="history"&&(
        <>
          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <button onClick={()=>shiftHistMonth(-1)} style={S.arrow}>‹</button>
            <span style={{fontSize:14,fontWeight:700,color:"#111"}}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={()=>shiftHistMonth(1)} style={S.arrow}>›</button>
          </div>
          {/* Day labels */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#fff",border:"1px solid #efefef",borderRadius:"14px 14px 0 0",borderBottom:"1px solid #f0f0f0"}}>
            {DAYS_S.map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontSize:9,color:i===0?"#E03A3A":i===6?"#3A6FE0":"#bbb",padding:"6px 0",borderRight:i<6?"1px solid #f0f0f0":"none",fontWeight:i===0||i===6?600:400}}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#fff",border:"1px solid #efefef",borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden",marginBottom:14,boxShadow:BOX}}>
            {histCells.map(({d,faded},i)=>{
              const m2=faded?(i<firstDay?calMonth-1<0?11:calMonth-1:calMonth+1>11?0:calMonth+1):calMonth;
              const y2=faded?(i<firstDay&&calMonth===0?calYear-1:!faded||i>=firstDay&&calMonth===11?calYear+1:calYear):calYear;
              const key=`${faded?(i<firstDay?(calMonth===0?calYear-1:calYear):calMonth===11?calYear+1:calYear):calYear}-${p2(faded?(i<firstDay?(calMonth===0?12:calMonth):calMonth+1>11?1:calMonth+1):calMonth+1)}-${p2(d)}`;
              const e=data.journal[key];
              const hasEntry=e&&(e.text||e.photos?.length>0);
              const mood=e&&MOODS.find(m=>m.l===e.mood);
              const isToday=key===today;
              const col=(i+1)%7;
              return(
                <button key={i} onClick={()=>{ if(!faded&&hasEntry) setDetailKey(key); else if(!faded){setSelKey(key);setView("write");}}} style={{
                  minHeight:72, border:"none", padding:"4px 3px",
                  borderRight:col!==0?"1px solid #f0f0f0":"none",
                  borderBottom:"1px solid #f0f0f0",
                  background:isToday?"#fafafa":"#fff",
                  cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,
                  opacity:faded?0.3:1
                }}>
                  <span style={{fontSize:10,fontWeight:isToday?800:400,color:isToday?"#111":"#666",lineHeight:1}}>{d}</span>
                  {!faded&&e?.photos?.[0]&&(
                    <div style={{width:"100%",paddingTop:"60%",position:"relative",borderRadius:3,overflow:"hidden"}}>
                      <img src={e.photos[0]} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  )}
                  {!faded&&!e?.photos?.[0]&&e?.text&&(
                    <div style={{fontSize:8,color:"#aaa",textAlign:"left",width:"100%",overflow:"hidden",lineHeight:1.3,WebkitLineClamp:2,display:"-webkit-box",WebkitBoxOrient:"vertical"}}>{e.text}</div>
                  )}
                  {!faded&&mood&&<span style={{fontSize:10,alignSelf:"flex-start"}}>{mood.e}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailKey&&detailEntry&&(
        <Modal onClose={()=>setDetailKey(null)} title={parseKey(detailKey).toLocaleDateString("en-AU",{weekday:"short",month:"short",day:"numeric"})}>
          {detailEntry.mood&&<div style={{fontSize:28,marginBottom:12}}>{MOODS.find(m=>m.l===detailEntry.mood)?.e}</div>}
          {(detailEntry.habits||[]).length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {detailEntry.habits.map(hid=>{ const h=DEFAULT_HABITS.find(x=>x.id===hid); return h?<span key={hid} style={{padding:"4px 10px",borderRadius:20,background:"#111",color:"#fff",fontSize:12,fontWeight:600}}>{h.emoji} {h.label}</span>:null; })}
            </div>
          )}
          {detailEntry.text&&<div style={{fontSize:14,color:"#333",lineHeight:1.8,marginBottom:14,whiteSpace:"pre-wrap"}}>{detailEntry.text}</div>}
          {detailEntry.photos?.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
              {detailEntry.photos.map((src,i)=>(
                <div key={i} style={{paddingTop:"100%",position:"relative"}}>
                  <img src={src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:8}}/>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{setSelKey(detailKey);setView("write");setDetailKey(null);}} style={{width:"100%",padding:"13px",background:"#111",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
        </Modal>
      )}
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────
function EventModal({ev,isNew,onSave,onDelete,onClose}){
  const[form,setForm]=useState({title:"",date:todayKey(),time:"",endTime:"",color:EVENT_COLORS[0],note:"",...ev});
  function save(){ if(!form.title.trim()) return; onSave(form); onClose(); }
  return(
    <Modal onClose={onClose} title={isNew?"New Event":"Edit Event"}>
      <Field label="Title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Event name" style={S.input}/></Field>
      <Field label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={S.input}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Field label="Start"><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={S.input}/></Field>
        <Field label="End"><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={S.input}/></Field>
      </div>
      <Field label="Color">
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EVENT_COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,border:form.color===c?"3px solid #111":"3px solid transparent",cursor:"pointer"}}/>)}
        </div>
      </Field>
      <Field label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optional note" style={S.input}/></Field>
      <ModalActions onSave={save} onDelete={onDelete} onClose={onClose}/>
    </Modal>
  );
}

function TaskModal({task,isNew,onSave,onDelete,onClose}){
  const[form,setForm]=useState({title:"",cat:"personal",priority:"med",dueDate:"",note:"",...task});
  function save(){ if(!form.title.trim()) return; onSave(form); onClose(); }
  return(
    <Modal onClose={onClose} title={isNew?"New Task":"Edit Task"}>
      <Field label="Title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Task name" style={S.input}/></Field>
      <Field label="Category">
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {TASK_CATS.map(c=><button key={c.id} onClick={()=>setForm(f=>({...f,cat:c.id}))} style={{padding:"5px 11px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:form.cat===c.id?`1.5px solid ${c.color}`:"1.5px solid #eee",background:form.cat===c.id?c.bg:"#fff",color:form.cat===c.id?c.color:"#bbb"}}>{c.label}</button>)}
        </div>
      </Field>
      <Field label="Priority">
        <div style={{display:"flex",gap:6}}>
          {["high","med","low"].map(p=>{
            const col=p==="high"?"#FF6B6B":p==="med"?"#F5A623":"#bbb";
            return <button key={p} onClick={()=>setForm(f=>({...f,priority:p}))} style={{flex:1,padding:"7px",borderRadius:8,border:form.priority===p?`1.5px solid ${col}`:"1.5px solid #eee",background:form.priority===p?col+"18":"#fff",color:form.priority===p?col:"#bbb",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{p}</button>;
          })}
        </div>
      </Field>
      <Field label="Due Date"><input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={S.input}/></Field>
      <Field label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optional" style={S.input}/></Field>
      <ModalActions onSave={save} onDelete={onDelete} onClose={onClose}/>
    </Modal>
  );
}

function GoalModal({goal,isNew,onSave,onDelete,onClose}){
  const[form,setForm]=useState({title:"",period:"week",memo:"",color:"#5B6EF5",...goal});
  function save(){ if(!form.title.trim()) return; onSave(form); onClose(); }
  return(
    <Modal onClose={onClose} title={isNew?"New Goal":"Edit Goal"}>
      <Field label="Title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Goal name" style={S.input}/></Field>
      <Field label="Period">
        <div style={{display:"flex",gap:6}}>
          {GOAL_PERIODS_NEW.map(p=><button key={p} onClick={()=>setForm(f=>({...f,period:p}))} style={{flex:1,padding:"7px",borderRadius:8,border:form.period===p?"1.5px solid #111":"1.5px solid #eee",background:form.period===p?"#111":"#fff",color:form.period===p?"#fff":"#bbb",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{p}</button>)}
        </div>
      </Field>
      <Field label="Memo">
        <textarea value={form.memo||""} onChange={e=>setForm(f=>({...f,memo:e.target.value}))} placeholder="Notes, details, why this matters..." rows={3}
          style={{...S.input,resize:"none",lineHeight:1.6}}/>
      </Field>
      <Field label="Color">
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EVENT_COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,border:form.color===c?"3px solid #111":"3px solid transparent",cursor:"pointer"}}/>)}
        </div>
      </Field>
      <ModalActions onSave={save} onDelete={onDelete} onClose={onClose}/>
    </Modal>
  );
}

// ── Shared UI ──────────────────────────────────────────────
function Modal({onClose,title,children}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"flex-end",background:"rgba(0,0,0,0.4)"}} onClick={onClose}>
      <div style={{background:"#fff",width:"100%",maxWidth:480,margin:"0 auto",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0"}}><div style={{width:36,height:4,borderRadius:2,background:"#e0e0e0"}}/></div>
        <div style={{padding:"14px 20px 44px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <span style={{fontSize:17,fontWeight:800,color:"#111"}}>{title}</span>
            <button onClick={onClose} style={{background:"#f5f5f5",border:"none",borderRadius:"50%",width:28,height:28,fontSize:16,color:"#888",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
function ModalActions({onSave,onDelete,onClose}){
  return(
    <div style={{display:"flex",gap:8,marginTop:20}}>
      <button onClick={onSave} style={{flex:1,padding:"13px",background:"#111",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
      {onDelete&&<button onClick={onDelete} style={{padding:"13px 16px",background:"none",border:"1px solid #fce0e0",borderRadius:12,color:"#e08080",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>}
    </div>
  );
}
function Field({label,children}){ return <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>{label}</div>{children}</div>; }
function IconBtn({onClick,children}){ return <button onClick={onClick} style={{width:30,height:30,borderRadius:"50%",background:"#111",border:"none",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>{children}</button>; }
function Empty({text}){ return <div style={{textAlign:"center",color:"#ddd",fontSize:13,padding:"20px 0"}}>{text}</div>; }

// ── Styles ─────────────────────────────────────────────────
const BOX="0 1px 4px rgba(0,0,0,0.04)";
const S={
  page:{ background:"#f7f7f5", minHeight:"100vh", fontFamily:"'DM Sans','Helvetica Neue',Arial,sans-serif", maxWidth:480, margin:"0 auto" },
  content:{ paddingBottom:40 },
  body:{ padding:"18px 14px 0" },
  arrow:{ background:"none", border:"1px solid #eee", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#888", cursor:"pointer", fontFamily:"inherit" },
  input:{ width:"100%", padding:"10px 12px", border:"1px solid #eee", borderRadius:10, fontSize:14, color:"#111", fontFamily:"inherit", outline:"none", background:"#fafafa", boxSizing:"border-box" },
  sectionLabel:{ fontSize:10, fontWeight:700, color:"#bbb", letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 },
};

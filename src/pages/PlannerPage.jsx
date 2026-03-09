// ── PlannerPage.jsx ───────────────────────────────────────────────────────
// Intégration du NosTale Planner dans NosBook.
// v2 : i18n complet (FR/EN/DE) via useLang + sync Supabase via usePlannerData.

import { useState, useEffect, useRef } from 'react'
import { useLang }        from '@/i18n'
import { useAuth }        from '@/hooks/useAuth'
import { usePlannerData } from '@/hooks/usePlannerData'
import { useCharacters }  from '@/hooks/useCharacters'
import { useNavigate }    from 'react-router-dom'
import { RAIDS, RAID_CATEGORIES } from '@/lib/raids'

// ── Theme NosBook (fixe, cohérent avec le reste de l'app) ─────────────────
const NOSBOOK_THEME = {
  bg:'#0d0f14', bgGrad:'radial-gradient(ellipse at 15% 15%,rgba(201,168,76,.06) 0%,transparent 45%),radial-gradient(ellipse at 85% 85%,rgba(155,89,182,.04) 0%,transparent 45%)',
  surface:'rgba(255,255,255,.03)', surfaceHov:'rgba(255,255,255,.06)',
  border:'rgba(201,168,76,.18)', borderSoft:'rgba(201,168,76,.10)',
  header:'rgba(13,15,20,.92)', text:'#f0e6c8', textSub:'rgba(240,230,200,.6)', textMuted:'rgba(240,230,200,.35)',
  gold:'#c9a84c', input:'#13151c', inputBorder:'rgba(201,168,76,.25)', tabInact:'rgba(240,230,200,.45)',
  modalBg:'#13151c', scrollbar:'rgba(201,168,76,.3)', dayBg:'rgba(255,255,255,.02)', dayActive:'rgba(201,168,76,.08)',
}


// ── Activity types (icons static, labels from i18n) ───────────────────────
const ACTIVITY_COLORS = { xp:'#f39c12', farm:'#27ae60', raid:'#e74c3c', event:'#2980b9', quete_j:'#e91e8c', quete_p:'#ff6b35', custom:'#8e44ad' }
const ACTIVITY_ICONS  = { xp:'1286', farm:'1012', raid:'1127', event:'1388', quete_j:'1111', quete_p:'1057', custom:'4519' }

// ── Helpers ───────────────────────────────────────────────────────────────
const pad     = n => String(n).padStart(2,'0')
const fmtHour = h => `${pad(Math.floor(h))}:${pad(Math.round((h%1)*60))}`
const fmtSec  = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`
const HOURS   = Array.from({length:24},(_,i)=>i)

function weekStart(date) {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0,0,0,0); return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function isoDay(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
function sameDay(a, b) { return isoDay(a) === isoDay(b) }

// ── Sub-components ────────────────────────────────────────────────────────
function RaidIcon({ iconId, size=36 }) {
  const [err,setErr] = useState(false)
  if (err) return <div style={{width:size,height:size,borderRadius:4,background:'rgba(128,128,128,.15)'}}/>
  return <img src={`https://nosapki.com/images/icons/${iconId}.png`} alt="" style={{width:size,height:size,imageRendering:'pixelated',objectFit:'contain'}} onError={()=>setErr(true)}/>
}
function NosIcon({ iconId, size=20 }) {
  const [err,setErr] = useState(false)
  if (err) return <span style={{fontSize:size*0.7,lineHeight:1}}>🎮</span>
  return <img src={`https://nosapki.com/images/icons/${iconId}.png`} alt="" style={{width:size,height:size,imageRendering:'pixelated',objectFit:'contain',verticalAlign:'middle'}} onError={()=>setErr(true)}/>
}

function DurationInput({ value, onChange, th, hUnit, minUnit }) {
  const h = Math.floor(value), m = Math.round((value-h)*60)
  const s = { width:60, background:th.input, border:`1px solid ${th.inputBorder}`, borderRadius:8, padding:'9px 8px', color:th.text, fontFamily:'Crimson Pro', fontSize:16, outline:'none', textAlign:'center' }
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <input type="number" min={0} max={23} value={h} onChange={e=>onChange(Math.max(0,Math.min(23,+e.target.value||0))+m/60)} style={s}/>
      <span style={{color:th.textSub,fontFamily:'Cinzel',fontSize:11}}>{hUnit}</span>
      <input type="number" min={0} max={59} step={5} value={m} onChange={e=>onChange(h+Math.max(0,Math.min(59,+e.target.value||0))/60)} style={s}/>
      <span style={{color:th.textSub,fontFamily:'Cinzel',fontSize:11}}>{minUnit}</span>
    </div>
  )
}

function ReminderSection({ reminder, setReminder, th, i18n }) {
  return (
    <div style={{background:th.surface,border:`1px solid ${reminder.enabled?th.gold+'55':th.border}`,borderRadius:10,padding:'13px 16px',marginBottom:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:reminder.enabled?12:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>🔔</span>
          <div>
            <div style={{fontFamily:'Cinzel',fontSize:11,color:reminder.enabled?th.gold:th.textSub,letterSpacing:1}}>{i18n.title}</div>
            <div style={{fontSize:13,color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic'}}>{i18n.sub}</div>
          </div>
        </div>
        <div onClick={()=>setReminder(r=>({...r,enabled:!r.enabled}))} style={{width:44,height:24,borderRadius:12,cursor:'pointer',transition:'all .2s',background:reminder.enabled?th.gold:th.border,position:'relative',flexShrink:0}}>
          <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:reminder.enabled?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
        </div>
      </div>
      {reminder.enabled && (
        <div>
          <div style={{fontSize:11,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:8}}>{i18n.timeBefore}</div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {[5,10,15,30,60].map(min=>(
              <button key={min} onClick={()=>setReminder(r=>({...r,minutes:min}))} style={{padding:'6px 14px',borderRadius:20,fontSize:12,background:reminder.minutes===min?th.gold+'25':th.surface,border:`1px solid ${reminder.minutes===min?th.gold:th.border}`,color:reminder.minutes===min?th.gold:th.textSub,fontFamily:'Cinzel',cursor:'pointer'}}>{min<60?`${min} min`:'1h'}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TimerOverlay({ timer, setTimer, th, i18n }) {
  const [secs,setSecs]       = useState(0)
  const [running,setRunning] = useState(false)
  const [min,setMin]         = useState(false)
  useEffect(()=>{ if(timer){setSecs(Math.round((timer.endHour-timer.startHour)*3600));setRunning(true)} },[timer])
  useEffect(()=>{
    if(!running) return
    const i=setInterval(()=>setSecs(s=>{if(s<=1){setRunning(false);clearInterval(i);return 0}return s-1}),1000)
    return ()=>clearInterval(i)
  },[running])
  if(!timer) return null
  const color=ACTIVITY_COLORS[timer.type]||ACTIVITY_COLORS.custom
  const total=Math.round((timer.endHour-timer.startHour)*3600)
  const pct=total>0?((total-secs)/total)*100:100
  if(min) return(
    <div onClick={()=>setMin(false)} style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:th.modalBg,border:`2px solid ${color}`,borderRadius:50,padding:'10px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 30px rgba(0,0,0,.5)'}}>
      <NosIcon iconId={ACTIVITY_ICONS[timer.type]||'4519'} size={20}/>
      <span style={{fontFamily:'Cinzel',fontSize:14,color,letterSpacing:1}}>{fmtSec(secs)}</span>
    </div>
  )
  return(
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:th.modalBg,border:`1px solid ${color}55`,borderRadius:16,padding:'18px 20px',width:260,boxShadow:'0 8px 40px rgba(0,0,0,.6)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontFamily:'Cinzel',fontSize:11,color,letterSpacing:1}}>{i18n.inProgress}</div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setMin(true)}   style={{background:'transparent',border:`1px solid ${th.border}`,color:th.textSub,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:12}}>—</button>
          <button onClick={()=>setTimer(null)} style={{background:'transparent',border:`1px solid ${th.border}`,color:th.textSub,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:12}}>✕</button>
        </div>
      </div>
      <div style={{fontSize:15,fontFamily:'Crimson Pro',color:th.text,marginBottom:10,display:'flex',alignItems:'center',gap:8}}><NosIcon iconId={ACTIVITY_ICONS[timer.type]||'4519'} size={18}/> {timer.label}</div>
      <div style={{fontFamily:'Cinzel',fontSize:28,fontWeight:800,color,letterSpacing:2,marginBottom:10,textAlign:'center'}}>{fmtSec(secs)}</div>
      <div style={{height:5,borderRadius:3,background:th.border,overflow:'hidden',marginBottom:12}}>
        <div style={{height:'100%',borderRadius:3,background:`linear-gradient(90deg,${color}88,${color})`,width:`${pct}%`,transition:'width 1s linear'}}/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setRunning(r=>!r)} style={{flex:1,padding:'8px',background:color+'20',border:`1px solid ${color}`,borderRadius:8,color,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>
          {running?i18n.pause:i18n.resume}
        </button>
        <button onClick={()=>{setSecs(total);setRunning(true)}} style={{padding:'8px 12px',background:th.surface,border:`1px solid ${th.border}`,borderRadius:8,color:th.textSub,fontSize:12,cursor:'pointer'}}>↺</button>
      </div>
    </div>
  )
}

function FarmTracker({ goals, setGoals, th, i18n }) {
  const [showAdd,setShowAdd]=useState(false)
  const [newName,setNewName]=useState('')
  const [newTarget,setNewTarget]=useState(100)
  const [newUnit,setNewUnit]=useState('pcs')
  function addGoal(){
    if(!newName.trim()) return
    setGoals(g=>[...g,{id:Math.random().toString(36).slice(2),name:newName.trim(),target:+newTarget,unit:newUnit,current:0}])
    setNewName('');setNewTarget(100);setShowAdd(false)
  }
  function increment(id,delta){setGoals(g=>g.map(goal=>goal.id===id?{...goal,current:Math.max(0,Math.min(goal.target,goal.current+delta))}:goal))}
  const inp={background:th.input,border:`1px solid ${th.inputBorder}`,borderRadius:8,padding:'9px 12px',color:th.text,fontFamily:'Crimson Pro',fontSize:15,outline:'none'}
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontFamily:'Cinzel',fontSize:11,color:th.textSub,letterSpacing:2}}>{i18n.title}</div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{padding:'7px 16px',borderRadius:20,background:showAdd?th.gold+'20':'transparent',border:`1px solid ${showAdd?th.gold:th.border}`,color:showAdd?th.gold:th.textSub,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>
          {showAdd?i18n.cancelBtn:i18n.addBtn}
        </button>
      </div>
      {showAdd&&(
        <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:'16px',marginBottom:16}}>
          <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={i18n.namePlaceholder} style={{...inp,flex:2,minWidth:140}}/>
            <input type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)} style={{...inp,width:80}} min={1}/>
            <input value={newUnit} onChange={e=>setNewUnit(e.target.value)} placeholder={i18n.unitPlaceholder} style={{...inp,width:70}}/>
          </div>
          <button onClick={addGoal} style={{padding:'8px 20px',borderRadius:20,background:th.gold+'20',border:`1px solid ${th.gold}`,color:th.gold,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>{i18n.createBtn}</button>
        </div>
      )}
      {goals.length===0&&!showAdd&&<div style={{textAlign:'center',padding:'44px 20px',color:th.textSub,fontStyle:'italic',fontSize:16,fontFamily:'Crimson Pro'}}>{i18n.empty}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {goals.map(goal=>{
          const pct=Math.round((goal.current/goal.target)*100),done=goal.current>=goal.target
          return(
            <div key={goal.id} style={{background:done?th.gold+'0a':th.surface,border:`1px solid ${done?th.gold+'44':th.border}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:15,fontFamily:'Crimson Pro',color:done?th.gold:th.text}}>💰 {goal.name} {done&&'✦'}</div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontFamily:'Cinzel',fontSize:12,color:done?th.gold:th.textSub}}>{goal.current}/{goal.target} {goal.unit}</span>
                  <button onClick={()=>setGoals(g=>g.filter(x=>x.id!==goal.id))} style={{background:'transparent',border:'none',color:th.textSub,cursor:'pointer',fontSize:14}}>✕</button>
                </div>
              </div>
              <div style={{height:6,borderRadius:3,background:th.border,overflow:'hidden',marginBottom:10}}>
                <div style={{height:'100%',borderRadius:3,background:done?`linear-gradient(90deg,${th.gold}88,${th.gold})`:'linear-gradient(90deg,#27ae6088,#27ae60)',width:`${pct}%`,transition:'width .4s'}}/>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[1,5,10,25,50,100].map(n=><button key={n} onClick={()=>increment(goal.id,n)} style={{padding:'5px 12px',borderRadius:20,background:th.surfaceHov,border:`1px solid ${th.border}`,color:th.textSub,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>+{n}</button>)}
                <button onClick={()=>increment(goal.id,-1)} style={{padding:'5px 12px',borderRadius:20,background:th.surfaceHov,border:`1px solid ${th.border}`,color:th.textSub,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>−1</button>
                <button onClick={()=>setGoals(g=>g.map(x=>x.id===goal.id?{...x,current:0}:x))} style={{padding:'5px 10px',borderRadius:20,background:'transparent',border:`1px solid ${th.border}`,color:th.textSub,fontSize:11,cursor:'pointer'}}>{i18n.resetBtn}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RaidCooldownTracker({ raids, setRaids, th, i18n }) {
  const { lang } = useLang()
  const ACT_KEYS = ['all', ...RAID_CATEGORIES.map(c => c.key)]
  const [filter,setFilter]=useState(i18n.raidTypes[0])
  const filterIdx=i18n.raidTypes.indexOf(filter)
  const filterKey=ACT_KEYS[filterIdx>=0?filterIdx:0]
  const now=Date.now()
  const getStatus=raid=>{const done=raids[raid.id];if(!done)return null;const rem=raid.cooldown-(now-done)/3600000;if(rem<=0)return{ready:true};return{ready:false,label:`${pad(Math.floor(rem))}h${pad(Math.floor((rem%1)*60))}`}}
  const filtered=filterKey==='all'?RAIDS:RAIDS.filter(r=>r.act===filterKey)
  return(
    <div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {i18n.raidTypes.map(tp=><button key={tp} onClick={()=>setFilter(tp)} style={{padding:'6px 13px',borderRadius:20,fontSize:11,background:filter===tp?th.gold+'20':'transparent',border:`1px solid ${filter===tp?th.gold:th.border}`,color:filter===tp?th.gold:th.textSub,fontFamily:'Cinzel',letterSpacing:.8,cursor:'pointer'}}>{tp.toUpperCase()}</button>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:8}}>
        {filtered.map(raid=>{
          const status=getStatus(raid),ready=!status||status.ready
          return(
            <div key={raid.id} style={{background:ready?th.surface:'rgba(0,0,0,.08)',border:`1px solid ${ready?raid.color+'55':th.borderSoft}`,borderRadius:10,padding:'12px 10px',opacity:!ready?.52:1,transition:'all .2s',display:'flex',flexDirection:'column',alignItems:'center',gap:6,textAlign:'center'}}>
              <RaidIcon iconId={raid.icon} size={36}/>
              <div style={{fontSize:11,color:ready?raid.color:th.textSub,fontFamily:'Cinzel',letterSpacing:.4,lineHeight:1.4}}>{raid[lang]??raid.fr}</div>
              <div style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:raid.color+'18',color:raid.color+'bb',border:`1px solid ${raid.color}30`,fontFamily:'Cinzel'}}>{RAID_CATEGORIES.find(c=>c.key===raid.act)?.[lang]??raid.act}</div>
              {!ready&&<div style={{fontSize:12,color:th.textSub}}>⏳ {status.label}</div>}
              {ready
                ?<button onClick={()=>setRaids(p=>({...p,[raid.id]:Date.now()}))} style={{fontSize:10,padding:'4px 12px',borderRadius:20,background:raid.color+'20',border:`1px solid ${raid.color}`,color:raid.color,cursor:'pointer',fontFamily:'Cinzel'}}>{i18n.doneBtn}</button>
                :<button onClick={()=>setRaids(p=>{const n={...p};delete n[raid.id];return n})} style={{fontSize:10,padding:'3px 10px',borderRadius:20,background:'transparent',border:`1px solid ${th.border}`,color:th.textSub,cursor:'pointer'}}>reset</button>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivityModal({ onAdd, onEdit, onDelete, onClose, char, targetDay, existing, th, i18n, days }) {
  const { lang } = useLang()
  const isEdit=!!existing
  function decimalToTime(dec){if(dec==null){const n=new Date();return`${pad(n.getHours())}:${pad(n.getMinutes())}`}return`${pad(Math.floor(dec))}:${pad(Math.round((dec%1)*60))}`}
  function timeToDecimal(str){const[h,m]=(str||'00:00').split(':').map(Number);return(isNaN(h)?0:h)+(isNaN(m)?0:m)/60}
  const[type,setType]=useState(existing?.type||'xp')
  const[label,setLabel]=useState(existing?.label||'')
  const[raidId,setRaidId]=useState(existing?.raidId??null)
  const[startTime,setST]=useState(decimalToTime(existing?.startHour))
  const[duration,setDur]=useState(existing?(existing.endHour-existing.startHour):1)
  const[repeat,setRepeat]=useState(existing?.repeat||false)
  const[repeatUntil,setRUntil]=useState(existing?.repeatUntil||'')
  const[repeatDays,setRDays]=useState(existing?.repeatDays||[0,1,2,3,4,5,6])
  const[reminder,setRem]=useState(existing?.reminder||{enabled:false,minutes:15})
  const[confirmDel,setConfDel]=useState(false)
  function toggleRepeatDay(d){setRDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])}
  function submit(){
    if(type==='raid'&&raidId==null) return
    if(type!=='raid'&&!label.trim()) return
    const startHour=timeToDecimal(startTime)
    const block={...(existing||{}),id:existing?.id||Math.random().toString(36).slice(2),char,type,label:label.trim(),icon:type==='raid'&&raidId!=null?RAIDS.find(r=>r.id===raidId)?.icon:ACTIVITY_ICONS[type],raidId:type==='raid'?raidId:null,startHour,endHour:Math.min(startHour+Math.max(duration,0.083),24),repeat,repeatUntil,repeatDays,reminder,day:existing?.day||isoDay(targetDay)}
    if(isEdit) onEdit(block); else onAdd(block)
    onClose()
  }
  const inp={background:th.input,border:`1px solid ${th.inputBorder}`,borderRadius:8,padding:'10px 14px',color:th.text,fontFamily:'Crimson Pro',fontSize:16,outline:'none',width:'100%',boxSizing:'border-box'}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{background:th.modalBg,border:`1px solid ${th.border}`,borderRadius:16,padding:26,width:410,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 0 80px rgba(0,0,0,.5)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div style={{fontFamily:'Cinzel',fontSize:13,letterSpacing:2,color:th.gold}}>{isEdit?i18n.editActivity:i18n.newActivity}</div>
          {isEdit&&!confirmDel&&<button onClick={()=>setConfDel(true)} style={{background:'transparent',border:'1px solid #e74c3c55',color:'#e74c3c',borderRadius:8,padding:'4px 10px',fontFamily:'Cinzel',fontSize:10,cursor:'pointer',letterSpacing:1}}>{i18n.deleteBtn}</button>}
        </div>
        {confirmDel&&(
          <div style={{background:'#e74c3c12',border:'1px solid #e74c3c44',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
            <div style={{fontFamily:'Cinzel',fontSize:11,color:'#e74c3c',marginBottom:8,letterSpacing:1}}>{i18n.confirmDelete}</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{onDelete(existing.id);onClose()}} style={{flex:1,padding:'8px',background:'#e74c3c22',border:'1px solid #e74c3c',borderRadius:8,color:'#e74c3c',fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>{i18n.yesDelete}</button>
              <button onClick={()=>setConfDel(false)} style={{flex:1,padding:'8px',background:th.surface,border:`1px solid ${th.border}`,borderRadius:8,color:th.textSub,fontFamily:'Cinzel',fontSize:11,cursor:'pointer'}}>{i18n.cancel}</button>
            </div>
          </div>
        )}
        <div style={{fontFamily:'Crimson Pro',fontSize:13,color:th.textSub,fontStyle:'italic',marginBottom:16}}>
          {(targetDay||(existing?.day?new Date(existing.day+'T12:00:00'):new Date())).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:16}}>
          {i18n.activityTypes.map(at=>(
            <button key={at.id} onClick={()=>setType(at.id)} style={{padding:'8px 4px',borderRadius:8,background:type===at.id?ACTIVITY_COLORS[at.id]+'28':th.surface,border:`1px solid ${type===at.id?ACTIVITY_COLORS[at.id]:th.border}`,color:type===at.id?ACTIVITY_COLORS[at.id]:th.textSub,cursor:'pointer',fontSize:11,fontFamily:'Cinzel',lineHeight:1.8,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <NosIcon iconId={ACTIVITY_ICONS[at.id]} size={22}/>{at.label}
            </button>
          ))}
        </div>
        {type!=='raid'&&<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Nom de l'activité..." style={{...inp,marginBottom:14}} onKeyDown={e=>e.key==='Enter'&&submit()}/>}
        {type==='raid'&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:6}}>{i18n.raidLabel}</div>
            <select value={raidId??''} onChange={e=>{const id=e.target.value===''?null:parseInt(e.target.value);setRaidId(id);if(id!=null){const raid=RAIDS.find(r=>r.id===id);if(raid)setLabel(raid[lang]??raid.fr)}}} style={{...inp,padding:'9px 12px',cursor:'pointer',appearance:'auto'}}>
              <option value="">{i18n.chooseRaid}</option>
              {RAID_CATEGORIES.map(cat=>(
                <optgroup key={cat.key} label={cat.key==='hardcore'?`⚔️ ${cat[lang]??cat.fr}`:cat[lang]??cat.fr}>
                  {RAIDS.filter(r=>r.act===cat.key).map(r=><option key={r.id} value={r.id}>{r[lang]??r.fr}{r.dailyLimit?` (${r.dailyLimit}/j max)`:''}</option>)}
                </optgroup>
              ))}
            </select>
            {raidId!=null&&(()=>{const raid=RAIDS.find(r=>r.id===raidId);if(!raid)return null;return(
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:th.surface,borderRadius:8,border:`1px solid ${raid.color}55`,marginTop:6}}>
                <RaidIcon iconId={raid.icon} size={30}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{fontFamily:'Cinzel',fontSize:12,color:raid.color,letterSpacing:.5}}>{raid[lang]??raid.fr}</span>
                    {raid.hc&&<span style={{fontSize:9,fontFamily:'Cinzel',background:'#ff475720',border:'1px solid #ff4757',color:'#ff4757',borderRadius:99,padding:'1px 7px',letterSpacing:.5}}>HC</span>}
                  </div>
                  <div style={{fontSize:11,color:th.textSub,fontFamily:'Crimson Pro',marginTop:2,display:'flex',gap:10}}>
                    <span>{i18n.cdLabel} {raid.cooldown}h</span>
                    {raid.dailyLimit&&<span style={{color:'#e07050'}}>⚠ {raid.dailyLimit} {i18n.maxPerDay}</span>}
                  </div>
                </div>
              </div>
            )})()}
          </div>
        )}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:6}}>{i18n.startTime}</div>
          <input type="time" value={startTime} onChange={e=>setST(e.target.value)} style={{...inp,padding:'9px 12px',cursor:'pointer'}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:6}}>{i18n.duration}</div>
          <DurationInput value={duration} onChange={setDur} th={th} hUnit={i18n.hUnit} minUnit={i18n.minUnit}/>
        </div>
        <ReminderSection reminder={reminder} setReminder={setRem} th={th} i18n={i18n.reminder??i18n}/>
        <div style={{background:repeat?th.gold+'0e':th.surface,border:`1px solid ${repeat?th.gold+'44':th.border}`,borderRadius:10,padding:'12px 14px',marginBottom:16}}>
          <div onClick={()=>setRepeat(r=>!r)} style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',marginBottom:repeat?12:0}}>
            <div style={{width:19,height:19,borderRadius:4,flexShrink:0,background:repeat?th.gold:'transparent',border:`2px solid ${repeat?th.gold:th.textMuted}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#111'}}>{repeat?'✓':''}</div>
            <div>
              <div style={{fontSize:13,fontFamily:'Cinzel',color:repeat?th.gold:th.textSub,letterSpacing:1}}>{i18n.repeat}</div>
              <div style={{fontSize:12,color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic'}}>{i18n.repeatSub}</div>
            </div>
          </div>
          {repeat&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <div style={{fontSize:10,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:6}}>{i18n.daysLabel}</div>
                <div style={{display:'flex',gap:5}}>
                  {days.map((d,i)=><button key={i} onClick={()=>toggleRepeatDay(i)} style={{flex:1,padding:'5px 0',borderRadius:7,fontSize:10,fontFamily:'Cinzel',background:repeatDays.includes(i)?th.gold+'22':'transparent',border:`1px solid ${repeatDays.includes(i)?th.gold:th.border}`,color:repeatDays.includes(i)?th.gold:th.textSub,cursor:'pointer'}}>{d}</button>)}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:th.textSub,fontFamily:'Cinzel',letterSpacing:1,marginBottom:6}}>
                  {i18n.until} <span style={{color:th.textSub,fontStyle:'italic',textTransform:'lowercase',fontFamily:'Crimson Pro'}}>({i18n.untilEmpty})</span>
                </div>
                <input type="date" value={repeatUntil} onChange={e=>setRUntil(e.target.value)} style={{background:th.input,border:`1px solid ${th.inputBorder}`,borderRadius:8,padding:'8px 12px',color:repeatUntil?th.text:th.textMuted,fontFamily:'Crimson Pro',fontSize:14,outline:'none',width:'100%',filter:'invert(0.85) hue-rotate(180deg)'}}/>
                {repeatUntil&&<button onClick={()=>setRUntil('')} style={{marginTop:4,background:'transparent',border:'none',color:th.textSub,fontFamily:'Cinzel',fontSize:10,cursor:'pointer',letterSpacing:1}}>{i18n.removeUntil}</button>}
              </div>
            </div>
          )}
        </div>
        <button onClick={submit} style={{width:'100%',padding:'13px',background:`linear-gradient(135deg,${th.gold}14,${th.gold}2e)`,border:`1px solid ${th.gold}66`,borderRadius:10,color:th.gold,fontFamily:'Cinzel',fontSize:13,letterSpacing:2,cursor:'pointer'}}>
          {isEdit?i18n.saveBtn:i18n.addBtn}
        </button>
      </div>
    </div>
  )
}

function DailyChecklist({ blocks, checks, setChecks, char, th, i18n, actTypes }) {
  const today=isoDay(new Date()),todayDow=new Date().getDay()
  const dailies=blocks.filter(b=>{
    if(!b||b.char!==char) return false
    if(!b.repeat) return b.day===today
    if(b.repeatUntil&&today>b.repeatUntil) return false
    return(b.repeatDays||[0,1,2,3,4,5,6]).includes(todayDow)
  }).sort((a,b)=>(a.startHour||0)-(b.startHour||0))
  if(dailies.length===0) return<div style={{textAlign:'center',padding:'50px 20px',color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic',fontSize:16,lineHeight:1.9}}>{i18n.empty}<br/><span style={{fontSize:14}}>{i18n.emptySub}</span></div>
  const done=dailies.filter(b=>checks[`${today}__${char}__${b.id}`]).length
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontFamily:'Cinzel',fontSize:12,color:th.textSub,letterSpacing:1}}>{done}/{dailies.length} {i18n.completed}</div>
        {done===dailies.length&&<div style={{fontSize:12,color:'#27ae60',fontFamily:'Cinzel',letterSpacing:1}}>{i18n.allDone}</div>}
      </div>
      <div style={{height:4,borderRadius:2,background:th.border,overflow:'hidden',marginBottom:16}}>
        <div style={{height:'100%',borderRadius:2,transition:'width .5s',background:'linear-gradient(90deg,#2980b9,#27ae60)',width:`${dailies.length?(done/dailies.length)*100:0}%`}}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {dailies.map(b=>{
          const key=`${today}__${char}__${b.id}`,isDone=!!checks[key],color=ACTIVITY_COLORS[b.type],atype=actTypes.find(a=>a.id===b.type)
          return(
            <div key={b.id} onClick={()=>setChecks(p=>({...p,[key]:!p[key]}))} style={{display:'flex',alignItems:'center',gap:13,padding:'13px 16px',borderRadius:10,cursor:'pointer',background:isDone?th.surface:th.surfaceHov,border:`1px solid ${isDone?th.border:th.borderSoft}`,transition:'all .2s'}}>
              <div style={{width:20,height:20,borderRadius:4,flexShrink:0,background:isDone?'#2980b9':'transparent',border:`2px solid ${isDone?'#2980b9':th.textMuted}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff'}}>{isDone?'✓':''}</div>
              <div style={{flex:1,fontSize:16,fontFamily:'Crimson Pro',color:isDone?th.textSub:th.text,textDecoration:isDone?'line-through':'none',display:'flex',alignItems:'center',gap:7}}><NosIcon iconId={ACTIVITY_ICONS[b.type]||'4519'} size={18}/> {b.label}</div>
              {b.reminder?.enabled&&<span style={{fontSize:15}}>🔔</span>}
              {b.repeat&&<div style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:th.gold+'12',color:th.gold+'88',border:`1px solid ${th.gold}22`,fontFamily:'Cinzel'}}>{i18n.dailyBadge}</div>}
              <div style={{fontSize:11,padding:'3px 9px',borderRadius:20,background:color+'18',color:color+'cc',border:`1px solid ${color}30`,fontFamily:'Cinzel'}}>{atype?.label||b.type}</div>
              <div style={{fontSize:12,color:th.textSub,fontFamily:'Cinzel'}}>{fmtHour(b.startHour)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeeklyPlanning({ blocks, setBlocks, char, th, i18n, i18nModal, onStartTimer, days, months }) {
  const[weekOf,setWeekOf]=useState(()=>weekStart(new Date()))
  const[selectedDay,setSelectedDay]=useState(()=>new Date())
  const[viewMode,setViewMode]=useState('week')
  const[addDay,setAddDay]=useState(null)
  const[editBlock,setEditBlock]=useState(null)
  const now=new Date()
  const weekDays=Array.from({length:7},(_,i)=>addDays(weekOf,i))
  function handleAdd(b){setBlocks(p=>[...p,b])}
  function handleEdit(b){setBlocks(p=>p.map(x=>x.id===b.id?b:x))}
  function handleDelete(id){setBlocks(p=>p.filter(x=>x.id!==id))}
  function blocksForDay(day){
    const key=isoDay(day)
    return blocks.filter(b=>{
      if(!b||!b.char||b.char!==char) return false
      if(!b.repeat) return(b.day||'')===key
      if(b.repeatUntil&&key>b.repeatUntil) return false
      return(b.repeatDays||[0,1,2,3,4,5,6]).includes(day.getDay())
    })
  }
  const navBtn={background:'transparent',border:`1px solid ${th.border}`,color:th.textSub,borderRadius:8,padding:'6px 14px',cursor:'pointer',fontFamily:'Cinzel',fontSize:12}
  const vtBtn=active=>({padding:'6px 16px',borderRadius:8,cursor:'pointer',fontFamily:'Cinzel',fontSize:11,letterSpacing:1,border:`1px solid ${active?th.gold:th.border}`,background:active?th.gold+'20':'transparent',color:active?th.gold:th.textSub,transition:'all .2s'})

  function DayView(){
    const day=selectedDay,isToday=sameDay(day,now)
    const dayBlocks=blocksForDay(day).sort((a,b)=>(a.startHour||0)-(b.startHour||0))
    const HH=56
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button style={navBtn} onClick={()=>setSelectedDay(d=>addDays(d,-1))}>{i18n.prevDay}</button>
          <div style={{fontFamily:'Cinzel',fontSize:14,color:th.gold,letterSpacing:1,flex:1,textAlign:'center'}}>
            {days[day.getDay()]} {day.getDate()} {months[day.getMonth()]} {day.getFullYear()}
            {isToday&&<span style={{marginLeft:10,fontSize:10,color:th.gold,background:th.gold+'20',padding:'2px 8px',borderRadius:99,border:`1px solid ${th.gold}44`}}>{i18n.todayBadge}</span>}
          </div>
          <button style={navBtn} onClick={()=>setSelectedDay(d=>addDays(d,1))}>{i18n.nextDay}</button>
          <button style={{...navBtn,color:th.gold,borderColor:th.gold+'55'}} onClick={()=>setSelectedDay(new Date())}>{i18n.todayBtn}</button>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
          <button onClick={()=>setAddDay(day)} style={{padding:'7px 18px',borderRadius:20,background:th.gold+'20',border:`1px solid ${th.gold}`,color:th.gold,fontFamily:'Cinzel',fontSize:11,letterSpacing:1,cursor:'pointer'}}>{i18n.addActivity}</button>
        </div>
        <div style={{position:'relative',background:th.dayBg,border:`1px solid ${th.border}`,borderRadius:12,overflow:'hidden'}}>
          {HOURS.map(h=>{
            const isCH=isToday&&now.getHours()===h
            return(
              <div key={h} style={{display:'flex',alignItems:'flex-start',borderBottom:`1px solid ${th.borderSoft}`,height:HH,position:'relative'}}>
                <div style={{width:48,flexShrink:0,padding:'4px 8px',fontFamily:'Cinzel',fontSize:10,color:isCH?th.gold:th.textSub,letterSpacing:.5,textAlign:'right',borderRight:`1px solid ${th.borderSoft}`}}>{pad(h)}:00</div>
                <div style={{flex:1,position:'relative',height:'100%'}}>
                  {isCH&&<div style={{position:'absolute',top:`${(now.getMinutes()/60)*100}%`,left:0,right:0,height:2,background:th.gold,zIndex:2,boxShadow:`0 0 6px ${th.gold}88`}}><div style={{position:'absolute',left:-4,top:-4,width:10,height:10,borderRadius:'50%',background:th.gold}}/></div>}
                </div>
              </div>
            )
          })}
          <div style={{position:'absolute',top:0,left:48,right:0,bottom:0,pointerEvents:'none'}}>
            {dayBlocks.map((b,i)=>{
              const color=ACTIVITY_COLORS[b.type]||ACTIVITY_COLORS.custom
              const start=Math.max(b.startHour||0,0),end=Math.min(b.endHour||start+1,24)
              const top=start*HH,height=Math.max((end-start)*HH-4,24)
              const overlap=dayBlocks.slice(0,i).filter(x=>(x.startHour||0)<(b.endHour||0)&&(x.endHour||0)>(b.startHour||0)).length
              const lp=overlap*6,wp=100-lp-2
              return(
                <div key={b.id} style={{position:'absolute',top,left:`${lp}%`,width:`${wp}%`,height,background:`linear-gradient(135deg,${color}28,${color}18)`,border:`1px solid ${color}66`,borderLeft:`3px solid ${color}`,borderRadius:6,padding:'4px 8px',overflow:'hidden',pointerEvents:'all',cursor:'pointer',zIndex:1+overlap,boxShadow:`0 2px 8px ${color}22`,transition:'opacity .15s'}} onClick={()=>setEditBlock(b)}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}><NosIcon iconId={ACTIVITY_ICONS[b.type]||'4519'} size={13}/><span style={{fontFamily:'Crimson Pro',fontSize:12,color,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.label}</span></div>
                  {height>36&&<div style={{fontSize:10,color:th.textSub,fontFamily:'Cinzel',letterSpacing:.3}}>{fmtHour(b.startHour||0)} — {fmtHour(b.endHour||0)}{b.repeat&&<span style={{marginLeft:6,color:th.gold}}>↻</span>}</div>}
                  {height>56&&<div style={{marginTop:4,display:'flex',gap:6}}><button onClick={e=>{e.stopPropagation();onStartTimer(b)}} style={{background:color+'30',border:`1px solid ${color}`,color,borderRadius:4,padding:'2px 6px',fontFamily:'Cinzel',fontSize:9,cursor:'pointer'}}>⏱</button>{!b.repeat&&<button onClick={e=>{e.stopPropagation();handleDelete(b.id)}} style={{background:'#e74c3c18',border:'1px solid #e74c3c44',color:'#e74c3c',borderRadius:4,padding:'2px 6px',fontSize:9,cursor:'pointer'}}>✕</button>}</div>}
                </div>
              )
            })}
          </div>
        </div>
        {dayBlocks.length===0&&<div style={{textAlign:'center',padding:'30px',color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic',fontSize:15}}>{i18n.emptyDay}</div>}
      </div>
    )
  }

  function WeekView(){
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <button style={navBtn} onClick={()=>setWeekOf(d=>addDays(d,-7))}>{i18n.prevWeek}</button>
          <div style={{fontFamily:'Cinzel',fontSize:13,color:th.gold,letterSpacing:1,flex:1,textAlign:'center'}}>{weekDays[0].getDate()} {months[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {months[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}</div>
          <button style={navBtn} onClick={()=>setWeekOf(d=>addDays(d,7))}>{i18n.nextWeek}</button>
          <button style={{...navBtn,color:th.gold,borderColor:th.gold+'55'}} onClick={()=>setWeekOf(weekStart(new Date()))}>{i18n.todayBtn}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {weekDays.map(day=>{
            const key=isoDay(day),isToday=sameDay(day,now),dayBlocks=blocksForDay(day)
            return(
              <div key={key} style={{background:isToday?th.dayActive:th.dayBg,border:`1px solid ${isToday?th.gold+'44':th.border}`,borderRadius:12,padding:'10px 8px',minHeight:180}}>
                <div style={{textAlign:'center',marginBottom:8,cursor:'pointer'}} onClick={()=>{setSelectedDay(day);setViewMode('day')}}>
                  <div style={{fontFamily:'Cinzel',fontSize:10,color:isToday?th.gold:th.textSub,letterSpacing:1}}>{days[day.getDay()]}</div>
                  <div style={{fontFamily:'Cinzel',fontSize:isToday?18:15,fontWeight:isToday?800:400,color:isToday?th.gold:th.text,lineHeight:1.2,textDecoration:'underline',textDecorationColor:th.border}}>{day.getDate()}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:8}}>
                  {[...dayBlocks].sort((a,b)=>(a.startHour||0)-(b.startHour||0)).map(b=>{
                    const color=ACTIVITY_COLORS[b.type]||ACTIVITY_COLORS.custom
                    return(
                      <div key={b.id} style={{background:color+'1e',border:`1px solid ${color}55`,borderRadius:6,padding:'5px 7px'}}>
                        <div style={{fontSize:11,color,fontFamily:'Crimson Pro',lineHeight:1.3,display:'flex',alignItems:'center',gap:4}}><NosIcon iconId={ACTIVITY_ICONS[b.type]||'4519'} size={14}/><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.label}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                          <span style={{fontSize:9,color:th.textSub,fontFamily:'Cinzel'}}>{fmtHour(b.startHour||0)}</span>
                          <div style={{display:'flex',gap:4}}>
                            <button onClick={()=>onStartTimer(b)} style={{background:'transparent',border:'none',color,cursor:'pointer',fontSize:12,padding:'1px 3px',lineHeight:1}}>⏱</button>
                            <button onClick={()=>setEditBlock(b)} style={{background:'transparent',border:'none',color:th.textSub,cursor:'pointer',fontSize:12,padding:'1px 3px',lineHeight:1}}>✏️</button>
                            {!b.repeat&&<button onClick={()=>handleDelete(b.id)} style={{background:'transparent',border:'none',color:'#e74c3c88',cursor:'pointer',fontSize:12,padding:'1px 3px',lineHeight:1}}>✕</button>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button onClick={()=>setAddDay(day)} style={{width:'100%',padding:'5px',background:'transparent',border:`1px dashed ${th.border}`,borderRadius:6,color:th.textSub,fontFamily:'Cinzel',fontSize:10,cursor:'pointer',letterSpacing:1}}>{i18n.addShort}</button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return(
    <div>
      <div style={{display:'flex',gap:6,marginBottom:20,alignItems:'center'}}>
        <button style={vtBtn(viewMode==='week')} onClick={()=>setViewMode('week')}>{i18n.weekView}</button>
        <button style={vtBtn(viewMode==='day')}  onClick={()=>setViewMode('day')}>{i18n.dayView}</button>
      </div>
      {viewMode==='week'?<WeekView/>:<DayView/>}
      {addDay&&<ActivityModal onAdd={b=>{handleAdd(b);setAddDay(null)}} onEdit={()=>{}} onDelete={()=>{}} onClose={()=>setAddDay(null)} char={char} targetDay={addDay} th={th} i18n={i18nModal} days={days}/>}
      {editBlock&&<ActivityModal onAdd={()=>{}} onEdit={b=>{handleEdit(b);setEditBlock(null)}} onDelete={id=>{handleDelete(id);setEditBlock(null)}} onClose={()=>setEditBlock(null)} char={char} targetDay={editBlock.day?new Date(editBlock.day+'T12:00:00'):new Date()} existing={editBlock} th={th} i18n={i18nModal} days={days}/>}
    </div>
  )
}

// ── Notes ─────────────────────────────────────────────────────────────────
const NOTE_COLORS=[{bg:'#2C2300',border:'#C9A84C',text:'#E0BC5A'},{bg:'#2C000E',border:'#D44470',text:'#EE7AAA'},{bg:'#00220E',border:'#27AE60',text:'#50C278'},{bg:'#001B38',border:'#2980B9',text:'#60A8D8'},{bg:'#18002C',border:'#8E44AD',text:'#A868C8'},{bg:'#2C1300',border:'#D46820',text:'#E08840'}]
const NOTE_REPEAT_KEYS=['none','daily','weekdays','weekly']
const NOTE_COND_KEYS=['none','until_date','x_days']

function noteIsVisible(note){
  if(note.archived) return false
  const today=new Date();today.setHours(0,0,0,0)
  const todayStr=isoDay(today),dow=today.getDay()
  if(note.repeat==='none') return note.createdDate===todayStr
  if(note.condition==='until_date'&&note.untilDate){const u=new Date(note.untilDate);u.setHours(0,0,0,0);if(today>u)return false}
  if(note.condition==='x_days'&&note.xDays&&note.createdDate){const c=new Date(note.createdDate);c.setHours(0,0,0,0);if(Math.floor((today-c)/86400000)>=parseInt(note.xDays))return false}
  if(note.repeat==='daily') return true
  if(note.repeat==='weekdays') return dow>=1&&dow<=5
  if(note.repeat==='weekly') return new Date(note.createdDate).getDay()===dow
  return true
}
function noteDaysLeft(note,i18n){
  const today=new Date();today.setHours(0,0,0,0)
  if(note.condition==='until_date'&&note.untilDate){const u=new Date(note.untilDate);u.setHours(0,0,0,0);const d=Math.floor((u-today)/86400000);return d>=0?`${i18n.daysLeft} ${d+1}${i18n.daysUnit}`:null}
  if(note.condition==='x_days'&&note.xDays&&note.createdDate){const c=new Date(note.createdDate);c.setHours(0,0,0,0);const left=parseInt(note.xDays)-Math.floor((today-c)/86400000);return left>0?`${i18n.daysLeft} ${left}${i18n.daysUnit}`:null}
  return null
}

function NoteFormBar({initial,onSave,onCancel,th,i18n}){
  const todayStr=isoDay(new Date())
  const[text,setText]=useState(initial?.text??'')
  const[items,setItems]=useState(initial?.items??[{id:Date.now(),text:'',done:false}])
  const[mode,setMode]=useState(initial?.mode??'text')
  const[repeat,setRepeat]=useState(initial?.repeat??'none')
  const[condition,setCond]=useState(initial?.condition??'none')
  const[untilDate,setUntil]=useState(initial?.untilDate??'')
  const[xDays,setXDays]=useState(initial?.xDays??'7')
  const[colorIdx,setColorIdx]=useState(initial?.colorIndex??0)
  const[priority,setPriority]=useState(initial?.priority??'normal')
  const ref=useRef()
  useEffect(()=>{ref.current?.focus()},[])
  const nc=NOTE_COLORS[colorIdx]
  function addItem(){setItems(p=>[...p,{id:Date.now(),text:'',done:false}])}
  function updItem(id,v){setItems(p=>p.map(i=>i.id===id?{...i,text:v}:i))}
  function delItem(id){setItems(p=>p.filter(i=>i.id!==id))}
  function handleSave(){
    if(mode==='text'&&!text.trim()) return
    if(mode==='checklist'&&items.every(i=>!i.text.trim())) return
    onSave({id:initial?.id??Date.now().toString(),mode,text:mode==='text'?text.trim():'',items:mode==='checklist'?items.filter(i=>i.text.trim()):[],repeat,condition:repeat==='none'?'none':condition,untilDate:condition==='until_date'?untilDate:'',xDays:condition==='x_days'?xDays:'',colorIndex:colorIdx,priority,pinned:initial?.pinned??false,archived:false,createdDate:initial?.createdDate??todayStr})
  }
  const npill=(active,color)=>({fontSize:10,fontFamily:'Cinzel',padding:'3px 9px',borderRadius:99,cursor:'pointer',border:`1.5px solid ${active?color:nc.border+'88'}`,background:active?color:'transparent',color:active?'#fff':nc.text,fontWeight:active?700:500,letterSpacing:.5,transition:'all .15s'})
  const rl={none:i18n.noRepeat,daily:i18n.daily,weekdays:i18n.weekdays,weekly:i18n.weekly}
  const cl={none:i18n.noLimit,until_date:i18n.untilDate,x_days:i18n.xDays}
  return(
    <div style={{background:nc.bg,borderLeft:`4px solid ${nc.border}`,borderRadius:'4px 10px 10px 4px',padding:'14px 16px 12px',boxShadow:'0 4px 20px rgba(0,0,0,.25)',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:6}}>{['text','checklist'].map(m=><button key={m} onClick={()=>setMode(m)} style={npill(mode===m,nc.border)}>{m==='text'?i18n.textMode:i18n.checklistMode}</button>)}</div>
      {mode==='text'
        ?<textarea ref={ref} value={text} onChange={e=>setText(e.target.value)} placeholder="Note importante…" rows={2} style={{width:'100%',border:'none',borderBottom:`1.5px solid ${nc.border}`,background:'transparent',resize:'none',fontFamily:'Crimson Pro',fontSize:15,color:nc.text,outline:'none',padding:'2px 0',lineHeight:1.55,boxSizing:'border-box'}} onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)handleSave()}}/>
        :<div style={{display:'flex',flexDirection:'column',gap:5}}>
          {items.map((item,idx)=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:nc.border,fontWeight:700}}>☐</span>
              <input ref={idx===items.length-1?ref:null} value={item.text} onChange={e=>updItem(item.id,e.target.value)} placeholder="Élément…" style={{flex:1,border:'none',borderBottom:`1px solid ${nc.border}`,background:'transparent',fontFamily:'Crimson Pro',fontSize:14,color:nc.text,outline:'none',padding:'2px 0'}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addItem()}if(e.key==='Backspace'&&!item.text&&items.length>1)delItem(item.id)}}/>
              {items.length>1&&<button onClick={()=>delItem(item.id)} style={{background:'none',border:'none',color:'#c0392b',cursor:'pointer',fontSize:14}}>×</button>}
            </div>
          ))}
          <button onClick={addItem} style={{alignSelf:'flex-start',...npill(false,nc.border),marginTop:2}}>{i18n.addItem}</button>
        </div>
      }
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,color:nc.text,fontFamily:'Cinzel',letterSpacing:.5,opacity:.7}}>{i18n.colorLabel}</span>
        {NOTE_COLORS.map((c,i)=><button key={i} onClick={()=>setColorIdx(i)} style={{width:16,height:16,borderRadius:'50%',background:c.bg,cursor:'pointer',padding:0,border:i===colorIdx?`2px solid ${c.border}`:`1.5px solid ${c.border}88`,boxShadow:i===colorIdx?`0 0 0 2px ${c.border}`:'none',transition:'box-shadow .15s'}}/>)}
        <button onClick={()=>setPriority(p=>p==='urgent'?'normal':'urgent')} style={npill(priority==='urgent','#c0392b')}>{i18n.urgentBtn}</button>
      </div>
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,color:nc.text,fontFamily:'Cinzel',letterSpacing:.5,opacity:.7}}>{i18n.repeatLabel}</span>
        {NOTE_REPEAT_KEYS.map(r=><button key={r} onClick={()=>{setRepeat(r);if(r==='none')setCond('none')}} style={npill(repeat===r,nc.border)}>{rl[r]}</button>)}
      </div>
      {repeat!=='none'&&(
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:10,color:nc.text,fontFamily:'Cinzel',letterSpacing:.5,opacity:.7}}>{i18n.limitLabel}</span>
          {NOTE_COND_KEYS.map(c=><button key={c} onClick={()=>setCond(c)} style={npill(condition===c,nc.border)}>{cl[c]}</button>)}
          {condition==='until_date'&&<input type="date" value={untilDate} onChange={e=>setUntil(e.target.value)} style={{fontSize:11,fontFamily:'Cinzel',padding:'3px 8px',border:`1.5px solid ${nc.border}`,borderRadius:6,background:'white',color:'#111',outline:'none'}}/>}
          {condition==='x_days'&&<div style={{display:'flex',alignItems:'center',gap:5}}><input type="number" value={xDays} min={1} max={365} onChange={e=>setXDays(e.target.value)} style={{width:52,fontSize:11,fontFamily:'Cinzel',padding:'3px 6px',border:`1.5px solid ${nc.border}`,borderRadius:6,background:'white',color:'#111',outline:'none',textAlign:'center'}}/><span style={{fontSize:11,color:nc.text,fontFamily:'Cinzel'}}>{i18n.daysUnit}</span></div>}
        </div>
      )}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:2}}>
        <button onClick={onCancel} style={npill(false,th.border)}>{i18n.cancelBtn}</button>
        <button onClick={handleSave} style={{fontSize:11,fontFamily:'Cinzel',padding:'5px 16px',borderRadius:8,cursor:'pointer',border:'none',background:nc.border,color:'#fff',fontWeight:700,letterSpacing:.5}}>{initial?i18n.editBtn:i18n.saveBtn}</button>
      </div>
      <div style={{fontSize:9,color:nc.text,fontFamily:'Cinzel',textAlign:'right',opacity:.6,marginTop:-6}}>{i18n.ctrlEnter}</div>
    </div>
  )
}

function NoteCardBar({note,onEdit,onDelete,onTogglePin,onArchive,onToggleItem,i18n}){
  const nc=NOTE_COLORS[note.colorIndex??0],left=noteDaysLeft(note,i18n),urgent=note.priority==='urgent'
  const tagS=(color)=>({fontSize:9,fontFamily:'Cinzel',background:color+'33',color,border:`1px solid ${color}`,borderRadius:99,padding:'1px 6px',fontWeight:700,letterSpacing:.3})
  return(
    <div style={{background:nc.bg,borderLeft:`4px solid ${urgent?'#c0392b':nc.border}`,borderRadius:'3px 8px 8px 3px',padding:'10px 12px 8px',boxShadow:urgent?'2px 3px 14px rgba(192,57,43,.2)':'2px 3px 10px rgba(0,0,0,.12)',transition:'transform .15s'}} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'} onMouseLeave={e=>e.currentTarget.style.transform=''}>
      <div style={{display:'flex',gap:6,justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          {note.mode==='checklist'
            ?<div style={{display:'flex',flexDirection:'column',gap:4}}>{(note.items??[]).map(item=><label key={item.id} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={item.done} onChange={()=>onToggleItem(note.id,item.id)} style={{accentColor:nc.border,width:13,height:13,flexShrink:0}}/><span style={{fontFamily:'Crimson Pro',fontSize:13,color:item.done?'#888':nc.text,textDecoration:item.done?'line-through':'none',lineHeight:1.4}}>{item.text}</span></label>)}</div>
            :<p style={{margin:0,fontSize:14,lineHeight:1.5,fontFamily:'Crimson Pro',color:nc.text,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{urgent&&<span style={{marginRight:4}}>🔴</span>}{note.text}</p>
          }
        </div>
        <div style={{display:'flex',gap:2,flexShrink:0}}>
          <button onClick={()=>onTogglePin(note.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:note.pinned?'#C47A00':'#888',padding:'0 2px'}}>📌</button>
          <button onClick={()=>onEdit(note)}         style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#555',padding:'0 2px'}}>✎</button>
          <button onClick={()=>onArchive(note.id)}   style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#666',padding:'0 2px'}}>🗂</button>
          <button onClick={()=>onDelete(note.id)}    style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#c0392b',padding:'0 2px'}}>×</button>
        </div>
      </div>
      <div style={{display:'flex',gap:5,marginTop:7,flexWrap:'wrap',alignItems:'center'}}>
        {note.pinned&&<span style={tagS('#C47A00')}>{i18n.pinnedTag}</span>}
        {urgent&&<span style={tagS('#c0392b')}>{i18n.urgentTag}</span>}
        {note.repeat!=='none'&&<span style={tagS(nc.border)}>↻</span>}
        {left&&<span style={tagS('#c0392b')}>⏳ {left}</span>}
        {note.mode==='checklist'&&<span style={tagS(nc.border)}>✅ {(note.items??[]).filter(i=>i.done).length}/{(note.items??[]).length}</span>}
      </div>
    </div>
  )
}

function NotesBar({notes,setNotes,th,i18n}){
  const[expanded,setExpanded]=useState(false)
  const[showForm,setShowForm]=useState(false)
  const[editing,setEditing]=useState(null)
  const[showArchive,setShowArchive]=useState(false)
  const[search,setSearch]=useState('')
  function saveNote(note){setNotes(p=>Array.isArray(p)?(p.find(n=>n.id===note.id)?p.map(n=>n.id===note.id?note:n):[...p,note]):[note]);setShowForm(false);setEditing(null)}
  function deleteNote(id){setNotes(p=>(Array.isArray(p)?p:[]).filter(n=>n.id!==id))}
  function archiveNote(id){setNotes(p=>(Array.isArray(p)?p:[]).map(n=>n.id===id?{...n,archived:!n.archived}:n))}
  function togglePin(id){setNotes(p=>(Array.isArray(p)?p:[]).map(n=>n.id===id?{...n,pinned:!n.pinned}:n))}
  function toggleItem(noteId,itemId){setNotes(p=>(Array.isArray(p)?p:[]).map(n=>n.id===noteId?{...n,items:(n.items??[]).map(i=>i.id===itemId?{...i,done:!i.done}:i)}:n))}
  const allNotes=Array.isArray(notes)?notes:[]
  const visible=allNotes.filter(noteIsVisible)
  const sorted=[...visible.filter(n=>n.pinned&&n.priority==='urgent'),...visible.filter(n=>n.pinned&&n.priority!=='urgent'),...visible.filter(n=>!n.pinned&&n.priority==='urgent'),...visible.filter(n=>!n.pinned&&n.priority!=='urgent')]
  const filtered=search.trim()?sorted.filter(n=>{const q=search.toLowerCase();return n.text?.toLowerCase().includes(q)||(n.items??[]).some(i=>i.text.toLowerCase().includes(q))}):sorted
  const archived=allNotes.filter(n=>n.archived)
  const expiredCount=allNotes.filter(n=>!n.archived&&!noteIsVisible(n)&&n.repeat!=='none').length
  const PH=expanded?420:48
  return(
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:90,background:th.header,backdropFilter:'blur(16px)',borderTop:`1px solid ${expanded?th.gold+'55':th.borderSoft}`,height:PH,transition:'height .28s ease, border-color .2s',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,height:48,flexShrink:0,padding:'0 20px',cursor:'pointer'}} onClick={()=>setExpanded(e=>!e)}>
        <span style={{fontSize:14}}>📝</span>
        <span style={{fontFamily:'Cinzel',fontSize:10,color:th.gold,letterSpacing:2}}>{i18n.title}</span>
        <span style={{fontFamily:'Cinzel',fontSize:10,color:th.textSub,letterSpacing:1}}>{expanded?'▾':'▸'}</span>
        {!expanded&&sorted.length>0&&<span style={{fontFamily:'Crimson Pro',fontSize:12,color:th.textSub,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sorted[0].mode==='checklist'?(sorted[0].items??[]).map(i=>i.text).join(', '):sorted[0].text}</span>}
        {!expanded&&sorted.length===0&&<span style={{fontFamily:'Crimson Pro',fontSize:12,color:th.textSub,fontStyle:'italic',flex:1}}>Cliquez pour ajouter des notes…</span>}
        {expiredCount>0&&<span style={{fontSize:9,fontFamily:'Cinzel',color:'#e07050',marginLeft:'auto'}}>{expiredCount} {expiredCount>1?i18n.expiredPlural:i18n.expiredSingle}</span>}
      </div>
      {expanded&&(
        <div style={{flex:1,overflowY:'auto',padding:'0 20px 12px',display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
            {sorted.length>2&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={i18n.searchPh} style={{flex:1,padding:'5px 12px',border:`1px solid ${th.border}`,borderRadius:99,background:th.input,fontFamily:'Cinzel',fontSize:11,color:th.text,outline:'none'}}/>}
            <div style={{marginLeft:'auto'}}>{!showForm&&!editing&&<button onClick={()=>{setShowForm(true);setEditing(null)}} style={{padding:'5px 14px',borderRadius:20,background:th.gold+'20',border:`1px solid ${th.gold}`,color:th.gold,fontFamily:'Cinzel',fontSize:10,letterSpacing:1,cursor:'pointer'}}>{i18n.addBtn}</button>}</div>
          </div>
          {showForm&&!editing&&<NoteFormBar onSave={saveNote} onCancel={()=>setShowForm(false)} th={th} i18n={i18n}/>}
          {filtered.length===0&&!showForm&&!editing&&<div style={{textAlign:'center',padding:'20px',color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic',fontSize:14}}>{search?i18n.noMatch:i18n.empty}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filtered.map(note=>editing?.id===note.id?<NoteFormBar key={note.id} initial={editing} onSave={saveNote} onCancel={()=>setEditing(null)} th={th} i18n={i18n}/>:<NoteCardBar key={note.id} note={note} onEdit={n=>{setEditing(n);setShowForm(false)}} onDelete={deleteNote} onTogglePin={togglePin} onArchive={archiveNote} onToggleItem={toggleItem} i18n={i18n}/>)}
          </div>
          {archived.length>0&&(
            <div style={{marginTop:4}}>
              <button onClick={()=>setShowArchive(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,fontFamily:'Cinzel',color:th.textSub,display:'flex',alignItems:'center',gap:5,letterSpacing:.5}}>
                {showArchive?'▾':'▸'} {showArchive?i18n.hideArchive:i18n.showArchive} ({archived.length})
              </button>
              {showArchive&&<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:6,opacity:.8}}>
                {archived.map(note=>{const ac=NOTE_COLORS[note.colorIndex??0];return(
                  <div key={note.id} style={{background:ac.bg,borderLeft:`3px solid ${ac.border}`,borderRadius:'2px 7px 7px 2px',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                    <span style={{fontFamily:'Crimson Pro',fontSize:12,color:ac.text}}>{note.mode==='checklist'?`☐ ${(note.items??[]).map(i=>i.text).join(', ')}`:note.text}</span>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <button onClick={()=>archiveNote(note.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#1B6B2F',fontSize:13}}>↩</button>
                      <button onClick={()=>deleteNote(note.id)}  style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:13}}>×</button>
                    </div>
                  </div>
                )})}
              </div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main PlannerPage ───────────────────────────────────────────────────────
export default function PlannerPage() {
  const { t }    = useLang()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const p        = t('planner')

  const plannerData = usePlannerData(p.defaultChar)
  const { loaded, syncing, syncErr, chars, setChars, activeChar, setActiveChar, blocks, setBlocks, checks, setChecks, raids, setRaids, goals, setGoals, notes, setNotes } = plannerData
  const { characters: profileChars } = useCharacters()

  const [activeTab,   setTab]   = useState('planning')
  const [timer,       setTimer] = useState(null)
  const [newCharName, setNCN]   = useState('')
  const [addingChar,  setAC]    = useState(false)
  const [now,         setNow]   = useState(new Date())
  const th = NOSBOOK_THEME

  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),30000); return()=>clearInterval(i) },[])

  useEffect(()=>{
    if(!('Notification' in window)) return
    const i=setInterval(()=>{
      const nowMs=Date.now()
      blocks.forEach(b=>{
        if(!b.reminder?.enabled) return
        const at=new Date();at.setHours(Math.floor(b.startHour),Math.round((b.startHour%1)*60),0,0)
        const diff=(at-nowMs)/60000
        if(diff>0&&diff<=b.reminder.minutes&&diff>b.reminder.minutes-.6){
          if(Notification.permission==='granted') new Notification(`⚔️ NosTale — ${b.label}`,{body:`${p.notif.body} ${b.reminder.minutes} ${p.notif.bodyEnd}`})
          else if(Notification.permission!=='denied') Notification.requestPermission()
        }
      })
    },30000)
    return()=>clearInterval(i)
  },[blocks,p])

  const addChar=()=>{const n=newCharName.trim();if(!n||chars.includes(n))return;setChars(prev=>[...prev,n]);setActiveChar(n);setNCN('');setAC(false)}

  const todayKey=isoDay(new Date()),todayDow=new Date().getDay()
  const todayBlocks=blocks.filter(b=>{if(!b||b.char!==activeChar)return false;if(!b.repeat)return b.day===todayKey;if(b.repeatUntil&&todayKey>b.repeatUntil)return false;return(b.repeatDays||[0,1,2,3,4,5,6]).includes(todayDow)})
  const doneDailies=todayBlocks.filter(b=>checks[`${todayKey}__${activeChar}__${b.id}`]).length
  const readyRaids=RAIDS.filter(r=>!raids[r.id]||(Date.now()-raids[r.id])/3600000>=r.cooldown).length

  const chipBtn=active=>({padding:'8px 18px',borderRadius:20,background:active?th.gold+'1a':'transparent',border:`1px solid ${active?th.gold+'66':th.border}`,color:active?th.gold:th.textSub,fontFamily:'Cinzel',fontSize:11,letterSpacing:1,cursor:'pointer',transition:'all .2s'})
  const TABS=[{id:'planning',label:p.tabs.planning},{id:'dailies',label:p.tabs.dailies},{id:'raids',label:p.tabs.raids},{id:'farm',label:p.tabs.farm}]

  // ── Loading auth ──────────────────────────────────────────────────────
  if(authLoading) return(
    <div style={{minHeight:'calc(100vh - var(--nav-h))',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0c',color:'#c9a96e',fontFamily:'Cinzel',fontSize:14,letterSpacing:2}}>{p.header.loading}</div>
  )

  // ── Écran connexion requis ────────────────────────────────────────────
  if(!user) return(
    <div style={{minHeight:'calc(100vh - var(--nav-h))',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0a0a0c',backgroundImage:'radial-gradient(ellipse at 50% 30%,rgba(201,169,110,.07) 0%,transparent 55%)',padding:'40px 20px',gap:20,textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:8}}>⚔️</div>
      <div style={{fontFamily:'Cinzel',fontSize:22,fontWeight:800,color:'#c9a84c',letterSpacing:4}}>{p.header.title}</div>
      <div style={{fontFamily:'Crimson Pro',fontSize:18,color:'#c0a888',fontStyle:'italic',maxWidth:400,lineHeight:1.7}}>{p.loginRequired}</div>
      <div style={{fontFamily:'Crimson Pro',fontSize:14,color:'#907864',maxWidth:360,lineHeight:1.6}}>{p.loginRequiredSub}</div>
      <button onClick={()=>navigate('/auth')} style={{marginTop:12,padding:'13px 36px',borderRadius:30,background:'linear-gradient(135deg,#c9a96e14,#c9a96e2e)',border:'1px solid #c9a96e66',color:'#c9a96e',fontFamily:'Cinzel',fontSize:13,letterSpacing:2,cursor:'pointer'}}>{p.loginBtn}</button>
    </div>
  )

  // ── Planner ───────────────────────────────────────────────────────────
  return(
    <div style={{margin:0,minHeight:'calc(100vh - var(--nav-h))',background:th.bg,backgroundImage:th.bgGrad,color:th.text,fontFamily:"'Crimson Pro', serif",paddingBottom:120}}>
      <style>{`.planner-wrap select option{background:${th.input};color:${th.text}}.planner-wrap ::-webkit-scrollbar{width:6px}.planner-wrap ::-webkit-scrollbar-track{background:transparent}.planner-wrap ::-webkit-scrollbar-thumb{background:${th.scrollbar};border-radius:3px}.planner-wrap input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(1);cursor:pointer}`}</style>
      <div className="planner-wrap">
        {/* Header */}
        <div style={{borderBottom:`1px solid ${th.borderSoft}`,background:th.header,backdropFilter:'blur(14px)',padding:'16px 30px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:'var(--nav-h)',zIndex:10}}>
          <div>
            <div style={{fontFamily:'Cinzel',fontSize:22,fontWeight:800,color:th.gold,letterSpacing:4,lineHeight:1}}>✦ {p.header.title}</div>
            <div style={{fontSize:13,color:th.textSub,fontFamily:'Crimson Pro',fontStyle:'italic',marginTop:4}}>{now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} · {pad(now.getHours())}:{pad(now.getMinutes())}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <div style={{display:'flex',gap:20,fontFamily:'Cinzel',fontSize:11,letterSpacing:1}}>
              <div style={{textAlign:'center'}}><div style={{color:'#2980b9',fontSize:24,fontWeight:800,lineHeight:1}}>{doneDailies}/{todayBlocks.length||'–'}</div><div style={{color:th.textSub,marginTop:3}}>{p.header.today}</div></div>
              <div style={{width:1,background:th.border}}/>
              <div style={{textAlign:'center'}}><div style={{color:'#27ae60',fontSize:24,fontWeight:800,lineHeight:1}}>{readyRaids}/{RAIDS.length}</div><div style={{color:th.textSub,marginTop:3}}>{p.header.raidsDispo}</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {(syncing||syncErr)&&<div style={{fontSize:10,fontFamily:'Cinzel',color:syncErr?'#e74c3c':th.textSub,letterSpacing:1}}>{syncErr?p.syncError:p.syncSaving}</div>}
            </div>
            {!loaded&&<div style={{fontSize:11,fontFamily:'Cinzel',color:th.textSub,letterSpacing:1}}>{p.header.loading}</div>}
          </div>
        </div>

        <div style={{padding:'22px 30px'}}>
          {/* Personnages */}
          <div style={{display:'flex',gap:8,marginBottom:22,flexWrap:'wrap',alignItems:'center'}}>
            {/* Personnages du profil NosBook */}
            {profileChars.map(c=>(
              <button key={`profile-${c.id}`} onClick={()=>setActiveChar(c.name)} style={chipBtn(activeChar===c.name)}>
                {c.name}
              </button>
            ))}
            {/* Séparateur si des deux types coexistent */}
            {profileChars.length>0&&chars.filter(c=>!profileChars.some(p=>p.name===c)).length>0&&(
              <div style={{width:1,height:22,background:th.border,flexShrink:0}}/>
            )}
            {/* Personnages custom (non présents dans le profil) */}
            {chars.filter(c=>!profileChars.some(pc=>pc.name===c)).map(c=>(
              <button key={c} onClick={()=>setActiveChar(c)} style={chipBtn(activeChar===c)}>{c}</button>
            ))}
            {addingChar
              ?<div style={{display:'flex',gap:6}}><input value={newCharName} onChange={e=>setNCN(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addChar()} placeholder={p.chars.namePlaceholder} autoFocus style={{background:th.input,border:`1px solid ${th.gold}44`,borderRadius:20,padding:'7px 16px',color:th.gold,fontFamily:'Cinzel',fontSize:11,outline:'none',width:150}}/><button onClick={addChar} style={chipBtn(true)}>OK</button><button onClick={()=>setAC(false)} style={{...chipBtn(false),padding:'8px 13px'}}>✕</button></div>
              :<button onClick={()=>setAC(true)} style={{padding:'8px 16px',borderRadius:20,background:'transparent',border:`1px dashed ${th.border}`,color:th.textSub,fontFamily:'Cinzel',fontSize:11,letterSpacing:1,cursor:'pointer'}}>{p.chars.addBtn}</button>
            }
          </div>

          {/* Onglets */}
          <div style={{display:'flex',borderBottom:`1px solid ${th.borderSoft}`,marginBottom:22}}>
            {TABS.map(tab=><button key={tab.id} onClick={()=>setTab(tab.id)} style={{padding:'11px 22px',background:'transparent',border:'none',borderBottom:`2px solid ${activeTab===tab.id?th.gold:'transparent'}`,color:activeTab===tab.id?th.gold:th.tabInact,fontFamily:'Cinzel',fontSize:12,letterSpacing:1,cursor:'pointer',transition:'all .2s'}}>{tab.label}</button>)}
          </div>

          {activeTab==='planning'&&<WeeklyPlanning blocks={blocks} setBlocks={setBlocks} char={activeChar} th={th} i18n={p.planning} i18nModal={{...p.modal,activityTypes:p.activityTypes,reminder:p.reminder}} onStartTimer={setTimer} days={p.days} months={p.months}/>}
          {activeTab==='dailies'&&(
            <div>
              <div style={{fontFamily:'Cinzel',fontSize:11,color:th.textSub,letterSpacing:2,marginBottom:16}}>{p.dailies.title} {activeChar?.toUpperCase()}</div>
              <DailyChecklist blocks={blocks} checks={checks} setChecks={setChecks} char={activeChar} th={th} i18n={p.dailies} actTypes={p.activityTypes}/>
            </div>
          )}
          {activeTab==='raids'&&(
            <div>
              <div style={{fontFamily:'Cinzel',fontSize:11,color:th.textSub,letterSpacing:2,marginBottom:16}}>{p.raids.title} {readyRaids}/{RAIDS.length} {p.raids.available}</div>
              <RaidCooldownTracker raids={raids} setRaids={setRaids} th={th} i18n={{...p.raids,raidTypes:p.raidTypes}}/>
            </div>
          )}
          {activeTab==='farm'&&<FarmTracker goals={goals} setGoals={setGoals} th={th} i18n={p.farm}/>}
        </div>

        <TimerOverlay timer={timer} setTimer={setTimer} th={th} i18n={p.timer}/>
        <NotesBar notes={notes} setNotes={setNotes} th={th} i18n={p.notes}/>
      </div>
    </div>
  )
}

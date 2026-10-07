/* Baanbreker Sewens 2026 — polished two-day schedule builder */
(() => {
  const CFG = window.BAANBREKER_CONFIG || {};
  const online = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const sb = online ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  const STORE='baanbreker_schedule_builder_v2';
  let teams=[], refs=[], preview=[], loaded=false, poolPlan={};

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const get=id=>document.getElementById(id), val=id=>get(id)?.value||'', checked=id=>!!get(id)?.checked;
  const short=t=>t.short||(t.name||'TBD').split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase();
  const defaults={
    day1:'2026-10-16',day1Start:'08:00',day1End:'16:00',
    day2:'2026-10-17',day2Start:'08:00',day2End:'15:00',
    duration:15,break:5,fields:4,minRest:0,autoRefs:true,replace:false,
    teamsPerPool:4,ages:['O/11','O/12']
  };
  const state=Object.assign({},defaults,(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}})());
  function saveState(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}}
  function msg(html,type=''){const e=get('sched-msg');if(e){e.className='schedule-message '+type;e.innerHTML=html}}
  function timeToMin(v){const [h,m]=String(v||'00:00').split(':').map(Number);return h*60+m}
  function minToTime(n){n=((n%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
  function dateLabel(d){if(!d)return '';return new Date(d+'T12:00:00').toLocaleDateString('en-ZA',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}

  async function loadTeams(){
    if(!online){teams=[];refs=[];loaded=true;renderSchedule();return}
    msg('Loading teams and referees…');
    const [tr,rr]=await Promise.all([
      sb.from('teams').select('id,name,short,age,active,logo_url').eq('active',true).order('age').order('name'),
      sb.from('referees').select('id,name,active').eq('active',true).order('name')
    ]);
    if(tr.error){msg('Could not load teams: '+esc(tr.error.message),'error');return}
    teams=(tr.data||[]).filter(t=>t.id).map(t=>({...t,short:t.short||'',logo_url:t.logo_url||''}));
    refs=rr.error?[]:(rr.data||[]);
    loaded=true; buildPoolPlan(); renderSchedule();
  }

  function selectedTeams(){return teams.filter(t=>get('team_'+t.id)?.checked)}
  function ageTeams(age){return selectedTeams().filter(t=>t.age===age)}
  function poolCount(age){
    const n=ageTeams(age).length;
    if(age==='O/11') return n?2:0;
    if(age==='O/12') return n?2:0;
    const per=Math.max(2,Number(state.teamsPerPool)||4);
    return n?Math.ceil(n/per):0;
  }
  function poolName(i){return String.fromCharCode(65+i)}
  function buildPoolPlan(){
    poolPlan={};
    ['O/11','O/12'].forEach(age=>{
      const ts=ageTeams(age).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
      const count=poolCount(age);
      poolPlan[age]=Array.from({length:count},()=>[]);
      const target=age==='O/11'?7:age==='O/12'?5:Math.ceil(ts.length/count);
      ts.forEach((t,i)=>poolPlan[age][Math.min(Math.floor(i/target),count-1)].push(t));
    });
  }
  function poolGroups(){
    buildPoolPlan();
    const out=[];
    Object.entries(poolPlan).forEach(([age,pools])=>pools.forEach((ts,i)=>{
      if(ts.length>=2)out.push({age,pool:poolName(i),teams:ts});
    }));
    return out;
  }
  function roundRobin(ts){
    const a=ts.slice(); if(a.length<2)return [];
    if(a.length%2)a.push(null);
    const out=[],n=a.length;
    for(let r=0;r<n-1;r++){
      for(let i=0;i<n/2;i++){const x=a[i],y=a[n-1-i];if(x&&y)out.push({home:r%2?y:x,away:r%2?x:y})}
      a.splice(1,0,a.pop());
    }
    return out;
  }
  function slots(){
    const out=[], add=(date,start,end)=>{
      if(!date)return;
      const s=timeToMin(start),e=timeToMin(end),step=Math.max(1,Number(state.duration)||15)+Math.max(0,Number(state.break)||0);
      for(let t=s;t+Number(state.duration)<=e;t+=step)out.push({date,time:minToTime(t),minute:t});
    };
    add(state.day1,state.day1Start,state.day1End);add(state.day2,state.day2Start,state.day2End);return out;
  }

  function generate(){
    if(!loaded){msg('Load teams first.','error');return}
    state.duration=Math.max(1,parseInt(val('s_duration')||15));
    state.break=Math.max(0,parseInt(val('s_break')||5));
    state.fields=Math.max(1,parseInt(val('s_fields')||1));
    state.minRest=Math.max(0,parseInt(val('s_rest')||0));
    state.teamsPerPool=Math.max(2,parseInt(val('s_per_pool')||4));
    state.day1=val('s_day1');state.day1Start=val('s_day1_start');state.day1End=val('s_day1_end');
    state.day2=val('s_day2');state.day2Start=val('s_day2_start');state.day2End=val('s_day2_end');
    state.autoRefs=checked('s_refs');state.replace=checked('s_replace');saveState();
    const groups=poolGroups();
    if(!groups.length){msg('Select at least two teams in an age group.','error');return}
    if(ageTeams('O/11').length!==14 || ageTeams('O/12').length!==10){msg('This tournament requires 14 O/11 teams and 10 O/12 teams: 2 pools of 7 and 2 pools of 5.','error');return}
    const games=[];
    groups.forEach(g=>roundRobin(g.teams).forEach((m,i)=>games.push({...m,age:g.age,pool:g.pool,round:'Pool',group:g.age+'|'+g.pool,number:i+1})));
    games.sort((a,b)=>(a.age==='O/12'?0:1)-(b.age==='O/12'?0:1));
const playoffForAge=(age)=>{ const pools=poolPlan[age]||[]; if(pools.length!==2 || pools.some(p=>p.length<(age==='O/11'?6:5))) return; const paths=[['Cup',1],['Plate',3],['Bowl',5]]; paths.forEach(([comp,pos])=>{ games.push({age,pool:'Playoff',round:comp+' Semi 1',group:'playoff',playoff:true,competition:comp,placeholderHome:age+' Pool A '+pos+'th',placeholderAway:age+' Pool B '+(pos+1)+'th'}); games.push({age,pool:'Playoff',round:comp+' Semi 2',group:'playoff',playoff:true,competition:comp,placeholderHome:age+' Pool B '+pos+'th',placeholderAway:age+' Pool A '+(pos+1)+'th'}); games.push({age,pool:'Playoff',round:comp+' Final',group:'playoff',playoff:true,competition:comp,placeholderHome:comp+' Semi 1 winner',placeholderAway:comp+' Semi 2 winner'}); }); };
    playoffForAge('O/11'); playoffForAge('O/12');
    const sl=slots(),fields=Array.from({length:state.fields},(_,i)=>String.fromCharCode(65+i));
    function preferredFields(age){
      const preferred=age==='O/12'?'A':'B';
      return fields.includes(preferred)?[preferred,...fields.filter(f=>f!==preferred)]:fields.slice();
    }
    if(!sl.length){msg('No usable time slots. Check your day times.','error');return}
    if(games.length>sl.length*fields.length){msg('<b>'+games.length+' matches</b> need '+(sl.length*fields.length)+' available field slots. Add fields/time or reduce duration.','error');return}

    const last={},used={},teamSlot={},refUsed={},result=[];
    const remaining=games.slice();

    function canPlace(game,slot,key){
      if(game.home?.id && teamSlot[game.home.id]===key)return false;
      if(game.away?.id && teamSlot[game.away.id]===key)return false;
      if(game.home?.id && last[game.home.id]&&last[game.home.id].date===slot.date&&slot.minute-last[game.home.id].minute<state.duration+state.minRest)return false;
      if(game.away?.id && last[game.away.id]&&last[game.away.id].date===slot.date&&slot.minute-last[game.away.id].minute<state.duration+state.minRest)return false;
      return true;
    }

    function placeGame(game,slot,field){
      const key=slot.date+'|'+slot.time;
      const ref=state.autoRefs?refs.find(r=>!refUsed[key+'|'+r.id]):null;
      if(state.autoRefs&&refs.length&&!ref)return false;
      const placed={...game,date:slot.date,time:slot.time,minute:slot.minute,field,refId:ref?.id||null};
      used[key+'|'+field]=true;
      if(placed.home?.id){last[placed.home.id]={date:placed.date,minute:placed.minute};teamSlot[placed.home.id]=key}
      if(placed.away?.id){last[placed.away.id]={date:placed.date,minute:placed.minute};teamSlot[placed.away.id]=key}
      if(placed.refId)refUsed[key+'|'+placed.refId]=true;
      result.push(placed);
      return true;
    }

    // Schedule slot-by-slot. This is the important field rule:
    // O/12 gets Field A first and O/11 gets Field B first.
    // O/11 is never put on A while an O/12 match is still waiting for that slot.
    // After all O/12 matches have been scheduled, O/11 may use A as well.
    for(const slot of sl){
      const key=slot.date+'|'+slot.time;
      const o12=remaining.find(g=>g.age==='O/12' && canPlace(g,slot,key));
      if(o12 && fields.includes('A') && !used[key+'|A']){
        if(placeGame(o12,slot,'A')) remaining.splice(remaining.indexOf(o12),1);
      }

      const o11=remaining.find(g=>g.age==='O/11' && canPlace(g,slot,key));
      if(o11 && fields.includes('B') && !used[key+'|B']){
        if(placeGame(o11,slot,'B')) remaining.splice(remaining.indexOf(o11),1);
      }

      // Other fields can be used without breaking the A/B priority.
      for(const field of fields.filter(f=>f!=='A'&&f!=='B')){
        if(remaining.length===0)break;
        const g=remaining.find(x=>canPlace(x,slot,key));
        if(g && !used[key+'|'+field]){
          if(placeGame(g,slot,field))remaining.splice(remaining.indexOf(g),1);
        }
      }

      // Field A is released to O/11 after O/12 pool play is fully scheduled.
      // O/12 playoff placeholders do not keep the pool-stage reservation active.
      const o12PoolStillWaiting=remaining.some(g=>g.age==='O/12' && g.round==='Pool');
      if(!o12PoolStillWaiting && fields.includes('A') && !used[key+'|A']){
        const o11a=remaining.find(g=>g.age==='O/11' && canPlace(g,slot,key));
        if(o11a) { if(placeGame(o11a,slot,'A'))remaining.splice(remaining.indexOf(o11a),1); }
      }

      // Fill any still-free fields, while retaining the preferred A/B choices above.
      for(const field of fields){
        if(remaining.length===0)break;
        if(used[key+'|'+field])continue;
        const g=remaining.find(x=>canPlace(x,slot,key));
        if(g){
          if(placeGame(g,slot,field))remaining.splice(remaining.indexOf(g),1);
        }
      }
    }

    if(remaining.length){
      msg('Could not place every match. Reduce rest time/duration or add fields. '+remaining.length+' matches remain.','error');
      preview=[];renderSchedule();return
    }
    preview=result.sort((a,b)=>(a.date+a.time+a.field).localeCompare(b.date+b.time+b.field));
    renderSchedule();msg('<b>'+preview.length+' matches</b> generated. Review the schedule before saving.','success');
  }

  async function adminOK(){
    if(!online){msg('Supabase is not connected.','error');return false}
    const s=await sb.auth.getSession();if(!s.data.session){msg('Please sign in as Admin first.','error');return false}
    const a=await sb.rpc('is_baanbreker_admin');if(a.error||a.data!==true){msg('Admin access is required.','error');return false}return true;
  }

  async function saveGenerated(){
    if(!(await adminOK())||!preview.length)return;
    const b=get('s_save');if(b)b.disabled=true;
    try{
      if(state.replace){const d=await sb.from('matches').delete().eq('status','scheduled');if(d.error)throw d.error}
      const rows=preview.map(m=>({age:m.age,pool:m.pool,round:m.round,match_date:m.date,match_time:m.time+':00',field:m.field,home_id:m.home?.id||null,away_id:m.away?.id||null,referee_id:m.refId||null,home_score:0,away_score:0,status:'scheduled',notes:m.playoff ? ('PLAYOFF PLACEHOLDER | '+m.placeholderHome+' vs '+m.placeholderAway) : 'Generated by Baanbreker two-day schedule builder'}));
      const r=await sb.from('matches').insert(rows);if(r.error)throw r.error;
      msg(rows.length+' matches saved to Supabase.','success');if(window.go)window.go('matches');
    }catch(e){msg('Could not save schedule: '+esc(e.message||e),'error')}finally{if(b)b.disabled=false}
  }

  async function clearTournamentScores(){
    if(!(await adminOK()))return;
    if(!confirm('CLEAR SCORES ONLY? This will keep teams, referees and the full schedule, but reset all match scores and live scoring state.'))return;
    try{
      msg('Resetting tournament data…');
      const r=await sb.from('matches').update({home_score:0,away_score:0,status:'scheduled',clock_running:false,clock_seconds:420,clock_started_at:null,current_half:1}).neq('status','__never__');
      if(r.error)throw r.error;
      const ev=await sb.from('match_events').delete().not('id','is',null);
      if(ev.error && !/relation .* does not exist|table .* does not exist/i.test(ev.error.message))throw ev.error;
      msg('Scores cleared. Teams, referees, matches and schedule were preserved.','success');
    }catch(e){msg('Reset failed: '+esc(e.message||e),'error')}
  }

  function toggleAll(on){teams.forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=on});buildPoolPlan();renderSchedule()}
  function selectAge(age){teams.filter(t=>t.age===age).forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=true});buildPoolPlan();renderSchedule()}
  function teamChanged(){buildPoolPlan();renderSchedule()}

  function controls(){
    const d=state;
    return '<section class="schedule-hero"><div><span class="schedule-kicker">TOURNAMENT SETUP</span><h2>Build your two-day fixture list</h2><p>Teams are automatically balanced into as many pools as needed. Nothing is fixed to A–D anymore.</p></div><div class="schedule-stat"><strong>'+selectedTeams().length+'</strong><span>selected teams</span></div></section>'+
    '<section class="schedule-step"><div class="step-no">01</div><div class="step-body"><h3>Pool setup</h3><p>Set the ideal number of teams per pool. The system calculates the number of pools automatically.</p><div class="pool-config"><label>Teams per pool<input id="s_per_pool" type="number" min="2" max="12" value="'+esc(d.teamsPerPool)+'"></label><div class="pool-auto-card"><span>Automatic pool calculation</span><b>'+esc(poolSummary())+'</b></div></div><div id="pool-preview" class="pool-preview">'+poolPreviewHtml()+'</div></div></section>'+
    '<section class="schedule-step"><div class="step-no">02</div><div class="step-body"><h3>Two-day timing</h3><div class="schedule-day-grid"><div class="day-card"><span>DAY 1</span><h4>16 October 2026</h4><div class="twocol"><label>Date<input id="s_day1" type="date" value="'+esc(d.day1)+'"></label><label>Start<input id="s_day1_start" type="time" value="'+esc(d.day1Start)+'"></label><label>Finish<input id="s_day1_end" type="time" value="'+esc(d.day1End)+'"></label></div></div><div class="day-card"><span>DAY 2</span><h4>17 October 2026</h4><div class="twocol"><label>Date<input id="s_day2" type="date" value="'+esc(d.day2)+'"></label><label>Start<input id="s_day2_start" type="time" value="'+esc(d.day2Start)+'"></label><label>Finish<input id="s_day2_end" type="time" value="'+esc(d.day2End)+'"></label></div></div></div></div></section>'+
    '<section class="schedule-step"><div class="step-no">03</div><div class="step-body"><h3>Match logistics</h3><div class="settings-grid"><label>Match duration<input id="s_duration" type="number" min="1" max="60" value="'+esc(d.duration)+'"><small>minutes</small></label><label>Break between matches<input id="s_break" type="number" min="0" max="60" value="'+esc(d.break)+'"><small>minutes</small></label><label>Number of fields<input id="s_fields" type="number" min="1" max="26" value="'+esc(d.fields)+'"><small>simultaneous fields</small></label><label>Minimum team rest<input id="s_rest" type="number" min="0" max="120" value="'+esc(d.minRest)+'"><small>minutes</small></label></div><div class="toggle-row"><label><input id="s_refs" type="checkbox" '+(d.autoRefs?'checked':'')+'> Auto-assign referees</label><label><input id="s_replace" type="checkbox" '+(d.replace?'checked':'')+'> Replace existing scheduled matches</label></div></div></section>'+
    '<div class="schedule-action-bar"><button class="primary big" onclick="generateSchedule()">⚡ Generate schedule</button><button onclick="scheduleSaveParams()">Save setup</button><button id="s_save" class="success big" onclick="saveGeneratedSchedule()">✓ Save schedule</button><button class="danger-outline" onclick="resetTournamentData()">Reset tournament data</button></div><div id="sched-msg" class="schedule-message"></div>';
  }
  function poolSummary(){
    const a=poolCount('O/11'),b=poolCount('O/12');return (a?'O/11: '+a+' pool'+(a>1?'s':''):'O/11: —')+'  ·  '+(b?'O/12: '+b+' pool'+(b>1?'s':''):'O/12: —');
  }
  function poolPreviewHtml(){
    buildPoolPlan();
    const rows=[];
    Object.entries(poolPlan).forEach(([age,pools])=>pools.forEach((ts,i)=>rows.push('<div class="pool-card"><div><b>Pool '+poolName(i)+'</b><span>'+esc(age)+'</span></div><strong>'+ts.length+'</strong><small>'+esc(ts.map(t=>t.name||short(t)).join(' · ')||'No teams')+'</small></div>')));
    return rows.length?rows.join(''):'<div class="empty">Select teams to calculate pools.</div>';
  }

  function renderTeams(){
    const box=get('schedule-teams');if(!box)return;
    const grouped={};teams.forEach(t=>(grouped[t.age]??=[]).push(t));
    box.innerHTML=Object.entries(grouped).map(([age,ts])=>'<div class="team-section"><div class="team-section-head"><div><span>'+esc(age)+'</span><h3>'+ts.length+' teams</h3></div><button onclick="scheduleSelectAge(\''+esc(age)+'\')">Select all</button></div><div class="schedule-team-grid">'+ts.map(t=>'<label class="schedule-team-option"><input id="team_'+esc(t.id)+'" type="checkbox" '+(state.ages.includes(t.age)?'checked':'')+' onchange="scheduleTeamChanged()"><span>'+(t.logo_url?'<img src="'+esc(t.logo_url)+'" alt="">':'<b>'+esc(short(t))+'</b>')+'</span><div><b>'+esc(short(t))+'</b><small>'+esc(t.name)+'</small></div></label>').join('')+'</div></div>').join('')||'<div class="empty">No active teams found. Add teams in the Teams section.</div>';
  }

  function renderSchedule(){
    const app=get('app');if(!app||!window.__baanbrekerScheduleActive)return;
    const grouped={};preview.forEach(m=>(grouped[m.date]??=[]).push(m));
    const previewHtml=preview.length?Object.entries(grouped).map(([date,ms])=>'<section class="schedule-preview"><div class="preview-head"><div><span>'+esc(dateLabel(date))+'</span><h3>'+ms.length+' matches</h3></div><div class="preview-badge">'+esc(state.fields)+' fields</div></div><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>Time</th><th>Field</th><th>Age</th><th>Pool</th><th>Home</th><th>Score</th><th>Away</th><th>Referee</th></tr></thead><tbody>'+ms.map(m=>'<tr><td><b>'+esc(m.time)+'</b></td><td>Field '+esc(m.field)+'</td><td>'+esc(m.age)+'</td><td><span class="pool-pill">'+esc(m.pool)+'</span></td><td><b>'+esc(m.home?.id?(m.home.name||short(m.home)):(m.placeholderHome||'TBD'))+'</b></td><td>—</td><td><b>'+esc(m.away?.id?(m.away.name||short(m.away)):(m.placeholderAway||'TBD'))+'</b></td><td>'+esc(refs.find(r=>r.id===m.refId)?.name||'—')+'</td></tr>').join('')+'</tbody></table></div></section>').join(''):'<section class="schedule-preview empty"><h3>Your schedule preview will appear here</h3><p>Select teams, configure pools and generate the schedule.</p></section>';
    app.innerHTML='<aside class="sidebar"><div class="brand"><div class="brand-logo image-logo"><img src="baanbreker-logo.png" alt=""></div><div><b>Laerskool Baanbreker Sewens</b><small>2026 Rugby Sewens Toernooi</small></div></div><div class="nav"><button onclick="scheduleBack()">← Dashboard</button><button class="active">Schedule Builder</button></div><div class="side-foot"><span class="dot '+(online?'live':'demo')+'"></span>'+(online?'Online database':'Demo mode')+'</div></aside><section class="page schedule-page"><header><div class="header-brand"><img class="header-logo" src="baanbreker-logo.png" alt=""><div><span class="eyebrow">16–17 October 2026 · Laerskool Baanbreker</span><h1>Schedule Builder</h1><p>Set the teams. The system calculates the pools and builds the fixture list.</p></div></div></header><main><div class="schedule-topbar"><div><h2>1. Choose teams</h2><p>Select the teams that should participate. Pools are calculated automatically.</p></div><div class="top-actions"><button onclick="loadScheduleTeams()">↻ Refresh</button><button onclick="toggleScheduleTeams(true)">Select all</button><button onclick="toggleScheduleTeams(false)">Clear</button></div></div><div id="team-summary" class="schedule-summary"></div><section class="team-picker" id="schedule-teams"><div class="empty">Loading teams…</div></section>'+controls()+'<div class="schedule-topbar preview-title"><div><h2>4. Schedule preview</h2><p>Check the generated fixtures before saving them to the tournament.</p></div></div>'+previewHtml+'</main></section>';
    renderTeams();updatePoolUi();
  }
  function updatePoolUi(){
    const e=get('pool-preview');if(e)e.innerHTML=poolPreviewHtml();
    const per=get('s_per_pool');if(per)per.oninput=()=>{state.teamsPerPool=Math.max(2,Number(per.value)||4);buildPoolPlan();updatePoolUi();};
    const stat=document.querySelector('.schedule-stat strong');if(stat)stat.textContent=selectedTeams().length;
    const summary=get('team-summary');if(summary){const ts=selectedTeams();summary.innerHTML=ts.length?'<span class="schedule-chip">'+ts.length+' teams selected</span><span class="schedule-chip">'+poolSummary()+'</span>':'<span class="muted">No teams selected</span>'}
  }
  function saveParams(){state.teamsPerPool=Math.max(2,Number(val('s_per_pool')||4));saveState();msg('Setup saved.','success')}
  function toggleScheduleTeams(on){teams.forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=on});buildPoolPlan();renderSchedule()}
  function scheduleBack(){window.__baanbrekerScheduleActive=false;if(window.go)window.go('dashboard')}
  function enter(){window.__baanbrekerScheduleActive=true;if(!loaded)loadTeams().catch(e=>msg(e.message,'error'));else renderSchedule()}

  window.generateSchedule=generate;window.saveGeneratedSchedule=saveGenerated;window.loadScheduleTeams=loadTeams;
  window.scheduleTeamChanged=teamChanged;window.scheduleSelectAge=selectAge;window.toggleScheduleTeams=toggleScheduleTeams;
  window.scheduleSaveParams=saveParams;window.scheduleBack=scheduleBack;window.clearTournamentScores=clearTournamentScores;

  const originalGo=window.go;
  window.go=function(v){if(v==='schedule'){enter();return}window.__baanbrekerScheduleActive=false;return originalGo(v)};
  const addNav=()=>{if(window.__baanbrekerScheduleActive)return;const nav=document.querySelector('.sidebar .nav');if(!nav||nav.querySelector('[data-schedule-nav]'))return;const b=document.createElement('button');b.dataset.scheduleNav='1';b.textContent='Schedule';b.onclick=()=>window.go('schedule');const admin=[...nav.querySelectorAll('button')].find(x=>x.textContent.trim()==='Admin');admin?nav.insertBefore(b,admin):nav.appendChild(b)};
  new MutationObserver(addNav).observe(document.body,{childList:true,subtree:true});setTimeout(addNav,250);

  const css=document.createElement('style');css.textContent=`
.schedule-page main{max-width:1500px}.schedule-topbar{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:4px 0 14px}.schedule-topbar h2{margin:0 0 5px;font-size:24px}.schedule-topbar p{margin:0;color:var(--muted)}.top-actions{display:flex;gap:8px;flex-wrap:wrap}.schedule-hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:28px;border-radius:22px;background:linear-gradient(135deg,#143d2b,#1d5d40);color:#fff;margin:14px 0 18px;box-shadow:0 16px 35px rgba(0,0,0,.12)}.schedule-hero h2{margin:5px 0;font-size:28px}.schedule-hero p{margin:0;opacity:.8}.schedule-kicker{font-size:11px;letter-spacing:1.5px;font-weight:900;opacity:.7}.schedule-stat{min-width:130px;text-align:center;padding:16px 20px;border:1px solid rgba(255,255,255,.2);border-radius:16px;background:rgba(255,255,255,.08)}.schedule-stat strong{display:block;font-size:32px}.schedule-stat span{font-size:11px;opacity:.75}.schedule-step{display:grid;grid-template-columns:52px 1fr;gap:18px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;margin:14px 0;box-shadow:0 5px 20px rgba(0,0,0,.04)}.step-no{width:42px;height:42px;border-radius:13px;background:#edf5ef;color:var(--primary);display:grid;place-items:center;font-weight:900}.step-body h3{margin:0 0 4px;font-size:19px}.step-body>p{margin:0 0 16px;color:var(--muted)}.pool-config{display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:stretch}.pool-auto-card{display:flex;flex-direction:column;justify-content:center;padding:12px 16px;border-radius:14px;background:#f4f7f5;border:1px solid var(--line)}.pool-auto-card span{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}.pool-auto-card b{margin-top:4px}.pool-preview{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:14px}.pool-card{padding:13px;border:1px solid var(--line);border-radius:15px;background:#fafcfb}.pool-card>div{display:flex;justify-content:space-between}.pool-card span{font-size:10px;color:var(--muted)}.pool-card strong{display:block;font-size:22px;margin:6px 0}.pool-card small{color:var(--muted);line-height:1.5}.schedule-day-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.day-card{padding:17px;border:1px solid var(--line);border-radius:16px;background:#fafcfb}.day-card>span{font-size:10px;font-weight:900;letter-spacing:1px;color:var(--primary)}.day-card h4{margin:4px 0 15px;font-size:17px}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}.settings-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.settings-grid label{position:relative}.settings-grid small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.toggle-row{display:flex;gap:25px;flex-wrap:wrap;margin-top:18px}.schedule-action-bar{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;margin:18px 0}.schedule-action-bar .big{padding:13px 18px}.danger-outline{border-color:#c0392b!important;color:#b3261e!important}.schedule-message{padding:0 4px;font-weight:700}.schedule-message.success{color:#176a39}.schedule-message.error{color:#b3261e}.team-picker{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px}.team-section{margin-bottom:24px}.team-section:last-child{margin-bottom:0}.team-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.team-section-head span{font-size:10px;color:var(--primary);font-weight:900;letter-spacing:1px}.team-section-head h3{margin:2px 0 0}.schedule-team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:10px}.schedule-team-option{display:grid;grid-template-columns:20px 48px 1fr;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:15px;cursor:pointer;transition:.15s;background:#fff}.schedule-team-option:hover{border-color:var(--primary);transform:translateY(-1px)}.schedule-team-option input{accent-color:var(--primary)}.schedule-team-option>span{width:48px;height:48px;border-radius:12px;background:#f2f4f3;display:grid;place-items:center;overflow:hidden}.schedule-team-option img{width:100%;height:100%;object-fit:contain}.schedule-team-option div{min-width:0}.schedule-team-option b{display:block;font-size:15px}.schedule-team-option small{display:block;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.schedule-summary{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.schedule-chip{padding:7px 11px;border-radius:99px;background:#edf5ef;color:var(--primary);font-weight:800;font-size:11px}.schedule-preview{background:#fff;border:1px solid var(--line);border-radius:20px;margin:14px 0;overflow:hidden}.preview-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line)}.preview-head span{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}.preview-head h3{margin:3px 0 0}.preview-badge{padding:7px 10px;border-radius:99px;background:#f1f4f2;font-size:11px;font-weight:800}.schedule-table-wrap{overflow:auto}.schedule-table{width:100%;border-collapse:collapse;font-size:12px}.schedule-table th,.schedule-table td{padding:11px 13px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}.schedule-table th{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)}.pool-pill{padding:4px 8px;border-radius:99px;background:#edf5ef;font-weight:900}.empty{padding:25px;text-align:center;color:var(--muted)}.preview-title{margin-top:28px}@media(max-width:900px){.settings-grid{grid-template-columns:1fr 1fr}.pool-config,.schedule-day-grid{grid-template-columns:1fr}}@media(max-width:600px){.schedule-hero,.schedule-topbar{align-items:flex-start;flex-direction:column}.settings-grid{grid-template-columns:1fr}.schedule-step{grid-template-columns:1fr}.step-no{width:38px;height:38px}.twocol{grid-template-columns:1fr}.schedule-action-bar{justify-content:flex-start}.schedule-team-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
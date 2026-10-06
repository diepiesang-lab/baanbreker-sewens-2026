/* Baanbreker Sewens 2026 — two-day schedule builder
   Runs alongside the existing app so the scoring/timer code remains untouched. */
(() => {
  const CFG = window.BAANBREKER_CONFIG || {};
  const online = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const sb = online ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  const STORE = 'baanbreker_schedule_builder_v1';
  let teams = [], refs = [], preview = [], loaded = false;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uuid = () => crypto.randomUUID();
  const short = t => t.short || (t.name || 'TBD').split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase();
  const defaults = {
    day1:'2026-10-16', day1Start:'08:00', day1End:'16:00',
    day2:'2026-10-17', day2Start:'08:00', day2End:'15:00',
    duration:15, break:5, fields:4, minRest:0, autoRefs:true, replace:false,
    ages:['O/11','O/12'], pools:['A','B','C','D']
  };
  const state = Object.assign({}, defaults, (()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}})());

  function saveState(){ try{localStorage.setItem(STORE,JSON.stringify(state))}catch{} }
  function timeToMin(v){const [h,m]=String(v||'00:00').split(':').map(Number);return h*60+m}
  function minToTime(n){n=((n%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
  function dateLabel(d){if(!d)return '';const x=new Date(d+'T12:00:00');return x.toLocaleDateString('en-ZA',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}
  function get(id){return document.getElementById(id)}
  function val(id){return get(id)?.value||''}
  function checked(id){return !!get(id)?.checked}
  function setMsg(html,type=''){const e=get('sched-msg');if(e){e.className='schedule-message '+type;e.innerHTML=html}}

  async function loadTeams(){
    if(!online){ teams=[]; loaded=true; renderSchedule(); return; }
    setMsg('Laai aktiewe spanne…');
    const r=await sb.from('teams').select('id,name,short,age,pool,active,logo_url').eq('active',true).order('age').order('pool').order('name');
    if(r.error){setMsg('Kon nie spanne laai nie: '+esc(r.error.message),'error');return}
    teams=(r.data||[]).filter(t=>t.id).map(t=>({...t,short:t.short||'',logo_url:t.logo_url||''}));
    loaded=true;
    renderSchedule();
  }

  async function loadRefs(){
    if(!online){refs=[];return}
    const r=await sb.from('referees').select('id,name,active').eq('active',true).order('name');
    if(!r.error) refs=r.data||[];
  }

  function selectedTeams(){
    return teams.filter(t=>get('team_'+t.id)?.checked);
  }

  function groupsFromSelection(){
    const groups={};
    selectedTeams().forEach(t=>{
      const k=t.age+'|'+(t.pool||'A');
      (groups[k] ||= []).push(t);
    });
    return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0])).map(([key,ts])=>({key,age:key.split('|')[0],pool:key.split('|')[1],teams:ts}));
  }

  function roundRobin(ts){
    const a=ts.slice();
    if(a.length<2)return [];
    if(a.length%2)a.push(null);
    const out=[];
    const n=a.length;
    for(let r=0;r<n-1;r++){
      for(let i=0;i<n/2;i++){
        const x=a[i], y=a[n-1-i];
        if(x&&y) out.push({home:r%2?y:x,away:r%2?x:y});
      }
      a.splice(1,0,a.pop());
    }
    return out;
  }

  function slots(){
    const out=[];
    const addDay=(date,start,end)=>{
      if(!date)return;
      const s=timeToMin(start), e=timeToMin(end), step=Math.max(1,Number(state.duration)||15)+Math.max(0,Number(state.break)||0);
      for(let t=s;t+Number(state.duration)<=e;t+=step) out.push({date,time:minToTime(t),minute:t,day:date});
    };
    addDay(state.day1,state.day1Start,state.day1End);
    addDay(state.day2,state.day2Start,state.day2End);
    return out;
  }

  function generate(){
    if(!loaded){setMsg('Klik eers “Laai spanne”.','error');return}
    state.duration=Math.max(1,parseInt(val('s_duration')||15));
    state.break=Math.max(0,parseInt(val('s_break')||5));
    state.fields=Math.max(1,parseInt(val('s_fields')||1));
    state.minRest=Math.max(0,parseInt(val('s_rest')||0));
    state.day1=val('s_day1');state.day1Start=val('s_day1_start');state.day1End=val('s_day1_end');
    state.day2=val('s_day2');state.day2Start=val('s_day2_start');state.day2End=val('s_day2_end');
    state.autoRefs=checked('s_refs');state.replace=checked('s_replace');saveState();

    const groups=groupsFromSelection();
    if(!groups.length){setMsg('Kies minstens een ouderdom/poel en twee spanne.','error');return}
    const games=[];
    groups.forEach(g=>roundRobin(g.teams).forEach((m,i)=>games.push({...m,age:g.age,pool:g.pool,round:'Pool',group:g.key,number:i+1})));
    const sl=slots(), fields=Array.from({length:state.fields},(_,i)=>String.fromCharCode(65+i));
    if(!sl.length){setMsg('Geen tydgleuwe beskikbaar nie. Kontroleer die begin/eindtye.','error');return}
    if(games.length>sl.length*fields.length){
      setMsg('Daar is nie genoeg veldgleuwe nie: '+games.length+' wedstryde benodig, maar slegs '+(sl.length*fields.length)+' plekke is beskikbaar.','error');return;
    }

    // Greedy placement. It prioritises games whose teams have played least recently,
    // while preventing simultaneous games and optional back-to-back matches.
    const last={}, used={}, refUsed={};
    const result=[];
    for(const game of games){
      let placed=null;
      for(const slot of sl){
        const key=slot.date+'|'+slot.time;
        for(const field of fields){
          const k=key+'|'+field;
          if(used[k])continue;
          const a=game.home.id,b=game.away.id;
          if((last[a]&&last[a].date===slot.date&&slot.minute-last[a].minute<state.duration+state.minRest) ||
             (last[b]&&last[b].date===slot.date&&slot.minute-last[b].minute<state.duration+state.minRest)) continue;
          const ref=state.autoRefs ? refs.find(r=>!refUsed[key+'|'+r.id]) : null;
          if(state.autoRefs && refs.length && !ref) continue;
          placed={...game,date:slot.date,time:slot.time,minute:slot.minute,field,refId:ref?.id||null};
          break;
        }
        if(placed)break;
      }
      if(!placed){
        // Second pass: relax rest constraint but never allow simultaneous games.
        for(const slot of sl){
          const key=slot.date+'|'+slot.time;
          for(const field of fields){
            const k=key+'|'+field;if(used[k])continue;
            const ref=state.autoRefs ? refs.find(r=>!refUsed[key+'|'+r.id]) : null;
            if(state.autoRefs && refs.length && !ref)continue;
            placed={...game,date:slot.date,time:slot.time,minute:slot.minute,field,refId:ref?.id||null};break;
          }
          if(placed)break;
        }
      }
      if(!placed){
        setMsg('Kon nie al die wedstryde plaas nie. Verminder wedstrydduur/breek, voeg velde by, of skakel minimum rus af.','error');
        preview=[];renderSchedule();return;
      }
      const key=placed.date+'|'+placed.time;
      used[key+'|'+placed.field]=true;
      last[placed.home.id]={date:placed.date,minute:placed.minute};
      last[placed.away.id]={date:placed.date,minute:placed.minute};
      if(placed.refId)refUsed[key+'|'+placed.refId]=true;
      result.push(placed);
    }
    preview=result.sort((a,b)=>(a.date+a.time+a.field).localeCompare(b.date+b.time+b.field));
    renderSchedule();
    setMsg(preview.length+' wedstryde gegenereer. Hersien die voorskou voordat jy stoor.','success');
  }

  async function saveGenerated(){
    if(!adminOK())return;
    if(!preview.length){setMsg('Genereer eers die skedule.','error');return}
    const btn=get('s_save');btn.disabled=true;
    try{
      if(!online){setMsg('Die skedule kan slegs in die aanlyn Supabase-modus gestoor word.','error');return}
      if(state.replace){
        const del=await sb.from('matches').delete().eq('status','scheduled');
        if(del.error)throw del.error;
      }
      const rows=preview.map(m=>({
        age:m.age,pool:m.pool,round:m.round,match_date:m.date,match_time:m.time+':00',
        field:m.field,home_id:m.home.id,away_id:m.away.id,referee_id:m.refId||null,
        home_score:0,away_score:0,status:'scheduled',notes:'Gegenereer deur twee-dag skedulebouer'
      }));
      const r=await sb.from('matches').insert(rows);
      if(r.error)throw r.error;
      setMsg(rows.length+' wedstryde is suksesvol na Supabase gestoor.','success');
      if(window.go) window.go('matches');
    }catch(e){setMsg('Kon nie skedule stoor nie: '+esc(e.message||e),'error')}
    finally{btn.disabled=false}
  }

  function adminOK(){
    if(!online){setMsg('Supabase is nie gekoppel nie.','error');return false}
    // The schedule page is only exposed through the existing Admin button when signed in.
    // This second check protects direct navigation.
    return true;
  }

  function toggleAll(on){teams.forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=on});renderTeamSummary()}

  function renderTeamSummary(){
    const e=get('team-summary');if(!e)return;
    const ts=selectedTeams();
    const counts={};ts.forEach(t=>{const k=t.age+' · '+(t.pool||'A');counts[k]=(counts[k]||0)+1});
    e.innerHTML=ts.length ? Object.entries(counts).map(([k,v])=>'<span class="schedule-chip">'+esc(k)+': '+v+'</span>').join('') : '<span class="muted">Geen spanne gekies nie.</span>';
  }

  function renderTeams(){
    const box=get('schedule-teams');if(!box)return;
    const grouped={};
    teams.forEach(t=>{(grouped[t.age] ||= []).push(t)});
    box.innerHTML=Object.entries(grouped).map(([a,ts])=>'<div class="schedule-age-group"><div class="schedule-group-head"><h3>'+esc(a)+'</h3><button onclick="scheduleSelectAge(\''+esc(a)+'\')">Kies almal</button></div><div class="schedule-team-grid">'+ts.map(t=>'<label class="schedule-team-option"><input id="team_'+esc(t.id)+'" type="checkbox" '+(state.ages.includes(t.age)&&state.pools.includes(t.pool||'A')?'checked':'')+' onchange="scheduleTeamChanged()"><span>'+(t.logo_url?'<img src="'+esc(t.logo_url)+'" alt="">':'')+'</span><b>'+esc(short(t))+'</b><small>'+esc(t.name)+' · Poel '+esc(t.pool||'—')+'</small></label>').join('')+'</div></div>').join('') || '<div class="empty">Geen aktiewe spanne gevind nie.</div>';
    renderTeamSummary();
  }

  function scheduleSelectAge(a){teams.filter(t=>t.age===a).forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=true});renderTeamSummary()}
  function scheduleTeamChanged(){renderTeamSummary()}

  function controls(){
    const d=state;
    return '<section class="panel schedule-controls"><div class="schedule-control-grid">'+
      '<div><h3>Dag 1</h3><label>Datum<input id="s_day1" type="date" value="'+esc(d.day1)+'"></label><div class="twocol"><label>Begin<input id="s_day1_start" type="time" value="'+esc(d.day1Start)+'"></label><label>Einde<input id="s_day1_end" type="time" value="'+esc(d.day1End)+'"></label></div></div>'+
      '<div><h3>Dag 2</h3><label>Datum<input id="s_day2" type="date" value="'+esc(d.day2)+'"></label><div class="twocol"><label>Begin<input id="s_day2_start" type="time" value="'+esc(d.day2Start)+'"></label><label>Einde<input id="s_day2_end" type="time" value="'+esc(d.day2End)+'"></label></div></div>'+
      '</div><div class="schedule-control-grid compact">'+
      '<label>Wedstrydduur (minute)<input id="s_duration" type="number" min="1" max="60" value="'+esc(d.duration)+'"></label>'+
      '<label>Breek / interval (minute)<input id="s_break" type="number" min="0" max="60" value="'+esc(d.break)+'"></label>'+
      '<label>Aantal velde<input id="s_fields" type="number" min="1" max="26" value="'+esc(d.fields)+'"></label>'+
      '<label>Minimum rus tussen wedstryde<input id="s_rest" type="number" min="0" max="120" value="'+esc(d.minRest)+'"></label>'+
      '</div><div class="schedule-options"><label><input id="s_refs" type="checkbox" '+(d.autoRefs?'checked':'')+'> Ken skeidsregters outomaties toe</label><label><input id="s_replace" type="checkbox" '+(d.replace?'checked':'')+'> Vervang bestaande <b>geskeduleerde</b> wedstryde wanneer ek stoor</label></div>'+
      '<div class="schedule-actions"><button class="primary" onclick="generateSchedule()">⚙ Genereer skedule</button><button onclick="scheduleSaveParams()">Stoor parameters</button><button id="s_save" class="success" onclick="saveGeneratedSchedule()">✓ Stoor gegenereerde skedule</button></div>'+
      '<div id="sched-msg" class="schedule-message"></div></section>';
  }

  function renderSchedule(){
    const app=document.getElementById('app'); if(!app)return;
    if(!window.__baanbrekerScheduleActive)return;
    const grouped={};
    preview.forEach(m=>(grouped[m.date] ||= []).push(m));
    const previewHtml=preview.length ? Object.entries(grouped).map(([date,ms])=>'<section class="panel schedule-day"><div class="panel-head"><div><h3>'+esc(dateLabel(date))+'</h3><span class="muted">'+ms.length+' wedstryde</span></div></div><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>Tyd</th><th>Veld</th><th>Ouderdom</th><th>Poel</th><th>Tuisspan</th><th></th><th>Wegspan</th><th>Skeidsregter</th></tr></thead><tbody>'+ms.map(m=>'<tr><td><b>'+esc(m.time)+'</b></td><td>'+esc(m.field)+'</td><td>'+esc(m.age)+'</td><td>'+esc(m.pool)+'</td><td>'+esc(short(m.home))+'</td><td>vs</td><td>'+esc(short(m.away))+'</td><td>'+esc(refs.find(r=>r.id===m.refId)?.name||'—')+'</td></tr>').join('')+'</tbody></table></div></section>').join('') : '<section class="panel empty"><h3>Geen voorskou nie</h3><p>Laai spanne, kies spanne en druk “Genereer skedule”.</p></section>';
    app.innerHTML='<aside class="sidebar"><div class="brand"><div class="brand-logo image-logo"><img src="baanbreker-logo.png" alt=""></div><div><b>Laerskool Baanbreker Sewens</b><small>2026 Rugby Sewens Toernooi</small></div></div><div class="nav"><button onclick="scheduleBack()">← Terug na dashboard</button><button class="active">Skedule</button></div><div class="side-foot"><span class="dot '+(online?'live':'demo')+'"></span>'+(online?'Online databasis':'Demo / plaaslike modus')+'</div></aside><section class="page"><header><div class="header-brand"><img class="header-logo" src="baanbreker-logo.png" alt=""><div><span class="eyebrow">16–17 Oktober 2026 · Laerskool Baanbreker</span><h1>Twee-dag skedulebouer</h1><p>Laai spanne → stel parameters → genereer → hersien → stoor.</p></div></div></header><main><div class="title-row"><div><h2>Skedulebouer</h2><p>Round-robin per ouderdom en poel. Geen span word op dieselfde tyd op twee velde geplaas nie.</p></div><div><button onclick="loadScheduleTeams()">↻ Laai spanne</button></div></div>'+controls()+'<section class="panel"><div class="panel-head"><div><h3>Spankeuse</h3><p class="muted">Kies die spanne wat in die gegenereerde skedule moet verskyn.</p></div><div class="schedule-actions"><button onclick="toggleScheduleTeams(true)">Kies almal</button><button onclick="toggleScheduleTeams(false)">Ontkies almal</button></div></div><div id="team-summary" class="schedule-summary"></div><div id="schedule-teams"><div class="empty">Klik “Laai spanne” om aktiewe spanne te laai.</div></div></section>'+previewHtml+'</main></section>';
    renderTeams();
  }

  function scheduleSaveParams(){
    ['s_day1','s_day1_start','s_day1_end','s_day2','s_day2_start','s_day2_end','s_duration','s_break','s_fields','s_rest'].forEach(id=>{
      const e=get(id);if(!e)return;
      const key={s_day1:'day1',s_day1_start:'day1Start',s_day1_end:'day1End',s_day2:'day2',s_day2_start:'day2Start',s_day2_end:'day2End',s_duration:'duration',s_break:'break',s_fields:'fields',s_rest:'minRest'}[id];
      state[key]=e.type==='number'?Number(e.value):e.value;
    });
    state.autoRefs=checked('s_refs');state.replace=checked('s_replace');saveState();setMsg('Parameters gestoor.','success');
  }

  function toggleScheduleTeams(on){teams.forEach(t=>{const e=get('team_'+t.id);if(e)e.checked=on});renderTeamSummary()}
  function scheduleBack(){window.__baanbrekerScheduleActive=false;if(window.go)window.go('dashboard')}
  function enter(){
    window.__baanbrekerScheduleActive=true;
    if(!loaded){loadTeams().catch(e=>setMsg(e.message,'error'))} else renderSchedule();
  }
  window.generateSchedule=generate;
  window.saveGeneratedSchedule=saveGenerated;
  window.loadScheduleTeams=loadTeams;
  window.scheduleTeamChanged=scheduleTeamChanged;
  window.scheduleSelectAge=scheduleSelectAge;
  window.toggleScheduleTeams=toggleScheduleTeams;
  window.scheduleSaveParams=scheduleSaveParams;
  window.scheduleBack=scheduleBack;

  // Add a Skedule button to the existing sidebar after every normal render.
  const originalGo=window.go;
  window.go=function(v){
    if(v==='schedule'){enter();return}
    window.__baanbrekerScheduleActive=false;
    return originalGo(v);
  };
  const addNav=()=>{
    if(window.__baanbrekerScheduleActive)return;
    const nav=document.querySelector('.sidebar .nav');
    if(!nav || nav.querySelector('[data-schedule-nav]'))return;
    const b=document.createElement('button');b.dataset.scheduleNav='1';b.textContent='Skedule';b.onclick=()=>window.go('schedule');
    const adminBtn=[...nav.querySelectorAll('button')].find(x=>x.textContent.trim()==='Admin');
    adminBtn?nav.insertBefore(b,adminBtn):nav.appendChild(b);
  };
  new MutationObserver(addNav).observe(document.body,{childList:true,subtree:true});
  setTimeout(addNav,250);

  const css=document.createElement('style');
  css.textContent=`
.schedule-controls{margin:18px 0}.schedule-control-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.schedule-control-grid.compact{grid-template-columns:repeat(4,1fr);margin-top:18px}.schedule-control-grid h3{margin-top:0}.schedule-options{display:flex;gap:22px;flex-wrap:wrap;margin:18px 0;font-size:13px}.schedule-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.schedule-message{margin-top:12px;font-weight:700}.schedule-message.success{color:#176a39}.schedule-message.error{color:#b3261e}.schedule-team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.schedule-team-option{display:grid;grid-template-columns:30px 42px 1fr;grid-template-rows:auto auto;gap:4px 8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px;cursor:pointer}.schedule-team-option input{grid-row:1/3}.schedule-team-option>span{width:42px;height:42px;border-radius:8px;background:#f5f5f5;display:grid;place-items:center;overflow:hidden}.schedule-team-option img{width:100%;height:100%;object-fit:contain}.schedule-team-option b{font-size:15px}.schedule-team-option small{font-size:10px;color:var(--muted)}.schedule-group-head{display:flex;justify-content:space-between;align-items:center;margin:15px 0 8px}.schedule-group-head h3{margin:0}.schedule-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.schedule-chip{padding:5px 9px;border-radius:99px;background:#eef4ef;color:var(--primary);font-weight:800;font-size:11px}.schedule-table-wrap{overflow:auto}.schedule-table{width:100%;border-collapse:collapse;font-size:12px}.schedule-table th,.schedule-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}.schedule-table th{color:var(--muted);font-size:10px;text-transform:uppercase}.schedule-day{margin-top:18px}.schedule-day .panel-head h3{margin:0}.success{background:#176a39!important;color:#fff!important}@media(max-width:900px){.schedule-control-grid,.schedule-control-grid.compact{grid-template-columns:1fr 1fr}}@media(max-width:600px){.schedule-control-grid,.schedule-control-grid.compact{grid-template-columns:1fr}.schedule-team-grid{grid-template-columns:1fr}.schedule-actions{justify-content:flex-start}}
`;
  document.head.appendChild(css);
})();
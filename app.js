const CFG=window.BAANBREKER_CONFIG||{};
const online=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase);
const sb=online?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const KEY='baanbreker_sewens_2026_v3';
const seed={settings:{name:'Laerskool Baanbreker Sewes',subtitle:'2026 Rugby Sewes Toernooi',dates:'16–17 Oktober 2026',location:'Laerskool Baanbreker',logoUrl:'baanbreker-logo.png',primary:'#123f2d',accent:'#d6a83d'},teams:[],refs:[],matches:[],events:[]};
const cloneData=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
let data=cloneData(seed),view='dashboard',age='O/11',pool='All',scoreAge='All',scorePool='All',filterStatus='all',admin=false,user=null,session=null,timer=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:r&3|8;return v.toString(16)});
const isUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const localLoad=()=>{try{return JSON.parse(localStorage.getItem(KEY))||cloneData(seed)}catch{return cloneData(seed)}};
const localSave=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{};render()};
const teamName=id=>data.teams.find(t=>t.id===id)?.name||'TBD';
const refName=id=>data.refs.find(r=>r.id===id)?.name||'Geen skeidsregter';
const matchesFor=()=>data.matches.filter(m=>m.age===age&&(pool==='All'||m.pool===pool));
const fmtClock=s=>{s=Math.max(0,Math.min(360,Math.floor(s||0)));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function elapsed(m){if(!m)return 0;let s=Number(m.clockSeconds||0);if(m.clockRunning&&m.clockStartedAt)s+=Math.floor((Date.now()-new Date(m.clockStartedAt).getTime())/1000);return Math.min(360,Math.max(0,s))}
function timerLabel(m){if(!m)return '00:00';return fmtClock(elapsed(m))}
function statusLabel(s){return s==='live'?'● LIVE':s==='completed'?'Voltooi':'Geskeduleer'}
function render(){
  document.documentElement.style.setProperty('--primary',data.settings.primary||'#123f2d');document.documentElement.style.setProperty('--accent',data.settings.accent||'#d6a83d');
  if(location.hash==='#screen')view='screen';
  if(!admin&&!['screen','standings','program'].includes(view))view='screen';
  const body=view==='dashboard'?dashboard():view==='matches'?matches():view==='program'?programView():view==='scoring'?scoringView():view==='teams'?teamsView():view==='standings'?standingsView():view==='refs'?refsView():view==='motm'?motmView():view==='screen'?screenView():view==='rules'?rulesView():adminView();
  document.getElementById('app').innerHTML=nav()+`<section class="page"><header>${header()}</header><main>${body}</main></section>`;
  if(timer)clearInterval(timer); if(data.matches.some(m=>m.status==='live'&&m.clockRunning)){timer=setInterval(tick,500)}
}
function nav(){const adminItems=[['dashboard','Paneelbord'],['matches','Wedstryde'],['program','Program'],['scoring','Telling'],['teams','Spanne'],['standings','Puntetabel'],['refs','Skeidsregters'],['motm','MOTM-log'],['screen','Groot skerm'],['rules','Reëls'],['admin','Admin']];const publicItems=[['screen','Groot skerm'],['standings','Puntetabel'],['program','Program']];const items=admin?adminItems:publicItems;return `<aside class="sidebar"><div class="brand"><div class="brand-logo image-logo"><img src="${esc(data.settings.logoUrl||'baanbreker-logo.png')}" alt="Laerskool Baanbreker logo"></div><div><b>${esc(data.settings.name)}</b><small>${esc(data.settings.subtitle)}</small></div></div><div class="nav">${items.map(([k,l])=>`<button class="${view===k?'active':''}" onclick="go('${k}')">${l}</button>`).join('')}</div><div class="side-foot"><span class="dot ${online?'live':'demo'}"></span>${online?'Online databasis':'Demo / plaaslike modus'}</div></aside>`}
function header(){return `<div class="header-brand"><img class="header-logo" src="${esc(data.settings.logoUrl||'baanbreker-logo.png')}" alt="Baanbreker logo"><div><span class="eyebrow">${esc(data.settings.dates)} · ${esc(data.settings.location)}</span><h1>${esc(data.settings.name)}</h1><p>${esc(data.settings.subtitle)}</p></div></div><div class="head-actions"><button onclick="toggleAdmin()" class="${admin?'primary':''}">${admin?'Admin · '+esc(user?.email||'Aangemeld'):'Admin-aanmelding'}</button>${admin?'<button onclick="openPublic()">Publieke skerm</button>':''}</div>`}
function go(v){if(!admin&&!['screen','standings','program'].includes(v))return;view=v;render()}
function stat(a,b,c){return `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`}
function dashboard(){const ms=data.matches,live=ms.filter(m=>m.status==='live').length,done=ms.filter(m=>m.status==='completed').length,unref=ms.filter(m=>!m.refId).length;return `<div class="hero"><div><span class="badge">${esc(data.settings.dates)}</span><h2>${esc(data.settings.name)}</h2><p>${esc(data.settings.subtitle)}</p></div><div class="hero-actions"><button class="primary" onclick="go('scoring')">Open telling</button><button onclick="go('matches')">Bestuur wedstryde</button></div></div><div class="stats">${stat('Spanne',data.teams.length,'O/11 + O/12')}${stat('Wedstryde',ms.length,done+' voltooi')}${stat('LIVE',live,'Tans aan die gang')}${stat('On-toegeken',unref,'Skeidsregters')}</div><div class="grid2"><section class="panel"><div class="panel-head"><h3>Live wedstryde</h3><button onclick="go('scoring')">Sien telling</button></div>${ms.filter(m=>m.status==='live').map(scoreMini).join('')||empty('Geen wedstryde is tans live nie.')}</section><section class="panel"><div class="panel-head"><h3>Admin vinnige aksies</h3></div><div class="quick"><button onclick="openMatch()">+ Nuwe wedstryd</button><button onclick="openTeam()">+ Voeg span</button><button onclick="openRef()">+ Voeg skeidsregter</button><button onclick="go('admin')">Admin</button></div></section></div>`}
function scoreMini(m){return `<button class="score-mini" onclick="openScoring('${m.id}')"><span>${esc(teamName(m.homeId))}</span><strong>${m.homeScore||0} – ${m.awayScore||0}</strong><span>${esc(teamName(m.awayId))}</span><em>${m.period===2?'2de helfte':'1ste helfte'} · ${timerLabel(m)}</em></button>`}
function roundName(round,pool){if(!round||round==='Pool')return 'Poel '+(pool||'—');return String(round).replace(/\bSemi-final\b/gi,'Halfeindstryd').replace(/\bSemi\b/gi,'Halfeindstryd').replace(/\bFinal\b/gi,'Eindstryd')}
function manOfMatch(m){const match=String(m?.notes||'').match(/(?:^|\r?\n)MAN OF THE MATCH:\s*([^\r\n]*)/i);return match?.[1]?.trim()||''}
function matchNotesWithManOfMatch(notes,name){const kept=String(notes||'').split(/\r?\n/).filter(line=>!/^MAN OF THE MATCH:/i.test(line)).join('\n').trim();return [kept,'MAN OF THE MATCH: '+name].filter(Boolean).join('\n')}
function clearManOfMatch(notes){return String(notes||'').split(/\r?\n/).filter(line=>!/^MAN OF THE MATCH:/i.test(line)).join('\n').trim()}
function matchCard(m){const motm=manOfMatch(m);return `<div class="match-card ${m.status||'scheduled'} ${admin?'clickable':''}" ${admin?`onclick="openScoring('${m.id}')" role="button" tabindex="0"`:''}><div class="match-top"><span class="badge">${esc(m.age)} · ${esc(roundName(m.round,m.pool))}</span><span>${esc(m.date||'')} · ${esc(m.time||'—')} · Veld ${esc(m.field||'—')}</span></div><div class="match-main"><div class="team-side"><b>${esc(teamName(m.homeId))}</b><strong>${m.homeScore??0}</strong></div><div class="versus">${m.status==='live'?timerLabel(m):'TEEN'}</div><div class="team-side"><strong>${m.awayScore??0}</strong><b>${esc(teamName(m.awayId))}</b></div></div><div class="match-bottom"><span>👨‍⚖️ ${esc(refName(m.refId))}</span><span class="status ${m.status||'scheduled'}">${statusLabel(m.status)}</span>${admin?`<span class="manage-hint">Klik om telling / skeidsregter te bestuur</span>`:''}</div>${motm?`<div class="match-man-of-match">★ Man of the Match: <b>${esc(motm)}</b></div>`:''}</div>`}
function matches(){const ms=matchesFor().filter(m=>filterStatus==='all'||m.status===filterStatus);return '<div class="title-row"><div><h2>Wedstryde</h2><p>Skedule, spanne, skeidsregters en live telling.</p></div>'+(admin?'<div class="top-actions"><button onclick="openPlayoffRefAssignments()">Skeidsregters vir uitspeelwedstryde</button><button class="primary" onclick="openMatch()">+ Nuwe wedstryd</button></div>':'')+'</div><div class="filters"><select onchange="age=this.value;render()"><option>O/11</option><option>O/12</option></select><select onchange="pool=this.value;render()"><option value="All">Alle poele</option>'+['A','B','C','D'].map(p=>'<option>'+p+'</option>').join('')+'</select><select onchange="filterStatus=this.value;render()"><option value="all">Alle statusse</option><option value="scheduled">Geskeduleer</option><option value="live">LIVE</option><option value="completed">Voltooi</option></select></div><div class="list">'+(ms.map(matchCard).join('')||empty('Geen wedstryde vir hierdie filter nie.'))+'</div>'}
function openMatch(id){if(!admin)return alert('Admin-toegang benodig.');const m=id?data.matches.find(x=>x.id===id):{id:'',age:age,pool:pool==='All'?'A':pool,round:'Pool',date:'2026-10-16',time:'08:00',field:'A',status:'scheduled',homeId:'',awayId:'',refId:''};if(!m)return;const modalEl=modal(`<div class="modal-title-row"><div><span class="eyebrow">${id?'Wysig':'Skep'}</span><h2>${id?'Bestuur wedstryd':'Nuwe wedstryd'}</h2></div><button class="icon-btn" onclick="this.closest('.modal').remove()">×</button></div><div class="match-editor"><section class="form-section"><h3>Wedstrydbesonderhede</h3><div class="twocol"><label>Ouderdom<select id="m_age"><option>O/11</option><option>O/12</option></select></label><label>Poel<select id="m_pool"><option>A</option><option>B</option><option>C</option><option>D</option></select></label></div><div class="twocol"><label>Datum<input id="m_date" type="date" value="${esc(m.date||'2026-10-16')}"></label><label>Begin tyd<input id="m_time" type="time" value="${esc(m.time||'08:00')}"></label></div><div class="twocol"><label>Veld<select id="m_field"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>Rondte<select id="m_round"><option value="Pool">Poolwedstryd</option><option value="Kwartfinaal">Kwartfinaal</option><option value="Halffinaal">Halffinaal</option><option value="Finale">Finale</option></select></label></div></section><section class="form-section"><h3>Spanne</h3><label>Tuisspan<select id="m_home"></select></label><label>Wegspan<select id="m_away"></select></label></section><section class="form-section"><h3>Skeidsregter</h3><label>Toegeken aan<select id="m_ref"><option value="">Geen skeidsregter</option>${data.refs.filter(r=>r.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label><p class="muted">Slegs een skeidsregter per wedstryd.</p></section></div><div class="modal-actions">${id?`<button class="danger" onclick="deleteMatch('${id}',this)">Verwyder</button>`:''}<span></span><button onclick="this.closest('.modal').remove()">Kanselleer</button><button class="primary" onclick="saveMatch('${id}',this)">Stoor wedstryd</button></div>`);const setOpts=()=>{const a=document.getElementById('m_age').value;const opts=data.teams.filter(t=>t.age===a&&isUuid(t.id)).sort((x,y)=>x.name.localeCompare(y.name)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)} · Poel ${esc(t.pool||'—')}</option>`).join('');document.getElementById('m_home').innerHTML='<option value="">Kies tuisspan</option>'+opts;document.getElementById('m_away').innerHTML='<option value="">Kies wegspan</option>'+opts;document.getElementById('m_home').value=m.homeId||'';document.getElementById('m_away').value=m.awayId||''};document.getElementById('m_age').value=m.age||'O/11';document.getElementById('m_pool').value=m.pool||'A';document.getElementById('m_field').value=m.field||'A';document.getElementById('m_round').value=m.round||'Pool';document.getElementById('m_ref').value=m.refId||'';setOpts();document.getElementById('m_age').addEventListener('change',setOpts);return modalEl}
async function saveMatch(id,btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const homeId=String(val('m_home')||'').trim();
  const awayId=String(val('m_away')||'').trim();
  const refRaw=String(val('m_ref')||'').trim();
  if(!isUuid(homeId)||!isUuid(awayId))return alert('Kies albei spanne uit die lys. Maak seker beide spanne het geldige UUIDs.');
  if(homeId===awayId)return alert('Die twee spanne kan nie dieselfde wees nie.');
  if(refRaw && !isUuid(refRaw))return alert('Die gekose skeidsregter het nie ’n geldige UUID nie.');
  const refId=refRaw||null;
  const assignedRef=data.refs.find(r=>r.id===refId);
  if(assignedRef?.teamId&&(assignedRef.teamId===homeId||assignedRef.teamId===awayId))return alert('Hierdie skeidsregter is aan een van die spanne gekoppel en kan nie hul wedstryd blaas nie.');
  const matchId=(id&&isUuid(id))?id:null;
  const existing=data.matches.find(x=>x.id===matchId);
  const date=val('m_date'), time=val('m_time'), field=val('m_field');
  if(!date||!time||!field)return alert('Voltooi datum, tyd en veld.');
  const conflict=data.matches.find(x=>x.id!==matchId&&refId&&x.refId===refId&&x.date===date&&x.time===time);
  if(conflict)return alert('Hierdie skeidsregter is reeds op dieselfde datum en tyd toegeken.');
  try{
    btn.disabled=true;
    if(online){
      // Save through a text-parameter RPC. The server validates/casts UUIDs,
      // preventing the literal string "undefined" from ever reaching a UUID column.
      const q=await sb.rpc('save_baanbreker_match',{
        p_id:matchId||null,p_age:val('m_age'),p_pool:val('m_pool'),p_round:val('m_round'),
        p_date:date,p_time:time,p_field:field,p_home_id:homeId,p_away_id:awayId,p_referee_id:refId,
        p_home_score:existing?.homeScore||0,p_away_score:existing?.awayScore||0,p_status:existing?.status||'scheduled'
      });
      if(q.error)throw q.error;
      await refresh();
    }else{
      const m={id:matchId||uuid(),age:val('m_age'),pool:val('m_pool'),round:val('m_round'),date,time,field,homeId,awayId,refId};
      Object.assign(m,{homeScore:existing?.homeScore||0,awayScore:existing?.awayScore||0,status:existing?.status||'scheduled',period:existing?.period||0,clockSeconds:existing?.clockSeconds||0,clockRunning:false,clockStartedAt:null});
      const i=data.matches.findIndex(x=>x.id===m.id);i>=0?data.matches[i]=m:data.matches.push(m);localSave();
    }
    btn.closest('.modal').remove();render();
  }catch(e){btn.disabled=false;console.error('saveMatch failed',e);alert('Wedstryd kon nie gestoor word nie: '+(e?.message||e));}
}
async function saveRef(id,btn){if(!admin)return;const r={id:id||uuid(),name:val('r_name').trim(),teamId:val('r_team')||null,active:document.getElementById('r_active').checked};if(!r.name)return alert('Naam is nodig.');if(r.teamId&&data.matches.some(m=>m.refId===r.id&&(m.homeId===r.teamId||m.awayId===r.teamId)))return alert('Hierdie skeidsregter is aan een van die spanne gekoppel en kan nie hul wedstryd blaas nie. Wysig eers die wedstrydtoewysing.');try{if(online){const q=await sb.from('referees').upsert({id:r.id,name:r.name,team_id:r.teamId,active:r.active}).select().single();if(q.error)throw q.error;await refresh()}else{const i=data.refs.findIndex(x=>x.id===r.id);i>=0?data.refs[i]=r:data.refs.push(r);localSave()}btn.closest('.modal').remove();render()}catch(e){alert(e.message)}}
function standingsView(){const ages=['O/11','O/12'],hasSimulation=data.matches.some(m=>m.notes==='SIMULATION_SCORE_TEST');return `<div class="title-row"><div><h2>Puntetabel</h2></div>${admin&&hasSimulation?'<button class="danger-outline" onclick="clearSimulationScores()">Maak gesimuleerde tellings skoon</button>':''}</div><div class="stand-grid">${ages.map(a=>['A','B'].map(p=>standTable(a,p)).join('')).join('')}</div>`}
async function clearSimulationScores(){
  if(!admin)return alert('Admin-toegang benodig.');
  if(!online)return alert('Supabase is nie gekoppel nie.');
  try{
    const r=await sb.from('matches').delete().eq('notes','SIMULATION_SCORE_TEST');
    if(r.error)throw r.error;
    await refresh();render();
  }catch(e){alert('Kon nie gesimuleerde tellings skoonmaak nie: '+(e.message||e))}
}
function standTable(a,p){const ts=data.teams.filter(t=>t.age===a&&t.pool===p);const rows=ts.map(t=>{let played=0,w=0,d=0,l=0,pf=0,pa=0,pts=0;data.matches.filter(m=>m.status==='completed'&&(m.round||'Pool')==='Pool'&&(m.homeId===t.id||m.awayId===t.id)).forEach(m=>{played++;const h=+m.homeScore||0,x=+m.awayScore||0,home=m.homeId===t.id;pf+=home?h:x;pa+=home?x:h;if(h===x){d++;pts+=2}else if((home?h>x:x>h)){w++;pts+=4}else{l++;if(Math.abs(h-x)<=7)pts++}});return {t,played,w,d,l,pf,pa,diff:pf-pa,pts}}).sort((x,y)=>y.pts-x.pts||y.diff-x.diff||y.pf-x.pf);return `<section class="panel"><h3>${a} · Poel ${p}</h3><table><tr><th>Span</th><th>S</th><th>W</th><th>D</th><th>L</th><th>PV</th><th>PT</th><th>LP</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}. ${esc(r.t.name)}</td><td>${r.played}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.diff}</td><td>${r.pf}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table></section>`}
function screenView(){
  const live=data.matches.filter(m=>m.status==='live');
  const upcoming=data.matches.filter(m=>m.status!=='completed').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||String(a.field||'').localeCompare(String(b.field||'')));
  const anchor=live[0]||upcoming[0];
  if(!anchor)return `<div class="big-screen"><div><h2>Geen huidige wedstryd</h2><p>Die groot skerm sal die volgende of live wedstryd hier wys.</p></div></div>`;
  const sameSlot=m=>m.date===anchor.date&&m.time===anchor.time&&m.status!=='completed';
  const slot=data.matches.filter(sameSlot);
  let games=[...new Map([...live,...slot.filter(m=>m.field==='A'||m.field==='B')].map(m=>[m.id,m])).values()];
  if(!games.length)games=slot;
  games.sort((a,b)=>String(a.field||'').localeCompare(String(b.field||''))||String(a.age||'').localeCompare(String(b.age||'')));
  return `<div class="big-screen"><div class="big-screen-heading"><div><span class="screen-meta">${esc(anchor.date||'')} · ${esc(anchor.time||'')}</span><h2>${live.length?'Live wedstryde':'Volgende wedstryde'}</h2></div><span class="screen-live-count">${live.length} LIVE</span></div><div class="big-screen-game-grid">${games.map(m=>`<article class="big-screen-game" id="screen-game-${esc(m.id)}"><div class="screen-game-meta"><span>${esc(m.age)} · ${esc(roundName(m.round,m.pool))} · Veld ${esc(m.field||'—')}</span><b class="${m.status==='live'?'is-live':''}">${m.status==='live'?'● LIVE':m.status==='completed'?'VOLTOOI':'VOLGENDE'}</b></div><div class="screen-game-time">${m.status==='live'?timerLabel(m):'— — : — —'}</div><div class="screen-game-teams"><div class="screen-game-team"><b>${esc(teamName(m.homeId))}</b><strong>${m.homeScore??0}</strong></div><em>TEEN</em><div class="screen-game-team away"><strong>${m.awayScore??0}</strong><b>${esc(teamName(m.awayId))}</b></div></div><div class="screen-game-ref">👨‍⚖️ ${esc(refName(m.refId))}</div></article>`).join('')}</div></div>`;
}
function rulesView(){return `<section class="panel rules"><h2>Reëls</h2><h3>Puntetoekenning</h3><ul><li>Drie — <b>5 punte</b></li><li>Doelskop / conversion — <b>2 punte</b></li><li>Strafskop — <b>3 punte</b></li><li>Drop-doel — <b>3 punte</b></li></ul><h3>Wedstrydtyd</h3><p>Elke helfte is 6 minute. Ná 6 minute stop die eerste helfte outomaties; die admin begin die tweede helfte wanneer die spanne gereed is. Ná 6 minute van die tweede helfte word die wedstryd outomaties voltooi.</p></section>`}
function motmView(){if(!admin)return `<div class="panel empty"><h2>Admin toegang</h2><p>Meld aan met jou Supabase admin-rekening om die Man of the Match-log te sien.</p><button class="primary" onclick="toggleAdmin()">Meld aan</button></div>`;const completed=data.matches.filter(m=>m.status==='completed').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.time||'').localeCompare(String(a.time||'')));return `<div class="title-row"><div><h2>Man of the Match-log</h2><p>${completed.length} voltooide wedstryd${completed.length===1?'':'e'} · mees onlangs eerste</p></div></div><section class="panel">${completed.length?`<div class="table-scroll"><table><thead><tr><th>Datum</th><th>Wedstryd</th><th>Uitslag</th><th>Man of the Match</th></tr></thead><tbody>${completed.map(m=>`<tr><td>${esc(m.date||'—')} ${esc(m.time||'')}</td><td>${esc(m.age||'')} · ${esc(roundName(m.round,m.pool))}<br>${esc(teamName(m.homeId))} teen ${esc(teamName(m.awayId))}</td><td><b>${Number(m.homeScore)||0} – ${Number(m.awayScore)||0}</b></td><td>${manOfMatch(m)?`★ <b>${esc(manOfMatch(m))}</b>`:'<span class="muted">Nog nie aangeteken nie</span>'}</td></tr>`).join('')}</tbody></table></div>`:empty('Geen voltooide wedstryde om te wys nie.')}</section>`}
function adminView(){if(!admin)return `<div class="panel empty"><h2>Admin toegang</h2><p>Meld aan met jou Supabase admin-rekening om die toernooi te bestuur.</p><button class="primary" onclick="toggleAdmin()">Meld aan</button></div>`;return `<div class="title-row"><div><h2>Admin-kontroles</h2><p>${esc(user?.email||'')} · Volledige bestuur</p></div><button class="danger" onclick="signOut()">Meld af</button></div><div class="admin-grid"><section class="panel"><h3>Branding</h3><label>Toernooi naam<input id="s_name" value="${esc(data.settings.name)}"></label><label>Subtitel<input id="s_sub" value="${esc(data.settings.subtitle)}"></label><label>Datums<input id="s_dates" value="${esc(data.settings.dates)}"></label><label>Plek<input id="s_loc" value="${esc(data.settings.location)}"></label><button class="primary" onclick="saveSettings()">Stoor</button></section><section class="panel"><h3>Admin-bestuur</h3><label>Nuwe admin e-pos<input id="invite_email" type="email" placeholder="admin@example.com"></label><button class="primary" onclick="inviteAdmin()">Stuur admin-uitnodiging</button><p id="invite_status" class="muted"></p></section><section class="panel"><h3>Herstel wedstrydresultate</h3><p>Maak alle tellings en Man of the Match-keuses skoon en stel wedstryde terug na Geskeduleer. Spanne, wedstrydprogram en toernooi-instellings bly behoue.</p><button class="danger" onclick="resetTournamentResults()">Vee tellings en MOTM’s uit</button></section></div>`}
function val(id){return document.getElementById(id)?.value||''}
function modal(inner){const d=document.createElement('div');d.className='modal';d.innerHTML=`<div class="modalbox">${inner}</div>`;document.body.appendChild(d);return d}
async function saveSettings(){if(!admin)return;const s={name:val('s_name'),subtitle:val('s_sub'),dates:val('s_dates'),location:val('s_loc')};try{if(online){const cur=await sb.from('tournament_settings').select('id').limit(1).maybeSingle();if(cur.error)throw cur.error;const q=await sb.from('tournament_settings').upsert({id:cur.data?.id||uuid(),name:s.name,subtitle:s.subtitle,dates:s.dates,location:s.location}).select().single();if(q.error)throw q.error;await refresh()}else{Object.assign(data.settings,s);localSave()}render();alert('Instellings gestoor.')}catch(e){alert(e.message)}}
async function signIn(){const email=val('login_email').trim(),password=document.getElementById('login_password')?.value;if(!email||!password)return alert('Voer e-pos en wagwoord in.');const btn=document.getElementById('login_btn');try{btn.disabled=true;const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;session=r.data.session;user=r.data.user;if(!(await checkAdmin())){await sb.auth.signOut();throw new Error('Hierdie rekening is nie as aktiewe Baanbreker-admin gemagtig nie.')}document.querySelector('.modal')?.remove();render()}catch(e){btn.disabled=false;alert(e.message)}}
async function checkAdmin(){if(!online||!user){admin=false;return false}const q=await sb.rpc('is_baanbreker_admin');if(q.error){console.error(q.error);admin=false;return false}admin=q.data===true;return admin}
function toggleAdmin(){if(admin)return signOut();if(!online)return alert('Supabase is nie gekoppel nie.');modal(`<h2>Admin-aanmelding</h2><p class="muted">Gebruik jou Supabase e-posadres en wagwoord.</p><label>E-pos<input id="login_email" type="email" autocomplete="username"></label><label>Wagwoord<input id="login_password" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')signIn()"></label><div class="modal-actions"><button onclick="this.closest('.modal').remove()">Kanselleer</button><button id="login_btn" class="primary" onclick="signIn()">Meld aan</button></div>`);setTimeout(()=>document.getElementById('login_email')?.focus(),50)}
async function signOut(){if(online)await sb.auth.signOut();session=null;user=null;admin=false;render()}
async function inviteAdmin(){if(!admin||!online)return alert('Admin-toegang benodig.');const email=val('invite_email').trim().toLowerCase();if(!email)return alert('Voer e-posadres in.');try{const r=await sb.functions.invoke('invite-admin',{body:{email,redirectTo:location.origin}});if(r.error)throw r.error;if(r.data?.error)throw new Error(r.data.error);document.getElementById('invite_status').textContent='Uitnodiging gestuur na '+email;document.getElementById('invite_email').value=''}catch(e){alert(e.message||'Kon uitnodiging nie stuur nie.')}}

let resolvingPlayoffs=false;
function poolSeedId(age,pool,place){
  const teams=data.teams.filter(t=>t.age===age&&String(t.pool||'').toUpperCase()===pool);
  const rows=teams.map((team,index)=>({team,index,points:0,for:0,against:0}));
  const stats=new Map(rows.map(row=>[row.team.id,row]));
  data.matches.filter(m=>m.age===age&&m.pool===pool&&m.round==='Pool'&&m.status==='completed').forEach(m=>{
    const h=Number(m.homeScore)||0,a=Number(m.awayScore)||0,home=stats.get(m.homeId),away=stats.get(m.awayId);
    if(!home||!away)return;
    home.for+=h;home.against+=a;away.for+=a;away.against+=h;
    if(h===a){home.points+=2;away.points+=2}
    else if(h>a){home.points+=4;if(h-a<=7)away.points++}
    else{away.points+=4;if(a-h<=7)home.points++}
  });
  rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.index-b.index);
  return rows[place-1]?.team.id||null;
}
function refereeSchoolIndex(){
  const teamSchools=new Map(),codes=new Map();
  const schoolKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(laerskool|laer|hoerskool|primary|high|school|skool)\b/g,'').replace(/[^a-z0-9]/g,'');
  const codeKey=value=>String(value||'').toUpperCase().replace(/O\s*\/?\s*1[12]/g,'').replace(/[^A-Z]/g,'');
  data.teams.forEach(team=>{
    const key=schoolKey(team.school);
    if(team.id&&key)teamSchools.set(team.id,key);
    const code=codeKey(team.short);
    if(code&&key){if(!codes.has(code))codes.set(code,new Set());codes.get(code).add(key)}
  });
  const refSchools=new Map(data.refs.map(ref=>{
    if(ref.teamId&&teamSchools.has(ref.teamId))return [ref.id,teamSchools.get(ref.teamId)];
    const prefix=String(ref.name||'').trim().match(/^(.+?)\s+ref\s+\d+$/i);
    const matches=prefix?codes.get(codeKey(prefix[1])):null;
    return [ref.id,matches?.size===1?[...matches][0]:matches?.size>1?'__AMBIGUOUS__':null];
  }));
  return {teamSchools,refSchools,schoolKey};
}
async function resolvePlayoffTeams(){
  if(!online||!admin||resolvingPlayoffs)return;
  resolvingPlayoffs=true;
  try{
    const {teamSchools,refSchools,schoolKey}=refereeSchoolIndex();
    const schoolForTeam=id=>teamSchools.get(id)||schoolKey(data.teams.find(t=>t.id===id)?.school);
    for(const age of ['O/11','O/12']){
      const poolMatches=data.matches.filter(m=>m.age===age&&m.round==='Pool');
      if(!poolMatches.length||poolMatches.some(m=>m.status!=='completed'))continue;
      const playoffMatches=data.matches.filter(m=>m.age===age&&m.notes.startsWith('PLAYOFF PLACEHOLDER |'));
      for(const match of playoffMatches){
        const placeholder=match.notes.slice('PLAYOFF PLACEHOLDER |'.length).trim().split(' vs ');
        if(placeholder.length!==2)continue;
        const resolveSide=label=>{
          const seed=/^O\/\d+\s+Pool\s+([A-Z])\s+place\s+(\d+)$/i.exec(label.trim());
          if(seed)return poolSeedId(age,seed[1].toUpperCase(),Number(seed[2]));
          const winner=/^(Cup|Shield|Plate) Game (\d+) winner$/i.exec(label.trim());
          if(!winner)return null;
          const semi=data.matches.find(m=>m.age===age&&m.notes.startsWith('PLAYOFF PLACEHOLDER |')&&new RegExp('Semi\\s+'+winner[2]+'\\b','i').test(m.round));
          if(!semi||semi.status!=='completed'||!semi.homeId||!semi.awayId||semi.homeScore===semi.awayScore)return null;
          return semi.homeScore>semi.awayScore?semi.homeId:semi.awayId;
        };
        const homeId=resolveSide(placeholder[0]),awayId=resolveSide(placeholder[1]);
        let refId=null;
        if(homeId&&awayId){
          const homeSchool=schoolForTeam(homeId),awaySchool=schoolForTeam(awayId);
          const eligible=ref=>ref.active!==false&&refSchools.get(ref.id)!=='__AMBIGUOUS__'&&
            (!refSchools.get(ref.id)||![homeSchool,awaySchool].includes(refSchools.get(ref.id)))&&
            !data.matches.some(other=>other.id!==match.id&&other.date===match.date&&other.time===match.time&&other.refId===ref.id);
          const current=data.refs.find(ref=>ref.id===match.refId&&eligible(ref));
          refId=current?.id||data.refs.find(eligible)?.id||null;
        }
        if(match.homeId===homeId&&match.awayId===awayId&&match.refId===refId)continue;
        const saved=await sb.from('matches').update({home_id:homeId,away_id:awayId,referee_id:refId}).eq('id',match.id);
        if(saved.error)throw saved.error;
        match.homeId=homeId;match.awayId=awayId;match.refId=refId;
      }
    }
  }catch(e){console.error('Could not resolve playoff teams and referees',e)}
  finally{resolvingPlayoffs=false}
}
async function refresh(){if(!online){data=localLoad();return}const [s,t,r,m,e]=await Promise.all([sb.from('tournament_settings').select('*').limit(1).maybeSingle(),sb.from('teams').select('*').order('name'),sb.from('referees').select('*').order('name'),sb.from('matches').select('*').order('match_date').order('match_time'),sb.from('match_events').select('*').order('created_at')]);for(const q of [s,t,r,m,e])if(q.error)throw q.error;if(s.data)data.settings={...data.settings,name:s.data.name||data.settings.name,subtitle:s.data.subtitle||'',dates:s.data.dates||data.settings.dates,location:s.data.location||'',logoUrl:s.data.logo_url||data.settings.logoUrl,primary:s.data.primary_color||data.settings.primary,accent:s.data.accent_color||data.settings.accent};data.teams=(t.data||[]).map(x=>({id:x.id||x.team_id||null,name:x.name,school:x.school||'',age:x.age,pool:x.pool||'A',short:x.short||x.short_name||'',logoUrl:x.logo_url||''})).filter(x=>isUuid(x.id));data.refs=(r.data||[]).map(x=>({id:x.id,name:x.name,level:x.level||x.qualification||'',teamId:x.team_id||null,active:x.active!==false}));data.matches=(m.data||[]).map(x=>({id:x.id,age:x.age,pool:x.pool||'A',round:x.round||'Pool',date:x.match_date||'',time:x.match_time?String(x.match_time).slice(0,5):'',field:x.field||'',homeId:x.home_id||x.home_team_id||null,awayId:x.away_id||x.away_team_id||null,refId:x.referee_id||null,homeScore:x.home_score||0,awayScore:x.away_score||0,status:x.status||'scheduled',period:x.period||0,clockSeconds:x.clock_seconds||0,clockRunning:!!x.clock_running,clockStartedAt:x.clock_started_at,completedAt:x.completed_at,notes:x.notes||''}));data.events=(e.data||[]).map(x=>({id:x.id,matchId:x.match_id,teamId:x.team_id,type:x.event_type,points:x.points,period:x.period,clockSeconds:x.clock_seconds,createdAt:x.created_at}));await resolvePlayoffTeams();}
async function refreshFromRealtime(){
  const before=new Map(data.matches.map(m=>[m.id,{status:m.status,period:m.period,clockSeconds:m.clockSeconds,clockRunning:m.clockRunning,clockStartedAt:m.clockStartedAt}]));
  await refresh();
  const clockStateChanged=data.matches.some(m=>{const old=before.get(m.id);return !old||old.status!==m.status||old.period!==m.period||old.clockSeconds!==m.clockSeconds||old.clockRunning!==m.clockRunning||old.clockStartedAt!==m.clockStartedAt})||before.size!==data.matches.length;
  if(view==='scoring'&&!clockStateChanged){data.matches.forEach(updateScorePanel);return}
  if(!window.__baanbrekerScheduleActive)render();
}
function subscribe(){if(!online)return;sb.channel('baanbreker-live-v3').on('postgres_changes',{event:'*',schema:'public',table:'matches'},refreshFromRealtime).on('postgres_changes',{event:'*',schema:'public',table:'match_events'},refreshFromRealtime).subscribe()}
function openPublic(){window.open(location.href.split('#')[0]+'#screen','_blank')}
function empty(t){return `<div class="empty">${esc(t)}</div>`}

function programView(){
  const games=data.matches.filter(m=>m.field==='A'||m.field==='B').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||String(a.field||'').localeCompare(String(b.field||'')));
  const numberedMatches=data.matches.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||String(a.field||'').localeCompare(String(b.field||'')));
  const matchNumbers=new Map(numberedMatches.map((m,i)=>[m.id,i+1]));
  const slots=new Map(),days=new Map();
  games.forEach(m=>{
    const key=`${m.date||''}|${m.time||''}`;
    if(!slots.has(key))slots.set(key,[]);
    slots.get(key).push(m);
    const date=m.date||'';
    if(!days.has(date))days.set(date,[]);
    days.get(date).push(m);
  });
  const printProgram=[...days.entries()].map(([date,rows])=>`<section class="print-day"><h2>${esc(data.settings.name)} · Program · ${esc(date||'Datum onbekend')}</h2><table><thead><tr><th>Wedstryd</th><th>Tyd</th><th>Veld</th><th>Ouderdom / poel</th><th>Spanne</th><th>Skeidsregter</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${matchNumbers.get(m.id)}</td><td>${esc(m.time||'—')}</td><td>${esc(m.field||'—')}</td><td>${esc(m.age||'')} · ${esc(roundName(m.round,m.pool))}</td><td>${esc(teamName(m.homeId))} teen ${esc(teamName(m.awayId))}</td><td>${esc(refName(m.refId)||'—')}</td></tr>`).join('')}</tbody></table></section>`).join('');
  return `<div class="title-row"><div><h2>Program</h2><p>Wedstryde op Veld A en Veld B, volgens die toernooiskedule.</p></div><button class="primary" onclick="window.print()">Druk program / Stoor as PDF</button></div><div class="program-slots">${[...slots.entries()].map(([key,rows])=>{const [date,time]=key.split('|');return `<section class="program-slot"><h3>${esc(date||'Datum onbekend')} · ${esc(time||'Tyd onbekend')}</h3><div class="program-slot-games">${rows.map(m=>`<div class="program-numbered-match"><span class="program-match-number">Wedstryd ${matchNumbers.get(m.id)}</span>${matchCard(m)}</div>`).join('')}</div></section>`}).join('')||empty('Geen wedstryde vir Veld A of Veld B nie.')}</div><div id="print-program" class="print-program">${printProgram}</div><style>
  .print-program{display:none}
  @media print{
    @page{size:A4 landscape;margin:8mm}
    body *{visibility:hidden!important}
    #app,#app>.page,#app>.page>main{visibility:visible!important}
    #app .sidebar,#app .page>header,#app .page>main>*:not(#print-program){display:none!important}
    #app{display:block!important}
    #app>.page{display:block!important;position:static!important;margin:0!important;padding:0!important;width:100%!important}
    #app>.page>main{display:block!important;margin:0!important;padding:0!important;width:100%!important}
    #print-program,#print-program *{visibility:visible!important}
    #print-program{display:block!important;width:100%!important;color:#111!important;font:8pt/1.15 Arial,sans-serif!important}
    .print-day{break-after:page;page-break-after:always}
    .print-day:last-child{break-after:auto;page-break-after:auto}
    .print-day h2{font-size:14pt;margin:0 0 5mm}
    .print-day table{border-collapse:collapse;width:100%;table-layout:fixed}
    .print-day th,.print-day td{border:1px solid #777;padding:2px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
    .print-day th{background:#e9eee9!important;font-size:7pt}
    .print-day th:nth-child(1){width:7%}.print-day th:nth-child(2){width:8%}.print-day th:nth-child(3){width:7%}.print-day th:nth-child(4){width:21%}.print-day th:nth-child(5){width:43%}.print-day th:nth-child(6){width:14%}
  }
  </style>`;
}
function scoringView(){
  if(!admin) return `<div class="panel empty"><h2>Live telling</h2><p>Meld aan as admin om wedstryde te bestuur.</p><button class="primary" onclick="toggleAdmin()">Admin-aanmelding</button></div>`;
  const filtered=data.matches.filter(m=>(scoreAge==='All'||m.age===scoreAge)&&(scorePool==='All'||m.pool===scorePool));
  const slots=new Map();
  filtered.forEach(m=>{const key=`${m.date||''}|${m.time||''}`;if(!slots.has(key))slots.set(key,[]);slots.get(key).push(m)});
  const ordered=[...slots.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  const slotHtml=ordered.map(([key,games])=>{
    const [date,time]=key.split('|');
    const fieldOrder=f=>({A:0,B:1,C:2,D:3}[f]??4);
    games.sort((a,b)=>fieldOrder(a.field)-fieldOrder(b.field)||String(a.age).localeCompare(String(b.age)));
    const main=games.filter(m=>m.field==='A'||m.field==='B');
    const other=games.filter(m=>m.field!=='A'&&m.field!=='B');
    return `<section class="score-time-slot"><h3>${esc(date||'Datum onbekend')} · ${esc(time||'Tyd onbekend')}</h3>${main.length?`<div class="score-concurrent-grid">${main.map(scorePanel).join('')}</div>`:''}${other.length?`<details class="score-other-fields"><summary>Ander velde (${other.length})</summary><div class="score-concurrent-grid">${other.map(scorePanel).join('')}</div></details>`:''}</section>`;
  }).join('');
  return `<div class="title-row"><div><h2>Live telling</h2><p>Velde A en B se gelyktydige wedstryde verskyn saam · 6 minute per helfte.</p></div></div><div class="filters"><select onchange="scoreAge=this.value;render()"><option value="All" ${scoreAge==='All'?'selected':''}>Albei ouderdomsgroepe</option><option value="O/11" ${scoreAge==='O/11'?'selected':''}>O/11</option><option value="O/12" ${scoreAge==='O/12'?'selected':''}>O/12</option></select><select onchange="scorePool=this.value;render()"><option value="All" ${scorePool==='All'?'selected':''}>Alle poele</option>${['A','B','C','D'].map(p=>`<option value="${p}" ${scorePool===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="score-time-slots">${slotHtml||empty('Geen wedstryde vir hierdie filter nie.')}</div>`;
}
function teamShort(tid){const t=data.teams.find(x=>x.id===tid);return t?.short||((t?.name||'TBD').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase())||'TBD'}
function teamLogo(tid){const t=data.teams.find(x=>x.id===tid);return t?.logoUrl?`<img class="score-team-logo" src="${esc(t.logoUrl)}" alt="">`:`<span class="score-team-logo-fallback">${esc(teamShort(tid).slice(0,3))}</span>`}
function updateScorePanel(m){
  const panel=document.getElementById('score-'+m.id);
  if(!panel)return;
  const home=panel.querySelector('.score-team-card.home strong');
  const away=panel.querySelector('.score-team-card.away strong');
  if(home)home.textContent=String(m.homeScore??0);
  if(away)away.textContent=String(m.awayScore??0);
}
function scorePanel(m){
  const running=!!m.clockRunning,period=m.period||0;
  const c=period===2?'2DE HELFTE':period===1?'1STE HELFTE':'GEREED';
  const homeName=teamName(m.homeId),awayName=teamName(m.awayId);
  return `<section class="score-console ${m.status==='live'?'live':''}" id="score-${esc(m.id)}">
    <div class="score-meta-line"><span class="badge">${esc(m.age)} · VELD ${esc(m.field||'—')} · POEL ${esc(m.pool||'—')}</span><span class="score-half">${c}</span></div>
    <div class="score-main-grid">
      <div class="score-team-card home"><div class="score-team-logo-wrap">${teamLogo(m.homeId)}</div><span class="score-short">${esc(homeName)}</span><strong>${m.homeScore||0}</strong></div>
      <div class="score-center"><div class="score-period">${c}</div><div class="live-clock"><strong>${timerLabel(m)}</strong><small>${running?'● LIVE':'KLOK GESTOP'}</small></div>
        <div class="timer-controls">${period===0?`<button class="primary" onclick="startMatch('${m.id}')">▶ BEGIN</button>`:''}${period>0&&running?`<button onclick="pauseMatch('${m.id}')">⏸ POUSE</button>`:''}${period===1&&!running&&elapsed(m)<360?`<button class="primary" onclick="startMatch('${m.id}')">▶ HERVAT</button>`:''}${period===1&&!running&&elapsed(m)>=360?`<button class="primary" onclick="startSecondHalf('${m.id}')">▶ 2DE HELFTE</button>`:''}${period===2&&!running&&elapsed(m)<360?`<button class="primary" onclick="startMatch('${m.id}')">▶ HERVAT</button>`:''}${period>0||m.status==='completed'?`<button class="danger" onclick="finishMatch('${m.id}')">${m.status==='completed'?(manOfMatch(m)?'WYSIG MAN OF THE MATCH':'MAN OF THE MATCH'):'✓ RONDTE KLAAR'}</button>`:''}</div>
      </div>
      <div class="score-team-card away"><div class="score-team-logo-wrap">${teamLogo(m.awayId)}</div><span class="score-short">${esc(awayName)}</span><strong>${m.awayScore||0}</strong></div>
    </div>
    ${period>0&&m.status!=='completed'?`<div class="scoring-actions-grid"><div class="score-action-side"><div class="action-team"><span>${teamLogo(m.homeId)}</span><b>${esc(homeName)}</b></div><button class="score-btn try" onclick="recordScore('${m.id}','${m.homeId}','try',5)"><span>DRIE</span><strong>+5</strong></button><button class="score-btn conversion" onclick="recordScore('${m.id}','${m.homeId}','conversion',2)"><span>DOELSKOP</span><strong>+2</strong></button><button class="score-btn penalty" onclick="recordScore('${m.id}','${m.homeId}','penalty',3)"><span>STRAFSKOP</span><strong>+3</strong></button><button class="score-btn drop" onclick="recordScore('${m.id}','${m.homeId}','drop_goal',3)"><span>DROP-DOEL</span><strong>+3</strong></button></div><div class="score-action-side"><div class="action-team"><span>${teamLogo(m.awayId)}</span><b>${esc(awayName)}</b></div><button class="score-btn try" onclick="recordScore('${m.id}','${m.awayId}','try',5)"><span>DRIE</span><strong>+5</strong></button><button class="score-btn conversion" onclick="recordScore('${m.id}','${m.awayId}','conversion',2)"><span>DOELSKOP</span><strong>+2</strong></button><button class="score-btn penalty" onclick="recordScore('${m.id}','${m.awayId}','penalty',3)"><span>STRAFSKOP</span><strong>+3</strong></button><button class="score-btn drop" onclick="recordScore('${m.id}','${m.awayId}','drop_goal',3)"><span>DROP-DOEL</span><strong>+3</strong></button></div></div>`:''}
    <div class="score-bottom-actions"><button onclick="undoEvent('${m.id}')">↩ ONTHOU LAASTE</button><button onclick="resetMatch('${m.id}')">↺ RESET</button></div>
  </section>`;
}
function teamsView(){if(!admin)return `<div class="panel empty"><h2>Spanne</h2><p>Admin toegang benodig om spanne te bestuur.</p></div>`;return `<div class="title-row"><div><h2>Spanne</h2><p>Bestuur O/11 en O/12 spanne.</p></div><button class="primary" onclick="openTeam()">+ Voeg span</button></div><div class="cards">${data.teams.map(t=>`<div class="team-card"><div class="team-mark">${t.logoUrl?`<img src="${esc(t.logoUrl)}" alt="">`:esc((t.short||t.name||'?').slice(0,3).toUpperCase())}</div><div><h3>${esc(t.name)}</h3><small>${esc(t.age)} · Poel ${esc(t.pool||'—')}</small></div><button onclick="openTeam('${t.id}')">Wysig</button></div>`).join('')||empty('Geen spanne nie.')}</div>`}
function openTeam(id){if(!admin)return;const t=id?data.teams.find(x=>x.id===id):{id:'',name:'',school:'',age:age,pool:'A',short:'',logoUrl:''};if(!t)return;const d=modal(`<h2>${id?'Wysig span':'Nuwe span'}</h2><label>Spannaam<input id="t_name" value="${esc(t.name)}"></label><div class="twocol"><label>Ouderdom<select id="t_age"><option>O/11</option><option>O/12</option></select></label><label>Poel<select id="t_pool"><option>A</option><option>B</option><option>C</option><option>D</option></select></label></div><div class="twocol"><label>Kort naam<input id="t_short" value="${esc(t.short||'')}"></label><label>Skool<input id="t_school" value="${esc(t.school||'')}"></label></div><label>Span logo<input id="t_logo" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="modal-actions">${id?`<button class="danger" onclick="deleteTeam('${id}',this)">Verwyder</button>`:''}<span></span><button onclick="this.closest('.modal').remove()">Kanselleer</button><button class="primary" onclick="saveTeam('${id}',this)">Stoor</button></div>`);document.getElementById('t_age').value=t.age||'O/11';document.getElementById('t_pool').value=t.pool||'A';return d}
async function saveTeam(id,btn){if(!admin)return;const name=val('t_name').trim();if(!name)return alert('Spannaam is nodig.');const old=data.teams.find(x=>x.id===id);const tid=id&&isUuid(id)?id:uuid();const payload={id:tid,name,school:val('t_school').trim(),age:val('t_age'),pool:val('t_pool'),short:val('t_short').trim(),active:true};try{btn.disabled=true;if(online){const f=document.getElementById('t_logo')?.files?.[0];if(f){const ext=(f.name.split('.').pop()||'png').toLowerCase();const path=`teams/${tid}.${ext}`;const up=await sb.storage.from('team-logos').upload(path,f,{upsert:true,contentType:f.type||'image/png'});if(up.error)throw up.error;payload.logo_url=sb.storage.from('team-logos').getPublicUrl(path).data.publicUrl;}else if(old?.logoUrl)payload.logo_url=old.logoUrl;const q=await sb.from('teams').upsert(payload).select().single();if(q.error)throw q.error;await refresh()}else{const local={id:tid,name,school:payload.school,age:payload.age,pool:payload.pool,short:payload.short,logoUrl:old?.logoUrl||''};const i=data.teams.findIndex(x=>x.id===tid);i>=0?data.teams[i]=local:data.teams.push(local);localSave()}btn.closest('.modal').remove();render()}catch(e){btn.disabled=false;alert('Span kon nie gestoor word nie: '+(e?.message||e))}}
async function deleteTeam(id,btn){if(!admin||!confirm('Verwyder hierdie span?'))return;try{if(online){const q=await sb.from('teams').delete().eq('id',id);if(q.error)throw q.error;await refresh()}else{data.teams=data.teams.filter(t=>t.id!==id);localSave()}btn.closest('.modal')?.remove();render()}catch(e){alert(e.message)}}
function schoolRefGroups(){
  const groups=new Map();
  data.teams.forEach(team=>{
    const school=String(team.school||'').trim();
    if(!school)return;
    const key=school.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!groups.has(key))groups.set(key,{school,teams:[]});
    groups.get(key).teams.push(team);
  });
  return [...groups.values()].map(group=>{
    const votes=new Map();
    group.teams.forEach(team=>{
      const code=String(team.short||'').toUpperCase().replace(/O\s*\/?\s*1[12]/g,'').replace(/\d+$/,'').replace(/[^A-Z]/g,'');
      if(code)votes.set(code,(votes.get(code)||0)+1);
    });
    let short=[...votes.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length||a[0].localeCompare(b[0]))[0]?.[0]||'';
    if(!short){
      const cleaned=group.school.replace(/\b(laerskool|laer|ho[eë]rskool|primary school|primary|high school|school)\b/gi,' ').trim();
      const words=cleaned.split(/\s+/).filter(Boolean);
      short=/baanbreker/i.test(group.school)?'BB':words.length>1?words.map(word=>word[0]).join(''):((words[0]||group.school).slice(0,2));
      short=short.toUpperCase().replace(/[^A-Z]/g,'');
    }
    return {...group,short};
  });
}
async function addSchoolReferees(btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const groups=schoolRefGroups();
  if(!groups.length)return alert('Geen skoolname is op die spanrekords ingevul nie.');
  const byShort=new Map();
  groups.forEach(group=>byShort.set(group.short,(byShort.get(group.short)||[]).concat(group.school)));
  const collisions=[...byShort.entries()].filter(([,schools])=>schools.length>1);
  if(collisions.length)return alert('Skoolkortname moet uniek wees voordat skeidsregters geskep kan word: '+collisions.map(([code,schools])=>code+' ('+schools.join(', ')+')').join('; '));
  const existing=new Set(data.refs.map(ref=>ref.name.trim().toLowerCase()));
  const rows=[];
  groups.forEach(group=>[1,2].forEach(number=>{
    const name=group.short+' ref '+number;
    if(!existing.has(name.toLowerCase()))rows.push({id:uuid(),name,active:true});
  }));
  if(!rows.length)return alert('Elke skool het reeds twee skeidsregters.');
  if(btn)btn.disabled=true;
  try{
    if(online){
      const result=await sb.from('referees').insert(rows.map(({id,name,active})=>({id,name,active})));
      if(result.error)throw result.error;
      await refresh();
    }else{
      data.refs.push(...rows.map(ref=>({...ref,teamId:null})));
      localSave();
    }
    alert(rows.length+' skeidsregter(s) bygevoeg.');
    render();
  }catch(e){alert('Skeidsregters kon nie bygevoeg word nie: '+(e?.message||e))}
  finally{if(btn)btn.disabled=false}
}
function isPlayoffMatch(m){return String(m?.notes||'').startsWith('PLAYOFF PLACEHOLDER |')||/\b(?:quarter.?final|kwartfinaal|semi(?:-final)?|halffinaal|finale?|cup|shield|plate|bowl|playoff)\b/i.test(String(m?.round||''))}
function openPlayoffRefAssignments(){
  if(!admin)return alert('Admin-toegang benodig.');
  const playoffMatches=data.matches.filter(isPlayoffMatch).sort((a,b)=>String(a.age||'').localeCompare(String(b.age||''))||String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||String(a.round||'').localeCompare(String(b.round||'')));
  if(!playoffMatches.length)return alert('Geen uitspeelwedstryde is tans op die wedstrydelys nie.');
  const refs=data.refs.filter(r=>r.active!==false||playoffMatches.some(m=>m.refId===r.id)).sort((a,b)=>a.name.localeCompare(b.name));
  const rows=playoffMatches.map(m=>'<div class="allocation"><div><b>'+esc(m.age)+' · '+esc(roundName(m.round,m.pool))+'</b><small>'+esc(m.date||'')+' · '+esc(m.time||'—')+' · '+esc(teamName(m.homeId))+' teen '+esc(teamName(m.awayId))+'</small></div><select data-playoff-match="'+esc(m.id)+'" aria-label="Skeidsregter vir '+esc(m.age)+' '+esc(roundName(m.round,m.pool))+'"><option value="">Geen skeidsregter</option>'+refs.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===m.refId?' selected':'')+'>'+esc(r.name)+(r.active===false?' · onaktief':'')+'</option>').join('')+'</select></div>').join('');
  const dlg=modal('<h2>Wys skeidsregters aan uitspeelwedstryde</h2><p class="muted">Kies ’n skeidsregter vir elke uitspeelwedstryd. Tydkonflikte en skeidsregters van ’n deelnemende skool word geweier.</p>'+(rows||empty('Geen skeidsregters beskikbaar nie.'))+'<div class="modal-actions"><button onclick="this.closest(&quot;.modal&quot;).remove()">Kanselleer</button><button class="primary" onclick="savePlayoffRefAssignments(this)">Stoor toewysings</button></div>');
  dlg.querySelector('.modalbox').style.maxWidth='900px';
}
async function savePlayoffRefAssignments(btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const dlg=btn.closest('.modal');
  const assignments=[...dlg.querySelectorAll('[data-playoff-match]')].map(select=>({match:data.matches.find(m=>m.id===select.dataset.playoffMatch),refId:String(select.value||'').trim()})).filter(a=>a.match);
  const playoffIds=new Set(assignments.map(a=>a.match.id));
  const {teamSchools,refSchools,schoolKey}=refereeSchoolIndex();
  const schoolForTeam=id=>teamSchools.get(id)||schoolKey(data.teams.find(t=>t.id===id)?.school);
  const occupied=new Set();
  for(const {match,refId} of assignments){
    if(!refId)continue;
    if(!isUuid(refId))return alert('Kies asseblief ’n geldige skeidsregter.');
    const ref=data.refs.find(r=>r.id===refId);
    if(!ref)return alert('Die gekose skeidsregter bestaan nie meer nie.');
    if(ref.active===false&&ref.id!==match.refId)return alert(ref.name+' is onaktief en kan nie nuut toegewys word nie.');
    if(refSchools.get(ref.id)==='__AMBIGUOUS__')return alert('Kan nie die skool van '+ref.name+' bevestig nie. Werk eers die skeidsregter se skoolkoppeling by.');
    const school=refSchools.get(ref.id),homeSchool=schoolForTeam(match.homeId),awaySchool=schoolForTeam(match.awayId);
    if(school&&[homeSchool,awaySchool].includes(school))return alert(ref.name+' kan nie ’n wedstryd van hul eie skool blaas nie.');
    const slot=String(match.date||'')+'|'+String(match.time||'')+'|'+refId;
    if(occupied.has(slot))return alert(ref.name+' is reeds vir ’n ander uitspeelwedstryd op dieselfde tyd gekies.');
    occupied.add(slot);
    const conflict=data.matches.find(other=>!playoffIds.has(other.id)&&other.refId===refId&&other.date===match.date&&other.time===match.time);
    if(conflict)return alert(ref.name+' is reeds op dieselfde datum en tyd aan ’n ander wedstryd toegewys.');
  }
  btn.disabled=true;
  let saved=0;
  try{
    for(const {match,refId} of assignments){
      if(match.refId===refId)continue;
      if(online){
        const q=await sb.rpc('save_baanbreker_match',{
          p_id:match.id,p_age:match.age,p_pool:match.pool,p_round:match.round,
          p_date:match.date,p_time:match.time,p_field:match.field,p_home_id:match.homeId,p_away_id:match.awayId,
          p_referee_id:refId||null,p_home_score:match.homeScore||0,p_away_score:match.awayScore||0,p_status:match.status||'scheduled'
        });
        if(q.error)throw q.error;
        if(String(q.data||'').toLowerCase()!==String(match.id).toLowerCase())throw new Error('Die databasis het nie die wedstrydtoewysing bevestig nie.');
      }
      match.refId=refId||null;
      saved++;
    }
    if(online)await refresh();
    dlg.remove();
    render();
  }catch(e){
    if(online)await refresh().catch(()=>{});
    render();
    alert((saved?'Some referee assignments were saved before the error. ':'')+'Kon nie alle skeidsregters stoor nie: '+(e?.message||e));
  }finally{btn.disabled=false}
}
function refsView(){if(!admin)return `<div class="panel empty"><h2>Skeidsregters</h2><p>Admin toegang benodig.</p></div>`;return `<div class="title-row"><div><h2>Skeidsregters</h2><p>Skep twee skeidsregters per skool, benoem met die skool se kortnaam.</p></div><div class="top-actions"><button onclick="addSchoolReferees(this)">+ Voeg 2 per skool by</button><button class="primary" onclick="openRef()">+ Voeg skeidsregter</button></div></div><div class="panel">${data.refs.map(r=>`<div class="ref-row"><div><b>${esc(r.name)}</b><small>${data.teams.find(t=>t.id===r.teamId)?'· '+esc(data.teams.find(t=>t.id===r.teamId).name):''}</small></div><span>${r.active!==false?'Aktief':'Onaktief'}</span><button onclick="openRef('${r.id}')">Wysig</button></div>`).join('')||empty('Geen skeidsregters nie.')}</div>`}
function openRef(id){if(!admin)return;const r=id?data.refs.find(x=>x.id===id):{id:'',name:'',teamId:null,active:true};modal(`<h2>${id?'Wysig skeidsregter':'Nuwe skeidsregter'}</h2><label>Naam<input id="r_name" value="${esc(r.name)}"></label><label>Eie span<select id="r_team"><option value="">Geen span gekoppel</option>${data.teams.slice().sort((a,b)=>String(a.age).localeCompare(String(b.age))||a.name.localeCompare(b.name)).map(t=>`<option value="${esc(t.id)}">${esc(t.age)} · ${esc(t.name)}</option>`).join('')}</select></label><label><input id="r_active" type="checkbox" ${r.active!==false?'checked':''}> Aktief</label><div class="modal-actions">${id?`<button class="danger" onclick="deleteRef('${id}',this)">Verwyder</button>`:''}<span></span><button onclick="this.closest('.modal').remove()">Kanselleer</button><button class="primary" onclick="saveRef('${id}',this)">Stoor</button></div>`);document.getElementById('r_team').value=r.teamId||''}
async function deleteRef(id,btn){if(!admin||!confirm('Verwyder hierdie skeidsregter?'))return;try{if(online){const q=await sb.from('referees').delete().eq('id',id);if(q.error)throw q.error;await refresh()}else{data.refs=data.refs.filter(r=>r.id!==id);localSave()}btn.closest('.modal')?.remove();render()}catch(e){alert(e.message)}}
async function startMatch(id){if(!admin)return;const m=data.matches.find(x=>x.id===id);if(!m)return;const now=new Date().toISOString();const next={period:m.period||1,clockSeconds:Number(m.clockSeconds||0),clockRunning:true,clockStartedAt:now,status:'live'};Object.assign(m,next);render();try{if(online){const q=await sb.from('matches').update({period:next.period,clock_seconds:next.clockSeconds,clock_running:true,clock_started_at:now,status:'live'}).eq('id',id);if(q.error)throw q.error;await refresh();render()}}catch(e){m.clockRunning=false;m.clockStartedAt=null;render();alert('Wedstryd kon nie begin nie: '+(e?.message||e))}}
async function startSecondHalf(id){if(!admin)return;const m=data.matches.find(x=>x.id===id);if(!m)return;const now=new Date().toISOString();Object.assign(m,{period:2,clockSeconds:0,clockRunning:true,clockStartedAt:now,status:'live'});render();try{if(online){const q=await sb.from('matches').update({period:2,clock_seconds:0,clock_running:true,clock_started_at:now,status:'live'}).eq('id',id);if(q.error)throw q.error;await refresh();render()}}catch(e){m.clockRunning=false;m.clockStartedAt=null;render();alert('2de helfte kon nie begin nie: '+(e?.message||e))}}
async function pauseMatch(id){if(!admin)return;const m=data.matches.find(x=>x.id===id);if(!m)return;const sec=elapsed(m);try{if(online){const q=await sb.from('matches').update({clock_seconds:sec,clock_running:false,clock_started_at:null}).eq('id',id);if(q.error)throw q.error;await refresh()}else{m.clockSeconds=sec;m.clockRunning=false;m.clockStartedAt=null;render()}}catch(e){alert(e.message)}}
async function finishMatch(id){
  if(!admin)return;
  const m=data.matches.find(x=>x.id===id);
  if(!m)return;
  const existing=manOfMatch(m);
  const entered=prompt('Wie is die Man of the Match?',existing);
  if(entered===null)return;
  const name=entered.trim().replace(/\s+/g,' ');
  if(!name){alert('Voer asseblief die Man of the Match se naam in.');return;}
  const notes=matchNotesWithManOfMatch(m.notes,name);
  const now=new Date().toISOString();
  try{
    if(online){
      const patch={notes};
      if(m.status!=='completed')Object.assign(patch,{clock_seconds:Math.min(360,elapsed(m)),clock_running:false,clock_started_at:null,status:'completed',completed_at:now});
      const q=await sb.from('matches').update(patch).eq('id',id);
      if(q.error)throw q.error;
      await refresh();
    }else{
      m.notes=notes;
      if(m.status!=='completed')Object.assign(m,{clockSeconds:Math.min(360,elapsed(m)),clockRunning:false,clockStartedAt:null,status:'completed',completedAt:now});
    }
    render();
  }catch(e){alert('Wedstryd of Man of the Match kon nie gestoor word nie: '+(e.message||e))}
}
async function endMatch(id){return finishMatch(id)}
async function resetTournamentResults(){
  if(!admin)return;
  const matches=data.matches.slice();
  if(!matches.length)return alert('Daar is geen wedstryde om te herstel nie.');
  const ok=confirm('Herstel ALLE '+matches.length+' wedstryde? Dit vee tellings, Man of the Match-keuses en puntegebeure permanent uit en stel die wedstryde terug na Geskeduleer. Hierdie aksie kan nie ongedaan gemaak word nie.');
  if(!ok)return;
  try{
    if(online){
      const updates=await Promise.all(matches.map(m=>sb.from('matches').update({
        home_score:0,away_score:0,status:'scheduled',period:0,clock_seconds:0,
        clock_running:false,clock_started_at:null,completed_at:null,notes:clearManOfMatch(m.notes)
      }).eq('id',m.id)));
      const failed=updates.find(q=>q.error);
      if(failed)throw failed.error;
      const ids=matches.map(m=>m.id).filter(Boolean);
      if(ids.length){const d=await sb.from('match_events').delete().in('match_id',ids);if(d.error)throw d.error}
      await refresh();
    }else{
      for(const m of data.matches)Object.assign(m,{homeScore:0,awayScore:0,status:'scheduled',period:0,clockSeconds:0,clockRunning:false,clockStartedAt:null,completedAt:null,notes:clearManOfMatch(m.notes)});
      data.events=[];
      localSave();
    }
    render();
    alert('Alle tellings en Man of the Match-keuses is skoongemaak.');
  }catch(e){alert('Die resultaat-herstel kon nie volledig voltooi word nie: '+(e?.message||e))}
}
async function resetMatch(id){if(!admin||!confirm('Reset wedstryd en telling?'))return;const m=data.matches.find(x=>x.id===id);try{if(online){const q=await sb.from('matches').update({home_score:0,away_score:0,status:'scheduled',period:0,clock_seconds:0,clock_running:false,clock_started_at:null,completed_at:null,notes:clearManOfMatch(m?.notes||'')}).eq('id',id);if(q.error)throw q.error;const d=await sb.from('match_events').delete().eq('match_id',id);if(d.error)throw d.error;await refresh()}else{if(m){Object.assign(m,{homeScore:0,awayScore:0,status:'scheduled',period:0,clockSeconds:0,clockRunning:false,clockStartedAt:null,completedAt:null,notes:clearManOfMatch(m.notes)});data.events=data.events.filter(e=>e.matchId!==id);render()}}}catch(e){alert(e.message)}}
const scoreBusy=new Set();
async function recordScore(matchId,teamId,type,points){
  if(!admin)return;
  const m=data.matches.find(x=>x.id===matchId);
  if(!m||m.status!=='live')return alert('Wedstryd moet LIVE wees voordat punte aangeteken kan word.');
  if(!teamId||teamId==='undefined'||teamId==='null')return alert('Span kon nie bepaal word nie.');
  const key=`${matchId}:${teamId}`;
  if(scoreBusy.has(key))return;
  scoreBusy.add(key);
  try{
    const sec=elapsed(m);
    if(online){
      // Preferred: atomic RPC. The RPC records the event timestamp but DOES NOT
      // alter clock_seconds/clock_started_at, so scoring can never add time.
      let q=await sb.rpc('record_match_event',{p_match_id:matchId,p_team_id:teamId,p_event_type:type,p_points:points});
      if(q.error){
        // Compatibility fallback for older match_events schemas. Intentionally
        // omit "period" so scoring still works if that column has not been added.
        const ins=await sb.from('match_events').insert({
          match_id:matchId,
          team_id:teamId,
          event_type:type,
          points:points,
          clock_seconds:sec,
          created_by:user?.id||null
        });
        if(ins.error)throw q.error;
        const patch=teamId===m.homeId
          ? {home_score:(m.homeScore||0)+points}
          : {away_score:(m.awayScore||0)+points};
        const up=await sb.from('matches').update(patch).eq('id',matchId);
        if(up.error)throw up.error;
      }
      await refresh();updateScorePanel(data.matches.find(x=>x.id===matchId)||m);
    }else{
      if(teamId===m.homeId)m.homeScore=(m.homeScore||0)+points;
      else if(teamId===m.awayId)m.awayScore=(m.awayScore||0)+points;
      data.events.push({id:uuid(),matchId,teamId,type,points,period:m.period,clockSeconds:sec});
      updateScorePanel(m);
    }
  }catch(e){
    alert('Telling kon nie gestoor word nie: '+(e?.message||e));
  }finally{
    scoreBusy.delete(key);
  }
}
async function undoEvent(matchId){
  if(!admin)return;
  try{
    if(online){
      const q=await sb.rpc('undo_last_match_event',{p_match_id:matchId});
      if(q.error){
        const ev=await sb.from('match_events').select('id,team_id,points,created_at')
          .eq('match_id',matchId).order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(ev.error)throw q.error;
        if(!ev.data)return alert('Geen telling om te onthou nie.');
        const m=data.matches.find(x=>x.id===matchId);
        const d=await sb.from('match_events').delete().eq('id',ev.data.id);
        if(d.error)throw d.error;
        const patch=ev.data.team_id===m.homeId
          ? {home_score:Math.max(0,(m.homeScore||0)-Number(ev.data.points||0))}
          : {away_score:Math.max(0,(m.awayScore||0)-Number(ev.data.points||0))};
        const up=await sb.from('matches').update(patch).eq('id',matchId);
        if(up.error)throw up.error;
      }
      await refresh();render();
    }else{
      const e=data.events.filter(x=>x.matchId===matchId).pop();
      if(!e)return;
      const m=data.matches.find(x=>x.id===matchId);
      if(e.teamId===m.homeId)m.homeScore=Math.max(0,(m.homeScore||0)-e.points);
      if(e.teamId===m.awayId)m.awayScore=Math.max(0,(m.awayScore||0)-e.points);
      data.events=data.events.filter(x=>x.id!==e.id);
      render();
    }
  }catch(e){alert('Kon laaste telling nie ongedaan maak nie: '+(e?.message||e))}
}
async function deleteMatch(id,btn){if(!admin||!confirm('Verwyder hierdie wedstryd?'))return;try{if(online){const q=await sb.from('matches').delete().eq('id',id);if(q.error)throw q.error;await refresh()}else{data.matches=data.matches.filter(m=>m.id!==id);render()}btn.closest('.modal')?.remove();render()}catch(e){alert(e.message)}}
let tickBusy=false;
async function tick(){
  const live=data.matches.filter(m=>m.status==='live'&&m.clockRunning);
  for(const m of live){
    const sec=elapsed(m);
    document.querySelectorAll('#score-'+m.id+' .live-clock').forEach(el=>el.textContent=fmtClock(sec));
    if(m.id && view==='screen'){const screenClock=document.getElementById('screen-game-'+m.id)?.querySelector('.screen-game-time');if(screenClock)screenClock.textContent=fmtClock(sec)}
    if(sec>=360 && !tickBusy){
      tickBusy=true;
      try{
        if(online){
          if((m.period||1)===1){
            const q=await sb.from('matches').update({clock_seconds:360,clock_running:false,clock_started_at:null}).eq('id',m.id);
            if(q.error)throw q.error;
          }else{
            const q=await sb.from('matches').update({clock_seconds:360,clock_running:false,clock_started_at:null,status:'completed',completed_at:new Date().toISOString()}).eq('id',m.id);
            if(q.error)throw q.error;
          }
          await refresh();
        }else{
          m.clockSeconds=360;m.clockRunning=false;m.clockStartedAt=null;
          if((m.period||1)===2)m.status='completed';
        }
        render();
      }catch(e){console.error('clock auto-stop failed',e)}
      finally{tickBusy=false}
    }
  }
}

window.go=go;window.refreshTournamentData=async()=>{await refresh();render()};window.clearSimulationScores=clearSimulationScores;window.toggleAdmin=toggleAdmin;window.signIn=signIn;window.signOut=signOut;window.openMatch=openMatch;window.saveMatch=saveMatch;window.deleteMatch=deleteMatch;window.openTeam=openTeam;window.saveTeam=saveTeam;window.deleteTeam=deleteTeam;window.openPlayoffRefAssignments=openPlayoffRefAssignments;window.savePlayoffRefAssignments=savePlayoffRefAssignments;window.openRef=openRef;window.saveRef=saveRef;window.startMatch=startMatch;window.pauseMatch=pauseMatch;window.endMatch=endMatch;window.finishMatch=finishMatch;window.resetMatch=resetMatch;window.resetTournamentResults=resetTournamentResults;window.recordScore=recordScore;window.undoEvent=undoEvent;window.openScoring=id=>{view='scoring';render();setTimeout(()=>document.getElementById('score-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}),20)};window.inviteAdmin=inviteAdmin;window.saveSettings=saveSettings;window.openPublic=openPublic;
async function boot(){try{if(!online){data=localLoad();render();return}const a=await sb.auth.getSession();session=a.data.session;user=session?.user||null;if(session)await checkAdmin();await refresh();sb.auth.onAuthStateChange(async(_,s)=>{session=s;user=s?.user||null;if(s)await checkAdmin();else admin=false;await refresh();render()});subscribe();render()}catch(e){console.error(e);data=localLoad();render()}}
boot();


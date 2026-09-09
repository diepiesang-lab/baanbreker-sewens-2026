const CFG=window.BAANBREKER_CONFIG||{};
const online=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase);
const sb=online?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const KEY='baanbreker_sewens_2026';
const seedData={settings:{name:'Laerskool Baanbreker Sewens',subtitle:'2026 Rugby Sewens Toernooi',dates:'16–17 Oktober 2026',location:'Laerskool Baanbreker',logoText:'LB',logoUrl:'baanbreker-logo.png',primary:'#123f2d',accent:'#d6a83d',language:'Afrikaans',publicReferees:true},teams:[],refs:[],matches:[]};
let data=structuredClone(seedData); let view='dashboard'; let age='O/11'; let pool='All'; let admin=false; let user=null; let timer=null; let session=null; let syncing=false;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x||structuredClone(seedData)}catch{return structuredClone(seedData)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data)); render()}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function uid(p='id'){return p+'_'+Math.random().toString(36).slice(2,9)}
function activeMatches(){return data.matches.filter(m=>m.age===age&&(pool==='All'||m.pool===pool))}
function standings(a,p){const ts=data.teams.filter(t=>t.age===a&&t.pool===p);return ts.map(t=>{let played=0,w=0,d=0,l=0,pf=0,pa=0,pts=0;data.matches.filter(m=>m.age===a&&m.pool===p&&m.status==='completed'&&(m.homeId===t.id||m.awayId===t.id)).forEach(m=>{played++;const home=m.homeId===t.id,h=+m.homeScore||0,x=+m.awayScore||0;pf+=home?h:x;pa+=home?x:h;if(h===x){d++;pts+=2}else if((home&&h>x)||(!home&&x>h)){w++;pts+=4}else{l++;if(Math.abs(h-x)<=7)pts+=1}});return {t,played,w,d,l,pf,pa,diff:pf-pa,pts}}).sort((a,b)=>b.pts-a.pts||b.diff-a.diff||b.pf-a.pf)}
function teamName(id){return data.teams.find(t=>t.id===id)?.name||'TBD'}
function matchLabel(m){return `${teamName(m.homeId)} vs ${teamName(m.awayId)}`}
function nav(){return `<aside class="sidebar"><div class="brand"><div class="brand-logo image-logo"><img src="${esc(data.settings.logoUrl||'baanbreker-logo.png')}" alt="Laerskool Baanbreker logo"></div><div><b>${esc(data.settings.name)}</b><small>${esc(data.settings.subtitle)}</small></div></div><div class="nav">${[['dashboard','Dashboard'],['matches','Wedstryde'],['teams','Spanne'],['standings','Standings'],['refs','Skeidsregters'],['screen','Groot skerm'],['rules','Reëls'],['admin','Admin']].map(x=>`<button class="${view===x[0]?'active':''}" onclick="go('${x[0]}')">${x[1]}</button>`).join('')}</div><div class="side-foot"><span class="dot ${online?'live':'demo'}"></span>${online?'Online databasis':'Demo / plaaslike modus'}</div></aside>`}
function header(){return `<header><div class="header-brand"><img class="header-logo" src="${esc(data.settings.logoUrl||'baanbreker-logo.png')}" alt="Baanbreker logo"><div><span class="eyebrow">${esc(data.settings.dates)} · ${esc(data.settings.location)}</span><h1>${esc(data.settings.name)}</h1><p>${esc(data.settings.subtitle)}</p></div></div><div class="head-actions"><button onclick="toggleAdmin()" class="${admin?'primary':''}">${admin?'Admin · '+esc(user?.email||'Aangemeld'):'Admin Login'}</button><button onclick="openPublic()">Publieke skerm</button></div></header>`}
function shell(content){document.documentElement.style.setProperty('--primary',data.settings.primary||'#123f2d');document.documentElement.style.setProperty('--accent',data.settings.accent||'#d6a83d');document.getElementById('app').innerHTML=nav()+`<section class="page">${header()}<main>${content}</main></section>`}
function stat(a,b,c){return `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`}
function dashboard(){const total=data.matches.length,done=data.matches.filter(m=>m.status==='completed').length,live=data.matches.filter(m=>m.status==='live').length,unref=data.matches.filter(m=>!m.refId).length;const next=data.matches.find(m=>m.status!=='completed');return `<div class="hero"><div><span class="badge">${esc(data.settings.dates)}</span><h2>${esc(data.settings.name)}</h2><p>${esc(data.settings.subtitle)} · O/11 & O/12</p></div><div class="hero-actions"><button class="primary" onclick="go('matches')">Bestuur wedstryde</button><button onclick="go('refs')">Skeidsregters</button></div></div><div class="stats">${stat('Spanne',data.teams.length,'O/11 + O/12')}${stat('Wedstryde',total,done+' voltooi')}${stat('Live',live,'Tans aan die gang')}${stat('On-toegeken',unref,'Wedstryde sonder skeidsregter')}</div><div class="grid2"><section class="panel"><div class="panel-head"><h3>Volgende wedstryd</h3><button onclick="go('matches')">Sien alles</button></div>${next?matchCard(next):empty('Geen komende wedstryde.')}</section><section class="panel"><div class="panel-head"><h3>Admin vinnige aksies</h3></div><div class="quick"><button onclick="openTeam()">+ Voeg span</button><button onclick="openMatch()">+ Voeg wedstryd</button><button onclick="openRef()">+ Voeg skeidsregter</button><button onclick="go('admin')">Pas koppelvlak aan</button></div></section></div>`}
function matchCard(m){const status=m.status||'scheduled';return `<div class="match-card ${status} ${admin?'clickable':''}" ${admin?`onclick="openMatch('${m.id}')" role="button" tabindex="0"`:''}><div class="match-top"><span class="badge">${esc(m.age)} · ${esc(m.round||'Pool')}</span><span>${esc(m.date||'')} · ${esc(m.time||'—')} · Veld ${esc(m.field||'—')}</span></div><div class="match-main"><div class="team-side"><b>${esc(teamName(m.homeId))}</b><strong>${m.homeScore??'—'}</strong></div><div class="versus">VS</div><div class="team-side"><strong>${m.awayScore??'—'}</strong><b>${esc(teamName(m.awayId))}</b></div></div><div class="match-bottom"><span>${m.refId?'👨‍⚖️ '+esc(data.refs.find(r=>r.id===m.refId)?.name||''):'⚠ Geen skeidsregter'}</span><span class="status ${status}">${status==='live'?'● LIVE':status==='completed'?'Voltooi':'Geskeduleer'}</span>${admin?`<span class="manage-hint">Klik om te bestuur</span>`:''}</div></div>`}
function openMatch(id){
  const m=id?data.matches.find(x=>x.id===id):{age:age||'O/11',pool:pool==='All'?'A':pool,round:'Pool',date:'2026-10-16',time:'08:00',field:'A',status:'scheduled',homeScore:null,awayScore:null,homeId:'',awayId:'',refId:''};
  if(!m)return;
  const teamOptions=(a,selected='')=>data.teams.filter(t=>t.age===a).sort((x,y)=>x.name.localeCompare(y.name)).map(t=>`<option value="${t.id}" ${selected===t.id?'selected':''}>${esc(t.name)} · Poel ${esc(t.pool||'—')}</option>`).join('');
  const refOptions=()=>data.refs.filter(r=>r.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(r=>`<option value="${r.id}" ${m.refId===r.id?'selected':''}>${esc(r.name)}</option>`).join('');
  const formatDate=d=>{if(!d)return '2026-10-16';if(/^\\d{4}-\\d{2}-\\d{2}$/.test(d))return d;const hit=String(d).match(/(\\d{1,2})[^0-9]+(\\d{1,2})[^0-9]+(\\d{4})/);return hit?`${hit[3]}-${hit[2].padStart(2,'0')}-${hit[1].padStart(2,'0')}`:'2026-10-16'};
  const modalEl=modal(`
    <div class="modal-title-row"><div><span class="eyebrow">${id?'Wysig':'Skep'}</span><h2>${id?'Bestuur wedstryd':'Nuwe wedstryd'}</h2></div><button class="icon-btn" type="button" aria-label="Maak toe" onclick="this.closest('.modal').remove()">×</button></div>
    <div class="match-editor">
      <section class="form-section"><h3>Wedstrydbesonderhede</h3>
        <div class="twocol"><label>Ouderdom<select id="m_age"><option value="O/11">O/11</option><option value="O/12">O/12</option></select></label><label>Poel<select id="m_pool"><option value="A">Poel A</option><option value="B">Poel B</option><option value="C">Poel C</option><option value="D">Poel D</option></select></label></div>
        <div class="twocol"><label>Datum<input id="m_date" type="date" value="${formatDate(m.date)}"></label><label>Begin tyd<input id="m_time" type="time" value="${esc(m.time||'08:00')}"></label></div>
        <div class="twocol"><label>Veld<select id="m_field"><option value="A">Veld A</option><option value="B">Veld B</option><option value="C">Veld C</option><option value="D">Veld D</option></select></label><label>Rondte<select id="m_round"><option value="Pool">Poolwedstryd</option><option value="Kwartfinaal">Kwartfinaal</option><option value="Halffinaal">Halffinaal</option><option value="Finale">Finale</option></select></label></div>
      </section>
      <section class="form-section"><h3>Spanne</h3>
        <label>Tuisspan<select id="m_home"><option value="">Kies tuisspan</option>${teamOptions(m.age,m.homeId)}</select></label>
        <label>Wegspan<select id="m_away"><option value="">Kies wegspan</option>${teamOptions(m.age,m.awayId)}</select></label>
      </section>
      <section class="form-section"><h3>Skeidsregter</h3><p class="muted small">Ken een aktiewe skeidsregter aan hierdie wedstryd toe. Slegs een skeidsregter per wedstryd.</p>
        <label>Toegeken aan<select id="m_ref"><option value="">Geen skeidsregter toegeken</option>${refOptions()}</select></label>
        <div class="ref-hint">${m.refId?`👨‍⚖️ ${esc(data.refs.find(r=>r.id===m.refId)?.name||'Skeidsregter')}`:'⚠ Geen skeidsregter toegeken nie'}</div>
      </section>
      <section class="form-section"><h3>Telling & status</h3>
        <div class="score-grid"><label>Tuis telling<input id="m_hs" type="number" min="0" step="1" inputmode="numeric" value="${m.homeScore??''}"></label><label>Weg telling<input id="m_as" type="number" min="0" step="1" inputmode="numeric" value="${m.awayScore??''}"></label></div>
        <label>Status<select id="m_status"><option value="scheduled">Geskeduleer</option><option value="live">LIVE</option><option value="completed">Voltooi</option></select></label>
      </section>
    </div>
    <div class="modal-actions">${id?`<button class="danger" type="button" onclick="deleteMatch('${id}',this)">Verwyder</button>`:''}<span></span><button type="button" onclick="this.closest('.modal').remove()">Kanselleer</button><button class="primary" type="button" onclick="saveMatch('${id||''}',this)">Stoor wedstryd</button></div>
  `);
  document.getElementById('m_age').value=m.age||'O/11';
  document.getElementById('m_pool').value=['A','B','C','D'].includes(m.pool)?m.pool:'A';
  document.getElementById('m_field').value=['A','B','C','D'].includes(m.field)?m.field:'A';
  document.getElementById('m_round').value=['Pool','Kwartfinaal','Halffinaal','Finale'].includes(m.round)?m.round:'Pool';
  document.getElementById('m_status').value=m.status||'scheduled';
  const updateTeams=()=>{const a=document.getElementById('m_age').value;const home=document.getElementById('m_home'),away=document.getElementById('m_away');const hv=home.value,av=away.value;home.innerHTML='<option value="">Kies tuisspan</option>'+teamOptions(a,hv);away.innerHTML='<option value="">Kies wegspan</option>'+teamOptions(a,av)};
  document.getElementById('m_age').addEventListener('change',()=>{document.getElementById('m_home').value='';document.getElementById('m_away').value='';updateTeams()});
  document.getElementById('m_home').addEventListener('change',()=>{if(document.getElementById('m_home').value===document.getElementById('m_away').value&&document.getElementById('m_home').value){document.getElementById('m_away').value='';alert('Kies twee verskillende spanne.')}});
  document.getElementById('m_away').addEventListener('change',()=>{if(document.getElementById('m_home').value===document.getElementById('m_away').value&&document.getElementById('m_away').value){document.getElementById('m_away').value='';alert('Kies twee verskillende spanne.')}});
  document.getElementById('m_ref').addEventListener('change',e=>{const hint=modalEl.querySelector('.ref-hint');const r=data.refs.find(x=>x.id===e.target.value);hint.textContent=r?`👨‍⚖️ ${r.name}`:'⚠ Geen skeidsregter toegeken nie'});
  return modalEl;
}

function saveMatch(id,btn){const m={id:id||uid('match'),age:document.getElementById('m_age').value,pool:document.getElementById('m_pool').value.trim(),round:document.getElementById('m_round').value.trim(),date:document.getElementById('m_date').value,time:document.getElementById('m_time').value,field:document.getElementById('m_field').value.trim(),homeId:document.getElementById('m_home').value,awayId:document.getElementById('m_away').value,homeScore:document.getElementById('m_hs').value===''?null:+document.getElementById('m_hs').value,awayScore:document.getElementById('m_as').value===''?null:+document.getElementById('m_as').value,status:document.getElementById('m_status').value,refId:document.getElementById('m_ref').value||null};const i=data.matches.findIndex(x=>x.id===m.id);i>=0?data.matches[i]=m:data.matches.push(m);btn.closest('.modal').remove();save()}
function deleteMatch(id,btn){if(confirm('Verwyder wedstryd?')){data.matches=data.matches.filter(m=>m.id!==id);btn.closest('.modal').remove();save()}}
function assignRef(mid,rid){const m=data.matches.find(x=>x.id===mid);if(!m)return;const conflict=data.matches.find(x=>x.id!==mid&&x.refId===rid&&x.date===m.date&&x.time===m.time);if(conflict)return alert('Hierdie skeidsregter is reeds op dieselfde datum en tyd toegeken.');m.refId=rid||null;save()}
function saveSettings(){Object.assign(data.settings,{name:val('s_name'),subtitle:val('s_sub'),dates:val('s_dates'),location:val('s_loc'),logoText:val('s_logo'),primary:val('s_primary'),accent:val('s_accent')});save()}
function val(id){return document.getElementById(id)?.value||''}
function seedDemo(){if(data.teams.length&& !confirm('Vervang huidige demo-data?'))return;data.teams=[];data.refs=[{id:'r1',name:'Johan Botha',level:'Hoofskeidsregter',active:true},{id:'r2',name:'Pieter Nel',level:'Skeidsregter',active:true},{id:'r3',name:'André Smit',level:'Skeidsregter',active:true},{id:'r4',name:'Marius Jacobs',level:'Skeidsregter',active:true}];data.matches=[];for(const a of ['O/11','O/12'])for(const p of ['A','B','C','D'])for(let i=1;i<=4;i++)data.teams.push({id:`${a}-${p}-${i}`,name:`Baanbreker ${a} ${p}${i}`,school:'Laerskool',age:a,pool:p,short:`${p}${i}`});let n=0;for(const a of ['O/11','O/12'])for(const p of ['A','B','C','D']){const ts=data.teams.filter(t=>t.age===a&&t.pool===p);for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){const k=n++;data.matches.push({id:'m'+k,age:a,pool:p,round:'Pool',date:k%2?'17 Oktober 2026':'16 Oktober 2026',time:String(8+Math.floor(k/2)).padStart(2,'0')+':00',field:k%2?'B':'A',homeId:ts[i].id,awayId:ts[j].id,homeScore:null,awayScore:null,status:'scheduled',refId:data.refs[k%data.refs.length].id})}}save()}
function exportData(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='baanbreker-sewens-2026-data.json';a.click()}
function importPrompt(){const s=prompt('Plak JSON-data hier:');if(!s)return;try{data=JSON.parse(s);save()}catch{alert('Ongeldige JSON.')}}
function resetData(){if(confirm('Herstel alle plaaslike data?')){data=structuredClone(seedData);save()}}
function printRefs(){const rows=data.matches.filter(m=>m.refId).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(m=>`<tr><td>${esc(m.date)}</td><td>${esc(m.time)}</td><td>${esc(m.field)}</td><td>${esc(m.age)}</td><td>${esc(matchLabel(m))}</td><td>${esc(data.refs.find(r=>r.id===m.refId)?.name||'')}</td></tr>`).join('');const w=window.open('','_blank');w.document.write(`<html><head><title>Skeidsregter Skedule</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}th{background:#123f2d;color:white}</style></head><body><h1>Laerskool Baanbreker Sewens 2026</h1><h2>Skeidsregter-skedule</h2><table><tr><th>Datum</th><th>Tyd</th><th>Veld</th><th>Afdeling</th><th>Wedstryd</th><th>Skeidsregter</th></tr>${rows}</table></body></html>`);w.document.close();w.print()}
function openPublic(){const w=window.open('','_blank');w.document.write(`<iframe src="${location.href.split('#')[0]}#screen" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`);w.document.close()}
function empty(t){return `<div class="empty">${esc(t)}</div>`}
window.go=go;window.toggleAdmin=toggleAdmin;window.openTeam=openTeam;window.openRef=openRef;window.openMatch=openMatch;window.saveTeam=saveTeam;window.saveRef=saveRef;window.saveMatch=saveMatch;window.deleteMatch=deleteMatch;window.assignRef=assignRef;window.saveSettings=saveSettings;window.seedDemo=seedDemo;window.exportData=exportData;window.importPrompt=importPrompt;window.resetData=resetData;window.printRefs=printRefs;window.openPublic=openPublic;
if(location.hash==='#screen')view='screen';
// Online boot is defined below; it loads Supabase data, restores the signed-in admin session, and enables realtime sync.
bootOnline();


/* ============================================================
   ONLINE DATA + AUTHENTICATION LAYER
   ============================================================ */

function localCache(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function uuid(){return crypto.randomUUID ? crypto.randomUUID() : uid('00000000-0000-4000-8000')}
function isAdminUser(){return !!(user && session)}

async function bootOnline(){
  try{
    if(!online){
      data=load();
      render();
      return;
    }
    const {data:auth}=await sb.auth.getSession();
    session=auth?.session||null;
    user=session?.user||null;
    await refreshFromSupabase();
    if(session) await checkAdmin();
    sb.auth.onAuthStateChange(async (_event,newSession)=>{
      session=newSession||null;
      user=session?.user||null;
      if(session) await checkAdmin(); else admin=false;
      await refreshFromSupabase();
      render();
    });
    subscribeRealtime();
    render();
  }catch(e){
    console.error(e);
    data=load();
    render();
  }
}

async function checkAdmin(){
  if(!user){admin=false;return false}
  const {data:row,error}=await sb.from('admin_users').select('user_id,role,active').eq('user_id',user.id).maybeSingle();
  if(error){console.error(error);admin=false;return false}
  admin=!!(row?.active);
  return admin;
}

async function refreshFromSupabase(){
  if(!online)return;
  syncing=true;
  try{
    const [settingsQ,agesQ,poolsQ,teamsQ,refsQ,matchesQ,allocQ]=await Promise.all([
      sb.from('tournament_settings').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle(),
      sb.from('age_groups').select('*').order('name'),
      sb.from('pools').select('*').order('name'),
      sb.from('teams').select('*').order('name'),
      sb.from('referees').select('*').order('name'),
      sb.from('matches').select('*').order('match_date').order('start_time'),
      sb.from('referee_allocations').select('*')
    ]);
    for(const q of [settingsQ,agesQ,poolsQ,teamsQ,refsQ,matchesQ,allocQ]) if(q.error) throw q.error;
    const settings=settingsQ.data;
    const ages=agesQ.data||[];
    const pools=poolsQ.data||[];
    const teams=teamsQ.data||[];
    const refs=refsQ.data||[];
    const matches=matchesQ.data||[];
    const alloc=allocQ.data||[];
    const ageById=Object.fromEntries(ages.map(a=>[a.id,a.name]));
    const poolById=Object.fromEntries(pools.map(p=>[p.id,p.name]));
    const poolAgeById=Object.fromEntries(pools.map(p=>[p.id,p.age_group_id]));
    const allocationByMatch=Object.fromEntries(alloc.map(a=>[a.match_id,a.referee_id]));
    if(settings) data.settings={...data.settings,
      name:settings.tournament_name||data.settings.name,
      subtitle:settings.tournament_subtitle||'',
      dates:settings.tournament_dates||data.settings.dates,
      location:settings.venue||'',
      logoUrl:settings.tournament_logo_url||data.settings.logoUrl,
      primary:settings.primary_colour||data.settings.primary,
      accent:settings.accent_colour||data.settings.accent
    };
    data.teams=teams.map(t=>({
      id:t.id,name:t.name,school:t.school||'',short:t.short_name||'',
      age:ageById[t.age_group_id]||'O/11',pool:poolById[t.pool_id]||'A',
      logoUrl:t.logo_url||'',primary:t.primary_colour||'',secondary:t.secondary_colour||''
    }));
    data.refs=refs.map(r=>({id:r.id,name:r.name,level:r.qualification||'',active:r.active!==false}));
    data.matches=matches.map(m=>({
      id:m.id,age:ageById[m.age_group_id]||'O/11',pool:poolById[m.pool_id]||'A',round:m.notes||'Pool',
      date:m.match_date||'',time:m.start_time?String(m.start_time).slice(0,5):'',field:m.field||'',
      homeId:m.home_team_id,awayId:m.away_team_id,homeScore:m.home_score,awayScore:m.away_score,
      status:m.status||'scheduled',refId:m.referee_id||allocationByMatch[m.id]||null
    }));
    localCache();
  }catch(e){
    console.error('Supabase sync failed:',e);
    if(!data.teams.length&&!data.matches.length)data=load();
  }finally{syncing=false}
}

function subscribeRealtime(){
  if(!online)return;
  sb.channel('baanbreker-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'teams'},()=>refreshAndRender())
    .on('postgres_changes',{event:'*',schema:'public',table:'matches'},()=>refreshAndRender())
    .on('postgres_changes',{event:'*',schema:'public',table:'referees'},()=>refreshAndRender())
    .on('postgres_changes',{event:'*',schema:'public',table:'referee_allocations'},()=>refreshAndRender())
    .on('postgres_changes',{event:'*',schema:'public',table:'tournament_settings'},()=>refreshAndRender())
    .subscribe();
}
let refreshTimer=null;
function refreshAndRender(){clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{await refreshFromSupabase();render()},120)}

async function ensureAgePool(ageName,poolName){
  let {data:a,error:ae}=await sb.from('age_groups').select('id').eq('name',ageName).maybeSingle();
  if(ae)throw ae;
  if(!a){const ins=await sb.from('age_groups').insert({name:ageName}).select('id').single();if(ins.error)throw ins.error;a=ins.data}
  let {data:p,error:pe}=await sb.from('pools').select('id').eq('name',poolName).eq('age_group_id',a.id).maybeSingle();
  if(pe)throw pe;
  if(!p){const ins=await sb.from('pools').insert({name:poolName,age_group_id:a.id}).select('id').single();if(ins.error)throw ins.error;p=ins.data}
  return {ageId:a.id,poolId:p.id};
}

async function signIn(){
  const email=document.getElementById('login_email')?.value.trim();
  const password=document.getElementById('login_password')?.value;
  if(!email||!password)return alert('Voer jou e-pos en wagwoord in.');
  const btn=document.getElementById('login_btn');if(btn)btn.disabled=true;
  const {data:res,error}=await sb.auth.signInWithPassword({email,password});
  if(error){if(btn)btn.disabled=false;return alert('Aanmelding het misluk: '+error.message)}
  session=res.session;user=res.user;
  const ok=await checkAdmin();
  if(!ok){await sb.auth.signOut();if(btn)btn.disabled=false;return alert('Hierdie rekening is nie as Baanbreker-administrateur gemagtig nie.')}
  document.querySelector('.modal')?.remove();render();
}
async function inviteAdmin(){
  if(!admin||!sb||!session)return alert('Admin-toegang benodig.');
  const input=document.getElementById('invite_email'); const email=input?.value.trim().toLowerCase();
  if(!email)return alert('Voer asseblief die nuwe admin se e-posadres in.');
  const status=document.getElementById('invite_status'); if(status)status.textContent='Stuur uitnodiging…';
  try{
    const {data,error}=await sb.functions.invoke('invite-admin',{body:{email,redirectTo:window.location.origin}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    if(status)status.textContent='Uitnodiging gestuur na '+email+'.';
    if(input)input.value='';
  }catch(e){console.error(e);if(status)status.textContent='Kon nie uitnodiging stuur nie.';alert(e.message||'Kon nie uitnodiging stuur nie. Maak seker die invite-admin Edge Function is ontplooi.');}
}

async function signOut(){await sb.auth.signOut();session=null;user=null;admin=false;render()}
function toggleAdmin(){
  if(admin){signOut();return}
  if(!online)return alert('Supabase is nie gekoppel nie.');
  modal(`<h2>Admin-aanmelding</h2><p class="muted">Gebruik jou Supabase e-posadres en wagwoord. Slegs rekeninge wat as aktiewe Baanbreker-administrateurs geregistreer is, kry toegang.</p><label>E-pos<input id="login_email" type="email" autocomplete="username" placeholder="jou-e-pos@example.com"></label><label>Wagwoord<input id="login_password" type="password" autocomplete="current-password" placeholder="Wagwoord" onkeydown="if(event.key==='Enter')signIn()"></label><div class="modal-actions"><button type="button" onclick="this.closest('.modal').remove()">Kanselleer</button><button id="login_btn" class="primary" type="button" onclick="signIn()">Meld aan</button></div>`);
  setTimeout(()=>document.getElementById('login_email')?.focus(),50);
}

async function saveTeam(id,btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const existing=id?data.teams.find(x=>x.id===id):null;
  const t={id:id||uuid(),name:document.getElementById('t_name').value.trim(),school:document.getElementById('t_school').value.trim(),age:document.getElementById('t_age').value,pool:document.getElementById('t_pool').value,short:document.getElementById('t_short').value.trim(),logoUrl:existing?.logoUrl||''};
  if(!t.name)return alert('Spannaam is nodig.');
  const file=document.getElementById('t_logo')?.files?.[0];
  try{
    btn.disabled=true;btn.textContent=file?'Laai logo op…':'Stoor…';
    if(online){
      const {ageId,poolId}=await ensureAgePool(t.age,t.pool);
      if(file){
        if(file.size>5*1024*1024)throw new Error('Logo moet kleiner as 5 MB wees.');
        const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'')||'png';
        const path=`teams/${t.id}.${ext}`;
        const up=await sb.storage.from('team-logos').upload(path,file,{upsert:true,contentType:file.type||'image/png'});
        if(up.error)throw up.error;
        t.logoUrl=sb.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
      }
      const row={id:t.id,name:t.name,short_name:t.short||null,school:t.school||null,age_group_id:ageId,pool_id:poolId,logo_url:t.logoUrl||null,primary_colour:null,secondary_colour:null,active:true};
      const q=await sb.from('teams').upsert(row).select().single();if(q.error)throw q.error;
      await refreshFromSupabase();
    }else{
      if(file){const reader=new FileReader();reader.onload=()=>{t.logoUrl=reader.result;upsertLocalTeam(t)};reader.readAsDataURL(file);return}
      upsertLocalTeam(t);return;
    }
    btn.closest('.modal').remove();render();
  }catch(e){btn.disabled=false;btn.textContent='Stoor';alert('Span kon nie gestoor word nie: '+e.message)}
}
function upsertLocalTeam(t){const i=data.teams.findIndex(x=>x.id===t.id);i>=0?data.teams[i]=t:data.teams.push(t);btnCloseAndSave()}
function btnCloseAndSave(){document.querySelector('.modal')?.remove();localCache();render()}

async function saveRef(id,btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const r={id:id||uuid(),name:document.getElementById('r_name').value.trim(),level:document.getElementById('r_level').value.trim(),active:document.getElementById('r_active').checked};
  if(!r.name)return alert('Naam is nodig.');
  try{
    btn.disabled=true;
    if(online){const q=await sb.from('referees').upsert({id:r.id,name:r.name,qualification:r.level||null,active:r.active}).select().single();if(q.error)throw q.error;await refreshFromSupabase()}
    else {const i=data.refs.findIndex(x=>x.id===r.id);i>=0?data.refs[i]=r:data.refs.push(r);localCache()}
    btn.closest('.modal').remove();render();
  }catch(e){btn.disabled=false;alert('Skeidsregter kon nie gestoor word nie: '+e.message)}
}

async function saveMatch(id,btn){
  if(!admin)return alert('Admin-toegang benodig.');
  const m={id:id||uuid(),age:document.getElementById('m_age').value,pool:document.getElementById('m_pool').value.trim()||'A',round:document.getElementById('m_round').value.trim()||'Pool',date:document.getElementById('m_date').value,time:document.getElementById('m_time').value,field:document.getElementById('m_field').value.trim(),homeId:document.getElementById('m_home').value,awayId:document.getElementById('m_away').value,homeScore:document.getElementById('m_hs').value===''?0:+document.getElementById('m_hs').value,awayScore:document.getElementById('m_as').value===''?0:+document.getElementById('m_as').value,status:document.getElementById('m_status').value,refId:document.getElementById('m_ref').value||null};
  if(m.homeId&&m.awayId&&m.homeId===m.awayId)return alert('Die twee spanne kan nie dieselfde wees nie.');
  try{
    btn.disabled=true;
    if(online){
      const {ageId,poolId}=await ensureAgePool(m.age,m.pool);
      const q=await sb.from('matches').upsert({id:m.id,age_group_id:ageId,pool_id:poolId,home_team_id:m.homeId||null,away_team_id:m.awayId||null,referee_id:m.refId||null,field:m.field||null,match_date:m.date||null,start_time:m.time||null,duration_minutes:14,home_score:m.homeScore,away_score:m.awayScore,status:m.status,notes:m.round||null}).select().single();
      if(q.error)throw q.error;
      await sb.from('referee_allocations').delete().eq('match_id',m.id);
      if(m.refId){const a=await sb.from('referee_allocations').insert({match_id:m.id,referee_id:m.refId,allocated_by:user?.id||null});if(a.error)throw a.error}
      await refreshFromSupabase();
    }else{const i=data.matches.findIndex(x=>x.id===m.id);i>=0?data.matches[i]=m:data.matches.push(m);localCache()}
    btn.closest('.modal').remove();render();
  }catch(e){btn.disabled=false;alert('Wedstryd kon nie gestoor word nie: '+e.message)}
}

async function deleteMatch(id,btn){
  if(!admin)return;
  if(!confirm('Verwyder wedstryd?'))return;
  try{
    if(online){const q=await sb.from('matches').delete().eq('id',id);if(q.error)throw q.error;await refreshFromSupabase()}
    else{data.matches=data.matches.filter(m=>m.id!==id);localCache()}
    btn.closest('.modal')?.remove();render();
  }catch(e){alert('Kon nie verwyder nie: '+e.message)}
}

async function assignRef(mid,rid){
  if(!admin)return alert('Admin-toegang benodig.');
  const m=data.matches.find(x=>x.id===mid);if(!m)return;
  if(rid){const conflict=data.matches.find(x=>x.id!==mid&&x.refId===rid&&x.date===m.date&&x.time===m.time);if(conflict)return alert('Hierdie skeidsregter is reeds op dieselfde datum en tyd toegeken.')}
  try{
    if(online){const q=await sb.from('matches').update({referee_id:rid||null}).eq('id',mid);if(q.error)throw q.error;await sb.from('referee_allocations').delete().eq('match_id',mid);if(rid){const a=await sb.from('referee_allocations').insert({match_id:mid,referee_id:rid,allocated_by:user?.id||null});if(a.error)throw a.error}await refreshFromSupabase()}
    else{m.refId=rid||null;localCache()}
    render();
  }catch(e){alert('Toewysing kon nie gestoor word nie: '+e.message)}
}

async function saveSettings(){
  if(!admin)return alert('Admin-toegang benodig.');
  const settings={name:val('s_name'),subtitle:val('s_sub'),dates:val('s_dates'),location:val('s_loc'),logoText:val('s_logo'),primary:val('s_primary'),accent:val('s_accent')};
  try{
    if(online){const existing=await sb.from('tournament_settings').select('id').order('created_at',{ascending:true}).limit(1).maybeSingle();if(existing.error)throw existing.error;const row={id:existing.data?.id||uuid(),tournament_name:settings.name,tournament_subtitle:settings.subtitle,tournament_dates:settings.dates,venue:settings.location,primary_colour:settings.primary,accent_colour:settings.accent};const q=await sb.from('tournament_settings').upsert(row).select().single();if(q.error)throw q.error;await refreshFromSupabase()}
    else{Object.assign(data.settings,settings);localCache()}
    render();alert('Instellings gestoor.');
  }catch(e){alert('Instellings kon nie gestoor word nie: '+e.message)}
}

async function seedDemo(){
  if(!admin)return alert('Admin-toegang benodig.');
  if(data.teams.length&&!confirm('Vervang huidige data met demo-data?'))return;
  if(!online){
    data.teams=[];data.refs=[];data.matches=[];for(const a of ['O/11','O/12'])for(const p of ['A','B','C','D'])for(let i=1;i<=4;i++)data.teams.push({id:uuid(),name:`Baanbreker ${a} ${p}${i}`,school:'Laerskool',age:a,pool:p,short:`${p}${i}`,logoUrl:''});for(const n of ['Johan Botha','Pieter Nel','André Smit','Marius Jacobs'])data.refs.push({id:uuid(),name:n,level:'Skeidsregter',active:true});localCache();render();return;
  }
  try{
    for(const a of ['O/11','O/12'])for(const p of ['A','B','C','D'])await ensureAgePool(a,p);
    const refs=['Johan Botha','Pieter Nel','André Smit','Marius Jacobs'];
    for(const n of refs){const ex=await sb.from('referees').select('id').eq('name',n).maybeSingle();if(!ex.data){const q=await sb.from('referees').insert({name:n,qualification:'Skeidsregter',active:true}).select('id').single();if(q.error)throw q.error}}
    for(const a of ['O/11','O/12'])for(const p of ['A','B','C','D'])for(let i=1;i<=4;i++){const {ageId,poolId}=await ensureAgePool(a,p);const exists=await sb.from('teams').select('id').eq('name',`Baanbreker ${a} ${p}${i}`).maybeSingle();if(!exists.data){const q=await sb.from('teams').insert({id:uuid(),name:`Baanbreker ${a} ${p}${i}`,short_name:`${p}${i}`,age_group_id:ageId,pool_id:poolId,active:true});if(q.error)throw q.error}}
    await refreshFromSupabase();render();
  }catch(e){alert('Demo-data kon nie gelaai word nie: '+e.message)}
}

function adminView(){
  if(!admin)return `<div class="panel empty"><h2>Admin toegang</h2><p>Meld aan met jou Supabase admin-rekening om die toernooi te bestuur.</p><button class="primary" onclick="toggleAdmin()">Meld aan</button></div>`;
  return `<div class="title-row"><div><h2>Admin-kontroles</h2><p>Volledig aanpasbare toernooi-instellings en aanlyn databestuur.</p></div><button class="danger" onclick="signOut()">Meld af</button></div><div class="admin-grid"><section class="panel"><h3>Branding & koppelvlak</h3><label>Toernooi naam<input id="s_name" value="${esc(data.settings.name)}"></label><label>Subtitel<input id="s_sub" value="${esc(data.settings.subtitle)}"></label><label>Datums<input id="s_dates" value="${esc(data.settings.dates)}"></label><label>Plek<input id="s_loc" value="${esc(data.settings.location)}"></label><label>Logo teks<input id="s_logo" value="${esc(data.settings.logoText)}"></label><div class="twocol"><label>Primêre kleur<input id="s_primary" type="color" value="${data.settings.primary}"></label><label>Aksentkleur<input id="s_accent" type="color" value="${data.settings.accent}"></label></div><button class="primary" onclick="saveSettings()">Stoor koppelvlak</button></section><section class="panel"><h3>Admin-bestuur</h3><p class="muted">Voeg ekstra administrateurs by. Die uitnodiging word per e-pos deur Supabase gestuur.</p><label>Nuwe admin e-pos<input id="invite_email" type="email" placeholder="admin@example.com"></label><button class="primary" onclick="inviteAdmin()">Stuur admin-uitnodiging</button><p id="invite_status" class="muted"></p><hr><h3>Databestuur</h3><p class="muted">Gekoppel aan Supabase. Veranderinge word tussen toestelle gesinkroniseer.</p><button onclick="seedDemo()">Laai demo spanne</button><button onclick="exportData()">Voer plaaslike data uit</button><button onclick="importPrompt()">Voer plaaslike data in</button></section></div>`;
}

function matches(){const ms=activeMatches().filter(m=>filterStatus==='all'||m.status===filterStatus);return `<div class="title-row"><div><h2>Wedstryde</h2><p>Bestuur skedule, tellings, status en skeidsregter-toewysings.</p></div>${admin?'<button class="primary" onclick="openMatch()">+ Nuwe wedstryd</button>':''}</div><div class="filters"><select onchange="age=this.value;render()"><option ${age==='O/11'?'selected':''}>O/11</option><option ${age==='O/12'?'selected':''}>O/12</option></select><select onchange="pool=this.value;render()"><option ${pool==='All'?'selected':''}>All</option>${['A','B','C','D'].map(p=>`<option ${pool===p?'selected':''}>${p}</option>`).join('')}</select><select onchange="filterStatus=this.value;render()"><option value="all" ${filterStatus==='all'?'selected':''}>Alle statusse</option><option value="scheduled" ${filterStatus==='scheduled'?'selected':''}>Geskeduleer</option><option value="live" ${filterStatus==='live'?'selected':''}>Live</option><option value="completed" ${filterStatus==='completed'?'selected':''}>Voltooi</option></select></div><div class="list">${ms.length?ms.map(matchCard).join(''):empty('Geen wedstryde vir hierdie filter nie.')}</div>`}

function teamLogo(t){return t.logoUrl?`<img src="${esc(t.logoUrl)}" alt="${esc(t.name)} logo">`:`<span>${esc((t.short||t.name).slice(0,2).toUpperCase())}</span>`}

window.signIn=signIn;window.signOut=signOut;window.isAdminUser=isAdminUser;window.inviteAdmin=inviteAdmin;

(() => {
  if (window.__dawoPlaylistModernLoaded) return;
  window.__dawoPlaylistModernLoaded = true;

  const DB_NAME = 'DawoMixPlaylistStudioDB';
  const STORE = 'playlists';
  const state = { playlists: [], activeId: null, search: '' };
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => ({
    playlist:'☷', edit:'✎', image:'▧', add:'＋', trash:'⌫', send:'⌁', music:'♫', back:'←', check:'✓', search:'⌕'
  }[name] || '•');

  function openDb(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,1);
      r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE,{keyPath:'id'}); };
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  async function allPlaylists(){const db=await openDb();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
  async function putPlaylist(p){const db=await openDb();return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(p);r.onsuccess=()=>resolve(p);r.onerror=()=>reject(r.error)})}
  async function deletePlaylist(id){const db=await openDb();return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
  async function library(){try{return await window.parent.DawoLibrary.all()}catch{return[]}}
  async function getTrack(uid){try{return await window.parent.DawoLibrary.get(uid)}catch{return null}}

  function css(){
    if(document.getElementById('dawoPlaylistModernStyle')) return;
    const s=document.createElement('style');s.id='dawoPlaylistModernStyle';s.textContent=`
      #dawoPlaylistModern{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 10% 0%,rgba(0,229,255,.10),transparent 28%),radial-gradient(circle at 90% 90%,rgba(168,85,247,.08),transparent 30%),#05080e;color:#eaf4fb;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;overflow:auto}
      .dpm-shell{max-width:1180px;margin:0 auto;padding:20px 20px 120px}.dpm-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.dpm-head h1{font-size:22px;margin:0}.dpm-head p{margin:4px 0 0;color:#71869a;font-size:12px}.dpm-pill{padding:7px 10px;border:1px solid #1e3242;border-radius:999px;background:#08131d;color:#69e7f2;font-size:10px;font-weight:800}
      .dpm-create{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:12px;margin-bottom:16px}.dpm-create input,.dpm-modal input,.dpm-search{height:56px;border-radius:16px;border:1px solid #203443;background:#07101a;color:#eef7fb;padding:0 18px;font-size:16px;outline:none}.dpm-create input:focus,.dpm-modal input:focus,.dpm-search:focus{border-color:#27d9ed;box-shadow:0 0 0 3px #27d9ed16}.dpm-primary{border:0;border-radius:16px;background:linear-gradient(135deg,#20bdd4,#27d9ed);color:#041016;font-weight:900;font-size:15px;cursor:pointer}.dpm-primary:hover{filter:brightness(1.07)}
      .dpm-grid{display:grid;gap:14px}.dpm-card{display:grid;grid-template-columns:116px minmax(0,1fr);gap:16px;padding:16px;border:1px solid #1c2b38;border-radius:22px;background:linear-gradient(180deg,#0b111c,#080d15);box-shadow:0 10px 30px #0005}.dpm-cover{width:116px;height:116px;border-radius:16px;overflow:hidden;border:1px dashed #314859;background:#050a11;display:grid;place-items:center;color:#435569;font-size:38px}.dpm-cover img{width:100%;height:100%;object-fit:cover}.dpm-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.dpm-card h3{margin:5px 0 3px;font-size:19px}.dpm-card small{color:#71869a}.dpm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.dpm-btn{min-height:38px;padding:0 12px;border-radius:11px;border:1px solid #223545;background:#0a1520;color:#9db0c2;cursor:pointer;font-weight:700}.dpm-btn:hover{border-color:#27d9ed66;color:#27d9ed}.dpm-btn.danger:hover{border-color:#ff526866;color:#ff6578}.dpm-track-preview{margin-top:12px;color:#6f8294;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dpm-empty{padding:48px 20px;text-align:center;border:1px dashed #233645;border-radius:18px;color:#71869a}.dpm-empty b{display:block;color:#dce8f3;margin-bottom:6px}
      .dpm-modal-back{position:fixed;inset:0;z-index:2147483600;background:#000b;display:grid;place-items:center;padding:18px}.dpm-modal{width:min(760px,100%);max-height:min(86vh,820px);overflow:auto;border:1px solid #203443;border-radius:22px;background:#09111b;padding:18px;box-shadow:0 30px 80px #000a}.dpm-modal h2{margin:0 0 14px;font-size:20px}.dpm-modal-row{display:grid;grid-template-columns:130px 1fr;gap:16px}.dpm-cover-edit{width:130px;height:130px;border-radius:17px;overflow:hidden;border:1px dashed #314859;background:#050a11;display:grid;place-items:center;cursor:pointer}.dpm-cover-edit img{width:100%;height:100%;object-fit:cover}.dpm-cover-edit span{color:#6f8294;text-align:center;font-size:11px;padding:10px}.dpm-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.dpm-list{margin-top:14px;border:1px solid #172633;border-radius:14px;overflow:hidden}.dpm-list-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #14232f}.dpm-list-row:last-child{border-bottom:0}.dpm-list-row strong{display:block;font-size:12px}.dpm-list-row small{display:block;color:#71869a;font-size:9px;margin-top:2px}.dpm-search{width:100%;height:44px;margin-top:12px}.dpm-chip{font-size:9px;color:#61e3ed;border:1px solid #1b4d55;border-radius:999px;padding:4px 7px}
      @media(max-width:700px){.dpm-shell{padding:12px 12px 90px}.dpm-create{grid-template-columns:1fr 118px}.dpm-create input{height:54px}.dpm-card{grid-template-columns:86px minmax(0,1fr);padding:12px}.dpm-cover{width:86px;height:86px}.dpm-actions{margin-top:10px}.dpm-btn{font-size:11px;padding:0 10px}.dpm-modal-row{grid-template-columns:1fr}.dpm-cover-edit{width:110px;height:110px}.dpm-head h1{font-size:18px}}
    `;document.head.appendChild(s);
  }

  function root(){let r=document.getElementById('dawoPlaylistModern');if(!r){r=document.createElement('div');r.id='dawoPlaylistModern';document.body.appendChild(r)}return r}
  function current(){return state.playlists.find(p=>p.id===state.activeId)||null}
  async function refresh(){state.playlists=(await allPlaylists()).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));render()}

  async function render(){
    const r=root();
    const lib=await library();
    r.innerHTML=`<div class="dpm-shell">
      <div class="dpm-head"><div><h1>${icon('playlist')} Playlist Creator</h1><p>Vytvářej playlisty, upravuj cover a přidávej skladby z Library.</p></div><span class="dpm-pill">${state.playlists.length} PLAYLISTŮ · ${lib.length} TRACKŮ</span></div>
      <div class="dpm-create"><input id="dpmNewName" placeholder="Název nového playlistu…"><button id="dpmCreate" class="dpm-primary">Vytvořit</button></div>
      <div id="dpmCards" class="dpm-grid">${state.playlists.length?state.playlists.map(p=>card(p,lib)).join(''):'<div class="dpm-empty"><b>Zatím žádný playlist</b>Vytvoř první playlist nahoře.</div>'}</div>
    </div>`;
    document.getElementById('dpmCreate').onclick=createFromInput;
    document.getElementById('dpmNewName').addEventListener('keydown',e=>{if(e.key==='Enter')createFromInput()});
    r.querySelectorAll('[data-dpm-edit]').forEach(b=>b.onclick=()=>editModal(b.dataset.dpmEdit));
    r.querySelectorAll('[data-dpm-add]').forEach(b=>b.onclick=()=>tracksModal(b.dataset.dpmAdd));
    r.querySelectorAll('[data-dpm-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.dpmDelete));
    r.querySelectorAll('[data-dpm-send]').forEach(b=>b.onclick=()=>send(b.dataset.dpmSend));
  }

  function card(p,lib){
    const tracks=(p.trackUids||[]).map(uid=>lib.find(t=>t.uid===uid)).filter(Boolean);
    const preview=tracks.slice(0,4).map(t=>t.title).join(' · ') || 'Prázdný playlist';
    return `<article class="dpm-card">
      <div class="dpm-cover">${p.cover?`<img src="${p.cover}" alt="">`:icon('music')}</div>
      <div><div class="dpm-card-head"><div><h3>${esc(p.name)}</h3><small>${tracks.length} skladeb</small></div><span class="dpm-chip">${tracks.length? 'READY':'EMPTY'}</span></div>
      <div class="dpm-track-preview">${esc(preview)}</div>
      <div class="dpm-actions">
        <button class="dpm-btn" data-dpm-edit="${esc(p.id)}">${icon('edit')} Upravit</button>
        <button class="dpm-btn" data-dpm-add="${esc(p.id)}">${icon('add')} Přidat skladby</button>
        <button class="dpm-btn" data-dpm-send="${esc(p.id)}">${icon('send')} Do Cue Editoru</button>
        <button class="dpm-btn danger" data-dpm-delete="${esc(p.id)}">${icon('trash')}</button>
      </div></div>
    </article>`;
  }

  async function createFromInput(){
    const i=document.getElementById('dpmNewName');const name=i.value.trim();if(!name)return;
    const now=new Date().toISOString();
    await putPlaylist({id:'pl_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,cover:'',trackUids:[],createdAt:now,updatedAt:now});
    i.value='';await refresh();window.parent.DawoMixStudio?.setStatus?.(`Vytvořen playlist „${name}“`);
  }

  async function remove(id){const p=state.playlists.find(x=>x.id===id);if(!p)return;if(!confirm(`Smazat playlist „${p.name}“?`))return;await deletePlaylist(id);await refresh()}

  function modal(content){const wrap=document.createElement('div');wrap.className='dpm-modal-back';wrap.innerHTML=`<div class="dpm-modal">${content}</div>`;wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap);return wrap}

  function editModal(id){
    const p=state.playlists.find(x=>x.id===id);if(!p)return;
    const m=modal(`<h2>${icon('edit')} Upravit playlist</h2><div class="dpm-modal-row"><label class="dpm-cover-edit"><input id="dpmCoverInput" type="file" accept="image/*" hidden>${p.cover?`<img id="dpmCoverPreview" src="${p.cover}">`:'<span id="dpmCoverPreview">▧<br>Změnit obrázek</span>'}</label><div><input id="dpmEditName" value="${esc(p.name)}" placeholder="Název playlistu"><p style="color:#71869a;font-size:11px;line-height:1.5">Cover se uloží přímo k playlistu a zůstane zachovaný po obnovení stránky.</p></div></div><div class="dpm-modal-actions"><button class="dpm-btn" id="dpmCancel">Zrušit</button><button class="dpm-primary" id="dpmSave" style="min-height:40px;padding:0 18px">Uložit</button></div>`);
    let cover=p.cover||'';
    m.querySelector('#dpmCancel').onclick=()=>m.remove();
    m.querySelector('#dpmCoverInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{cover=reader.result;const preview=m.querySelector('#dpmCoverPreview');if(preview.tagName==='IMG')preview.src=cover;else{const img=document.createElement('img');img.id='dpmCoverPreview';img.src=cover;preview.replaceWith(img)}};reader.readAsDataURL(f)};
    m.querySelector('#dpmSave').onclick=async()=>{const name=m.querySelector('#dpmEditName').value.trim()||p.name;await putPlaylist({...p,name,cover,updatedAt:new Date().toISOString()});m.remove();await refresh()};
  }

  async function tracksModal(id){
    const p=state.playlists.find(x=>x.id===id);if(!p)return;const lib=await library();let selected=new Set(p.trackUids||[]);
    const m=modal(`<h2>${icon('add')} Přidat skladby · ${esc(p.name)}</h2><input id="dpmTrackSearch" class="dpm-search" placeholder="Hledat v knihovně…"><div id="dpmTrackList" class="dpm-list"></div><div class="dpm-modal-actions"><button class="dpm-btn" id="dpmTrackCancel">Zrušit</button><button class="dpm-primary" id="dpmTrackSave" style="min-height:40px;padding:0 18px">Uložit výběr</button></div>`);
    const draw=()=>{const q=(m.querySelector('#dpmTrackSearch').value||'').toLowerCase();const rows=lib.filter(t=>`${t.title||''} ${t.artist||''}`.toLowerCase().includes(q));m.querySelector('#dpmTrackList').innerHTML=rows.length?rows.map(t=>`<label class="dpm-list-row"><input type="checkbox" data-track="${esc(t.uid)}" ${selected.has(t.uid)?'checked':''}><span><strong>${esc(t.title||t.fileName||'Bez názvu')}</strong><small>${esc(t.artist||'—')} · ${t.bpm||'—'} BPM · ${esc(t.key||'—')}</small></span><span class="dpm-chip">${(t.cues||[]).filter(v=>v!=null).length}/8</span></label>`).join(''):'<div class="dpm-empty"><b>Nic nenalezeno</b></div>';m.querySelectorAll('[data-track]').forEach(ch=>ch.onchange=()=>ch.checked?selected.add(ch.dataset.track):selected.delete(ch.dataset.track))};
    draw();m.querySelector('#dpmTrackSearch').oninput=draw;m.querySelector('#dpmTrackCancel').onclick=()=>m.remove();m.querySelector('#dpmTrackSave').onclick=async()=>{await putPlaylist({...p,trackUids:[...selected],updatedAt:new Date().toISOString()});m.remove();await refresh()};
  }

  async function send(id){
    const p=state.playlists.find(x=>x.id===id);if(!p)return;const tracks=[];for(const uid of p.trackUids||[]){const t=await getTrack(uid);if(t)tracks.push({id:t.sourceId||t.uid,title:t.title,artist:t.artist,bpm:t.bpm,key:t.key,duration:t.duration,fileBlob:t.fileBlob,fileName:t.fileName,waveformData:t.waveformData,cues:t.cues,autoCues:t.autoCues})}
    if(!tracks.length)return alert('Playlist je prázdný.');
    window.parent.DawoMixStudio?.transferPlaylist?.({id:p.id,name:p.name,tracks});
  }

  function boot(){css();refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.DawoPlaylistModern={refresh};
})();
(()=>{
  if(window.__dawoWorkflowProLoaded)return;
  window.__dawoWorkflowProLoaded=true;
  const QUEUE_KEY='dawo:workflow:analyzerQueue';
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let queueBusy=false,skipRequested=false;

  function getSelectedLibraryUids(){
    return [...document.querySelectorAll('#libraryModuleRows input[data-library-select]:checked')].map(x=>x.dataset.librarySelect).filter(Boolean);
  }
  function saveQueue(ids){sessionStorage.setItem(QUEUE_KEY,JSON.stringify([...new Set(ids||[])]));}
  function loadQueue(){try{return JSON.parse(sessionStorage.getItem(QUEUE_KEY)||'[]').filter(Boolean)}catch{return[]}}

  function installStyle(){
    if($('#dawoWorkflowProStyle'))return;
    const s=document.createElement('style');s.id='dawoWorkflowProStyle';s.textContent=`
      .workflow-queue{margin:0 0 16px;padding:14px;border:1px solid #28303a;border-radius:13px;background:#11151b;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.workflow-queue strong{font-size:12px;color:#eef2f6}.workflow-queue small{color:#87919d}.workflow-progress{height:5px;min-width:160px;flex:1;border-radius:99px;background:#20262e;overflow:hidden}.workflow-progress i{display:block;height:100%;width:0;background:#63b6c5;transition:width .2s}.workflow-status{min-width:120px;color:#aeb7c1;font-size:10px}.workflow-go{min-height:38px;padding:0 13px;border:1px solid #2d5f50;border-radius:9px;background:#19372f;color:#d9f5e9;font-weight:800;cursor:pointer}.workflow-skip{min-height:38px;padding:0 12px;border:1px solid #454b55;border-radius:9px;background:#171b21;color:#c2c8d0;font-weight:700;cursor:pointer}.workflow-add-playlist{color:#d0ad5c!important}.workflow-readiness{margin:18px auto 0;max-width:1100px;border:1px solid #28303a;border-radius:14px;background:#11151b;padding:16px}.workflow-ready-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.workflow-ready-grid article{padding:12px;border:1px solid #242b34;border-radius:10px;background:#151a21}.workflow-ready-grid small{display:block;color:#7f8995;font-size:9px}.workflow-ready-grid strong{display:block;margin-top:5px;font-size:18px}.workflow-ready-ok{color:#76c6a5}.workflow-ready-warn{color:#d0ad5c}
      .workflow-playlist-pop{position:fixed;inset:0;z-index:9999;background:#0009;display:grid;place-items:center;padding:18px}.workflow-playlist-card{width:min(430px,100%);max-height:80vh;overflow:auto;border:1px solid #303741;border-radius:16px;background:#12161c;padding:16px;box-shadow:0 24px 70px #0008}.workflow-playlist-card h3{margin:0 0 12px}.workflow-playlist-card button{width:100%;text-align:left;margin:5px 0;padding:11px 12px;border:1px solid #2a313a;border-radius:10px;background:#171c23;color:#dce3ea;cursor:pointer}.workflow-playlist-card button:hover{border-color:#63717d}.workflow-playlist-new{display:flex;gap:8px;margin-top:12px}.workflow-playlist-new input{flex:1;min-width:0;padding:10px;border:1px solid #303741;border-radius:9px;background:#0f1318;color:#fff}.workflow-playlist-new button{width:auto;margin:0;background:#1c3a31;border-color:#315c4d}
      @media(max-width:760px){.workflow-ready-grid{grid-template-columns:repeat(2,1fr)}.workflow-queue{align-items:stretch}.workflow-progress{flex-basis:100%}}
    `;document.head.appendChild(s);
  }

  function installLibraryWorkflow(){
    const open=$('#libraryOpenAnalyzer');
    if(open&&!open.dataset.workflowBound){
      open.dataset.workflowBound='1';
      open.addEventListener('click',()=>{
        const ids=getSelectedLibraryUids();
        if(ids.length)saveQueue(ids);else saveQueue([]);
        setTimeout(()=>installAnalyzerQueue(),80);
      },true);
    }
    const rows=$('#libraryModuleRows');
    if(rows&&!rows.dataset.playlistObserver){
      rows.dataset.playlistObserver='1';
      const apply=()=>{
        rows.querySelectorAll('.library-module-row[data-library-uid]').forEach(row=>{
          const actions=row.querySelector('.library-module-actions');if(!actions||actions.querySelector('.workflow-add-playlist'))return;
          const b=document.createElement('button');b.type='button';b.className='workflow-add-playlist';b.title='Přidat do playlistu';b.textContent='＋';b.onclick=e=>{e.stopPropagation();openPlaylistChooser(row.dataset.libraryUid)};actions.prepend(b);
        });
      };
      new MutationObserver(apply).observe(rows,{childList:true,subtree:true});apply();
    }
  }

  function openPlaylistDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('DawoMixPlaylistStudioDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('playlists'))r.result.createObjectStore('playlists',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  async function getPlaylists(){const db=await openPlaylistDb();const out=await req(db.transaction('playlists').objectStore('playlists').getAll());db.close();return out||[]}
  async function putPlaylist(p){const db=await openPlaylistDb();await req(db.transaction('playlists','readwrite').objectStore('playlists').put(p));db.close()}
  async function openPlaylistChooser(uid){
    const list=await getPlaylists();const wrap=document.createElement('div');wrap.className='workflow-playlist-pop';
    wrap.innerHTML=`<div class="workflow-playlist-card"><h3>＋ Přidat skladbu do playlistu</h3><div class="workflow-playlist-list">${list.length?list.map(p=>`<button data-pl="${esc(p.id)}">${esc(p.name)} <small>· ${(p.trackUids||[]).length} skladeb</small></button>`).join(''):'<small>Zatím nemáš žádný playlist.</small>'}</div><div class="workflow-playlist-new"><input placeholder="Nový playlist"><button type="button">Vytvořit + přidat</button></div></div>`;
    document.body.appendChild(wrap);wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
    wrap.querySelectorAll('[data-pl]').forEach(b=>b.onclick=async()=>{const p=list.find(x=>x.id===b.dataset.pl);if(!p)return;p.trackUids=[...new Set([...(p.trackUids||[]),uid])];p.updatedAt=new Date().toISOString();await putPlaylist(p);wrap.remove();DawoMixStudio?.setStatus?.(`Přidáno do playlistu ${p.name}`)});
    const input=wrap.querySelector('input'),create=wrap.querySelector('.workflow-playlist-new button');create.onclick=async()=>{const name=input.value.trim();if(!name)return;const now=new Date().toISOString(),p={id:'pl_'+Date.now().toString(36),name,cover:'',trackUids:[uid],createdAt:now,updatedAt:now};await putPlaylist(p);wrap.remove();DawoMixStudio?.setStatus?.(`Vytvořen playlist ${name}`)};
  }

  function installAnalyzerQueue(){
    const panel=$('#analyzer');if(!panel)return;
    const toolbar=panel.querySelector('.analyzer-toolbar');if(!toolbar||$('#workflowAnalyzerQueue'))return;
    const box=document.createElement('div');box.id='workflowAnalyzerQueue';box.className='workflow-queue';
    box.innerHTML='<div><strong>ANALYZER QUEUE</strong><br><small id="workflowQueueText">Žádný výběr z Library</small></div><div class="workflow-progress"><i id="workflowQueueProgress"></i></div><span id="workflowQueueStatus" class="workflow-status">0 / 0</span><button id="workflowAnalyzeQueue" class="workflow-go" type="button">Analyzovat vybrané</button><button id="workflowSkipTrack" class="workflow-skip" type="button">Přeskočit</button><button id="workflowContinueCues" class="workflow-go" type="button">Pokračovat do Cue Editoru →</button>';
    toolbar.after(box);
    $('#workflowAnalyzeQueue').onclick=runQueue;$('#workflowSkipTrack').onclick=()=>skipRequested=true;$('#workflowContinueCues').onclick=continueToCue;
    refreshQueueUi();
  }
  async function refreshQueueUi(){
    const ids=loadQueue(),all=window.DawoLibrary?await DawoLibrary.all():[],names=ids.map(id=>all.find(t=>t.uid===id)?.title).filter(Boolean);
    const text=$('#workflowQueueText');if(text)text.textContent=ids.length?`${ids.length} vybraných · ${names.slice(0,3).join(' · ')}${names.length>3?'…':''}`:'Bez výběru: použije se celá analyzovatelná knihovna';
    const status=$('#workflowQueueStatus');if(status)status.textContent=`0 / ${ids.length||all.filter(t=>t.fileBlob).length}`;
  }
  async function runQueue(){
    if(queueBusy||!window.DawoAnalyzer?.analyzeBlob)return;
    let ids=loadQueue(),rows=await DawoLibrary.all();rows=ids.length?ids.map(id=>rows.find(t=>t.uid===id)).filter(Boolean):rows.filter(t=>t.fileBlob);rows=rows.filter(t=>t.fileBlob);
    if(!rows.length)return alert('Ve frontě nejsou analyzovatelné audio soubory.');
    queueBusy=true;skipRequested=false;const btn=$('#workflowAnalyzeQueue');btn.disabled=true;
    let done=0,errors=0,skipped=0;
    for(let i=0;i<rows.length;i++){
      const t=rows[i];$('#workflowQueueStatus').textContent=`${i+1} / ${rows.length} · ${t.title||t.fileName||''}`;$('#workflowQueueProgress').style.width=`${i/rows.length*100}%`;
      if(skipRequested){skipRequested=false;skipped++;continue}
      try{await DawoLibrary.update(t.uid,await DawoAnalyzer.analyzeBlob(t.fileBlob));done++}catch(e){console.warn(e);errors++}
    }
    $('#workflowQueueProgress').style.width='100%';$('#workflowQueueStatus').textContent=`Hotovo ${done} · chyby ${errors} · přeskočeno ${skipped}`;btn.disabled=false;queueBusy=false;DawoAnalyzer.render?.();DawoMixStudio?.setStatus?.(`Analyzer queue dokončena: ${done}/${rows.length}`);
  }

  async function cueDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('DawoMixStudioCueflowDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('tracks'))r.result.createObjectStore('tracks',{keyPath:'sourceKey'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function continueToCue(){
    let ids=loadQueue(),rows=await DawoLibrary.all();rows=ids.length?ids.map(id=>rows.find(t=>t.uid===id)).filter(Boolean):rows.filter(t=>t.bpm||t.key||t.cues?.length);if(!rows.length)return alert('Není co poslat do Cue Editoru.');
    const db=await cueDb(),tx=db.transaction('tracks','readwrite'),store=tx.objectStore('tracks');let firstId=null;
    for(let i=0;i<rows.length;i++){
      const t=rows[i],sourceKey=`workflow:${t.uid}`,existing=await req(store.get(sourceKey)),id=existing?.id||Date.now()+i+Math.random();if(firstId==null)firstId=id;
      const cues=Array.from({length:8},(_,n)=>{const v=t.autoCues?.[n]?.time??t.cues?.[n];return Number.isFinite(Number(v))?Number(v):null});
      const row={...(existing||{}),sourceKey,playlistId:'workflow',playlistName:'Workflow Queue',id,title:t.title||t.fileName||'Bez názvu',artist:t.artist||'—',bpm:Number(t.bpm)||null,key:t.key||'—',duration:Number(t.duration)||180,ready:cues.every(v=>v!=null),color:existing?.color||'#63b6c5',cover:existing?.cover||'linear-gradient(135deg,#30404d,#161b22)',cues,wave:t.waveformData||t.wave||null,fileBlob:t.fileBlob||existing?.fileBlob||null,fileName:t.fileName||existing?.fileName||'',sharedUid:t.uid,beatgrid:t.beatgrid||[],firstBeat:t.firstBeat??null,downbeat:t.downbeat??null,beatInterval:t.beatInterval??null};await req(store.put(row));
    }
    db.close();sessionStorage.setItem('dawo:workflow:cueCount',String(rows.length));DawoMixStudio?.showPanel?.('cueflow');const frame=$('#cueflow');if(frame){const open=()=>{let n=0;const timer=setInterval(()=>{n++;try{const card=frame.contentDocument?.querySelector(`[data-open="${CSS.escape(String(firstId))}"]`);if(card){clearInterval(timer);card.click()}else if(n>80)clearInterval(timer)}catch{if(n>80)clearInterval(timer)}},100)};frame.addEventListener('load',open,{once:true});frame.contentWindow?.location.reload()}
  }

  async function renderTraktorReadiness(){
    const panel=$('#traktor');if(!panel||!window.DawoLibrary)return;let box=$('#workflowTraktorReady');if(!box){box=document.createElement('div');box.id='workflowTraktorReady';box.className='workflow-readiness';panel.appendChild(box)}
    let ids=loadQueue(),rows=await DawoLibrary.all();if(ids.length)rows=ids.map(id=>rows.find(t=>t.uid===id)).filter(Boolean);
    const analyzed=rows.filter(t=>t.bpm&&t.key&&t.key!=='—').length,grid=rows.filter(t=>t.firstBeat!=null&&t.beatInterval).length,cues=rows.filter(t=>(t.cues||[]).filter(v=>v!=null).length>=8).length,ready=rows.filter(t=>t.bpm&&t.key&&t.key!=='—'&&t.firstBeat!=null&&t.beatInterval&&(t.cues||[]).filter(v=>v!=null).length>=8).length;
    box.innerHTML=`<strong>READY FOR TRAKTOR</strong><div class="workflow-ready-grid"><article><small>VÝBĚR</small><strong>${rows.length}</strong></article><article><small>BPM + KEY</small><strong class="${analyzed===rows.length?'workflow-ready-ok':'workflow-ready-warn'}">${analyzed}/${rows.length}</strong></article><article><small>BEATGRID</small><strong class="${grid===rows.length?'workflow-ready-ok':'workflow-ready-warn'}">${grid}/${rows.length}</strong></article><article><small>8 HOT CUES</small><strong class="${cues===rows.length?'workflow-ready-ok':'workflow-ready-warn'}">${cues}/${rows.length}</strong></article></div><p style="margin:12px 0 0;color:#87919d;font-size:11px">${ready===rows.length&&rows.length?'Výběr je připravený pro Traktor export.':'Dokonči chybějící analýzu, beatgrid nebo cue pointy.'}</p>`;
  }

  function boot(){installStyle();installLibraryWorkflow();installAnalyzerQueue();renderTraktorReadiness();new MutationObserver(()=>{installLibraryWorkflow();installAnalyzerQueue()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('dawo-library-change',()=>{refreshQueueUi();renderTraktorReadiness()});document.querySelectorAll('[data-target="traktor"]').forEach(x=>x.addEventListener('click',()=>setTimeout(renderTraktorReadiness,80)))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
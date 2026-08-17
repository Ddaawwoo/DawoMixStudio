(() => {
  const $ = s => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let query='';
  let duplicateGroups=[];
  let duplicateUids=new Set();

  function injectStyle(){
    if(document.getElementById('dawoLibraryModuleStyle')) return;
    const style=document.createElement('style');
    style.id='dawoLibraryModuleStyle';
    style.textContent=`
      .library-module-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
      .library-module-search{flex:1;min-width:220px;padding:11px 13px;border:1px solid #1d2a38;border-radius:10px;background:#07101a;color:#eef7fb;outline:none}
      .library-module-search:focus{border-color:#19e6ef;box-shadow:0 0 0 2px #19e6ef18}
      .library-duplicate-summary{margin:-4px 0 12px;padding:10px 12px;border:1px solid #6a4b1d;border-radius:10px;background:#22170a;color:#ffc85a;font-size:11px;line-height:1.45}
      .library-module-table{border:1px solid #172330;border-radius:14px;overflow:hidden;background:#081019}
      .library-module-head,.library-module-row{display:grid;grid-template-columns:minmax(220px,2fr) minmax(140px,1.2fr) 90px 80px 110px 100px;gap:12px;align-items:center;padding:11px 14px}
      .library-module-head{font-size:9px;letter-spacing:.12em;color:#6f8295;font-weight:800;background:#0b141f;border-bottom:1px solid #172330}
      .library-module-row{border-bottom:1px solid #12202c;transition:background .15s ease}
      .library-module-row:last-child{border-bottom:0}.library-module-row:hover{background:#0d1925}.library-module-row.duplicate{background:linear-gradient(90deg,#2a160caa,#0d151f);box-shadow:inset 3px 0 #ff9d3d}.library-module-row.duplicate:hover{background:#2b190f}
      .library-module-title strong{display:block;font-size:12px;color:#eef7fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.library-module-title small{display:block;margin-top:3px;color:#6f8295;font-size:9px}.library-module-row.duplicate .library-module-title small:after{content:' · DUPLICITA';color:#ffac55;font-weight:900;letter-spacing:.06em}
      .library-module-cell{font-size:11px;color:#a9b8c7}.library-module-badge{display:inline-flex;align-items:center;justify-content:center;min-width:56px;padding:5px 8px;border-radius:999px;border:1px solid #213243;background:#0b1621;font-size:9px;font-weight:800}
      .library-module-badge.ok{color:#3ee6a8;border-color:#164b3a}.library-module-badge.warn{color:#ffc857;border-color:#5b4722}
      .library-module-actions{display:flex;gap:6px;justify-content:flex-end}.library-module-actions button{width:30px;height:30px;border:1px solid #213243;border-radius:8px;background:#0a1520;color:#8fa5b8;cursor:pointer}.library-module-actions button:hover{color:#19e6ef;border-color:#19e6ef66}
      .library-module-empty{padding:50px 20px;text-align:center;color:#6f8295}.library-module-empty b{display:block;color:#dce8f3;margin-bottom:6px}
      @media(max-width:900px){.library-module-head{display:none}.library-module-row{grid-template-columns:1fr auto auto;gap:8px}.library-module-row>.library-module-cell:nth-of-type(1),.library-module-row>.library-module-cell:nth-of-type(4){display:none}.library-module-row .library-module-actions{grid-column:1/-1;justify-content:flex-start}.library-module-toolbar>*{flex:1 1 160px}.library-module-search{flex-basis:100%}}
    `;
    document.head.appendChild(style);
  }

  const clean = value => String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\.[a-z0-9]{2,5}$/,'').replace(/[^a-z0-9]+/g,' ').trim();
  const blobSize = track => Number(track?.fileBlob?.size || track?.sourceRecord?.fileBlob?.size || 0);
  const roundedDuration = track => { const d=Number(track?.duration)||0; return d>0 ? Math.round(d*2)/2 : 0; };
  function duplicateKeys(track){
    const keys=[];
    const file=clean(track.fileName);
    const title=clean(track.title);
    const artist=clean(track.artist==='Neznámý interpret'?'':track.artist);
    const size=blobSize(track);
    const duration=roundedDuration(track);
    if(file && size) keys.push(`file-size:${file}|${size}`);
    if(file && duration) keys.push(`file-duration:${file}|${duration}`);
    if(title && artist && duration && size) keys.push(`meta-size:${title}|${artist}|${duration}|${size}`);
    if(title && artist && duration) keys.push(`meta-duration:${title}|${artist}|${duration}`);
    return keys;
  }
  function quality(track){
    let score=0;
    if(track.fileBlob) score+=100;
    score+=Math.min(40,(Array.isArray(track.cues)?track.cues.filter(v=>v!=null).length:0)*5);
    if(track.bpm) score+=16;if(track.key&&track.key!=='—')score+=12;
    if(track.waveformData?.length)score+=18;if(track.beatgrid?.length)score+=16;
    if(track.analysisConfidence)score+=Math.min(12,Number(track.analysisConfidence)/10);
    if(track.artist&&track.artist!=='Neznámý interpret')score+=5;if(track.album)score+=3;if(track.genre)score+=2;
    if(track.source==='library')score+=6;
    return score;
  }
  function findDuplicateGroups(rows){
    const buckets=new Map();
    for(const track of rows) for(const key of duplicateKeys(track)){ if(!buckets.has(key)) buckets.set(key,new Map()); buckets.get(key).set(track.uid,track); }
    const candidates=[...buckets.entries()].filter(([,map])=>map.size>1).sort((a,b)=>b[1].size-a[1].size);
    const used=new Set(),groups=[];
    for(const [key,map] of candidates){const items=[...map.values()].filter(t=>!used.has(t.uid));if(items.length<2)continue;items.sort((a,b)=>quality(b)-quality(a));groups.push({key,keeper:items[0],duplicates:items.slice(1),items});items.forEach(t=>used.add(t.uid));}
    return groups;
  }
  function mergeTrack(keeper,items){
    const bestArray=(field)=>items.map(t=>t[field]).filter(v=>Array.isArray(v)&&v.length).sort((a,b)=>b.length-a.length)[0] || keeper[field];
    const bestText=(field)=>keeper[field] || items.map(t=>t[field]).find(Boolean) || '';
    const bestNumber=(field)=>Number(keeper[field])||items.map(t=>Number(t[field])).find(Number.isFinite)||null;
    const withBlob=items.find(t=>t.fileBlob) || keeper;
    return {
      title:bestText('title'),artist:bestText('artist'),album:bestText('album'),genre:bestText('genre'),fileName:bestText('fileName'),
      fileBlob:withBlob.fileBlob||keeper.fileBlob||null,duration:bestNumber('duration'),bpm:bestNumber('bpm'),key:(keeper.key&&keeper.key!=='—'?keeper.key:items.map(t=>t.key).find(k=>k&&k!=='—'))||'—',keyName:bestText('keyName'),
      energy:keeper.energy||items.map(t=>t.energy).find(Boolean)||null,energyScore:bestNumber('energyScore'),analysisConfidence:bestNumber('analysisConfidence'),analysisEngine:bestText('analysisEngine'),analyzedAt:keeper.analyzedAt||items.map(t=>t.analyzedAt).find(Boolean)||null,
      waveformData:bestArray('waveformData'),beatgrid:bestArray('beatgrid'),cues:bestArray('cues'),autoCues:bestArray('autoCues'),firstBeat:bestNumber('firstBeat'),downbeat:bestNumber('downbeat'),beatInterval:bestNumber('beatInterval'),beatsPerBar:bestNumber('beatsPerBar')||4
    };
  }

  async function render(){
    if(!window.DawoLibrary) return;
    const rows=await window.DawoLibrary.all();
    const filtered=rows.filter(t=>`${t.title||''} ${t.artist||''} ${t.album||''} ${t.genre||''} ${t.key||''}`.toLowerCase().includes(query));
    const count=$('#libraryModuleCount'); if(count) count.textContent=rows.length;
    const body=$('#libraryModuleRows'); if(!body) return;
    body.innerHTML=filtered.length?filtered.map(track=>{
      const cueCount=Array.isArray(track.cues)?track.cues.filter(v=>v!=null).length:0;
      const analyzed=!!(track.bpm || (track.key && track.key!=='—'));
      return `<div class="library-module-row ${duplicateUids.has(track.uid)?'duplicate':''}" data-library-uid="${esc(track.uid)}">
        <div class="library-module-title"><strong>${esc(track.title||track.fileName||'Bez názvu')}</strong><small>${esc(track.fileName||track.source||'DawoMix Library')}</small></div>
        <div class="library-module-cell">${esc(track.artist||'—')}</div>
        <div class="library-module-cell"><span class="library-module-badge ${analyzed?'ok':'warn'}">${track.bpm||'—'} BPM</span></div>
        <div class="library-module-cell"><span class="library-module-badge">${esc(track.key||'—')}</span></div>
        <div class="library-module-cell">${cueCount}/8 CUES</div>
        <div class="library-module-actions"><button type="button" data-library-analyze="${esc(track.uid)}" title="Otevřít v Analyzeru">⌁</button><button type="button" data-library-tags="${esc(track.uid)}" title="Otevřít Tag Editor">◇</button></div>
      </div>`;
    }).join(''):`<div class="library-module-empty"><b>${rows.length?'Nic nenalezeno':'Knihovna je prázdná'}</b><span>${rows.length?'Zkus jiné hledání.':'Nahraj audio soubory pomocí tlačítka Přidat audio.'}</span></div>`;
    body.querySelectorAll('[data-library-analyze]').forEach(btn=>btn.onclick=()=>{window.DawoAnalyzer?.select?.(btn.dataset.libraryAnalyze);window.DawoMixStudio?.showPanel?.('analyzer')});
    body.querySelectorAll('[data-library-tags]').forEach(btn=>{btn.onclick=()=>window.DawoMixStudio?.showPanel?.('tag-editor')});
  }

  async function importFiles(files){
    if(!files?.length||!window.DawoLibrary) return;
    const result=await window.DawoLibrary.addFiles(files);
    duplicateGroups=[];duplicateUids.clear();updateDuplicateUi();await render();
    window.DawoMixStudio?.setStatus?.(`Library: přidáno ${files.length} audio souborů`);
    return result;
  }

  function updateDuplicateUi(){
    const summary=$('#libraryDuplicateSummary'),del=$('#libraryModuleDeleteDuplicates');
    const duplicateCount=duplicateGroups.reduce((n,g)=>n+g.duplicates.length,0);
    if(summary){summary.hidden=!duplicateGroups.length;summary.textContent=duplicateGroups.length?`Nalezeno ${duplicateGroups.length} skupin · ${duplicateCount} nadbytečných záznamů. Oranžově jsou označené všechny skladby ve skupinách; při čištění se vždy ponechá nejlepší záznam.`:'';}
    if(del){del.disabled=!duplicateCount;del.textContent=duplicateCount?`⌫ Smazat duplicity (${duplicateCount})`:'⌫ Smazat duplicity';}
  }

  async function findDuplicates(){
    const rows=await window.DawoLibrary.all();
    duplicateGroups=findDuplicateGroups(rows);duplicateUids=new Set(duplicateGroups.flatMap(g=>g.items.map(t=>t.uid)));updateDuplicateUi();await render();
    const count=duplicateGroups.reduce((n,g)=>n+g.duplicates.length,0);
    window.DawoMixStudio?.setStatus?.(count?`Library: nalezeno ${count} duplicit`:'Library: žádné bezpečně rozpoznané duplicity');
    if(!count) alert('Nenašel jsem žádné vysoce pravděpodobné duplicity.');
  }

  async function rewritePlaylists(replacements){
    if(!replacements.size)return;
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('DawoMixPlaylistStudioDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('playlists'))r.result.createObjectStore('playlists',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const playlists=await new Promise((resolve,reject)=>{const r=db.transaction('playlists').objectStore('playlists').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)});
    for(const p of playlists){const original=p.trackUids||[];const next=[...new Set(original.map(uid=>replacements.get(uid)||uid))];if(next.join('|')!==original.join('|'))await new Promise((resolve,reject)=>{const r=db.transaction('playlists','readwrite').objectStore('playlists').put({...p,trackUids:next,updatedAt:new Date().toISOString()});r.onsuccess=resolve;r.onerror=()=>reject(r.error)});}
    db.close();
  }

  async function deleteDuplicates(){
    if(!duplicateGroups.length)return;
    const count=duplicateGroups.reduce((n,g)=>n+g.duplicates.length,0);
    if(!confirm(`Odstranit ${count} duplicitních záznamů? V každé skupině zůstane jeden nejlepší track. Playlisty se automaticky přepojí na zachovaný záznam.`))return;
    const replacements=new Map();
    for(const group of duplicateGroups){
      const merged=mergeTrack(group.keeper,group.items);
      await window.DawoLibrary.update(group.keeper.uid,merged).catch(async()=>window.DawoLibrary.put({...group.keeper,...merged,updatedAt:Date.now()}));
      for(const dup of group.duplicates){replacements.set(dup.uid,group.keeper.uid);await window.DawoLibrary.remove(dup.uid,{suppress:true});}
    }
    await rewritePlaylists(replacements).catch(console.warn);
    duplicateGroups=[];duplicateUids.clear();updateDuplicateUi();await render();
    window.DawoAnalyzer?.render?.();
    window.DawoMixStudio?.setStatus?.(`Library: odstraněno ${count} duplicit · playlisty zachovány`);
  }

  function bind(){
    injectStyle();
    const search=$('#libraryModuleSearch'); if(search) search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();render()});
    const input=$('#libraryModuleFiles'); if(input) input.addEventListener('change',async()=>{await importFiles([...input.files]);input.value=''});
    $('#libraryModuleSync')?.addEventListener('click',async()=>{await window.DawoMixStudio?.syncLibrary?.();duplicateGroups=[];duplicateUids.clear();updateDuplicateUi();await render()});
    $('#libraryModuleFindDuplicates')?.addEventListener('click',findDuplicates);
    $('#libraryModuleDeleteDuplicates')?.addEventListener('click',deleteDuplicates);
    window.addEventListener('dawo-library-change',render);
    updateDuplicateUi();render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.DawoLibraryModule={render,importFiles,findDuplicates,deleteDuplicates};
})();
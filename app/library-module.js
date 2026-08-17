(() => {
  const $ = s => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let query='';
  let duplicateGroups=[];
  let roleByUid=new Map();

  function injectStyle(){
    if(document.getElementById('dawoLibraryModuleStyle')) return;
    const style=document.createElement('style');
    style.id='dawoLibraryModuleStyle';
    style.textContent=`
      .library-module-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
      .library-module-search{flex:1;min-width:220px;padding:11px 13px;border:1px solid #1d2a38;border-radius:10px;background:#07101a;color:#eef7fb;outline:none}
      .library-module-search:focus{border-color:#19e6ef;box-shadow:0 0 0 2px #19e6ef18}
      .library-duplicate-summary{margin:-4px 0 12px;padding:12px;border:1px solid #6a4b1d;border-radius:12px;background:#22170a;color:#ffc85a;font-size:11px;line-height:1.45}
      .library-duplicate-summary strong{display:block;color:#ffd783;margin-bottom:4px}
      .library-duplicate-delete-inline{display:block;width:100%;min-height:44px;margin-top:10px;border:1px solid #a44235;border-radius:10px;background:#6b1e1e;color:#fff;font-weight:900;cursor:pointer}
      .library-module-table{border:1px solid #172330;border-radius:14px;overflow:hidden;background:#081019}
      .library-module-head,.library-module-row{display:grid;grid-template-columns:minmax(220px,2fr) minmax(140px,1.2fr) 90px 80px 110px 110px;gap:12px;align-items:center;padding:11px 14px}
      .library-module-head{font-size:9px;letter-spacing:.12em;color:#6f8295;font-weight:800;background:#0b141f;border-bottom:1px solid #172330}
      .library-module-row{border-bottom:1px solid #12202c;transition:background .15s ease}
      .library-module-row:last-child{border-bottom:0}.library-module-row:hover{background:#0d1925}
      .library-module-row.keeper{background:linear-gradient(90deg,#0d2a20aa,#0d151f);box-shadow:inset 3px 0 #3ee6a8}
      .library-module-row.to-delete{background:linear-gradient(90deg,#2a160caa,#0d151f);box-shadow:inset 3px 0 #ff9d3d}
      .library-module-title strong{display:block;font-size:12px;color:#eef7fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.library-module-title small{display:block;margin-top:3px;color:#6f8295;font-size:9px}
      .dedupe-label{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.05em;vertical-align:middle}
      .dedupe-label.keep{color:#52efb5;border:1px solid #1e624b;background:#0b2a20}.dedupe-label.delete{color:#ffb060;border:1px solid #75451f;background:#2d180b}
      .library-module-cell{font-size:11px;color:#a9b8c7}.library-module-badge{display:inline-flex;align-items:center;justify-content:center;min-width:56px;padding:5px 8px;border-radius:999px;border:1px solid #213243;background:#0b1621;font-size:9px;font-weight:800}
      .library-module-badge.ok{color:#3ee6a8;border-color:#164b3a}.library-module-badge.warn{color:#ffc857;border-color:#5b4722}
      .library-module-actions{display:flex;gap:6px;justify-content:flex-end}.library-module-actions button{width:30px;height:30px;border:1px solid #213243;border-radius:8px;background:#0a1520;color:#8fa5b8;cursor:pointer}
      .library-module-empty{padding:50px 20px;text-align:center;color:#6f8295}.library-module-empty b{display:block;color:#dce8f3;margin-bottom:6px}
      @media(max-width:900px){
        .library-module-head{display:none}.library-module-row{grid-template-columns:minmax(0,1fr) auto auto;gap:8px}.library-module-row>.library-module-cell:nth-of-type(1),.library-module-row>.library-module-cell:nth-of-type(4){display:none}.library-module-row .library-module-actions{grid-column:1/-1;justify-content:flex-start}
        .library-module-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:8px}.library-module-toolbar>*{min-width:0;width:100%}.library-module-search{grid-column:1/-1;min-width:0}.library-module-toolbar #libraryModuleDeleteDuplicates{grid-column:1/-1;display:block!important;min-height:44px}.library-module-toolbar #libraryModuleSync{grid-column:1/-1}
      }
    `;
    document.head.appendChild(style);
  }

  const clean = value => String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[^a-z0-9]+/g,' ').trim();
  const knownArtist = track => {
    const a=clean(track.artist);
    return a && a!=='neznamy interpret' && a!=='unknown artist' ? a : '';
  };
  const filenameKey = track => clean(track.fileName || track.sourceRecord?.fileName || track.sourceRecord?.name || '');
  const metaKey = track => {
    const title=clean(track.title), artist=knownArtist(track);
    return title && artist ? `${title}|${artist}` : '';
  };
  const sizeOf = track => Number(track.fileBlob?.size || track.sourceRecord?.fileBlob?.size || 0);
  const durationOf = track => Number(track.duration)||0;

  function quality(track){
    let score=0;
    if(track.fileBlob) score+=100;
    if(track.source==='library') score+=8;
    if(track.bpm) score+=18;
    if(track.key&&track.key!=='—') score+=12;
    if(Array.isArray(track.waveformData)&&track.waveformData.length) score+=20;
    if(Array.isArray(track.beatgrid)&&track.beatgrid.length) score+=20;
    score+=Math.min(48,(Array.isArray(track.cues)?track.cues.filter(v=>v!=null).length:0)*6);
    if(track.analysisConfidence) score+=Math.min(15,Number(track.analysisConfidence)/7);
    if(knownArtist(track)) score+=5;
    if(track.album) score+=3;
    return score;
  }

  function sameTrack(a,b){
    const af=filenameKey(a), bf=filenameKey(b);
    if(af && bf && af===bf) return true;
    const am=metaKey(a), bm=metaKey(b);
    if(am && bm && am===bm){
      const ad=durationOf(a), bd=durationOf(b), as=sizeOf(a), bs=sizeOf(b);
      if(ad&&bd&&Math.abs(ad-bd)>2) return false;
      if(as&&bs&&Math.abs(as-bs)>Math.max(4096,Math.min(as,bs)*0.02)) return false;
      return true;
    }
    return false;
  }

  function findDuplicateGroups(rows){
    const remaining=[...rows];
    const groups=[];
    while(remaining.length){
      const seed=remaining.shift();
      const matches=[seed];
      for(let i=remaining.length-1;i>=0;i--){
        if(sameTrack(seed,remaining[i])) matches.push(remaining.splice(i,1)[0]);
      }
      if(matches.length>1){
        matches.sort((a,b)=>quality(b)-quality(a));
        groups.push({keeper:matches[0],duplicates:matches.slice(1),items:matches});
      }
    }
    return groups;
  }

  function mergeTrack(keeper,items){
    const bestArray=field=>items.map(t=>t[field]).filter(v=>Array.isArray(v)&&v.length).sort((a,b)=>b.length-a.length)[0] || keeper[field] || [];
    const bestText=field=>keeper[field] || items.map(t=>t[field]).find(Boolean) || '';
    const bestNumber=field=>{for(const t of [keeper,...items]){const n=Number(t[field]);if(Number.isFinite(n)&&n!==0)return n;}return null;};
    const blobTrack=items.find(t=>t.fileBlob)||keeper;
    return {
      title:bestText('title'),artist:bestText('artist'),album:bestText('album'),genre:bestText('genre'),fileName:bestText('fileName'),fileBlob:blobTrack.fileBlob||null,
      duration:bestNumber('duration'),bpm:bestNumber('bpm'),key:(keeper.key&&keeper.key!=='—'?keeper.key:items.map(t=>t.key).find(k=>k&&k!=='—'))||'—',keyName:bestText('keyName'),
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
      const role=roleByUid.get(track.uid)||'';
      const label=role==='keeper'?'<span class="dedupe-label keep">PONECHAT</span>':role==='delete'?'<span class="dedupe-label delete">SMAZAT</span>':'';
      const cueCount=Array.isArray(track.cues)?track.cues.filter(v=>v!=null).length:0;
      const analyzed=!!(track.bpm || (track.key && track.key!=='—'));
      return `<div class="library-module-row ${role==='keeper'?'keeper':role==='delete'?'to-delete':''}" data-library-uid="${esc(track.uid)}">
        <div class="library-module-title"><strong>${esc(track.title||track.fileName||'Bez názvu')}${label}</strong><small>${esc(track.fileName||track.source||'DawoMix Library')}</small></div>
        <div class="library-module-cell">${esc(track.artist||'—')}</div>
        <div class="library-module-cell"><span class="library-module-badge ${analyzed?'ok':'warn'}">${track.bpm||'—'} BPM</span></div>
        <div class="library-module-cell"><span class="library-module-badge">${esc(track.key||'—')}</span></div>
        <div class="library-module-cell">${cueCount}/8 CUES</div>
        <div class="library-module-actions"><button type="button" data-library-analyze="${esc(track.uid)}" title="Otevřít v Analyzeru">⌁</button><button type="button" data-library-tags="${esc(track.uid)}" title="Otevřít Tag Editor">◇</button></div>
      </div>`;
    }).join(''):`<div class="library-module-empty"><b>${rows.length?'Nic nenalezeno':'Knihovna je prázdná'}</b><span>${rows.length?'Zkus jiné hledání.':'Nahraj audio soubory pomocí tlačítka Přidat audio.'}</span></div>`;
    body.querySelectorAll('[data-library-analyze]').forEach(btn=>btn.onclick=()=>{window.DawoAnalyzer?.select?.(btn.dataset.libraryAnalyze);window.DawoMixStudio?.showPanel?.('analyzer')});
    body.querySelectorAll('[data-library-tags]').forEach(btn=>btn.onclick=()=>window.DawoMixStudio?.showPanel?.('tag-editor'));
  }

  async function importFiles(files){
    if(!files?.length||!window.DawoLibrary) return;
    const result=await window.DawoLibrary.addFiles(files);
    resetDuplicates();await render();
    window.DawoMixStudio?.setStatus?.(`Library: přidáno ${files.length} audio souborů`);
    return result;
  }

  function resetDuplicates(){duplicateGroups=[];roleByUid.clear();updateDuplicateUi();}

  function updateDuplicateUi(){
    const summary=$('#libraryDuplicateSummary'), del=$('#libraryModuleDeleteDuplicates');
    const duplicateCount=duplicateGroups.reduce((n,g)=>n+g.duplicates.length,0);
    if(del){del.disabled=!duplicateCount;del.hidden=false;del.textContent=duplicateCount?`⌫ Smazat duplicity (${duplicateCount})`:'⌫ Smazat duplicity';}
    if(summary){
      summary.hidden=!duplicateCount;
      summary.innerHTML=duplicateCount?`<strong>Nalezeno ${duplicateGroups.length} skupin · ${duplicateCount} souborů ke smazání</strong>Zelený řádek zůstane. Oranžové řádky budou odstraněny.<button id="libraryDuplicateDeleteInline" class="library-duplicate-delete-inline" type="button">⌫ Smazat ${duplicateCount} duplicit</button>`:'';
      summary.querySelector('#libraryDuplicateDeleteInline')?.addEventListener('click',deleteDuplicates);
    }
  }

  async function findDuplicates(){
    const rows=await window.DawoLibrary.all();
    duplicateGroups=findDuplicateGroups(rows);
    roleByUid.clear();
    for(const g of duplicateGroups){roleByUid.set(g.keeper.uid,'keeper');for(const d of g.duplicates)roleByUid.set(d.uid,'delete');}
    updateDuplicateUi();await render();
    const count=duplicateGroups.reduce((n,g)=>n+g.duplicates.length,0);
    window.DawoMixStudio?.setStatus?.(count?`Library: nalezeno ${count} souborů ke smazání`:'Library: žádné duplicity');
    if(!count) alert('Nenašel jsem žádné duplicity podle názvu souboru nebo Title + Artist.');
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
    const expected=duplicateGroups.flatMap(g=>g.duplicates.map(d=>d.uid));
    if(!expected.length)return;
    if(!confirm(`Opravdu odstranit ${expected.length} duplicitních záznamů? Jeden nejlepší záznam z každé skupiny zůstane.`))return;
    const replacements=new Map();
    try{
      for(const group of duplicateGroups){
        const merged=mergeTrack(group.keeper,group.items);
        try{await window.DawoLibrary.update(group.keeper.uid,merged);}catch{await window.DawoLibrary.put({...group.keeper,...merged,updatedAt:Date.now()});}
        for(const dup of group.duplicates){
          replacements.set(dup.uid,group.keeper.uid);
          await window.DawoLibrary.remove(dup.uid,{suppress:true});
        }
      }
      await rewritePlaylists(replacements).catch(console.warn);
      const after=await window.DawoLibrary.all();
      const remaining=new Set(after.map(t=>t.uid));
      const failed=expected.filter(uid=>remaining.has(uid));
      if(failed.length) throw new Error(`${failed.length} duplicit zůstalo v IndexedDB.`);
      resetDuplicates();await render();
      window.DawoAnalyzer?.render?.();
      window.DawoMixStudio?.setStatus?.(`Library: odstraněno ${expected.length} duplicit · nyní ${after.length} tracků`);
      alert(`Hotovo. Odstraněno ${expected.length} duplicit. V knihovně zůstává ${after.length} tracků.`);
    }catch(error){
      console.error('Duplicate cleanup failed',error);
      alert(`Mazání duplicit selhalo: ${error.message}`);
      await findDuplicates();
    }
  }

  function bind(){
    injectStyle();
    const search=$('#libraryModuleSearch'); if(search) search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();render()});
    const input=$('#libraryModuleFiles'); if(input) input.addEventListener('change',async()=>{await importFiles([...input.files]);input.value=''});
    $('#libraryModuleSync')?.addEventListener('click',async()=>{await window.DawoMixStudio?.syncLibrary?.();resetDuplicates();await render()});
    $('#libraryModuleFindDuplicates')?.addEventListener('click',findDuplicates);
    $('#libraryModuleDeleteDuplicates')?.addEventListener('click',deleteDuplicates);
    window.addEventListener('dawo-library-change',render);
    updateDuplicateUi();render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.DawoLibraryModule={render,importFiles,findDuplicates,deleteDuplicates};
})();
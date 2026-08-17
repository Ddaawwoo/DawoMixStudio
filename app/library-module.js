(() => {
  const $ = s => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let query='';
  let selected=new Set();
  let duplicateGroups=[];

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
      .library-module-head,.library-module-row{display:grid;grid-template-columns:110px minmax(220px,2fr) minmax(140px,1.2fr) 90px 80px 110px 100px;gap:12px;align-items:center;padding:11px 14px}
      .library-module-head{font-size:9px;letter-spacing:.12em;color:#6f8295;font-weight:800;background:#0b141f;border-bottom:1px solid #172330}
      .library-module-row{border-bottom:1px solid #12202c;transition:background .15s ease}.library-module-row:last-child{border-bottom:0}.library-module-row:hover{background:#0d1925}
      .library-module-row.selected{background:linear-gradient(90deg,#241016,#0d151f);box-shadow:inset 3px 0 #ff5575}.library-module-row.duplicate-keeper{box-shadow:inset 3px 0 #3ee6a8}.library-module-row.duplicate-delete{box-shadow:inset 3px 0 #ff9d3d;background:linear-gradient(90deg,#26170caa,#0d151f)}
      .library-module-title strong{display:block;font-size:12px;color:#eef7fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.library-module-title small{display:block;margin-top:3px;color:#6f8295;font-size:9px}
      .library-module-cell{font-size:11px;color:#a9b8c7}.library-module-badge{display:inline-flex;align-items:center;justify-content:center;min-width:56px;padding:5px 8px;border-radius:999px;border:1px solid #213243;background:#0b1621;font-size:9px;font-weight:800}
      .library-module-badge.ok{color:#3ee6a8;border-color:#164b3a}.library-module-badge.warn{color:#ffc857;border-color:#5b4722}.library-module-badge.keep{color:#3ee6a8;border-color:#1a5b45}.library-module-badge.delete{color:#ffb14b;border-color:#71491a}
      .library-module-actions{display:flex;gap:6px;justify-content:flex-end}.library-module-actions button{width:30px;height:30px;border:1px solid #213243;border-radius:8px;background:#0a1520;color:#8fa5b8;cursor:pointer}.library-module-actions button:hover{color:#19e6ef;border-color:#19e6ef66}
      .library-module-check{display:flex;align-items:center;gap:8px;font-size:10px;color:#91a4b7}.library-module-check input,.library-check-all input{width:18px;height:18px;accent-color:#19dce8}.library-check-all{display:flex;align-items:center;gap:7px;white-space:nowrap;cursor:pointer}
      .next-action{border:1px solid #8758ff;border-radius:10px;background:linear-gradient(135deg,#402072,#6f40d7);color:#fff;font-weight:900;padding:10px 14px;cursor:pointer;box-shadow:0 0 18px #7a4cff25}.next-action:hover{filter:brightness(1.08)}
      .library-module-empty{padding:50px 20px;text-align:center;color:#6f8295}.library-module-empty b{display:block;color:#dce8f3;margin-bottom:6px}
      @media(max-width:900px){.library-module-head{grid-template-columns:90px 1fr 80px}.library-module-head span:nth-child(3),.library-module-head span:nth-child(5),.library-module-head span:nth-child(6),.library-module-head span:nth-child(7){display:none}.library-module-row{grid-template-columns:90px minmax(0,1fr) 80px;gap:8px}.library-module-row>.library-module-cell:nth-of-type(1),.library-module-row>.library-module-cell:nth-of-type(3),.library-module-row>.library-module-cell:nth-of-type(4){display:none}.library-module-row .library-module-actions{grid-column:2/-1;justify-content:flex-start}.library-module-toolbar>*{flex:1 1 150px}.library-module-search{flex-basis:100%}}
    `;
    document.head.appendChild(style);
  }

  const clean = value => String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/\b(copy|kopie|duplicate|dup)\b/g,'').replace(/\s*\(\d+\)\s*$/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const blobSize=t=>Number(t?.fileBlob?.size||t?.sourceRecord?.fileBlob?.size||0);
  const duration=t=>Number(t?.duration||0);
  const cueCount=t=>Array.isArray(t?.cues)?t.cues.filter(v=>v!=null).length:0;
  function quality(t){let n=0;if(t.fileBlob)n+=120;n+=cueCount(t)*8;if(t.bpm)n+=20;if(t.key&&t.key!=='—')n+=16;if(t.waveformData?.length)n+=20;if(t.beatgrid?.length)n+=20;if(t.analysisConfidence)n+=Math.min(15,Number(t.analysisConfidence)/7);if(t.artist&&t.artist!=='Neznámý interpret')n+=8;if(t.album)n+=4;if(t.genre)n+=3;return n}
  function pairDuplicate(a,b){if(!a||!b||a.uid===b.uid)return false;const af=clean(a.fileName),bf=clean(b.fileName);if(af&&bf&&af===bf)return true;const at=clean(a.title),bt=clean(b.title),aa=clean(a.artist==='Neznámý interpret'?'':a.artist),ba=clean(b.artist==='Neznámý interpret'?'':b.artist);if(at&&bt&&at===bt&&aa&&ba&&aa===ba){const ad=duration(a),bd=duration(b);if(!ad||!bd||Math.abs(ad-bd)<=1.5)return true}const as=blobSize(a),bs=blobSize(b);return !!(as&&bs&&as===bs&&at&&bt&&at===bt)}
  function findGroups(rows){const parent=new Map(rows.map(t=>[t.uid,t.uid]));const find=x=>{let p=parent.get(x);while(p!==parent.get(p))p=parent.get(p);let y=x;while(parent.get(y)!==p){const n=parent.get(y);parent.set(y,p);y=n}return p};const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra)};for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(pairDuplicate(rows[i],rows[j]))union(rows[i].uid,rows[j].uid);const buckets=new Map();for(const t of rows){const r=find(t.uid);if(!buckets.has(r))buckets.set(r,[]);buckets.get(r).push(t)}return[...buckets.values()].filter(g=>g.length>1).map(items=>{items.sort((a,b)=>quality(b)-quality(a));return{keeper:items[0],duplicates:items.slice(1),items}})}
  function role(uid){for(const g of duplicateGroups){if(g.keeper.uid===uid)return'keeper';if(g.duplicates.some(t=>t.uid===uid))return'delete'}return''}

  async function render(){
    if(!window.DawoLibrary)return;
    const rows=await window.DawoLibrary.all();
    const filtered=rows.filter(t=>`${t.title||''} ${t.artist||''} ${t.album||''} ${t.genre||''} ${t.key||''}`.toLowerCase().includes(query));
    $('#libraryModuleCount') && ($('#libraryModuleCount').textContent=rows.length);
    const body=$('#libraryModuleRows');if(!body)return;
    body.innerHTML=filtered.length?filtered.map(t=>{const analyzed=!!(t.bpm||(t.key&&t.key!=='—')),r=role(t.uid);return`<div class="library-module-row ${selected.has(t.uid)?'selected':''} ${r==='keeper'?'duplicate-keeper':r==='delete'?'duplicate-delete':''}" data-library-uid="${esc(t.uid)}"><label class="library-module-check"><input class="library-row-check" type="checkbox" data-library-select="${esc(t.uid)}" ${selected.has(t.uid)?'checked':''}><span>${r==='keeper'?'<span class="library-module-badge keep">PONECHAT</span>':r==='delete'?'<span class="library-module-badge delete">SMAZAT</span>':'Vybrat'}</span></label><div class="library-module-title"><strong>${esc(t.title||t.fileName||'Bez názvu')}</strong><small>${esc(t.fileName||t.source||'DawoMix Library')}</small></div><div class="library-module-cell">${esc(t.artist||'—')}</div><div class="library-module-cell"><span class="library-module-badge ${analyzed?'ok':'warn'}">${t.bpm||'—'} BPM</span></div><div class="library-module-cell"><span class="library-module-badge">${esc(t.key||'—')}</span></div><div class="library-module-cell">${cueCount(t)}/8 CUES</div><div class="library-module-actions"><button type="button" data-library-analyze="${esc(t.uid)}" title="Otevřít v Analyzeru">⌁</button><button type="button" data-library-tags="${esc(t.uid)}" title="Otevřít Tag Editor">◇</button></div></div>`}).join(''):`<div class="library-module-empty"><b>${rows.length?'Nic nenalezeno':'Knihovna je prázdná'}</b><span>${rows.length?'Zkus jiné hledání.':'Nahraj audio soubory pomocí tlačítka Přidat audio.'}</span></div>`;
    body.querySelectorAll('[data-library-select]').forEach(ch=>ch.onchange=()=>{const uid=ch.dataset.librarySelect;ch.checked?selected.add(uid):selected.delete(uid);updateSelectionUi();render()});
    body.querySelectorAll('[data-library-analyze]').forEach(btn=>btn.onclick=()=>{window.DawoAnalyzer?.select?.(btn.dataset.libraryAnalyze);window.DawoMixStudio?.showPanel?.('analyzer')});
    body.querySelectorAll('[data-library-tags]').forEach(btn=>btn.onclick=()=>window.DawoMixStudio?.showPanel?.('tag-editor'));
    updateSelectionUi(rows);
  }

  function updateSelectionUi(rows){const del=$('#libraryModuleDeleteSelected');if(del){del.disabled=!selected.size;del.textContent=selected.size?`⌫ Smazat vybrané (${selected.size})`:'⌫ Smazat vybrané'}const all=$('#librarySelectAll');if(all){const count=rows?.length??document.querySelectorAll('[data-library-uid]').length;all.checked=!!count&&selected.size>=count;all.indeterminate=selected.size>0&&selected.size<count}}

  async function findDuplicates(){const rows=await window.DawoLibrary.all();duplicateGroups=findGroups(rows);selected.clear();for(const g of duplicateGroups)for(const dup of g.duplicates)selected.add(dup.uid);const count=selected.size,summary=$('#libraryDuplicateSummary');if(summary){summary.hidden=!count;summary.textContent=count?`Nalezeno ${duplicateGroups.length} duplicitních skupin. Automaticky jsem vybral ${count} nadbytečných kopií ke smazání. Zelená = ponechat, oranžová = vybraná kopie ke smazání.`:''}if(!count)alert('Žádné duplicity nebyly nalezeny.');window.DawoMixStudio?.setStatus?.(count?`Library: vybráno ${count} duplicit ke smazání`:'Library: duplicity nenalezeny');await render()}

  async function rewritePlaylists(replacements){if(!replacements.size)return;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('DawoMixPlaylistStudioDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('playlists'))r.result.createObjectStore('playlists',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const playlists=await new Promise((resolve,reject)=>{const r=db.transaction('playlists').objectStore('playlists').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)});for(const p of playlists){const old=p.trackUids||[],next=[...new Set(old.map(uid=>replacements.get(uid)||uid))];if(JSON.stringify(old)!==JSON.stringify(next))await new Promise((resolve,reject)=>{const r=db.transaction('playlists','readwrite').objectStore('playlists').put({...p,trackUids:next,updatedAt:new Date().toISOString()});r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}db.close()}

  async function deleteSelected(){if(!selected.size)return;const rows=await window.DawoLibrary.all();if(!confirm(`Smazat ${selected.size} vybraných záznamů z Library?`))return;const replacements=new Map();for(const uid of [...selected]){const group=duplicateGroups.find(g=>g.duplicates.some(t=>t.uid===uid));if(group)replacements.set(uid,group.keeper.uid);await window.DawoLibrary.remove(uid,{suppress:true})}await rewritePlaylists(replacements).catch(console.warn);selected.clear();duplicateGroups=[];const summary=$('#libraryDuplicateSummary');if(summary){summary.hidden=true;summary.textContent=''}await render();window.DawoAnalyzer?.render?.();window.DawoMixStudio?.setStatus?.('Library: vybrané záznamy byly smazány')}

  async function importFiles(files){if(!files?.length||!window.DawoLibrary)return;const result=await window.DawoLibrary.addFiles(files);selected.clear();duplicateGroups=[];await render();window.DawoMixStudio?.setStatus?.(`Library: přidáno ${files.length} audio souborů`);return result}

  function bind(){injectStyle();$('#libraryModuleSearch')?.addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render()});$('#libraryModuleFiles')?.addEventListener('change',async e=>{await importFiles([...e.target.files]);e.target.value=''});$('#libraryModuleSync')?.addEventListener('click',async()=>{await window.DawoMixStudio?.syncLibrary?.();selected.clear();duplicateGroups=[];await render()});$('#libraryModuleFindDuplicates')?.addEventListener('click',findDuplicates);$('#libraryModuleDeleteSelected')?.addEventListener('click',deleteSelected);$('#libraryOpenAnalyzer')?.addEventListener('click',()=>window.DawoMixStudio?.showPanel?.('analyzer'));$('#librarySelectAll')?.addEventListener('change',async e=>{const rows=await window.DawoLibrary.all();if(e.target.checked)rows.forEach(t=>selected.add(t.uid));else selected.clear();await render()});window.addEventListener('dawo-library-change',render);render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.DawoLibraryModule={render,importFiles,findDuplicates,deleteSelected,getSelected:()=>[...selected]};
})();
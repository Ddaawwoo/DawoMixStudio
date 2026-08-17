(() => {
  let sourceText = '';
  let sourceName = 'collection.nml';
  const selected = new Set();
  const $ = s => document.querySelector(s);
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function rows(){ return window.DawoLibrary ? window.DawoLibrary.all() : []; }

  async function renderTracks(){
    const list=$('#traktorMergeTrackList'); if(!list)return;
    const tracks=await rows();
    if(!selected.size) tracks.forEach(t=>selected.add(t.uid));
    list.innerHTML=tracks.length?tracks.map(t=>`<label style="display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #172330;cursor:pointer"><input type="checkbox" data-traktor-select="${escapeHtml(t.uid)}" ${selected.has(t.uid)?'checked':''}><span><strong style="display:block;font-size:12px">${escapeHtml(t.title)}</strong><small style="color:#718697">${escapeHtml(t.artist)} · ${t.bpm||'—'} BPM · ${escapeHtml(t.key||'—')}</small></span><small style="color:#19e6ef">${(t.cues||[]).filter(v=>v!=null).length}/8 CUES</small></label>`).join(''):'<div class="library-empty">Společná knihovna je prázdná.</div>';
    list.querySelectorAll('[data-traktor-select]').forEach(input=>input.addEventListener('change',()=>{input.checked?selected.add(input.dataset.traktorSelect):selected.delete(input.dataset.traktorSelect);updateSelectionStatus()}));
    updateSelectionStatus();
  }

  function updateSelectionStatus(){
    const el=$('#traktorMergeSelection'); if(el)el.textContent=`${selected.size} vybraných tracků`;
  }

  function install(){
    const panel=$('#traktor'); if(!panel||$('#traktorCollectionMerge'))return;
    const section=document.createElement('section');
    section.id='traktorCollectionMerge';
    section.style.cssText='max-width:1100px;margin:18px auto 0;border:1px solid #1d2a38;border-radius:16px;background:#0b121c;padding:20px';
    section.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap">
        <div><p class="eyebrow">SAFE COLLECTION MERGE</p><h3 style="margin:0 0 7px">Aktualizovat existující collection.nml</h3><p style="margin:0;color:#8395a7;max-width:720px;line-height:1.5">Načti původní Traktor kolekci. DawoMix upraví pouze vybrané skladby a zachová ostatní ENTRY, playlisty a další obsah. Při exportu stáhne i nedotčenou zálohu originálu.</p></div>
        <span id="traktorCollectionState" class="module-state">ŽÁDNÁ KOLEKCE</span>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin:18px 0 12px">
        <label class="file-action">Načíst collection.nml<input id="traktorCollectionInput" type="file" accept=".nml,application/xml,text/xml" hidden></label>
        <button id="traktorSelectAll" class="secondary-action" type="button">Vybrat vše</button>
        <button id="traktorSelectNone" class="secondary-action" type="button">Nic</button>
        <span id="traktorMergeSelection" style="align-self:center;color:#8395a7;font-size:11px"></span>
      </div>
      <div id="traktorCollectionInfo" style="padding:10px 12px;border:1px solid #172330;border-radius:9px;background:#07101a;color:#8395a7;font-size:11px">Nejdřív načti collection.nml z Traktoru.</div>
      <div id="traktorMergeTrackList" style="margin-top:12px;max-height:330px;overflow:auto;border:1px solid #172330;border-radius:10px"></div>
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px">
        <label style="display:flex;gap:8px;align-items:center;color:#8395a7;font-size:11px"><input id="traktorAddMissing" type="checkbox"> Přidat vybrané skladby, které v collection.nml nejsou</label>
        <button id="traktorMergeExport" class="primary-action" type="button" disabled>Vytvořit backup + upravenou collection.nml</button>
      </div>`;
    panel.appendChild(section);

    $('#traktorCollectionInput').addEventListener('change',loadCollection);
    $('#traktorSelectAll').addEventListener('click',async()=>{(await rows()).forEach(t=>selected.add(t.uid));await renderTracks()});
    $('#traktorSelectNone').addEventListener('click',async()=>{selected.clear();document.querySelectorAll('[data-traktor-select]').forEach(i=>i.checked=false);updateSelectionStatus()});
    $('#traktorMergeExport').addEventListener('click',exportMerged);
    renderTracks();
  }

  async function loadCollection(event){
    const file=event.target.files?.[0]; if(!file)return;
    try{
      const text=await file.text();
      const doc=window.DawoTraktorNml.parseCollection(text);
      sourceText=text;sourceName=file.name;
      const count=doc.querySelectorAll('NML > COLLECTION > ENTRY').length;
      const version=doc.documentElement.getAttribute('VERSION')||'?';
      $('#traktorCollectionState').textContent=`${count} TRACKS`;
      $('#traktorCollectionInfo').textContent=`${file.name} · NML v${version} · ${count} tracků. Originál zůstane nedotčený.`;
      $('#traktorMergeExport').disabled=false;
      window.DawoMixStudio?.setStatus?.(`Načtena Traktor kolekce: ${count} tracků`);
    }catch(error){
      console.error(error);sourceText='';$('#traktorMergeExport').disabled=true;alert(`Collection.nml se nepodařilo načíst: ${error.message}`);
    }
  }

  async function exportMerged(){
    if(!sourceText)return alert('Nejdřív načti collection.nml.');
    const all=await rows(), tracks=all.filter(t=>selected.has(t.uid));
    if(!tracks.length)return alert('Vyber alespoň jednu skladbu.');
    const folder=($('#traktorMusicFolder')?.value||localStorage.getItem('dawo:traktorMusicFolder')||'').trim();
    const base=sourceName.replace(/\.nml$/i,'');
    try{
      const result=window.DawoTraktorNml.downloadMerged(sourceText,tracks,{musicFolder:folder,addMissing:$('#traktorAddMissing').checked,backupFilename:`${base}-BACKUP.nml`,filename:`${base}-DAWOMIX.nml`,downloadBackup:true});
      $('#traktorCollectionInfo').textContent=`Hotovo · ${result.matched} nalezených a upravených · ${result.added} přidaných · ${result.unmatched} nenalezených. Backup byl stažen zvlášť.`;
      window.DawoMixStudio?.setStatus?.(`Traktor merge: ${result.matched} upraveno · ${result.added} přidáno · ${result.unmatched} nenalezeno`);
    }catch(error){console.error(error);alert(`Merge collection.nml selhal: ${error.message}`)}
  }

  window.addEventListener('dawo-library-change',renderTracks);
  window.addEventListener('DOMContentLoaded',install);
  if(document.readyState!=='loading')install();
  window.DawoTraktorCollectionUI={install,renderTracks};
})();
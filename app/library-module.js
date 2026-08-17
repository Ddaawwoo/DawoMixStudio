(() => {
  const $ = s => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let query='';

  function injectStyle(){
    if(document.getElementById('dawoLibraryModuleStyle')) return;
    const style=document.createElement('style');
    style.id='dawoLibraryModuleStyle';
    style.textContent=`
      .library-module-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
      .library-module-search{flex:1;min-width:220px;padding:11px 13px;border:1px solid #1d2a38;border-radius:10px;background:#07101a;color:#eef7fb;outline:none}
      .library-module-search:focus{border-color:#19e6ef;box-shadow:0 0 0 2px #19e6ef18}
      .library-module-table{border:1px solid #172330;border-radius:14px;overflow:hidden;background:#081019}
      .library-module-head,.library-module-row{display:grid;grid-template-columns:minmax(220px,2fr) minmax(140px,1.2fr) 90px 80px 110px 100px;gap:12px;align-items:center;padding:11px 14px}
      .library-module-head{font-size:9px;letter-spacing:.12em;color:#6f8295;font-weight:800;background:#0b141f;border-bottom:1px solid #172330}
      .library-module-row{border-bottom:1px solid #12202c;transition:background .15s ease}
      .library-module-row:last-child{border-bottom:0}.library-module-row:hover{background:#0d1925}
      .library-module-title strong{display:block;font-size:12px;color:#eef7fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.library-module-title small{display:block;margin-top:3px;color:#6f8295;font-size:9px}
      .library-module-cell{font-size:11px;color:#a9b8c7}.library-module-badge{display:inline-flex;align-items:center;justify-content:center;min-width:56px;padding:5px 8px;border-radius:999px;border:1px solid #213243;background:#0b1621;font-size:9px;font-weight:800}
      .library-module-badge.ok{color:#3ee6a8;border-color:#164b3a}.library-module-badge.warn{color:#ffc857;border-color:#5b4722}
      .library-module-actions{display:flex;gap:6px;justify-content:flex-end}.library-module-actions button{width:30px;height:30px;border:1px solid #213243;border-radius:8px;background:#0a1520;color:#8fa5b8;cursor:pointer}.library-module-actions button:hover{color:#19e6ef;border-color:#19e6ef66}
      .library-module-empty{padding:50px 20px;text-align:center;color:#6f8295}.library-module-empty b{display:block;color:#dce8f3;margin-bottom:6px}
      @media(max-width:900px){.library-module-head{display:none}.library-module-row{grid-template-columns:1fr auto auto;gap:8px}.library-module-row>.library-module-cell:nth-of-type(1),.library-module-row>.library-module-cell:nth-of-type(4){display:none}.library-module-row .library-module-actions{grid-column:1/-1;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
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
      return `<div class="library-module-row" data-library-uid="${esc(track.uid)}">
        <div class="library-module-title"><strong>${esc(track.title||track.fileName||'Bez názvu')}</strong><small>${esc(track.fileName||track.source||'DawoMix Library')}</small></div>
        <div class="library-module-cell">${esc(track.artist||'—')}</div>
        <div class="library-module-cell"><span class="library-module-badge ${analyzed?'ok':'warn'}">${track.bpm||'—'} BPM</span></div>
        <div class="library-module-cell"><span class="library-module-badge">${esc(track.key||'—')}</span></div>
        <div class="library-module-cell">${cueCount}/8 CUES</div>
        <div class="library-module-actions"><button type="button" data-library-analyze="${esc(track.uid)}" title="Otevřít v Analyzeru">◫</button><button type="button" data-library-tags="${esc(track.uid)}" title="Otevřít Tag Editor">✎</button></div>
      </div>`;
    }).join(''):`<div class="library-module-empty"><b>${rows.length?'Nic nenalezeno':'Knihovna je prázdná'}</b><span>${rows.length?'Zkus jiné hledání.':'Nahraj audio soubory pomocí tlačítka Přidat audio.'}</span></div>`;
    body.querySelectorAll('[data-library-analyze]').forEach(btn=>btn.onclick=()=>{window.DawoAnalyzer?.select?.(btn.dataset.libraryAnalyze);window.DawoMixStudio?.showPanel?.('analyzer')});
    body.querySelectorAll('[data-library-tags]').forEach(btn=>{btn.onclick=()=>window.DawoMixStudio?.showPanel?.('tag-editor')});
  }

  async function importFiles(files){
    if(!files?.length||!window.DawoLibrary) return;
    const result=await window.DawoLibrary.addFiles(files);
    await render();
    window.DawoMixStudio?.setStatus?.(`Library: přidáno ${files.length} audio souborů`);
    return result;
  }

  function bind(){
    injectStyle();
    const search=$('#libraryModuleSearch'); if(search) search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();render()});
    const input=$('#libraryModuleFiles'); if(input) input.addEventListener('change',async()=>{await importFiles([...input.files]);input.value=''});
    $('#libraryModuleSync')?.addEventListener('click',async()=>{await window.DawoMixStudio?.syncLibrary?.();await render()});
    window.addEventListener('dawo-library-change',render);
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.DawoLibraryModule={render,importFiles};
})();
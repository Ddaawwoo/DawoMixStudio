(()=>{
  if(window.__dawoAutoBuildPlaylist)return;window.__dawoAutoBuildPlaylist=true;
  const $=s=>document.querySelector(s),esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MODES={
    smooth:{name:'Smooth',desc:'Co nejplynulejší BPM, key a energy přechody.'},
    balanced:{name:'Balanced',desc:'Vyvážený harmonický a energetický DJ flow.'},
    rise:{name:'Energy Rise',desc:'Postupně staví energii setu směrem nahoru.'}
  };
  let generated=null;

  function completeness(t){let n=0;if(Number(t.bpm)>0)n++;if(t.key&&t.key!=='—')n++;if(Number.isFinite(Number(t.energyScore)))n++;if(String(t.genre||'').trim())n++;return n/4}
  function energy(t){return Number.isFinite(Number(t.energyScore))?Number(t.energyScore):50}
  function transition(a,b,mode='balanced',position=0,total=1){
    const base=window.DawoAutoMatch?.score?.(a,b)||{total:0,parts:[],bpmDiff:null};
    const qa=completeness(a),qb=completeness(b),quality=.72+.28*((qa+qb)/2);
    let score=base.total*quality;
    const ed=energy(b)-energy(a),bd=base.bpmDiff==null?8:base.bpmDiff;
    if(mode==='smooth'){
      score-=Math.min(22,bd*2.2);
      score-=Math.min(18,Math.abs(ed)*.42);
    }else if(mode==='rise'){
      const progress=total>1?position/(total-1):0;
      const desired=2.5+progress*2.5;
      if(ed>=0)score+=Math.max(0,13-Math.abs(ed-desired)*1.4);
      else score-=Math.min(28,Math.abs(ed)*1.5);
      score-=Math.min(12,bd*1.15);
    }else{
      score-=Math.min(10,bd*.8);
      score-=Math.min(9,Math.abs(ed)*.18);
    }
    return{...base,adjusted:Math.max(0,Math.min(100,Math.round(score))),energyDelta:ed,completeness:Math.round(qb*100)};
  }

  function pathScore(path){if(path.length<2)return 0;const vals=path.slice(1).map(x=>x.match.adjusted);const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const floor=Math.min(...vals);return avg*.82+floor*.18}
  function build(rows,startUid,length,mode){
    const start=rows.find(t=>String(t.uid)===String(startUid));if(!start)return null;
    const target=Math.max(2,Math.min(Number(length)||20,Math.min(rows.length,60)));
    let beam=[{items:[{track:start,match:null}],used:new Set([String(start.uid)]),score:0}];
    const width=7,branch=9;
    for(let pos=1;pos<target;pos++){
      const next=[];
      for(const state of beam){
        const current=state.items[state.items.length-1].track;
        const candidates=rows.filter(t=>!state.used.has(String(t.uid))).map(t=>({track:t,match:transition(current,t,mode,pos,target)})).sort((a,b)=>b.match.adjusted-a.match.adjusted).slice(0,branch);
        for(const c of candidates){
          const items=[...state.items,c],used=new Set(state.used);used.add(String(c.track.uid));next.push({items,used,score:pathScore(items)});
        }
      }
      if(!next.length)break;
      next.sort((a,b)=>b.score-a.score);beam=next.slice(0,width);
    }
    const best=beam.sort((a,b)=>b.score-a.score)[0];
    if(!best)return null;
    const matches=best.items.slice(1).map(x=>x.match.adjusted),average=matches.length?Math.round(matches.reduce((a,b)=>a+b,0)/matches.length):100;
    return{items:best.items,average,mode,target,createdAt:new Date().toISOString()};
  }

  function style(){if($('#dawoAutoBuildStyle'))return;const s=document.createElement('style');s.id='dawoAutoBuildStyle';s.textContent=`
    .auto-build-btn{border-color:#4b5f72!important;color:#c2d6e4!important}.auto-build-row-btn{color:#b6a8d8!important}
    .auto-build-modal{position:fixed;inset:0;z-index:100000;background:#000b;display:grid;place-items:center;padding:16px}.auto-build-card{width:min(920px,100%);max-height:90vh;overflow:auto;border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:18px;box-shadow:0 30px 90px #000a}.auto-build-head{display:flex;justify-content:space-between;gap:18px}.auto-build-head h3{margin:0;font-size:21px}.auto-build-head p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.45}.auto-build-close{width:38px;height:38px;border:1px solid var(--line);border-radius:10px;background:#171c22;color:#d8e0e7;cursor:pointer}.auto-build-controls{display:grid;grid-template-columns:minmax(180px,1fr) 120px minmax(260px,1.3fr);gap:10px;margin-top:16px}.auto-build-controls label{display:grid;gap:5px;color:var(--muted);font-size:9px;font-weight:800}.auto-build-controls select,.auto-build-controls input{height:42px;border:1px solid #303946;border-radius:10px;background:#10151b;color:#eef3f6;padding:0 11px;outline:none}.auto-build-modes{display:flex;gap:6px}.auto-build-mode{flex:1;border:1px solid #313a45;border-radius:9px;background:#141a21;color:#aeb9c3;font-size:9px;font-weight:800;cursor:pointer}.auto-build-mode.active{border-color:var(--cyan);color:#eef4f7;background:color-mix(in srgb,var(--cyan) 10%,#141a21)}.auto-build-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 8px;padding:11px 12px;border:1px solid #2b3540;border-radius:11px;background:#11171d}.auto-build-summary strong{font-size:14px}.auto-build-summary span{font-size:10px;color:var(--muted)}.auto-build-average{font-size:19px!important;font-weight:900;color:#78bea7!important}.auto-build-list{display:grid;gap:7px}.auto-build-item{display:grid;grid-template-columns:42px minmax(0,1fr) 88px;gap:10px;align-items:center;padding:10px 11px;border:1px solid #27303a;border-radius:11px;background:#10151b}.auto-build-order{width:34px;height:34px;border-radius:9px;background:#171d24;display:grid;place-items:center;font-weight:900;font-size:10px;color:#9ca8b3}.auto-build-item strong{display:block;font-size:11px}.auto-build-item small{display:block;margin-top:3px;color:var(--muted);font-size:8px}.auto-build-match{text-align:right;font-weight:900;color:#79bea7;font-size:14px}.auto-build-match small{display:block;font-weight:700;font-size:7px}.auto-build-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;flex-wrap:wrap}.auto-build-actions button{min-height:40px;padding:0 13px;border:1px solid #35404b;border-radius:10px;background:#171d24;color:#d5dde4;font-weight:800;cursor:pointer}.auto-build-actions .primary{border-color:#426b5e;background:#1e372f;color:#e1f2ea}.auto-build-empty{padding:30px;text-align:center;color:var(--muted)}
    @media(max-width:720px){.auto-build-controls{grid-template-columns:1fr 100px}.auto-build-controls>label:last-child{grid-column:1/-1}.auto-build-card{padding:14px}.auto-build-item{grid-template-columns:38px 1fr 70px}.auto-build-modes{min-height:42px}}
  `;document.head.appendChild(s)}

  function selectedUid(){const ids=[...document.querySelectorAll('[data-library-select]:checked')].map(x=>x.dataset.librarySelect);return ids.length===1?ids[0]:null}
  function install(){style();const bar=$('.library-module-toolbar');if(bar&&!$('#libraryAutoBuild')){const b=document.createElement('button');b.id='libraryAutoBuild';b.className='secondary-action auto-build-btn';b.type='button';b.textContent='≋ Auto Build Playlist';b.onclick=()=>{const uid=selectedUid();if(!uid)return alert('Vyber přesně jednu skladbu jako start Auto Build playlistu.');open(uid)};bar.appendChild(b)}const rows=$('#libraryModuleRows');if(rows)rows.querySelectorAll('.library-module-row[data-library-uid]').forEach(r=>{const a=r.querySelector('.library-module-actions');if(!a||a.querySelector('.auto-build-row-btn'))return;const b=document.createElement('button');b.type='button';b.className='auto-build-row-btn';b.title='Auto Build Playlist od této skladby';b.textContent='≋';b.onclick=e=>{e.stopPropagation();open(r.dataset.libraryUid)};a.prepend(b)})}

  async function open(uid){const rows=await DawoLibrary.all(),src=rows.find(t=>String(t.uid)===String(uid));if(!src)return;let mode='balanced';const wrap=document.createElement('div');wrap.className='auto-build-modal';wrap.innerHTML=`<div class="auto-build-card"><div class="auto-build-head"><div><h3>Auto Build Playlist</h3><p>Start: <b>${esc(src.title||src.fileName||'Bez názvu')}</b> · ${src.bpm||'—'} BPM · ${esc(src.key||'—')}<br>Playlist se skládá sekvenčně tak, aby každý přechod co nejlépe navazoval na předchozí track.</p></div><button class="auto-build-close">×</button></div><div class="auto-build-controls"><label>Počet tracků<input id="autoBuildLength" type="number" min="2" max="60" value="${Math.min(20,rows.length)}"></label><label>Název playlistu<input id="autoBuildName" value="Auto Set ${new Date().toISOString().slice(0,10)}"></label><label>Charakter setu<div class="auto-build-modes">${Object.entries(MODES).map(([id,m])=>`<button class="auto-build-mode ${id===mode?'active':''}" data-auto-build-mode="${id}" title="${esc(m.desc)}">${m.name}</button>`).join('')}</div></label></div><div id="autoBuildResult"></div><div class="auto-build-actions"><button id="autoBuildRebuild">↻ Přepočítat</button><button id="autoBuildSave" class="primary">Uložit jako playlist</button></div></div>`;document.body.appendChild(wrap);wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};wrap.querySelector('.auto-build-close').onclick=()=>wrap.remove();wrap.querySelectorAll('[data-auto-build-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.autoBuildMode;wrap.querySelectorAll('[data-auto-build-mode]').forEach(x=>x.classList.toggle('active',x===b));rebuild()});wrap.querySelector('#autoBuildLength').onchange=rebuild;wrap.querySelector('#autoBuildRebuild').onclick=rebuild;wrap.querySelector('#autoBuildSave').onclick=()=>saveGenerated(wrap);function rebuild(){generated=build(rows,src.uid,wrap.querySelector('#autoBuildLength').value,mode);renderResult(wrap.querySelector('#autoBuildResult'),generated)}rebuild()}

  function renderResult(host,result){if(!host)return;if(!result){host.innerHTML='<div class="auto-build-empty">Playlist se nepodařilo sestavit.</div>';return}host.innerHTML=`<div class="auto-build-summary"><div><strong>${result.items.length} tracků · ${MODES[result.mode].name}</strong><br><span>Průměrná kompatibilita přechodů</span></div><span class="auto-build-average">${result.average}% MATCH</span></div><div class="auto-build-list">${result.items.map((x,i)=>{const t=x.track,m=x.match;return `<div class="auto-build-item"><div class="auto-build-order">${String(i+1).padStart(2,'0')}</div><div><strong>${esc(t.title||t.fileName||'Bez názvu')}</strong><small>${esc(t.artist||'—')} · ${t.bpm||'—'} BPM · ${esc(t.key||'—')} · Energy ${Number.isFinite(Number(t.energyScore))?Math.round(t.energyScore):'—'}${m?.energyDelta!=null?` · ΔE ${m.energyDelta>=0?'+':''}${m.energyDelta.toFixed(0)}`:''}</small></div><div class="auto-build-match">${m?m.adjusted:100}%<small>${i?'MATCH':'START'}</small></div></div>`}).join('')}</div>`}

  function openDb(){return new Promise((res,rej)=>{const r=indexedDB.open('DawoMixPlaylistStudioDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('playlists'))r.result.createObjectStore('playlists',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  async function saveGenerated(wrap){if(!generated?.items?.length)return;const name=wrap.querySelector('#autoBuildName').value.trim()||`Auto Set ${new Date().toISOString().slice(0,10)}`;const now=new Date().toISOString(),transitions=generated.items.slice(1).map((x,i)=>({from:generated.items[i].track.uid,to:x.track.uid,match:x.match.adjusted,parts:x.match.parts.map(p=>({name:p[0],score:Math.round(p[1])}))}));const playlist={id:'auto_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,cover:'',trackUids:generated.items.map(x=>x.track.uid),createdAt:now,updatedAt:now,autoBuild:{mode:generated.mode,averageMatch:generated.average,generatedAt:now,transitions}};const db=await openDb();await req(db.transaction('playlists','readwrite').objectStore('playlists').put(playlist));db.close();window.DawoMixStudio?.setStatus?.(`Auto Build: vytvořen playlist „${name}“ · ${playlist.trackUids.length} tracků · ${generated.average}% match`);wrap.remove();window.DawoMixStudio?.showPanel?.('dawomix');setTimeout(()=>document.getElementById('dawomix')?.contentWindow?.location.reload(),120)}

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.DawoAutoBuildPlaylist={open,build,transition};
})();

(()=>{
  if(window.__dawoAutosaveLoaded)return;
  window.__dawoAutosaveLoaded=true;
  const $=s=>document.querySelector(s);
  const timers=new Map();
  const state={tag:'saved',cue:'saved',playlist:'saved'};
  function css(){if($('#dawoAutosaveStyle'))return;const s=document.createElement('style');s.id='dawoAutosaveStyle';s.textContent=`
    .dawo-save-state{display:inline-flex;align-items:center;gap:7px;min-height:28px;padding:0 10px;border:1px solid var(--line,#2b333d);border-radius:999px;background:#12171d;color:#9ca6b0;font:800 9px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.03em;white-space:nowrap}.dawo-save-state:before{content:"";width:6px;height:6px;border-radius:50%;background:#75808b}.dawo-save-state[data-state="dirty"]{color:#d2ae64}.dawo-save-state[data-state="dirty"]:before{background:#d2ae64}.dawo-save-state[data-state="saving"]{color:#75b8c5}.dawo-save-state[data-state="saving"]:before{background:#75b8c5}.dawo-save-state[data-state="saved"]{color:#7fc1a3}.dawo-save-state[data-state="saved"]:before{background:#7fc1a3}.dawo-save-state[data-state="error"]{color:#cf7e89}.dawo-save-state[data-state="error"]:before{background:#cf7e89}
    .dawo-save-state.compact{min-height:25px;padding:0 8px;font-size:8px}.dawo-autosave-note{color:#7e8995;font-size:9px;margin-left:6px}
  `;document.head.appendChild(s)}
  function label(v){return v==='dirty'?'Neuloženo':v==='saving'?'Ukládám…':v==='error'?'Chyba ukládání':'Uloženo'}
  function set(kind,v,doc=document){state[kind]=v;doc.querySelectorAll(`[data-dawo-save-state="${kind}"]`).forEach(el=>{el.dataset.state=v;el.textContent=label(v)})}
  function badge(kind,doc=document,compact=false){const el=doc.createElement('span');el.className='dawo-save-state'+(compact?' compact':'');el.dataset.dawoSaveState=kind;el.dataset.state=state[kind]||'saved';el.textContent=label(state[kind]||'saved');return el}
  function debounce(key,fn,ms=650){clearTimeout(timers.get(key));timers.set(key,setTimeout(fn,ms))}

  function installTag(){const form=$('#tagEditorForm');if(!form||form.dataset.autosave)return;form.dataset.autosave='1';const host=form.querySelector('.primary-action')?.parentElement||form;if(!host.querySelector('[data-dawo-save-state="tag"]'))host.appendChild(badge('tag'));
    const save=async()=>{const uid=$('#tagUid')?.value;if(!uid||!window.DawoLibrary)return;set('tag','saving');try{await DawoLibrary.update(uid,{title:$('#tagTitle').value.trim(),artist:$('#tagArtist').value.trim(),album:$('#tagAlbum').value.trim(),bpm:Number($('#tagBpm').value)||null,key:$('#tagKey').value.trim()||'—',genre:$('#tagGenre').value.trim(),tagsEditedAt:new Date().toISOString()});set('tag','saved');DawoMixStudio?.setStatus?.('Tag Editor: změny automaticky uloženy')}catch(e){console.warn(e);set('tag','error')}};
    form.querySelectorAll('input:not([type="hidden"])').forEach(i=>i.addEventListener('input',()=>{set('tag','dirty');debounce('tag',save,700)}));form.addEventListener('submit',()=>setTimeout(()=>set('tag','saved'),60));
  }

  function installCue(){const frame=$('#cueflow');if(!frame)return;const apply=()=>{try{const d=frame.contentDocument;if(!d?.body)return;const actions=d.querySelector('.cue-editor-actions');if(!actions)return;if(!d.querySelector('[data-dawo-save-state="cue"]'){const row=d.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px';const note=d.createElement('span');note.className='dawo-autosave-note';note.textContent='Autosave zapnutý';row.append(note,badge('cue',d,true));actions.prepend(row)}
      if(!d.__dawoAutosaveCue){d.__dawoAutosaveCue=true;const schedule=()=>{set('cue','dirty',d);debounce('cue',()=>{const save=d.getElementById('saveCues');if(!save)return;set('cue','saving',d);save.click();setTimeout(()=>set('cue','saved',d),140)},550)};d.addEventListener('click',e=>{if(e.target.closest('[data-cue],[data-delete-cue],#autoCues'))schedule()},true);d.getElementById('saveCues')?.addEventListener('click',()=>{set('cue','saving',d);setTimeout(()=>set('cue','saved',d),140)},true)}
    }catch(e){console.warn('Cue autosave install failed',e)}};frame.addEventListener('load',()=>setTimeout(apply,180));setTimeout(apply,900)
  }

  function playlistDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('DawoMixPlaylistStudioDB',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('playlists'))r.result.createObjectStore('playlists',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  async function patchPlaylist(id,patch){if(!id)return;const db=await playlistDb(),store=db.transaction('playlists','readwrite').objectStore('playlists'),p=await req(store.get(id));if(!p){db.close();return}await req(store.put({...p,...patch,updatedAt:new Date().toISOString()}));db.close()}
  function installPlaylist(){const frame=$('#dawomix');if(!frame)return;const apply=()=>{try{const d=frame.contentDocument;if(!d?.body)return;if(!d.__dawoAutosavePlaylist){d.__dawoAutosavePlaylist=true;let currentId=null,mode='';
        d.addEventListener('click',e=>{const edit=e.target.closest('[data-dpm-edit]'),tracks=e.target.closest('[data-dpm-add]');if(edit){currentId=edit.dataset.dpmEdit;mode='edit';set('playlist','saved',d);setTimeout(()=>decorateModal(d,'edit'),80)}else if(tracks){currentId=tracks.dataset.dpmAdd;mode='tracks';set('playlist','saved',d);setTimeout(()=>decorateModal(d,'tracks'),80)}},true);
        const decorateModal=(doc,m)=>{};
        const obs=new MutationObserver(()=>{const modal=d.querySelector('.dpm-modal');if(!modal||modal.dataset.autosave)return;modal.dataset.autosave='1';const actions=modal.querySelector('.dpm-modal-actions');if(actions&&!actions.querySelector('[data-dawo-save-state="playlist"]'))actions.prepend(badge('playlist',d,true));
          const name=modal.querySelector('#dpmEditName');if(name)name.addEventListener('input',()=>{set('playlist','dirty',d);debounce('playlist-name',async()=>{set('playlist','saving',d);try{await patchPlaylist(currentId,{name:name.value.trim()||'Playlist'});set('playlist','saved',d)}catch(e){set('playlist','error',d)}},650)});
          const cover=modal.querySelector('#dpmCoverInput');if(cover)cover.addEventListener('change',()=>{set('playlist','dirty',d);debounce('playlist-cover',async()=>{const img=modal.querySelector('#dpmCoverPreview');const src=img?.tagName==='IMG'?img.src:'';if(!src)return;set('playlist','saving',d);try{await patchPlaylist(currentId,{cover:src});set('playlist','saved',d)}catch(e){set('playlist','error',d)}},850)});
          modal.querySelectorAll('[data-track]').forEach(cb=>cb.addEventListener('change',()=>{set('playlist','dirty',d);debounce('playlist-tracks',async()=>{const ids=[...modal.querySelectorAll('[data-track]:checked')].map(x=>x.dataset.track);set('playlist','saving',d);try{await patchPlaylist(currentId,{trackUids:ids});set('playlist','saved',d)}catch(e){set('playlist','error',d)}},500)}));
          modal.querySelector('#dpmSave,#dpmTrackSave')?.addEventListener('click',()=>{set('playlist','saving',d);setTimeout(()=>set('playlist','saved',d),150)},true)
        });obs.observe(d.body,{childList:true,subtree:true})
      }
      const head=d.querySelector('.dpm-head');if(head&&!head.querySelector('[data-dawo-save-state="playlist"]'))head.appendChild(badge('playlist',d,true));
    }catch(e){console.warn('Playlist autosave install failed',e)}};frame.addEventListener('load',()=>setTimeout(apply,180));setTimeout(apply,900)
  }

  function boot(){css();installTag();installCue();installPlaylist();new MutationObserver(()=>installTag()).observe(document.body,{childList:true,subtree:true})}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
(() => {
  if (window.__dawoPlaylistDownloadLoaded) return;
  window.__dawoPlaylistDownloadLoaded = true;

  const DB_NAME='DawoMixPlaylistStudioDB', STORE='playlists';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeName=v=>String(v||'playlist').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim().slice(0,120)||'playlist';
  const fmtTime=s=>{s=Math.max(0,Math.floor(Number(s)||0));const m=Math.floor(s/60),sec=s%60;return `${m}:${String(sec).padStart(2,'0')}`};

  function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function getPlaylist(id){const db=await openDb();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>{db.close();resolve(r.result||null)};r.onerror=()=>{db.close();reject(r.error)}})}
  async function library(){try{return await window.parent.DawoLibrary.all()}catch{return[]}}
  async function resolvePlaylist(id){const p=await getPlaylist(id);if(!p)throw new Error('Playlist nebyl nalezen.');const lib=await library();const tracks=(p.trackUids||[]).map(uid=>lib.find(t=>t.uid===uid)).filter(Boolean);return{p,tracks}}

  function textExport(p,tracks){
    const lines=[`DAWO MIX STUDIO — PLAYLIST`,p.name,`${tracks.length} skladeb`,`Export: ${new Date().toLocaleString('cs-CZ')}`,''];
    tracks.forEach((t,i)=>{const cues=Array.isArray(t.cues)?t.cues.filter(v=>v!=null).map((v,j)=>`${j+1}:${Number(v).toFixed(2)}s`).join(', '):'';lines.push(`${String(i+1).padStart(2,'0')}. ${t.artist||'Neznámý interpret'} — ${t.title||t.fileName||'Bez názvu'}`);lines.push(`    BPM: ${t.bpm||'—'} | Key: ${t.key||'—'} | Délka: ${fmtTime(t.duration)} | Soubor: ${t.fileName||'—'}`);if(cues)lines.push(`    Cues: ${cues}`);lines.push('')});
    return lines.join('\r\n');
  }
  function m3uExport(p,tracks){const out=['#EXTM3U',`#PLAYLIST:${p.name}`];tracks.forEach(t=>{const dur=Math.max(-1,Math.round(Number(t.duration)||-1));const artist=t.artist||'Neznámý interpret',title=t.title||t.fileName||'Bez názvu';out.push(`#EXTINF:${dur},${artist} - ${title}`);out.push(t.fileName||title)});return out.join('\r\n')+'\r\n'}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}

  const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}return table})();
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
  function u16(v){return new Uint8Array([v&255,(v>>>8)&255])}
  function u32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
  function concat(parts){const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
  function dosDateTime(d=new Date()){const year=Math.max(1980,d.getFullYear());return{time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}}
  async function toBytes(data){if(data instanceof Uint8Array)return data;if(data instanceof Blob)return new Uint8Array(await data.arrayBuffer());return new TextEncoder().encode(String(data))}
  async function zipStore(entries){
    const locals=[],centrals=[];let offset=0;const dt=dosDateTime();
    for(const e of entries){const name=new TextEncoder().encode(e.name.replace(/\\/g,'/')),data=await toBytes(e.data),crc=crc32(data);const local=concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length}
    const centralBlob=concat(centrals),end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBlob.length),u32(offset),u16(0)]);return new Blob([...locals,centralBlob,end],{type:'application/zip'})
  }

  async function zipExport(p,tracks){
    const root=safeName(p.name),entries=[{name:`${root}/playlist.txt`,data:textExport(p,tracks)},{name:`${root}/playlist.m3u8`,data:m3uExport(p,tracks)}];let added=0;
    for(let i=0;i<tracks.length;i++){const t=tracks[i];if(!t.fileBlob)continue;const file=safeName(t.fileName||`${String(i+1).padStart(2,'0')} - ${t.artist||''} - ${t.title||'track'}.mp3`);entries.push({name:`${root}/audio/${file}`,data:t.fileBlob});added++}
    if(p.cover&&String(p.cover).startsWith('data:')){try{const [meta,b64]=p.cover.split(',');const type=(meta.match(/data:([^;]+)/)||[])[1]||'image/jpeg',ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);entries.push({name:`${root}/cover.${ext}`,data:bytes})}catch{}}
    const zip=await zipStore(entries);return{zip,added,missing:tracks.length-added}
  }

  function css(){if($('#dawoPlaylistDownloadStyle'))return;const s=document.createElement('style');s.id='dawoPlaylistDownloadStyle';s.textContent=`
    .dpm-download-modal{width:min(520px,100%);border:1px solid #2a2d38;border-radius:22px;background:#111118;padding:28px 32px;color:#f4f4f7;box-shadow:0 30px 90px #000b}.dpm-download-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.dpm-download-head h2{margin:2px 0 0;font-size:23px}.dpm-download-close{width:48px;height:44px;border:1px solid #2f313b;border-radius:10px;background:#17171f;color:#9da0ab;cursor:pointer}.dpm-download-meta{margin:18px 0 16px;color:#9b9ca7;font-size:12px}.dpm-download-options{display:grid;gap:10px}.dpm-download-option{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:10px;width:100%;min-height:66px;padding:10px 16px;border:1px solid #31323b;border-radius:9px;background:#1a1a21;color:#fff;text-align:left;cursor:pointer}.dpm-download-option:hover{border-color:#25e8d1;background:#1d2026}.dpm-download-option .ico{color:#24e8d1;font-size:21px;text-align:center}.dpm-download-option strong{display:block;font-size:13px}.dpm-download-option small{display:block;color:#a0a2ae;margin-top:3px;font-size:11px}.dpm-download-option[disabled]{opacity:.55;cursor:wait}.dpm-download-progress{margin-top:12px;color:#64e5d6;font-size:11px;min-height:16px}.dpm-btn.download{color:#62e7db;border-color:#24554f}
  `;document.head.appendChild(s)}

  function openModal(id){resolvePlaylist(id).then(({p,tracks})=>{const back=document.createElement('div');back.className='dpm-modal-back';back.innerHTML=`<div class="dpm-download-modal"><div class="dpm-download-head"><h2>Stáhnout playlist</h2><button class="dpm-download-close" type="button">×</button></div><div class="dpm-download-meta">${esc(p.name)} · ${tracks.length} skladeb</div><div class="dpm-download-options"><button class="dpm-download-option" data-dl="text"><span class="ico">▤</span><span><strong>Text</strong><small>Seznam skladeb se všemi dostupnými informacemi.</small></span></button><button class="dpm-download-option" data-dl="zip"><span class="ico">□</span><span><strong>Složka</strong><small>ZIP se složkou playlistu, skladbami, textem a M3U.</small></span></button><button class="dpm-download-option" data-dl="m3u"><span class="ico">☷</span><span><strong>M3U</strong><small>Playlist soubor pro DJ software.</small></span></button></div><div class="dpm-download-progress"></div></div>`;document.body.appendChild(back);const close=()=>back.remove();$('.dpm-download-close',back).onclick=close;back.onclick=e=>{if(e.target===back)close()};back.querySelectorAll('[data-dl]').forEach(btn=>btn.onclick=async()=>{const type=btn.dataset.dl,progress=$('.dpm-download-progress',back);try{if(type==='text'){downloadBlob(new Blob([textExport(p,tracks)],{type:'text/plain;charset=utf-8'}),`${safeName(p.name)}.txt`);progress.textContent='Textový seznam stažen.'}else if(type==='m3u'){downloadBlob(new Blob([m3uExport(p,tracks)],{type:'audio/x-mpegurl;charset=utf-8'}),`${safeName(p.name)}.m3u8`);progress.textContent='M3U playlist stažen.'}else{back.querySelectorAll('[data-dl]').forEach(x=>x.disabled=true);progress.textContent='Balím playlist a audio soubory do ZIPu…';const r=await zipExport(p,tracks);downloadBlob(r.zip,`${safeName(p.name)}.zip`);progress.textContent=`ZIP hotový · ${r.added} audio souborů${r.missing?` · ${r.missing} bez uloženého audia`:''}`;back.querySelectorAll('[data-dl]').forEach(x=>x.disabled=false)}}catch(e){console.error(e);progress.textContent=`Export selhal: ${e.message}`}})});}).catch(e=>alert(e.message))}

  function enhance(){css();document.querySelectorAll('.dpm-card').forEach(card=>{if(card.querySelector('[data-dpm-download]'))return;const id=card.querySelector('[data-dpm-edit]')?.dataset.dpmEdit,actions=card.querySelector('.dpm-actions');if(!id||!actions)return;const b=document.createElement('button');b.type='button';b.className='dpm-btn download';b.dataset.dpmDownload=id;b.textContent='⇩ Stáhnout';b.onclick=()=>openModal(id);const danger=actions.querySelector('.danger');danger?actions.insertBefore(b,danger):actions.appendChild(b)})}
  function boot(){css();enhance();const root=document.getElementById('dawoPlaylistModern')||document.body;new MutationObserver(()=>enhance()).observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300));else setTimeout(boot,300);
})();
const cueTypes = [
  ["INTRO", "#12e6f2"], ["BUILD", "#ffcb3d"], ["VOCAL", "#ff3c8e"], ["DROP 1", "#9277ff"],
  ["BREAK", "#ff715b"], ["DROP 2", "#42d392"], ["MIX OUT", "#58a6ff"], ["OUTRO", "#a7f432"]
];

const tracks = [];
const selectedTrackKeys = new Set();

function normalizeWaveform(values, targetCount=160) {
  const source = Array.from(values || [], value => Math.max(0, Number(value) || 0));
  if (!source.length) return null;
  const count = Math.min(targetCount, source.length);
  const sampled = Array.from({length:count}, (_, index) => {
    const start = Math.floor(index * source.length / count);
    const end = Math.max(start + 1, Math.floor((index + 1) * source.length / count));
    let peak = 0, sum = 0, samples = 0;
    for (let i=start; i<end && i<source.length; i++) {
      peak = Math.max(peak, source[i]);
      sum += source[i];
      samples++;
    }
    return peak * .65 + (sum / Math.max(1,samples)) * .35;
  });
  const sorted = sampled.filter(Number.isFinite).sort((a,b)=>a-b);
  const reference = sorted[Math.floor((sorted.length-1)*.92)] || Math.max(...sampled) || 1;
  return sampled.map(value => Math.round(Math.max(8,Math.min(100,(value/reference)*88))));
}
const cueflowDb = new Promise((resolve, reject) => {
  const request = indexedDB.open("DawoMixStudioCueflowDB", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("tracks", {keyPath:"sourceKey"});
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function saveTrack(track) {
  const db = await cueflowDb;
  const stored = {...track};
  delete stored.url;
  await new Promise((resolve, reject) => {
    const request = db.transaction("tracks", "readwrite").objectStore("tracks").put(stored);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

async function deleteStoredTrack(track) {
  if (!track.sourceKey) return;
  const db = await cueflowDb;
  db.transaction("tracks", "readwrite").objectStore("tracks").delete(track.sourceKey);
}

async function loadStoredTracks() {
  const db = await cueflowDb;
  const stored = await new Promise((resolve, reject) => {
    const request = db.transaction("tracks").objectStore("tracks").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  stored.forEach(track => {
    if (track.wave?.length && Math.max(...track.wave) <= 2) track.wave = normalizeWaveform(track.wave);
    track.url = track.fileBlob ? URL.createObjectURL(track.fileBlob) : "";
    tracks.push(track);
  });
  renderTracks();
}

window.CueflowBridge = {
  async importPlaylist(playlist) {
    const incomingKeys = new Set(playlist.tracks.map(track => `${playlist.id}:${track.id}`));
    for (let index = tracks.length - 1; index >= 0; index--) {
      if (tracks[index].playlistId === playlist.id && !incomingKeys.has(tracks[index].sourceKey)) {
        if (tracks[index].url) URL.revokeObjectURL(tracks[index].url);
        await deleteStoredTrack(tracks[index]);
        tracks.splice(index, 1);
      }
    }

    const colors = ["#12e6f2","#ffcb3d","#ff3c8e","#9277ff","#42d392","#58a6ff"];
    for (const [index, source] of playlist.tracks.entries()) {
      const sourceKey = `${playlist.id}:${source.id}`;
      const existingIndex = tracks.findIndex(track => track.sourceKey === sourceKey);
      if (existingIndex >= 0 && tracks[existingIndex].url) URL.revokeObjectURL(tracks[existingIndex].url);
      const duration = Number(source.duration) || 180;
      const track = {
        sourceKey,
        playlistId: playlist.id,
        playlistName: playlist.name,
        id: Date.now() + index + Math.random(),
        title: source.title || source.fileName || "Bez názvu",
        artist: source.artist || "Dawomix",
        bpm: Number(source.bpm) || null,
        key: source.key || "—",
        duration,
        ready: false,
        color: colors[index % colors.length],
        cover: `linear-gradient(135deg,${colors[index % colors.length]}33,#101624)`,
        cues: Array(8).fill(null),
        wave: normalizeWaveform(source.waveformData),
        fileBlob: source.fileBlob || null,
        fileName: source.fileName || "",
        url: source.fileBlob ? URL.createObjectURL(source.fileBlob) : ""
      };
      if (existingIndex >= 0) {
        track.cues = tracks[existingIndex].cues || track.cues;
        track.ready = track.cues.every(value => value != null);
        tracks.splice(existingIndex, 1, track);
      } else {
        tracks.push(track);
      }
      await saveTrack(track);
    }
    renderTracks();
    toast(`Playlist „${playlist.name}“: ${playlist.tracks.length} skladeb importováno`);
    return playlist.tracks.length;
  }
};

const state = { filter:"all", query:"", sortAsc:true, selected:null, current:null, position:0, playing:false, timer:null, zoom:1 };
const $ = (s) => document.querySelector(s);
const audio = $("#audioElement");

function time(value, decimal=true) {
  if (value == null) return "Nenastaveno";
  const min = Math.floor(value / 60);
  const sec = decimal ? (value % 60).toFixed(1).padStart(4,"0") : String(Math.floor(value % 60)).padStart(2,"0");
  return `${String(min).padStart(2,"0")}:${sec}`;
}

function bars(track, count=120) {
  if (track.wave) return track.wave.slice(0,count).map(h => `<i style="height:${h}%"></i>`).join("");
  let seed = track.id * 113;
  return Array.from({length:count},(_,i) => {
    seed = (seed * 9301 + 49297) % 233280;
    const h = Math.max(8,(seed/233280)*92*(.42+Math.abs(Math.sin(i/10))*.55));
    return `<i style="height:${h}%"></i>`;
  }).join("");
}

function renderTracks() {
  const list = tracks
    .filter(t => state.filter==="all" || (state.filter==="ready" ? t.ready : !t.ready))
    .filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(state.query.toLowerCase()))
    .sort((a,b) => state.sortAsc ? a.bpm-b.bpm : b.bpm-a.bpm);
  $("#trackList").innerHTML = list.map(t => `
    <article class="track-card ${state.selected?.id===t.id?"selected":""}" style="--track-color:${t.color}" data-open="${t.id}">
      <input class="track-select" type="checkbox" data-select-key="${t.sourceKey}" aria-label="Vybrat ${t.title}" ${selectedTrackKeys.has(t.sourceKey)?"checked":""}>
      <div class="cover" style="--cover:${t.cover}">${t.title.slice(0,2).toUpperCase()}</div>
      <div class="track-main">
        <h3 class="track-title">${t.title}</h3><p class="track-artist">${t.artist}</p>
        <div class="track-meta"><span class="meta-pill">${t.bpm||"—"} BPM</span><span class="meta-pill key-pill">${t.key}</span>
          <span class="cue-dots" aria-label="${t.cues.filter(v=>v!=null).length} z 8 cue pointů">${t.cues.map(v=>`<i class="${v!=null?"on":""}"></i>`).join("")}</span>
        </div>
      </div>
      <div class="track-actions">
        <button data-action="play" data-id="${t.id}" aria-label="Přehrát"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg></button>
        <button data-action="edit" data-id="${t.id}" aria-label="Upravit cue pointy"><svg viewBox="0 0 24 24"><path d="M4 16v4h4M20 8V4h-4M5 11a7 7 0 0 1 12-4l3 1M19 13a7 7 0 0 1-12 4l-3-1"/></svg></button>
        <button class="delete-track" data-action="delete" data-id="${t.id}" aria-label="Odebrat skladbu"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></button>
      </div>
    </article>`).join("");
  $("#emptyState").hidden = list.length > 0;
  const ready=tracks.filter(t=>t.ready).length;
  const bpms=tracks.filter(t=>Number.isFinite(t.bpm)).map(t=>t.bpm);
  $("#trackCount").textContent=tracks.length;
  $("#cueCount").textContent=tracks.reduce((sum,t)=>sum+t.cues.filter(v=>v!=null).length,0);
  $("#readyPercent").textContent=tracks.length?`${Math.round(ready/tracks.length*100)}%`:"0%";
  $("#averageBpm").textContent=bpms.length?Math.round(bpms.reduce((a,b)=>a+b,0)/bpms.length):"—";
  $("#allCount").textContent=tracks.length;
  $("#readyCount").textContent=ready;
  $("#todoCount").textContent=tracks.length-ready;
  updateBulkActions();
}

function updateBulkActions() {
  const count=selectedTrackKeys.size;
  $("#selectedCount").textContent=`${count} vybráno`;
  $("#exportTraktorButton").disabled=!count;
  $("#downloadSelectedButton").disabled=!count;
  $("#sendToDawomixButton").disabled=!count;
  $("#selectAllTracks").checked=tracks.length>0&&tracks.every(track=>selectedTrackKeys.has(track.sourceKey));
  $("#selectAllTracks").indeterminate=count>0&&!$("#selectAllTracks").checked;
}

function getSelectedTracks() {
  return tracks.filter(track=>selectedTrackKeys.has(track.sourceKey));
}

function removeTrack(track) {
  const index=tracks.findIndex(t=>t.id===track.id);
  if(index<0)return;
  if(track.url) URL.revokeObjectURL(track.url);
  tracks.splice(index,1);
  selectedTrackKeys.delete(track.sourceKey);
  deleteStoredTrack(track).catch(()=>{});
  if(state.current?.id===track.id) {
    setPlaying(false); audio.removeAttribute("src"); audio.load();
    state.current=null; state.position=0;
    $("#nowPlayingTitle").textContent="Vyber skladbu";
    $("#nowPlayingArtist").textContent="Knihovna je připravená";
    $("#playerWaveform").innerHTML="";
    $("#cueShortcut").disabled=true;
  }
  if(state.selected?.id===track.id) closeEditor();
  renderTracks(); toast("Skladba byla odebrána");
}

function selectTrack(track, autoplay=false) {
  const changed = state.current?.id !== track.id;
  state.current = track;
  if (changed) {
    state.position = 0;
    audio.pause();
    audio.src = track.url || "";
  }
  $("#nowPlayingTitle").textContent = track.title;
  $("#nowPlayingArtist").textContent = `${track.artist} · ${track.bpm||"—"} BPM · ${track.key}`;
  $("#playerDuration").textContent = time(track.duration,false);
  $("#cueShortcut").disabled = false;
  $("#playerWaveform").innerHTML = bars(track,160);
  updatePosition();
  if (autoplay) setPlaying(true);
}

function setPlaying(value) {
  if (!state.current) return;
  state.playing = value;
  $("#player").classList.toggle("playing",value);
  $("#editorPlay").classList.toggle("playing",value);
  clearInterval(state.timer);
  if (state.current.url) {
    if (value) { audio.currentTime=state.position; audio.play().catch(()=>{}); } else audio.pause();
    return;
  }
  if (value) state.timer=setInterval(()=>{ state.position=(state.position+.1)%state.current.duration; updatePosition(); },100);
}

function updatePosition() {
  if (!state.current) return;
  const ratio = state.position/state.current.duration;
  $("#currentTime").textContent=time(state.position);
  $("#playerCurrent").textContent=time(state.position,false);
  $("#playerProgress").style.left=`${ratio*100}%`;
  $("#playhead").style.left=`${ratio*100}%`;
  document.querySelectorAll("#waveform > i,#playerWaveform > i").forEach((bar,i,all)=>bar.classList.toggle("past",i/all.length<ratio));
}

function renderCues() {
  const t=state.selected;
  $("#cueGrid").innerHTML=cueTypes.map((cue,i)=>`
    <article class="cue-slot" style="--cue-color:${cue[1]}">
      <button class="cue-set" data-cue="${i}">
        <span>${String(i+1).padStart(2,"0")} · ${cue[0]}</span><strong>${time(t.cues[i])}</strong>
        <small>${t.cues[i]==null?"Kliknutím přidat":"Kliknutím přehrát"}</small>
      </button>
      <button class="cue-delete" data-delete-cue="${i}" aria-label="Smazat cue point ${i+1}" ${t.cues[i]==null?"disabled":""}>
        <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13M12 10v7"/></svg>
      </button>
    </article>`).join("");
  document.querySelectorAll(".cue-marker").forEach(m=>m.remove());
  t.cues.forEach((v,i)=>{
    if(v==null)return;
    const m=document.createElement("span"); m.className="cue-marker"; m.dataset.label=i+1;
    m.style.cssText=`--cue-color:${cueTypes[i][1]};left:${(v/t.duration)*100}%`;
    $("#waveformStage").appendChild(m);
  });
}

function buildAutomaticCues() {
  const track=state.selected;
  if(!track)return;
  const targets=[.035,.13,.25,.38,.51,.64,.82,.94];
  track.cues=targets.map(ratio=>{
    let selectedRatio=ratio;
    if(track.wave?.length) {
      const center=Math.round(ratio*(track.wave.length-1));
      const radius=Math.max(2,Math.round(track.wave.length*.035));
      let best=center;
      for(let i=Math.max(0,center-radius);i<=Math.min(track.wave.length-1,center+radius);i++) {
        if(track.wave[i]>track.wave[best]) best=i;
      }
      selectedRatio=best/(track.wave.length-1);
    }
    return Math.round(track.duration*selectedRatio*10)/10;
  });
  track.ready=true;
  renderCues();
  renderTracks();
  toast("Cue pointy byly automaticky sestaveny");
}

function openEditor(track) {
  selectTrack(track);
  state.selected=track;
  $("#sheetTitle").textContent=track.title;
  $("#sheetArtist").textContent=`${track.artist} · ${track.bpm||"—"} BPM · ${track.key}`;
  $("#durationTime").textContent=time(track.duration);
  $("#waveform").innerHTML=bars(track);
  setWaveZoom(1);
  $("#cueEditor").hidden=false;
  renderCues(); renderTracks(); updatePosition();
  $("#cueEditor").scrollIntoView({behavior:"smooth",block:"start"});
}

function closeEditor() { $("#cueEditor").hidden=true; state.selected=null; renderTracks(); }
function toast(text) { $("#toast").textContent=text;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),2400); }

function blobToDataUrl(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function xmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[character]));
}

function safeFileName(value, fallback="skladba") {
  return String(value || fallback).replace(/[<>:"/\\|?*\x00-\x1f]/g,"_").trim() || fallback;
}

function trackFileName(track,index) {
  const original=track.fileName || track.fileBlob?.name || "";
  const extension=(original.match(/\.[a-z0-9]{2,5}$/i)||[".mp3"])[0];
  return `${String(index+1).padStart(2,"0")} - ${safeFileName(track.artist)} - ${safeFileName(track.title)}${extension}`;
}

function createTraktorNml(selected,name="CUEFLOW výběr") {
  const entries=selected.map((track,index)=>{
    const file=trackFileName(track,index);
    const key=`/:Skladby/:${file}`;
    const cues=(track.cues||[]).map((value,cueIndex)=>value==null?"":`<CUE_V2 NAME="${xmlEscape(cueTypes[cueIndex]?.[0]||`CUE ${cueIndex+1}`)}" DISPL_ORDER="${cueIndex}" TYPE="0" START="${Math.round(value*1000)}" LEN="0" REPEATS="-1" HOTCUE="${cueIndex}"/>`).join("");
    return `<ENTRY MODIFIED_DATE="${new Date().toISOString().slice(0,10).replaceAll("-","/")}" TITLE="${xmlEscape(track.title)}" ARTIST="${xmlEscape(track.artist)}"><LOCATION DIR="/:Skladby/:" FILE="${xmlEscape(file)}" VOLUME=""/><ALBUM TITLE=""/><INFO KEY="${xmlEscape(track.key)}" PLAYTIME="${Math.round(track.duration||0)}"/><TEMPO BPM="${Number(track.bpm)||0}" BPM_QUALITY="100.000000"/>${cues}</ENTRY>`;
  }).join("");
  const playlistEntries=selected.map((track,index)=>`<ENTRY><PRIMARYKEY TYPE="TRACK" KEY="/:Skladby/:${xmlEscape(trackFileName(track,index))}"/></ENTRY>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?><NML VERSION="19"><HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/><MUSICFOLDERS/><COLLECTION ENTRIES="${selected.length}">${entries}</COLLECTION><SETS ENTRIES="0"/><PLAYLISTS><NODE TYPE="FOLDER" NAME="$ROOT"><SUBNODES COUNT="1"><NODE TYPE="PLAYLIST" NAME="${xmlEscape(name)}"><PLAYLIST ENTRIES="${selected.length}" TYPE="LIST" UUID="${crypto.randomUUID().replaceAll("-","")}">${playlistEntries}</PLAYLIST></NODE></SUBNODES></NODE></PLAYLISTS></NML>`;
}

function downloadBlob(blob,fileName) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}

function little(value,size) {
  return Array.from({length:size},(_,index)=>(value>>>8*index)&255);
}

function joinBytes(parts) {
  const length=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(length);
  let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}

function createZip(files) {
  const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0;
  files.forEach(file=>{
    const name=encoder.encode(file.name),data=file.data,crc=crc32(data);
    const local=new Uint8Array([...little(0x04034b50,4),...little(20,2),...little(0x800,2),...little(0,2),...little(0,2),...little(0,2),...little(crc,4),...little(data.length,4),...little(data.length,4),...little(name.length,2),...little(0,2),...name]);
    locals.push(local,data);
    const central=new Uint8Array([...little(0x02014b50,4),...little(20,2),...little(20,2),...little(0x800,2),...little(0,2),...little(0,2),...little(0,2),...little(crc,4),...little(data.length,4),...little(data.length,4),...little(name.length,2),...little(0,2),...little(0,2),...little(0,2),...little(0,2),...little(0,4),...little(offset,4),...name]);
    centrals.push(central);offset+=local.length+data.length;
  });
  const centralSize=centrals.reduce((sum,item)=>sum+item.length,0);
  const end=new Uint8Array([...little(0x06054b50,4),...little(0,2),...little(0,2),...little(files.length,2),...little(files.length,2),...little(centralSize,4),...little(offset,4),...little(0,2)]);
  return new Blob([...locals,...centrals,end],{type:"application/zip"});
}

function exportSelectedToTraktor() {
  const selected=getSelectedTracks();
  downloadBlob(new Blob([createTraktorNml(selected)],{type:"application/xml"}),`cueflow-traktor-${new Date().toISOString().slice(0,10)}.nml`);
  toast(`Traktor NML: ${selected.length} skladeb`);
}

async function downloadSelectedTracks() {
  const selected=getSelectedTracks(),encoder=new TextEncoder(),files=[];
  selected.forEach((track,index)=>{if(track.fileBlob)files.push({name:`Skladby/${trackFileName(track,index)}`,data:null,blob:track.fileBlob});});
  for(const file of files)file.data=new Uint8Array(await file.blob.arrayBuffer());
  files.push({name:"CUEFLOW-Traktor.nml",data:encoder.encode(createTraktorNml(selected))});
  files.push({name:"README.txt",data:encoder.encode("V Traktor DJ importujte soubor CUEFLOW-Traktor.nml. Audio je ve složce Skladby.")});
  downloadBlob(createZip(files),`cueflow-vybrane-${new Date().toISOString().slice(0,10)}.zip`);
  toast(`ZIP obsahuje ${files.length-2} audio souborů a Traktor NML`);
}

async function sendSelectedToDawomix() {
  const selected=getSelectedTracks();
  const payload={name:`CUEFLOW výběr ${new Date().toLocaleDateString("cs-CZ")}`,tracks:selected.map(track=>({
    sourceKey:track.sourceKey,title:track.title,artist:track.artist,bpm:track.bpm,key:track.key,duration:track.duration,
    waveform:track.wave,cues:track.cues,fileName:track.fileName,fileBlob:track.fileBlob
  }))};
  try {
    await window.parent.DawoMixStudio.transferToDawomix(payload);
  } catch(error) {
    toast(`Přenos do Dawomix selhal: ${error.message}`);
  }
}

async function saveLibraryWithMetadata() {
  if (!tracks.length) {
    toast("Knihovna je prázdná");
    return;
  }
  const button=$("#saveLibraryButton");
  button.disabled=true;
  toast("Připravuji skladby a metadata…");
  try {
    const exportedTracks=[];
    for (const track of tracks) {
      exportedTracks.push({
        sourceKey:track.sourceKey,
        playlistId:track.playlistId,
        playlistName:track.playlistName,
        title:track.title,
        artist:track.artist,
        bpm:track.bpm,
        key:track.key,
        duration:track.duration,
        cues:track.cues,
        waveform:track.wave,
        fileName:track.fileName,
        mimeType:track.fileBlob?.type || "",
        audio:track.fileBlob ? await blobToDataUrl(track.fileBlob) : null
      });
    }
    const payload={
      format:"dawo-mix-studio-cueflow-library",
      version:1,
      exportedAt:new Date().toISOString(),
      tracks:exportedTracks
    };
    const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`cueflow-skladby-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(`${tracks.length} skladeb včetně metadat bylo uloženo`);
  } catch(error) {
    console.error(error);
    toast("Uložení knihovny se nezdařilo");
  } finally {
    button.disabled=false;
  }
}
function openImport(){document.body.classList.add("import-open")}
function closeImport(){document.body.classList.remove("import-open")}
function openSettings(){document.body.classList.add("settings-open")}
function closeSettings(){document.body.classList.remove("settings-open")}

const themes = {
  cyan:{cyan:"#12e6f2",pink:"#ff3c8e",wave:"#12e6f2"},
  lime:{cyan:"#b6ff00",pink:"#ffe600",wave:"#b6ff00"},
  violet:{cyan:"#9d72ff",pink:"#ff62ca",wave:"#9d72ff"},
  orange:{cyan:"#ff713c",pink:"#ffc83d",wave:"#ff713c"}
};
function applyAppearance(settings) {
  const theme=themes[settings.theme]||themes.cyan;
  document.documentElement.style.setProperty("--cyan",theme.cyan);
  document.documentElement.style.setProperty("--pink",theme.pink);
  document.documentElement.style.setProperty("--wave",settings.wave||theme.wave);
  document.body.dataset.bg=settings.bg||"grid";
  if(settings.image) document.body.style.setProperty("--custom-bg",`url("${settings.image}")`);
  $("#waveColor").value=settings.wave||theme.wave;
  document.querySelectorAll(".theme-preset").forEach(b=>b.classList.toggle("active",b.dataset.theme===(settings.theme||"cyan")));
  document.querySelectorAll(".background-preset").forEach(b=>b.classList.toggle("active",b.dataset.bg===(settings.bg||"grid")));
}

function saveAppearance(patch) {
  const current=JSON.parse(localStorage.getItem("cueflowAppearance")||"{}");
  const next={...current,...patch};
  localStorage.setItem("cueflowAppearance",JSON.stringify(next));
  applyAppearance(next);
}

function setWaveZoom(value) {
  state.zoom=Math.max(1,Math.min(8,Number(value)));
  $("#waveZoom").value=state.zoom;
  $("#zoomValue").textContent=`${state.zoom}×`;
  $("#waveformStage").style.setProperty("--zoom",state.zoom);
}

async function analyzeFile(file) {
  const url=URL.createObjectURL(file);
  const duration=await new Promise(resolve=>{const a=new Audio(url);a.onloadedmetadata=()=>resolve(a.duration||180);a.onerror=()=>resolve(180)});
  let wave=null;
  try {
    const context=new AudioContext();
    const buffer=await context.decodeAudioData(await file.arrayBuffer());
    const data=buffer.getChannelData(0), count=160, size=Math.floor(data.length/count);
    wave=Array.from({length:count},(_,i)=>{
      let peak=0; for(let j=0;j<size;j+=Math.max(1,Math.floor(size/80))) peak=Math.max(peak,Math.abs(data[i*size+j]||0));
      return Math.max(8,Math.min(100,peak*115));
    });
    await context.close();
  } catch {}
  const title=file.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  const id=Date.now()+Math.random();
  const track={sourceKey:`cueflow:${id}`,id,title,artist:"Import ze zařízení",bpm:null,key:"—",duration,ready:false,color:"#12e6f2",cover:"linear-gradient(135deg,#103e49,#156f76)",cues:Array(8).fill(null),wave,fileBlob:file,fileName:file.name,url};
  tracks.unshift(track);
  await saveTrack(track);
  renderTracks();
}

$("#trackList").addEventListener("click",e=>{
  const checkbox=e.target.closest("[data-select-key]");
  if(checkbox) {
    checkbox.checked?selectedTrackKeys.add(checkbox.dataset.selectKey):selectedTrackKeys.delete(checkbox.dataset.selectKey);
    updateBulkActions();
    return;
  }
  const button=e.target.closest("button[data-id]");
  const card=e.target.closest("[data-open]");
  const id=Number(button?.dataset.id||card?.dataset.open);
  const track=tracks.find(t=>t.id===id);
  if(!track)return;
  if(button?.dataset.action==="delete") removeTrack(track);
  else if(button?.dataset.action==="play") selectTrack(track,true);
  else openEditor(track);
});
$("#searchInput").addEventListener("input",e=>{state.query=e.target.value;renderTracks()});
$("#filters").addEventListener("click",e=>{const b=e.target.closest(".filter");if(!b)return;state.filter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderTracks()});
$("#sortButton").addEventListener("click",()=>{state.sortAsc=!state.sortAsc;renderTracks()});
$("#playerButton").addEventListener("click",()=>setPlaying(!state.playing));
$("#editorPlay").addEventListener("click",()=>setPlaying(!state.playing));
$("#cueShortcut").addEventListener("click",()=>openEditor(state.current));
$("#closeEditor").addEventListener("click",closeEditor);
$("#backButton").addEventListener("click",()=>{state.position=Math.max(0,state.position-10);if(state.current.url)audio.currentTime=state.position;updatePosition()});
$("#forwardButton").addEventListener("click",()=>{state.position=Math.min(state.current.duration,state.position+10);if(state.current.url)audio.currentTime=state.position;updatePosition()});
$(".editor-waveform").addEventListener("click",e=>{const r=$("#waveform").getBoundingClientRect();state.position=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*state.current.duration;if(state.current.url)audio.currentTime=state.position;updatePosition()});
$("#playerWaveWrap").addEventListener("click",e=>{if(!state.current)return;const r=e.currentTarget.getBoundingClientRect();state.position=((e.clientX-r.left)/r.width)*state.current.duration;if(state.current.url)audio.currentTime=state.position;updatePosition()});
$("#cueGrid").addEventListener("click",e=>{
  const remove=e.target.closest("[data-delete-cue]");
  if(remove) {
    state.selected.cues[Number(remove.dataset.deleteCue)]=null;
    state.selected.ready=false;
    renderCues(); renderTracks(); toast("Cue point byl odstraněn");
    return;
  }
  const set=e.target.closest("[data-cue]");
  if(!set)return;
  const cueIndex=Number(set.dataset.cue);
  const cueTime=state.selected.cues[cueIndex];
  if(cueTime!=null) {
    state.position=cueTime;
    if(state.current.url) audio.currentTime=cueTime;
    updatePosition();
    setPlaying(true);
    return;
  }
  state.selected.cues[cueIndex]=Math.round(state.position*10)/10;
  state.selected.ready=state.selected.cues.every(v=>v!=null);
  renderCues();
});
$("#autoCues").addEventListener("click",buildAutomaticCues);
$("#saveCues").addEventListener("click",()=>{renderTracks();if(state.selected)saveTrack(state.selected).catch(()=>{});toast("8 cue pointů bylo uloženo")});
$("#addTrackButton").addEventListener("click",openImport);
$("#saveLibraryButton").addEventListener("click",saveLibraryWithMetadata);
$("#selectAllTracks").addEventListener("change",e=>{selectedTrackKeys.clear();if(e.target.checked)tracks.forEach(track=>selectedTrackKeys.add(track.sourceKey));renderTracks();});
$("#exportTraktorButton").addEventListener("click",exportSelectedToTraktor);
$("#downloadSelectedButton").addEventListener("click",downloadSelectedTracks);
$("#sendToDawomixButton").addEventListener("click",sendSelectedToDawomix);
$("#emptyImportButton").addEventListener("click",openImport);
$("#closeImport").addEventListener("click",closeImport);
$("#importBackdrop").addEventListener("click",closeImport);
$("#deviceImport").addEventListener("click",()=>$("#audioInput").click());
$("#audioInput").addEventListener("change",async e=>{
  const files=[...e.target.files];
  closeImport();
  for(const file of files) await analyzeFile(file);
  if(files.length) toast(files.length===1?"Skladba byla přidána do knihovny":`${files.length} skladeb bylo přidáno do knihovny`);
  e.target.value="";
});
document.querySelectorAll("[data-cloud]").forEach(b=>b.addEventListener("click",()=>{const name=b.dataset.cloud==="mega"?"MEGA":"Dropbox";toast(`${name}: pro ostré připojení vlož API klíč služby`)}));
document.querySelectorAll(".source-button[data-source]").forEach(b=>b.addEventListener("click",()=>{
  const source=b.dataset.source;
  if(source==="device") { openImport(); return; }
  const name=source==="mega"?"MEGA":source==="dropbox"?"Dropbox":"Google Drive";
  toast(`${name}: připojení vyžaduje API klíč služby`);
}));
$("#settingsButton").addEventListener("click",openSettings);
$("#closeSettings").addEventListener("click",closeSettings);
$("#settingsBackdrop").addEventListener("click",closeSettings);
document.querySelectorAll(".theme-preset").forEach(b=>b.addEventListener("click",()=>{
  const theme=b.dataset.theme;
  saveAppearance({theme});
}));
document.querySelectorAll(".background-preset").forEach(b=>b.addEventListener("click",()=>{
  if(b.dataset.bg==="image") { $("#backgroundInput").click(); return; }
  saveAppearance({bg:b.dataset.bg});
}));
$("#backgroundInput").addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{saveAppearance({bg:"image",image:reader.result});toast("Vlastní pozadí bylo nastaveno")};
  reader.readAsDataURL(file); e.target.value="";
});
$("#waveColor").addEventListener("input",e=>saveAppearance({wave:e.target.value}));
$("#resetSettings").addEventListener("click",()=>{localStorage.removeItem("cueflowAppearance");applyAppearance({theme:"cyan",bg:"grid",wave:"#12e6f2"});toast("Vzhled byl obnoven")});
$("#waveZoom").addEventListener("input",e=>setWaveZoom(e.target.value));
$("#zoomOut").addEventListener("click",()=>setWaveZoom(state.zoom-.5));
$("#zoomIn").addEventListener("click",()=>setWaveZoom(state.zoom+.5));
audio.addEventListener("timeupdate",()=>{state.position=audio.currentTime;updatePosition()});
audio.addEventListener("ended",()=>setPlaying(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeImport();closeSettings();closeEditor()}if(e.code==="Space"&&!e.target.matches("input")){e.preventDefault();setPlaying(!state.playing)}});

applyAppearance(JSON.parse(localStorage.getItem("cueflowAppearance")||"{}"));
renderTracks();
loadStoredTracks().catch(()=>toast("Uloženou knihovnu CUEFLOW se nepodařilo načíst"));

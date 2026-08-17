(()=>{
  const DB='DawoMixStudioCueflowDB',STORE='tracks',PENDING='dawo:cueflow:pendingAnalyzerTrack';
  const colors=['#12e6f2','#ffcb3d','#ff3c8e','#9277ff','#42d392','#58a6ff'];
  const openDb=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'sourceKey'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  async function getRecord(db,key){return req(db.transaction(STORE).objectStore(STORE).get(key));}
  async function putRecord(db,row){return req(db.transaction(STORE,'readwrite').objectStore(STORE).put(row));}
  function cueTimes(track){const src=Array.isArray(track.autoCues)&&track.autoCues.length?track.autoCues.map(c=>Number(c?.time)):Array.isArray(track.cues)?track.cues:[];return Array.from({length:8},(_,i)=>Number.isFinite(Number(src[i]))?Number(src[i]):null);}
  async function importAnalyzedTrack(track){
    if(!track)throw new Error('Analyzer neposlal žádnou skladbu.');
    const db=await openDb();
    const sourceKey=`analyzer:${track.uid||track.sourceId||track.fileName||track.title}`;
    const existing=await getRecord(db,sourceKey);
    const cues=cueTimes(track),color=existing?.color||colors[Math.abs(String(sourceKey).split('').reduce((a,c)=>a+c.charCodeAt(0),0))%colors.length];
    const row={
      ...(existing||{}),sourceKey,playlistId:'analyzer',playlistName:'Analyzer',id:existing?.id||Date.now()+Math.random(),
      title:track.title||track.fileName||'Bez názvu',artist:track.artist||'DawoMix Analyzer',bpm:Number(track.bpm)||null,key:track.key||'—',duration:Number(track.duration)||180,
      ready:cues.every(v=>v!=null),color,cover:existing?.cover||`linear-gradient(135deg,${color}33,#101624)`,cues,
      wave:Array.isArray(track.waveformData)?track.waveformData:(Array.isArray(track.wave)?track.wave:null),fileBlob:track.fileBlob||existing?.fileBlob||null,fileName:track.fileName||existing?.fileName||'',
      firstBeat:Number.isFinite(Number(track.firstBeat))?Number(track.firstBeat):null,downbeat:Number.isFinite(Number(track.downbeat))?Number(track.downbeat):null,
      beatInterval:Number.isFinite(Number(track.beatInterval))?Number(track.beatInterval):null,beatsPerBar:Number(track.beatsPerBar)||4,beatgrid:Array.isArray(track.beatgrid)?track.beatgrid:[],autoCues:Array.isArray(track.autoCues)?track.autoCues:[],
      analysisConfidence:Number(track.analysisConfidence)||null,analysisEngine:track.analysisEngine||'',analyzedAt:track.analyzedAt||null,sharedUid:track.uid||null
    };
    await putRecord(db,row);db.close();
    sessionStorage.setItem(PENDING,JSON.stringify({id:row.id,sourceKey,title:row.title,at:Date.now()}));
    location.reload();
    return {sourceKey,id:row.id};
  }
  const previous=window.CueflowBridge||{};
  window.CueflowBridge={...previous,importAnalyzedTrack};

  function openPending(){
    let pending;try{pending=JSON.parse(sessionStorage.getItem(PENDING)||'null');}catch{return;}
    if(!pending)return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const card=document.querySelector(`[data-open="${CSS.escape(String(pending.id))}"]`);
      if(card){clearInterval(timer);sessionStorage.removeItem(PENDING);card.click();setTimeout(()=>document.getElementById('cueEditor')?.scrollIntoView({behavior:'smooth',block:'start'}),100);}
      else if(attempts>80){clearInterval(timer);sessionStorage.removeItem(PENDING);}
    },75);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openPending);else openPending();
})();
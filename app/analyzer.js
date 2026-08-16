(() => {
  let essentiaPromise = null;
  let audioContext = null;
  let selectedUid = null;
  let busy = false;

  const $ = s => document.querySelector(s);
  const camelotMap = {
    'C major':'8B','G major':'9B','D major':'10B','A major':'11B','E major':'12B','B major':'1B','F# major':'2B','Gb major':'2B','Db major':'3B','C# major':'3B','Ab major':'4B','G# major':'4B','Eb major':'5B','D# major':'5B','Bb major':'6B','A# major':'6B','F major':'7B',
    'A minor':'8A','E minor':'9A','B minor':'10A','F# minor':'11A','Gb minor':'11A','C# minor':'12A','Db minor':'12A','G# minor':'1A','Ab minor':'1A','D# minor':'2A','Eb minor':'2A','A# minor':'3A','Bb minor':'3A','F minor':'4A','C minor':'5A','G minor':'6A','D minor':'7A'
  };

  function getEssentia() {
    if (!window.EssentiaWASM || !window.Essentia) throw new Error('Essentia.js není načtená.');
    essentiaPromise ||= window.EssentiaWASM().then(module => new window.Essentia(module));
    return essentiaPromise;
  }

  function resample(input, sourceRate, targetRate=44100) {
    if (sourceRate === targetRate) return input;
    const ratio = sourceRate / targetRate;
    const out = new Float32Array(Math.floor(input.length / ratio));
    for (let i=0;i<out.length;i++) {
      const pos = i * ratio;
      const left = Math.floor(pos);
      const right = Math.min(input.length-1,left+1);
      const frac = pos-left;
      out[i] = input[left]*(1-frac)+input[right]*frac;
    }
    return out;
  }

  function waveformFromSignal(signal, bars=220) {
    const size = Math.max(1, Math.floor(signal.length / bars));
    const data = [];
    let max = 0;
    for (let i=0;i<bars;i++) {
      const start=i*size, end=Math.min(signal.length,start+size);
      let peak=0, sum=0, n=0;
      for(let j=start;j<end;j++){const v=Math.abs(signal[j]);peak=Math.max(peak,v);sum+=v;n++;}
      const value=peak*.72+(sum/Math.max(1,n))*.28;
      max=Math.max(max,value);data.push(value);
    }
    return data.map(v=>Math.round(Math.max(3,(v/Math.max(max,.0001))*100)));
  }

  async function analyzeBlob(blob) {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const maxSeconds = 180;
    const length = Math.min(buffer.length, Math.round(buffer.sampleRate * maxSeconds));
    const start = Math.max(0, Math.floor((buffer.length-length)/2));
    const mono = new Float32Array(length);
    for (let ch=0;ch<buffer.numberOfChannels;ch++) {
      const channel=buffer.getChannelData(ch);
      for (let i=0;i<length;i++) mono[i]+=channel[start+i]/buffer.numberOfChannels;
    }
    const waveformData = waveformFromSignal(mono);
    let rms=0; for(const v of mono) rms+=v*v; rms=Math.sqrt(rms/Math.max(1,mono.length));
    const energyScore=Math.round(Math.max(0,Math.min(100,(20*Math.log10(Math.max(rms,1e-7))+60)*1.65)));
    const essentia=await getEssentia();
    const signal=resample(mono,buffer.sampleRate);
    const vector=essentia.arrayToVector(signal);
    let rhythm,keyInfo;
    try { rhythm=essentia.RhythmExtractor2013(vector,180,'multifeature',60); keyInfo=essentia.KeyExtractor(vector); }
    finally { vector.delete(); }
    const bpm=Math.round(Number(rhythm.bpm))||null;
    const keyName=`${keyInfo.key} ${keyInfo.scale}`;
    const confidence=Math.round(Math.max(0,Math.min(1,Number(rhythm.confidence||0)/5.32))*100);
    return {
      bpm,
      key: camelotMap[keyName] || keyName,
      duration: buffer.duration,
      waveformData,
      energy: energyScore<35?'Low':energyScore<68?'Medium':'High',
      energyScore,
      danceability: confidence,
      analysisConfidence: confidence,
      analyzedAt: new Date().toISOString()
    };
  }

  function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function render() {
    const rows = await window.DawoLibrary.all();
    const list=$('#analyzerTrackList');
    const count=$('#sharedLibraryCount');
    if(count) count.textContent=rows.length;
    if(!list) return;
    list.innerHTML = rows.length ? rows.map(track=>`<button class="library-track ${selectedUid===track.uid?'selected':''}" data-analyzer-track="${escapeHtml(track.uid)}"><span><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.artist)} · ${track.source}</small></span><span class="track-analysis"><b>${track.bpm||'—'}</b><small>BPM</small></span><span class="track-analysis"><b>${escapeHtml(track.key||'—')}</b><small>KEY</small></span></button>`).join('') : '<div class="library-empty">Knihovna je prázdná. Přidej audio soubory nebo synchronizuj Playlist Creator / Cue Point Editor.</div>';
    document.querySelectorAll('[data-analyzer-track]').forEach(btn=>btn.addEventListener('click',()=>{selectedUid=btn.dataset.analyzerTrack;render();renderSelected();}));
    if(!selectedUid && rows[0]) { selectedUid=rows[0].uid; renderSelected(); }
  }

  async function renderSelected() {
    const track=selectedUid?await window.DawoLibrary.get(selectedUid):null;
    $('#analysisTitle').textContent=track?.title||'Žádná skladba';
    $('#analysisArtist').textContent=track?.artist||'Vyber track ze společné knihovny';
    $('#analysisBpm').textContent=track?.bpm||'—';
    $('#analysisKey').textContent=track?.key||'—';
    $('#analysisEnergy').textContent=track?.energyScore!=null?`${track.energyScore}%`:'—';
    $('#analysisConfidence').textContent=track?.analysisConfidence!=null?`${track.analysisConfidence}%`:'—';
    const wave=$('#analysisWaveform');
    if(wave) wave.innerHTML=(track?.waveformData||[]).map(v=>`<i style="height:${Math.max(4,Number(v)||4)}%"></i>`).join('');
    const button=$('#analyzeSelectedButton'); if(button) button.disabled=!track?.fileBlob||busy;
  }

  async function analyzeSelected() {
    if(busy||!selectedUid)return;
    const track=await window.DawoLibrary.get(selectedUid);
    if(!track?.fileBlob){ alert('Tato skladba nemá uložený audio soubor.'); return; }
    busy=true; $('#analyzeSelectedButton').textContent='Analyzuji…'; $('#analyzeSelectedButton').disabled=true;
    try {
      const result=await analyzeBlob(track.fileBlob);
      await window.DawoLibrary.update(track.uid,result);
      window.DawoMixStudio?.setStatus?.(`Analyzováno: ${track.title} · ${result.bpm||'—'} BPM · ${result.key}`);
    } catch(error) {
      console.error(error); alert(`Analýza selhala: ${error.message}`);
    } finally {
      busy=false; $('#analyzeSelectedButton').textContent='Analyzovat vybranou'; await render(); await renderSelected();
    }
  }

  async function analyzeAll() {
    if(busy)return;
    const rows=(await window.DawoLibrary.all()).filter(t=>t.fileBlob);
    if(!rows.length){alert('Ve společné knihovně nejsou žádné analyzovatelné audio soubory.');return;}
    busy=true;
    try {
      for(let i=0;i<rows.length;i++){
        const track=rows[i]; selectedUid=track.uid; $('#analyzeAllButton').textContent=`${i+1}/${rows.length}`; await renderSelected();
        try { const result=await analyzeBlob(track.fileBlob); await window.DawoLibrary.update(track.uid,result); } catch(error){ console.warn('Analysis failed',track.title,error); }
      }
      window.DawoMixStudio?.setStatus?.(`Analyzer dokončil ${rows.length} skladeb`);
    } finally { busy=false; $('#analyzeAllButton').textContent='Analyzovat vše'; await render(); await renderSelected(); }
  }

  async function addFiles(event) {
    const files=[...(event.target.files||[])]; if(!files.length)return;
    const added=await window.DawoLibrary.addFiles(files); selectedUid=added[0]?.uid||selectedUid; event.target.value=''; await render(); await renderSelected();
  }

  async function syncSources(){
    const result=await window.DawoLibrary.syncAllSources();
    window.DawoMixStudio?.setStatus?.(`Knihovna synchronizována · Playlist ${result.playlist} · Cues ${result.cues}`);
    await render(); await renderSelected();
  }

  window.addEventListener('dawo-library-change',()=>{render();renderSelected();});
  window.addEventListener('DOMContentLoaded',()=>{
    $('#analyzerFiles')?.addEventListener('change',addFiles);
    $('#analyzeSelectedButton')?.addEventListener('click',analyzeSelected);
    $('#analyzeAllButton')?.addEventListener('click',analyzeAll);
    $('#syncLibraryButton')?.addEventListener('click',syncSources);
    syncSources().catch(console.warn);
  });

  window.DawoAnalyzer={render,analyzeSelected,analyzeAll,syncSources};
})();
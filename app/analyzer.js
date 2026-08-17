(() => {
  let audioContext = null;
  let selectedUid = null;
  let busy = false;

  const $ = s => document.querySelector(s);
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const MAJOR_PROFILE = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
  const MINOR_PROFILE = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
  const MAJOR_CAMELOT = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
  const MINOR_CAMELOT = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];

  function resample(input, sourceRate, targetRate=11025) {
    if (sourceRate === targetRate) return input;
    const ratio = sourceRate / targetRate;
    const out = new Float32Array(Math.max(1, Math.floor(input.length / ratio)));
    for (let i=0;i<out.length;i++) {
      const pos=i*ratio, left=Math.floor(pos), right=Math.min(input.length-1,left+1), frac=pos-left;
      out[i]=input[left]*(1-frac)+input[right]*frac;
    }
    return out;
  }

  function waveformFromSignal(signal,bars=220) {
    const size=Math.max(1,Math.floor(signal.length/bars));
    const data=[]; let max=0;
    for(let i=0;i<bars;i++){
      const start=i*size,end=Math.min(signal.length,start+size); let peak=0,sum=0,n=0;
      for(let j=start;j<end;j++){const v=Math.abs(signal[j]);peak=Math.max(peak,v);sum+=v;n++;}
      const value=peak*.72+(sum/Math.max(1,n))*.28; max=Math.max(max,value); data.push(value);
    }
    return data.map(v=>Math.round(Math.max(3,(v/Math.max(max,.0001))*100)));
  }

  function detectTempo(signal,sampleRate) {
    const targetRate=8000;
    const x=resample(signal,sampleRate,targetRate);
    const frame=1024,hop=256,envelope=[];
    let previous=0;
    for(let start=0;start+frame<x.length;start+=hop){
      let sum=0;
      for(let i=0;i<frame;i++){const v=x[start+i];sum+=v*v;}
      const rms=Math.sqrt(sum/frame);
      envelope.push(Math.max(0,rms-previous)); previous=rms;
    }
    if(envelope.length<20)return {bpm:null,confidence:0};
    const mean=envelope.reduce((a,b)=>a+b,0)/envelope.length;
    for(let i=0;i<envelope.length;i++)envelope[i]=Math.max(0,envelope[i]-mean*.55);
    let bestBpm=null,best=-Infinity,second=-Infinity;
    for(let bpm=60;bpm<=180;bpm++){
      const lag=Math.max(1,Math.round((60*targetRate)/(bpm*hop)));
      let score=0,n=0;
      for(let i=lag;i<envelope.length;i++){score+=envelope[i]*envelope[i-lag];n++;}
      score/=Math.max(1,n);
      if(score>best){second=best;best=score;bestBpm=bpm;}else if(score>second)second=score;
    }
    if(!Number.isFinite(best)||best<=0)return {bpm:null,confidence:0};
    const contrast=Math.max(0,(best-second)/best);
    return {bpm:bestBpm,confidence:Math.round(Math.min(100,35+contrast*260))};
  }

  function goertzelPower(signal,start,length,sampleRate,frequency){
    const w=2*Math.PI*frequency/sampleRate,coeff=2*Math.cos(w); let s0=0,s1=0,s2=0;
    for(let i=0;i<length;i++){const n=start+i;if(n>=signal.length)break;const window=.5-.5*Math.cos(2*Math.PI*i/Math.max(1,length-1));s0=signal[n]*window+coeff*s1-s2;s2=s1;s1=s0;}
    return Math.max(0,s1*s1+s2*s2-coeff*s1*s2);
  }

  function correlation(a,b){
    const am=a.reduce((x,y)=>x+y,0)/a.length,bm=b.reduce((x,y)=>x+y,0)/b.length;
    let num=0,da=0,db=0;
    for(let i=0;i<a.length;i++){const x=a[i]-am,y=b[i]-bm;num+=x*y;da+=x*x;db+=y*y;}
    return num/Math.sqrt(Math.max(1e-12,da*db));
  }

  function rotateProfile(profile,root){return Array.from({length:12},(_,i)=>profile[(i-root+12)%12]);}

  function detectKey(signal,sampleRate){
    const targetRate=11025,x=resample(signal,sampleRate,targetRate),frame=4096;
    const maxFrames=48,usable=Math.max(1,x.length-frame),step=Math.max(frame,Math.floor(usable/maxFrames));
    const chroma=new Array(12).fill(0); let frames=0;
    for(let start=0;start+frame<=x.length&&frames<maxFrames;start+=step,frames++){
      for(let pc=0;pc<12;pc++){
        let power=0;
        for(let octave=2;octave<=5;octave++){
          const midi=12*(octave+1)+pc; const freq=440*Math.pow(2,(midi-69)/12);
          if(freq<targetRate/2)power+=Math.log1p(goertzelPower(x,start,frame,targetRate,freq));
        }
        chroma[pc]+=power;
      }
    }
    const sum=chroma.reduce((a,b)=>a+b,0); if(!sum)return {key:'—',confidence:0};
    const norm=chroma.map(v=>v/sum); const candidates=[];
    for(let root=0;root<12;root++){
      candidates.push({score:correlation(norm,rotateProfile(MAJOR_PROFILE,root)),key:MAJOR_CAMELOT[root],name:`${NOTE_NAMES[root]} major`});
      candidates.push({score:correlation(norm,rotateProfile(MINOR_PROFILE,root)),key:MINOR_CAMELOT[root],name:`${NOTE_NAMES[root]} minor`});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const best=candidates[0],runner=candidates[1];
    const confidence=Math.round(Math.max(0,Math.min(100,45+(best.score-runner.score)*180+best.score*20)));
    return {key:best.key,keyName:best.name,confidence};
  }

  async function analyzeBlob(blob){
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    const buffer=await audioContext.decodeAudioData(await blob.arrayBuffer());
    const maxSeconds=180,length=Math.min(buffer.length,Math.round(buffer.sampleRate*maxSeconds));
    const start=Math.max(0,Math.floor((buffer.length-length)/2)); const mono=new Float32Array(length);
    for(let ch=0;ch<buffer.numberOfChannels;ch++){const channel=buffer.getChannelData(ch);for(let i=0;i<length;i++)mono[i]+=channel[start+i]/buffer.numberOfChannels;}
    const waveformData=waveformFromSignal(mono);
    let rms=0;for(const v of mono)rms+=v*v;rms=Math.sqrt(rms/Math.max(1,mono.length));
    const energyScore=Math.round(Math.max(0,Math.min(100,(20*Math.log10(Math.max(rms,1e-7))+60)*1.65)));
    const tempo=detectTempo(mono,buffer.sampleRate),key=detectKey(mono,buffer.sampleRate);
    const confidence=Math.round((tempo.confidence+key.confidence)/2);
    return {bpm:tempo.bpm,key:key.key,keyName:key.keyName,duration:buffer.duration,waveformData,energy:energyScore<35?'Low':energyScore<68?'Medium':'High',energyScore,danceability:tempo.confidence,analysisConfidence:confidence,analysisEngine:'Dawo Native Offline',analyzedAt:new Date().toISOString()};
  }

  function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function render(){
    const rows=await window.DawoLibrary.all(),list=$('#analyzerTrackList'),count=$('#sharedLibraryCount');if(count)count.textContent=rows.length;if(!list)return;
    list.innerHTML=rows.length?rows.map(track=>`<button class="library-track ${selectedUid===track.uid?'selected':''}" data-analyzer-track="${escapeHtml(track.uid)}"><span><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.artist)} · ${track.source}</small></span><span class="track-analysis"><b>${track.bpm||'—'}</b><small>BPM</small></span><span class="track-analysis"><b>${escapeHtml(track.key||'—')}</b><small>KEY</small></span></button>`).join(''):'<div class="library-empty">Knihovna je prázdná. Přidej audio soubory nebo synchronizuj Playlist Creator / Cue Point Editor.</div>';
    document.querySelectorAll('[data-analyzer-track]').forEach(btn=>btn.addEventListener('click',()=>{selectedUid=btn.dataset.analyzerTrack;render();renderSelected();}));if(!selectedUid&&rows[0]){selectedUid=rows[0].uid;renderSelected();}
  }

  async function renderSelected(){
    const track=selectedUid?await window.DawoLibrary.get(selectedUid):null;$('#analysisTitle').textContent=track?.title||'Žádná skladba';$('#analysisArtist').textContent=track?.artist||'Vyber track ze společné knihovny';$('#analysisBpm').textContent=track?.bpm||'—';$('#analysisKey').textContent=track?.key||'—';$('#analysisEnergy').textContent=track?.energyScore!=null?`${track.energyScore}%`:'—';$('#analysisConfidence').textContent=track?.analysisConfidence!=null?`${track.analysisConfidence}%`:'—';const wave=$('#analysisWaveform');if(wave)wave.innerHTML=(track?.waveformData||[]).map(v=>`<i style="height:${Math.max(4,Number(v)||4)}%"></i>`).join('');const button=$('#analyzeSelectedButton');if(button)button.disabled=!track?.fileBlob||busy;
  }

  async function analyzeSelected(){if(busy||!selectedUid)return;const track=await window.DawoLibrary.get(selectedUid);if(!track?.fileBlob){alert('Tato skladba nemá uložený audio soubor.');return;}busy=true;$('#analyzeSelectedButton').textContent='Analyzuji offline…';$('#analyzeSelectedButton').disabled=true;try{const result=await analyzeBlob(track.fileBlob);await window.DawoLibrary.update(track.uid,result);window.DawoMixStudio?.setStatus?.(`Offline analýza: ${track.title} · ${result.bpm||'—'} BPM · ${result.key}`);}catch(error){console.error(error);alert(`Analýza selhala: ${error.message}`);}finally{busy=false;$('#analyzeSelectedButton').textContent='Analyzovat vybranou';await render();await renderSelected();}}

  async function analyzeAll(){if(busy)return;const rows=(await window.DawoLibrary.all()).filter(t=>t.fileBlob);if(!rows.length){alert('Ve společné knihovně nejsou žádné analyzovatelné audio soubory.');return;}busy=true;try{for(let i=0;i<rows.length;i++){const track=rows[i];selectedUid=track.uid;$('#analyzeAllButton').textContent=`${i+1}/${rows.length}`;await renderSelected();try{const result=await analyzeBlob(track.fileBlob);await window.DawoLibrary.update(track.uid,result);}catch(error){console.warn('Analysis failed',track.title,error);}}window.DawoMixStudio?.setStatus?.(`Offline Analyzer dokončil ${rows.length} skladeb`);}finally{busy=false;$('#analyzeAllButton').textContent='Analyzovat vše';await render();await renderSelected();}}

  async function addFiles(event){const files=[...(event.target.files||[])];if(!files.length)return;const added=await window.DawoLibrary.addFiles(files);selectedUid=added[0]?.uid||selectedUid;event.target.value='';await render();await renderSelected();}
  async function syncSources(){const result=await window.DawoLibrary.syncAllSources();window.DawoMixStudio?.setStatus?.(`Knihovna synchronizována · Playlist ${result.playlist} · Cues ${result.cues}`);await render();await renderSelected();}

  window.addEventListener('dawo-library-change',()=>{render();renderSelected();});
  window.addEventListener('DOMContentLoaded',()=>{$('#analyzerFiles')?.addEventListener('change',addFiles);$('#analyzeSelectedButton')?.addEventListener('click',analyzeSelected);$('#analyzeAllButton')?.addEventListener('click',analyzeAll);$('#syncLibraryButton')?.addEventListener('click',syncSources);syncSources().catch(console.warn);});
  window.DawoAnalyzer={render,analyzeSelected,analyzeAll,syncSources,analyzeBlob};
})();
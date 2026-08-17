(() => {
  const CUE_LABELS = ['INTRO','BUILD','VOCAL','DROP 1','BREAK','DROP 2','MIX OUT','OUTRO'];

  function xml(value='') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  }
  const norm = value => String(value || '').trim().toLowerCase().replace(/\\/g,'/');
  function pad2(value) { return String(value).padStart(2,'0'); }
  function modifiedDate() { const d=new Date(); return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`; }
  function modifiedTime() { const d=new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }

  function parseWindowsFolder(folder='') {
    const normalized = String(folder).trim().replace(/\//g,'\\').replace(/\\+$/,'');
    const driveMatch = normalized.match(/^([A-Za-z]:)(?:\\(.*))?$/);
    if (!driveMatch) return { volume:'', dir:'/:Skladby/:' };
    const volume = driveMatch[1];
    const parts = (driveMatch[2] || '').split('\\').filter(Boolean);
    const dir = parts.length ? '/:' + parts.map(part => xml(part)).join('/:') + '/:' : '/:';
    return { volume, dir };
  }

  function trackFilename(track,index=0) {
    const original = track.fileName || track.fileBlob?.name || '';
    if (original) return original;
    const safe = `${track.artist || 'Unknown'} - ${track.title || `Track ${index+1}`}`.replace(/[<>:"/\\|?*]+/g,'_');
    return `${safe}.mp3`;
  }

  function trackLocation(track,index,options={}) {
    const filename=trackFilename(track,index);
    const relative=track.relativePath || track.webkitRelativePath || track.sourceRecord?.relativePath || '';
    const base=parseWindowsFolder(options.musicFolder || '');
    if(relative && relative.includes('/')){
      const relParts=relative.replace(/\\/g,'/').split('/').filter(Boolean); relParts.pop();
      const relDir=relParts.length ? relParts.map(part=>xml(part)).join('/:') + '/:' : '';
      return {volume:base.volume,dir:base.dir+relDir,file:filename};
    }
    return {volume:base.volume,dir:base.dir,file:filename};
  }

  function normalizeCues(track) {
    const source=Array.isArray(track.cues)&&track.cues.length ? track.cues : (track.autoCues||[]).map(c=>c?.time);
    return Array.from({length:8},(_,index)=>{
      const raw=source?.[index], time=typeof raw==='object'?raw?.time:raw, value=Number(time);
      return Number.isFinite(value)&&value>=0?value:null;
    });
  }

  function appendAnalysisNodes(doc,entry,track) {
    let info=entry.querySelector(':scope > INFO');
    if(!info){info=doc.createElement('INFO');entry.appendChild(info)}
    if(track.key && track.key!=='—') info.setAttribute('KEY',track.key);
    if(track.genre) info.setAttribute('GENRE',track.genre);
    if(Number(track.duration)>=0){info.setAttribute('PLAYTIME',String(Math.round(Number(track.duration)||0)));info.setAttribute('PLAYTIME_FLOAT',(Number(track.duration)||0).toFixed(6))}

    let tempo=entry.querySelector(':scope > TEMPO');
    if(!tempo){tempo=doc.createElement('TEMPO');entry.appendChild(tempo)}
    if(Number(track.bpm)>0){tempo.setAttribute('BPM',Number(track.bpm).toFixed(6));tempo.setAttribute('BPM_QUALITY','100.000000')}

    [...entry.querySelectorAll(':scope > CUE_V2')].forEach(cue=>{
      const slot=Number(cue.getAttribute('HOTCUE'));
      const type=Number(cue.getAttribute('TYPE'));
      if((Number.isInteger(slot)&&slot>=0&&slot<=7)||type===4) cue.remove();
    });

    const gridStart=Number(track.downbeat ?? track.firstBeat);
    if(Number.isFinite(gridStart)&&gridStart>=0&&Number(track.bpm)>0){
      const cue=doc.createElement('CUE_V2');
      [['NAME','GRID'],['DISPL_ORDER','0'],['TYPE','4'],['START',(gridStart*1000).toFixed(6)],['LEN','0.000000'],['REPEATS','-1'],['HOTCUE','-1']].forEach(([k,v])=>cue.setAttribute(k,v));
      entry.appendChild(cue);
    }
    normalizeCues(track).forEach((time,slot)=>{
      if(time==null)return;
      const cue=doc.createElement('CUE_V2');
      const label=track.autoCues?.[slot]?.label || CUE_LABELS[slot];
      [['NAME',label],['DISPL_ORDER',String(slot)],['TYPE','0'],['START',(time*1000).toFixed(6)],['LEN','0.000000'],['REPEATS','-1'],['HOTCUE',String(slot)]].forEach(([k,v])=>cue.setAttribute(k,v));
      entry.appendChild(cue);
    });
    entry.setAttribute('MODIFIED_DATE',modifiedDate());
    entry.setAttribute('MODIFIED_TIME',modifiedTime());
    if(track.title) entry.setAttribute('TITLE',track.title);
    if(track.artist) entry.setAttribute('ARTIST',track.artist);
    let album=entry.querySelector(':scope > ALBUM');
    if(track.album){if(!album){album=doc.createElement('ALBUM');entry.appendChild(album)}album.setAttribute('TITLE',track.album)}
  }

  function createEntry(track,index,options={}) {
    const location=trackLocation(track,index,options),cues=normalizeCues(track),bpm=Number(track.bpm)||0,duration=Number(track.duration)||0,key=track.key&&track.key!=='—'?track.key:'',album=track.album||'',genre=track.genre||'',gridStart=Number(track.downbeat??track.firstBeat);
    const gridCue=Number.isFinite(gridStart)&&gridStart>=0&&bpm>0?`<CUE_V2 NAME="GRID" DISPL_ORDER="0" TYPE="4" START="${(gridStart*1000).toFixed(6)}" LEN="0.000000" REPEATS="-1" HOTCUE="-1"/>`:'';
    const hotCues=cues.map((time,slot)=>time==null?'':`<CUE_V2 NAME="${xml(track.autoCues?.[slot]?.label||CUE_LABELS[slot])}" DISPL_ORDER="${slot}" TYPE="0" START="${(time*1000).toFixed(6)}" LEN="0.000000" REPEATS="-1" HOTCUE="${slot}"/>`).join('');
    return `<ENTRY MODIFIED_DATE="${modifiedDate()}" MODIFIED_TIME="${modifiedTime()}" TITLE="${xml(track.title||track.fileName||'Bez názvu')}" ARTIST="${xml(track.artist||'')}"><LOCATION DIR="${location.dir}" FILE="${xml(location.file)}" VOLUME="${xml(location.volume)}" VOLUMEID=""/><ALBUM TITLE="${xml(album)}"/><INFO KEY="${xml(key)}" GENRE="${xml(genre)}" PLAYTIME="${Math.round(duration)}" PLAYTIME_FLOAT="${duration.toFixed(6)}"/><TEMPO BPM="${bpm.toFixed(6)}" BPM_QUALITY="100.000000"/>${gridCue}${hotCues}</ENTRY>`;
  }

  function createCollection(tracks,options={}) {
    const rows=(tracks||[]).filter(Boolean), entries=rows.map((track,index)=>createEntry(track,index,options)).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<NML VERSION="20"><HEAD COMPANY="DawoMixStudio" PROGRAM="DawoMixStudio for Traktor Pro 4"/><COLLECTION ENTRIES="${rows.length}">${entries}</COLLECTION></NML>`;
  }

  function parseCollection(text){
    const doc=new DOMParser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')||doc.documentElement?.tagName!=='NML') throw new Error('Soubor není platná Traktor NML kolekce.');
    const collection=doc.querySelector('NML > COLLECTION');
    if(!collection) throw new Error('NML neobsahuje COLLECTION.');
    return doc;
  }

  function entryIdentity(entry){
    const loc=entry.querySelector(':scope > LOCATION');
    return {
      file:norm(loc?.getAttribute('FILE')),
      volume:norm(loc?.getAttribute('VOLUME')),
      dir:norm(loc?.getAttribute('DIR')),
      title:norm(entry.getAttribute('TITLE')),
      artist:norm(entry.getAttribute('ARTIST'))
    };
  }

  function findEntry(collection,track,index,options={}){
    const loc=trackLocation(track,index,options), file=norm(loc.file), title=norm(track.title), artist=norm(track.artist), entries=[...collection.querySelectorAll(':scope > ENTRY')];
    let hit=entries.find(entry=>entryIdentity(entry).file===file);
    if(hit)return hit;
    hit=entries.find(entry=>{const id=entryIdentity(entry);return title&&id.title===title&&(!artist||id.artist===artist)});
    return hit||null;
  }

  function mergeCollection(sourceText,tracks,options={}){
    const doc=parseCollection(sourceText),collection=doc.querySelector('NML > COLLECTION'),selected=(tracks||[]).filter(Boolean);
    let matched=0,added=0,unmatched=0;
    selected.forEach((track,index)=>{
      let entry=findEntry(collection,track,index,options);
      if(!entry){
        if(options.addMissing){
          const temp=parseCollection(createCollection([track],options));
          entry=doc.importNode(temp.querySelector('ENTRY'),true);collection.appendChild(entry);added++;
        } else {unmatched++;return}
      } else matched++;
      appendAnalysisNodes(doc,entry,track);
    });
    collection.setAttribute('ENTRIES',String(collection.querySelectorAll(':scope > ENTRY').length));
    const out=new XMLSerializer().serializeToString(doc);
    return {nml:`<?xml version="1.0" encoding="UTF-8"?>\n${out.replace(/^<\?xml[^>]*>\s*/,'')}`,matched,added,unmatched,total:selected.length};
  }

  function validate(text){try{parseCollection(text);return true}catch(_){return false}}
  function saveBlob(text,filename){const blob=new Blob([text],{type:'application/xml;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function download(tracks,options={}){if(!tracks?.length)throw new Error('Ve společné knihovně nejsou žádné skladby k exportu.');const nml=createCollection(tracks,options);if(!validate(nml))throw new Error('Vygenerované NML není validní XML.');saveBlob(nml,options.filename||`DawoMixStudio-Traktor-${new Date().toISOString().slice(0,10)}.nml`);return{nml,count:tracks.length}}
  function downloadMerged(sourceText,tracks,options={}){
    const result=mergeCollection(sourceText,tracks,options);if(!validate(result.nml))throw new Error('Sloučené NML není validní XML.');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    if(options.downloadBackup!==false)saveBlob(sourceText,options.backupFilename||`collection-backup-${stamp}.nml`);
    saveBlob(result.nml,options.filename||`collection-DawoMix-${stamp}.nml`);return result;
  }

  window.DawoTraktorNml={createCollection,createEntry,parseCollection,mergeCollection,validate,download,downloadMerged,parseWindowsFolder,normalizeCues,trackFilename};
})();
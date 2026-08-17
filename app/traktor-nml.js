(() => {
  const CUE_LABELS = ['INTRO','BUILD','VOCAL','DROP 1','BREAK','DROP 2','MIX OUT','OUTRO'];

  function xml(value='') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  }

  function pad2(value) { return String(value).padStart(2,'0'); }
  function modifiedDate() {
    const d = new Date();
    return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
  }
  function modifiedTime() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  function parseWindowsFolder(folder='') {
    const normalized = String(folder).trim().replace(/\//g,'\\').replace(/\\+$/,'');
    const driveMatch = normalized.match(/^([A-Za-z]:)(?:\\(.*))?$/);
    if (!driveMatch) return { volume:'', dir:'/:Skladby/:' };
    const volume = driveMatch[1];
    const parts = (driveMatch[2] || '').split('\\').filter(Boolean);
    const dir = parts.length ? '/:' + parts.map(part => xml(part)).join('/:') + '/:' : '/:';
    return { volume, dir };
  }

  function trackFilename(track, index=0) {
    const original = track.fileName || track.fileBlob?.name || '';
    if (original) return original;
    const safe = `${track.artist || 'Unknown'} - ${track.title || `Track ${index+1}`}`.replace(/[<>:"/\\|?*]+/g,'_');
    return `${safe}.mp3`;
  }

  function trackLocation(track, index, options={}) {
    const filename = trackFilename(track,index);
    const relative = track.relativePath || track.webkitRelativePath || track.sourceRecord?.relativePath || '';
    if (relative && relative.includes('/')) {
      const base = parseWindowsFolder(options.musicFolder || '');
      const relParts = relative.replace(/\\/g,'/').split('/').filter(Boolean);
      relParts.pop();
      const relDir = relParts.length ? relParts.map(part=>xml(part)).join('/:') + '/:' : '';
      return { volume:base.volume, dir:base.dir + relDir, file:filename };
    }
    const base = parseWindowsFolder(options.musicFolder || '');
    return { volume:base.volume, dir:base.dir, file:filename };
  }

  function normalizeCues(track) {
    const source = Array.isArray(track.cues) && track.cues.length ? track.cues : (track.autoCues || []).map(c => c?.time);
    return Array.from({length:8}, (_, index) => {
      const raw = source?.[index];
      const time = typeof raw === 'object' ? raw?.time : raw;
      const value = Number(time);
      return Number.isFinite(value) && value >= 0 ? value : null;
    });
  }

  function createEntry(track, index, options={}) {
    const location = trackLocation(track,index,options);
    const cues = normalizeCues(track);
    const bpm = Number(track.bpm) || 0;
    const duration = Number(track.duration) || 0;
    const key = track.key && track.key !== '—' ? track.key : '';
    const album = track.album || '';
    const genre = track.genre || '';
    const gridStart = Number(track.downbeat ?? track.firstBeat);
    const gridCue = Number.isFinite(gridStart) && gridStart >= 0 && bpm > 0
      ? `<CUE_V2 NAME="GRID" DISPL_ORDER="0" TYPE="4" START="${(gridStart*1000).toFixed(6)}" LEN="0.000000" REPEATS="-1" HOTCUE="-1"/>`
      : '';
    const hotCues = cues.map((time, slot) => time == null ? '' : `<CUE_V2 NAME="${xml(track.autoCues?.[slot]?.label || CUE_LABELS[slot])}" DISPL_ORDER="${slot}" TYPE="0" START="${(time*1000).toFixed(6)}" LEN="0.000000" REPEATS="-1" HOTCUE="${slot}"/>`).join('');

    return `<ENTRY MODIFIED_DATE="${modifiedDate()}" MODIFIED_TIME="${modifiedTime()}" TITLE="${xml(track.title || track.fileName || 'Bez názvu')}" ARTIST="${xml(track.artist || '')}">` +
      `<LOCATION DIR="${location.dir}" FILE="${xml(location.file)}" VOLUME="${xml(location.volume)}" VOLUMEID=""/>` +
      `<ALBUM TITLE="${xml(album)}"/>` +
      `<INFO KEY="${xml(key)}" GENRE="${xml(genre)}" PLAYTIME="${Math.round(duration)}" PLAYTIME_FLOAT="${duration.toFixed(6)}"/>` +
      `<TEMPO BPM="${bpm.toFixed(6)}" BPM_QUALITY="100.000000"/>` +
      gridCue + hotCues + `</ENTRY>`;
  }

  function createCollection(tracks, options={}) {
    const rows = (tracks || []).filter(Boolean);
    const entries = rows.map((track,index)=>createEntry(track,index,options)).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<NML VERSION="20"><HEAD COMPANY="DawoMixStudio" PROGRAM="DawoMixStudio for Traktor Pro 4"/><COLLECTION ENTRIES="${rows.length}">${entries}</COLLECTION></NML>`;
  }

  function validate(text) {
    try {
      const doc = new DOMParser().parseFromString(text,'application/xml');
      if (doc.querySelector('parsererror')) return false;
      return doc.documentElement?.tagName === 'NML' && doc.documentElement?.getAttribute('VERSION') === '20';
    } catch (_) { return false; }
  }

  function download(tracks, options={}) {
    if (!tracks?.length) throw new Error('Ve společné knihovně nejsou žádné skladby k exportu.');
    const nml = createCollection(tracks,options);
    if (!validate(nml)) throw new Error('Vygenerované NML není validní XML.');
    const blob = new Blob([nml], { type:'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = options.filename || `DawoMixStudio-Traktor-${new Date().toISOString().slice(0,10)}.nml`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    return { nml, count:tracks.length };
  }

  window.DawoTraktorNml = { createCollection, createEntry, validate, download, parseWindowsFolder, normalizeCues };
})();
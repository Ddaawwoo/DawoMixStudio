(() => {
  const LABELS = ['INTRO','BUILD','VOCAL','DROP 1','BREAK','DROP 2','MIX OUT','OUTRO'];

  function parentLibrary() {
    try { return window.parent && window.parent !== window ? window.parent.DawoLibrary : null; }
    catch (_) { return null; }
  }

  function setParentStatus(text) {
    try { window.parent?.DawoMixStudio?.setStatus?.(text); } catch (_) {}
  }

  async function syncTrackToShared(track) {
    if (!track?.sharedUid) return false;
    const library = parentLibrary();
    if (!library?.update) return false;

    const cues = Array.from({ length: 8 }, (_, index) => {
      const value = track.cues?.[index];
      return Number.isFinite(Number(value)) ? Number(value) : null;
    });
    const autoCues = cues.map((time, index) => ({
      index,
      label: LABELS[index],
      time,
      source: 'manual',
      locked: time != null
    }));

    await library.update(track.sharedUid, {
      cues,
      autoCues,
      cueSource: 'manual',
      cuesEditedAt: new Date().toISOString(),
      cueReady: cues.every(value => value != null),
      firstBeat: track.firstBeat ?? null,
      downbeat: track.downbeat ?? null,
      beatInterval: track.beatInterval ?? null,
      beatsPerBar: track.beatsPerBar || 4,
      beatgrid: Array.isArray(track.beatgrid) ? track.beatgrid : [],
      bpm: Number(track.bpm) || null,
      key: track.key || '—',
      waveformData: track.wave || null
    });

    setParentStatus(`${track.title}: ruční cue pointy synchronizovány do společné knihovny`);
    return true;
  }

  const originalSaveTrack = window.saveTrack;
  if (typeof originalSaveTrack === 'function') {
    window.saveTrack = async function syncedSaveTrack(track) {
      const result = await originalSaveTrack(track);
      try { await syncTrackToShared(track); }
      catch (error) {
        console.error('CueFlow → Shared Library sync failed', error);
        setParentStatus(`${track?.title || 'Track'}: cue pointy uloženy, synchronizace selhala`);
      }
      return result;
    };
  } else {
    console.warn('CueFlow shared sync: saveTrack nebyl nalezen.');
  }

  window.CueflowSharedSync = { syncTrackToShared };
})();
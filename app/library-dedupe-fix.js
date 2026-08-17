(() => {
  const $ = s => document.querySelector(s);
  const clean = value => String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\b(copy|kopie|duplicate|dup)\b/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/\s*-\s*copy\s*$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const blobSize = t => Number(t?.fileBlob?.size || t?.sourceRecord?.fileBlob?.size || 0);
  const duration = t => Number(t?.duration || 0);
  const cueCount = t => Array.isArray(t?.cues) ? t.cues.filter(v => v != null).length : 0;

  function quality(t) {
    let n = 0;
    if (t.fileBlob) n += 120;
    n += cueCount(t) * 8;
    if (t.bpm) n += 20;
    if (t.key && t.key !== '—') n += 16;
    if (Array.isArray(t.waveformData) && t.waveformData.length) n += 20;
    if (Array.isArray(t.beatgrid) && t.beatgrid.length) n += 20;
    if (t.analysisConfidence) n += Math.min(15, Number(t.analysisConfidence) / 7);
    if (t.artist && t.artist !== 'Neznámý interpret') n += 8;
    if (t.album) n += 4;
    if (t.genre) n += 3;
    return n;
  }

  function pairLooksDuplicate(a, b) {
    if (!a || !b || a.uid === b.uid) return false;
    const af = clean(a.fileName), bf = clean(b.fileName);
    if (af && bf && af === bf) return true;

    const at = clean(a.title), bt = clean(b.title);
    const aa = clean(a.artist === 'Neznámý interpret' ? '' : a.artist);
    const ba = clean(b.artist === 'Neznámý interpret' ? '' : b.artist);
    if (at && bt && at === bt && aa && ba && aa === ba) {
      const ad = duration(a), bd = duration(b);
      if (!ad || !bd || Math.abs(ad - bd) <= 1.5) return true;
    }

    const as = blobSize(a), bs = blobSize(b);
    return !!(as && bs && as === bs && at && bt && at === bt);
  }

  function findGroups(rows) {
    const parent = new Map(rows.map(t => [t.uid, t.uid]));
    const find = x => {
      let p = parent.get(x);
      while (p !== parent.get(p)) p = parent.get(p);
      let y = x;
      while (parent.get(y) !== p) { const next = parent.get(y); parent.set(y, p); y = next; }
      return p;
    };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) if (pairLooksDuplicate(rows[i], rows[j])) union(rows[i].uid, rows[j].uid);

    const buckets = new Map();
    for (const t of rows) {
      const root = find(t.uid);
      if (!buckets.has(root)) buckets.set(root, []);
      buckets.get(root).push(t);
    }
    return [...buckets.values()].filter(items => items.length > 1).map(items => {
      items.sort((a, b) => quality(b) - quality(a));
      return { keeper: items[0], duplicates: items.slice(1), items };
    });
  }

  const bestArray = (items, field) => items.map(t => t[field]).filter(v => Array.isArray(v) && v.length).sort((a, b) => b.length - a.length)[0] || [];
  const bestText = (items, field, fallback = '') => items.map(t => t[field]).find(v => v && v !== 'Neznámý interpret' && v !== '—') || fallback;
  const bestNumber = (items, field) => items.map(t => Number(t[field])).find(v => Number.isFinite(v) && v !== 0) ?? null;

  function mergedPatch(group) {
    const items = group.items;
    const blobTrack = items.find(t => t.fileBlob) || group.keeper;
    return {
      title: bestText(items, 'title', group.keeper.title), artist: bestText(items, 'artist', group.keeper.artist),
      album: bestText(items, 'album', group.keeper.album), genre: bestText(items, 'genre', group.keeper.genre),
      fileName: bestText(items, 'fileName', group.keeper.fileName), fileBlob: blobTrack.fileBlob || null,
      duration: bestNumber(items, 'duration') || 0, bpm: bestNumber(items, 'bpm'),
      key: bestText(items, 'key', group.keeper.key || '—'), keyName: bestText(items, 'keyName', group.keeper.keyName || ''),
      energy: bestText(items, 'energy', group.keeper.energy || ''), energyScore: bestNumber(items, 'energyScore'),
      analysisConfidence: bestNumber(items, 'analysisConfidence'), analysisEngine: bestText(items, 'analysisEngine', group.keeper.analysisEngine || ''),
      waveformData: bestArray(items, 'waveformData'), beatgrid: bestArray(items, 'beatgrid'), cues: bestArray(items, 'cues'), autoCues: bestArray(items, 'autoCues'),
      firstBeat: bestNumber(items, 'firstBeat'), downbeat: bestNumber(items, 'downbeat'), beatInterval: bestNumber(items, 'beatInterval'), beatsPerBar: bestNumber(items, 'beatsPerBar') || 4
    };
  }

  async function rewritePlaylists(replacements) {
    if (!replacements.size) return;
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('DawoMixPlaylistStudioDB', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('playlists')) r.result.createObjectStore('playlists', { keyPath: 'id' }); };
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const playlists = await new Promise((resolve, reject) => {
      const r = db.transaction('playlists').objectStore('playlists').getAll();
      r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error);
    });
    for (const p of playlists) {
      const old = Array.isArray(p.trackUids) ? p.trackUids : [];
      const next = [...new Set(old.map(uid => replacements.get(uid) || uid))];
      if (JSON.stringify(old) !== JSON.stringify(next)) await new Promise((resolve, reject) => {
        const r = db.transaction('playlists', 'readwrite').objectStore('playlists').put({ ...p, trackUids: next, updatedAt: new Date().toISOString() });
        r.onsuccess = resolve; r.onerror = () => reject(r.error);
      });
    }
    db.close();
  }

  async function findAndDelete() {
    const button = $('#libraryModuleDedupe');
    if (!window.DawoLibrary || !button) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Hledám duplicity…';
    try {
      const rows = await window.DawoLibrary.all();
      const groups = findGroups(rows);
      const count = groups.reduce((n, g) => n + g.duplicates.length, 0);
      const summary = $('#libraryDuplicateSummary');
      if (!count) {
        if (summary) { summary.hidden = true; summary.textContent = ''; }
        window.DawoMixStudio?.setStatus?.('Library: duplicity nenalezeny');
        alert('Žádné duplicity nebyly nalezeny.');
        return;
      }

      if (summary) {
        summary.hidden = false;
        summary.textContent = `Nalezeno ${groups.length} skupin · ${count} duplicitních záznamů. Po potvrzení zůstane vždy nejlepší verze skladby.`;
      }
      if (!confirm(`Nalezeno ${count} duplicitních záznamů. Smazat je teď? V každé skupině zůstane jedna nejlepší verze.`)) return;

      button.textContent = `Mažu ${count} duplicit…`;
      const replacements = new Map();
      const removed = [];
      for (const group of groups) {
        await window.DawoLibrary.update(group.keeper.uid, mergedPatch(group));
        for (const dup of group.duplicates) {
          replacements.set(dup.uid, group.keeper.uid);
          removed.push(dup.uid);
          await window.DawoLibrary.remove(dup.uid, { suppress: true });
        }
      }
      await rewritePlaylists(replacements);

      const after = await window.DawoLibrary.all();
      const live = new Set(after.map(t => t.uid));
      const failed = removed.filter(uid => live.has(uid));
      if (failed.length) throw new Error(`${failed.length} duplicit zůstalo v knihovně.`);

      if (summary) {
        summary.hidden = false;
        summary.textContent = `Hotovo · odstraněno ${removed.length} duplicit · v knihovně zůstává ${after.length} tracků.`;
      }
      await window.DawoLibraryModule?.render?.();
      window.DawoAnalyzer?.render?.();
      window.DawoMixStudio?.setStatus?.(`Library: odstraněno ${removed.length} duplicit`);
    } catch (error) {
      console.error('Dawo duplicate cleanup failed', error);
      alert(`Mazání duplicit selhalo: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function analyzeAllFromLibrary() {
    const button = $('#libraryModuleAnalyzeAll');
    const analyzerButton = $('#analyzeAllButton');
    if (!analyzerButton) return alert('Analyzer ještě není připravený.');
    if (button) button.textContent = 'Analyzuji…';
    analyzerButton.click();
    window.DawoMixStudio?.setStatus?.('Library: spuštěna analýza všech skladeb');
    const timer = setInterval(() => {
      const text = analyzerButton.textContent || '';
      if (/^Analyzovat vše$/i.test(text)) {
        clearInterval(timer);
        if (button) button.textContent = '⌁ Analyzovat vše';
        window.DawoLibraryModule?.render?.();
      } else if (button) button.textContent = `⌁ ${text}`;
    }, 500);
  }

  function install() {
    const dedupe = $('#libraryModuleDedupe');
    const analyzeAll = $('#libraryModuleAnalyzeAll');
    if (!dedupe || !analyzeAll || !window.DawoLibrary) return setTimeout(install, 250);
    dedupe.addEventListener('click', findAndDelete);
    analyzeAll.addEventListener('click', analyzeAllFromLibrary);
    window.DawoLibraryDedupe = { findAndDelete, findGroups };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();

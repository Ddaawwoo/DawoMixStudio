(() => {
  const DB_NAME = 'DawoMixSharedLibrary';
  const DB_VERSION = 1;
  const STORE = 'tracks';
  let dbPromise;

  const openDb = () => dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'uid' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const txStore = async (mode='readonly') => (await openDb()).transaction(STORE, mode).objectStore(STORE);
  const safeText = (value, fallback='') => value == null ? fallback : String(value);

  function makeUid(source, raw) {
    const identity = raw.sourceKey ?? raw.id ?? raw.fileName ?? raw.name ?? `${raw.title || 'track'}:${raw.artist || ''}:${raw.duration || ''}`;
    return `${source}:${identity}`;
  }

  function normalize(raw, source) {
    const uid = raw.uid || makeUid(source, raw);
    return {
      uid,
      source,
      sourceId: raw.id ?? raw.sourceKey ?? null,
      title: safeText(raw.title || raw.name || raw.fileName, 'Bez názvu'),
      artist: safeText(raw.artist, 'Neznámý interpret'),
      album: safeText(raw.album),
      genre: safeText(raw.genre),
      bpm: Number(raw.bpm) || null,
      key: safeText(raw.key, '—'),
      duration: Number(raw.duration) || 0,
      energy: raw.energy || null,
      energyScore: Number(raw.energyScore) || null,
      danceability: Number(raw.danceability) || null,
      analysisConfidence: Number(raw.analysisConfidence) || null,
      waveformData: raw.waveformData || raw.wave || null,
      cues: Array.isArray(raw.cues) ? raw.cues : [],
      fileBlob: raw.fileBlob || null,
      fileName: safeText(raw.fileName || raw.name),
      playlistId: raw.playlistId ?? null,
      playlistName: safeText(raw.playlistName),
      analyzedAt: raw.analyzedAt || null,
      updatedAt: Date.now(),
      sourceRecord: raw
    };
  }

  async function put(track) {
    const store = await txStore('readwrite');
    await request(store.put(track));
    window.dispatchEvent(new CustomEvent('dawo-library-change', { detail: track }));
    return track;
  }

  async function addFiles(files) {
    const added = [];
    for (const file of files) {
      const raw = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: file.name.replace(/\.[^.]+$/, ''), fileName: file.name, fileBlob: file, duration: 0 };
      const track = normalize(raw, 'library');
      await put(track);
      added.push(track);
    }
    return added;
  }

  async function all() {
    const store = await txStore();
    const rows = await request(store.getAll());
    return rows.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function get(uid) {
    const store = await txStore();
    return request(store.get(uid));
  }

  async function update(uid, patch) {
    const current = await get(uid);
    if (!current) throw new Error('Skladba ve společné knihovně nebyla nalezena.');
    const next = { ...current, ...patch, updatedAt: Date.now() };
    next.sourceRecord = { ...(current.sourceRecord || {}), ...patch };
    await put(next);
    await propagate(next).catch(console.warn);
    return next;
  }

  async function remove(uid) {
    const store = await txStore('readwrite');
    await request(store.delete(uid));
    window.dispatchEvent(new CustomEvent('dawo-library-change'));
  }

  async function readStore(dbName, storeName) {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      if (!dbs.some(db => db.name === dbName)) return [];
    }
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve([]); return; }
        const getReq = db.transaction(storeName).objectStore(storeName).getAll();
        getReq.onsuccess = () => { const rows = getReq.result || []; db.close(); resolve(rows); };
        getReq.onerror = () => { db.close(); resolve([]); };
      };
    });
  }

  async function syncSource(dbName, storeName, source) {
    const rows = await readStore(dbName, storeName);
    for (const row of rows) {
      const incoming = normalize(row, source);
      const existing = await get(incoming.uid);
      await put({ ...incoming, ...(existing || {}), ...incoming, sourceRecord: row, updatedAt: Date.now() });
    }
    return rows.length;
  }

  async function syncAllSources() {
    const [playlist, cues] = await Promise.all([
      syncSource('DawomixProDB', 'tracks', 'dawomix'),
      syncSource('DawoMixStudioCueflowDB', 'tracks', 'cueflow')
    ]);
    return { playlist, cues, total: (await all()).length };
  }

  async function writeBack(dbName, storeName, record) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve(false); return; }
        const putReq = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record);
        putReq.onsuccess = () => { db.close(); resolve(true); };
        putReq.onerror = () => { db.close(); reject(putReq.error); };
      };
    });
  }

  async function propagate(track) {
    const record = { ...(track.sourceRecord || {}), title: track.title, artist: track.artist, album: track.album, genre: track.genre, bpm: track.bpm, key: track.key, duration: track.duration, energy: track.energy, energyScore: track.energyScore, danceability: track.danceability, analysisConfidence: track.analysisConfidence, waveformData: track.waveformData, analyzedAt: track.analyzedAt };
    if (track.source === 'dawomix') await writeBack('DawomixProDB', 'tracks', record);
    if (track.source === 'cueflow') {
      record.wave = track.waveformData || record.wave;
      await writeBack('DawoMixStudioCueflowDB', 'tracks', record);
    }
  }

  async function clear() {
    const store = await txStore('readwrite');
    await request(store.clear());
    window.dispatchEvent(new CustomEvent('dawo-library-change'));
  }

  window.DawoLibrary = { all, get, put, update, remove, addFiles, syncAllSources, clear, normalize };
})();
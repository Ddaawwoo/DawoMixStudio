# Přenos playlistu Dawomix → CUEFLOW

Dawomix ukládá data v IndexedDB databázi `DawomixProDB` verze 1.

- `playlists`: `{ id, name, trackIds, image? }`
- `tracks`: `{ id, title, artist, bpm, key, energy, duration, waveformData, fileName?, fileBlob? }`

Pořadí playlistu určuje pole `trackIds`. Integrační most sestaví seřazený
seznam odpovídajících skladeb a předá jej přímo do CUEFLOW. `Blob` se
nekóduje do Base64, takže nedochází ke zvětšení ani ztrátě audio dat.

CUEFLOW převádí každou skladbu na:

`{ sourceKey, playlistId, playlistName, id, title, artist, bpm, key, duration,
ready, color, cover, cues[8], wave, fileBlob, fileName, url }`

Importované položky se ukládají do IndexedDB databáze
`DawoMixStudioCueflowDB`. Stabilní `sourceKey` má tvar
`<playlistId>:<trackId>`, takže opakovaný přenos aktualizuje existující
playlist. Pole `cues` se při aktualizaci zachová.

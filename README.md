# Dawo Mix Studio

Windows aplikace spojující **Dawomix** a **CUEFLOW**.

## Funkce

- přenos playlistů z Dawomix do CUEFLOW jedním tlačítkem,
- zachování pořadí, audia, metadat a waveformu,
- tvorba a ukládání osmi hot-cue bodů,
- výběr více skladeb v CUEFLOW,
- export vybraných skladeb do Traktor DJ (`.nml`),
- stažení audia a Traktor playlistu v jednom ZIPu,
- odeslání vybraných skladeb zpět do Dawomix.

## Spuštění ve Windows

1. Nainstalujte [Node.js](https://nodejs.org/).
2. Spusťte `Start-DawoMixStudio.cmd`.
3. Aplikace se otevře v Microsoft Edge.

Lokálně běží na `http://127.0.0.1:3217/`.

## Přenos do CUEFLOW

V Dawomix otevřete playlist, rozbalte nabídku stažení a zvolte
**Odeslat do CUEFLOW**.

## Traktor DJ

V CUEFLOW označte skladby a použijte:

- **Traktor DJ (.nml)** pro samostatný playlist,
- **Stáhnout vybrané (.zip)** pro NML playlist společně s audio soubory.

V Traktoru následně importujte soubor `CUEFLOW-Traktor.nml`.

Technický popis přenosového formátu je v [PLAYLIST-FORMAT.md](PLAYLIST-FORMAT.md).

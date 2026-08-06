# Tyskland — minnetavle

En interaktiv minnetavle: bildene fra turen til Tyskland som polaroider festet på
en oppslagstavle i treramme, med gule lapper og tusjtegninger. Bygget mobil-først.

Teksten er skrevet i stemmen til noen som **ikke** var med på turen, men som har
sett gjennom bildene etterpå — derfor «dere», aldri «vi».

## Kom i gang

```bash
npm install
npm run images   # lager miniatyrbilder + manifest fra kildemappen
npm run dev
```

`npm run build` bygger til `dist/`.

## Hvordan det er satt sammen

Ingen rammeverk og ingen kjøretidsavhengigheter — bare Vite som byggeverktøy.
Ferdig bundle er ~13 kB gzippet.

| Fil | Ansvar |
|---|---|
| `scripts/process-images.mjs` | lager 640px miniatyrbilder + 1600px fullversjoner, skriver `src/manifest.json` |
| `src/photo-meta.js` | per bilde: rammeform, fokuspunkt, bildetekst, rotasjon |
| `src/data.js` | plasserer bilder i klynger, lapper og tegninger i mellomrommene |
| `src/board.js` | panorering/zoom med treghet, og grensene som hindrer at du roter deg bort |
| `src/polaroid.js` | polaroid-komponenten: lat lasting, «fremkalling», fall-animasjon |
| `src/lightbox.js` | fullskjermvisning med sveip mellom bildene |
| `src/frame.js` | trerammen (fire lister med gerede hjørner) |
| `src/intro.js` | postkortet du møter først |

### Ytelse

- Miniatyrbilder lastes først når de kommer i nærheten av skjermen.
- Originalbildet hentes **bare** når du åpner et bilde, og bare naboene forhåndslastes.
- Svevingen står stille for alt som er utenfor skjermen.
- Alle animasjoner er `transform`/`opacity`, altså GPU-akselerert.
- Målt 60 FPS med 4× CPU-struping.

## Legge til flere bilder

1. Legg bildet i kildemappen (se `SRC_DIR` i `scripts/process-images.mjs`).
2. `npm run images`
3. Legg inn en linje i `src/photo-meta.js` med fokuspunkt og bildetekst.

Utelater du steg 3 blir bildet kvadratisk med fokus litt over midten, uten tekst.

**To ting verdt å vite:**

- **Bildetekster må være én linje.** To linjer skyver seg opp i bildet og ned
  under den hvite kanten. CSS gjør bryting umulig (`nowrap` + ellipse), men hold
  tekstene korte — feltet er 182px.
- **Fokuspunktet betyr noe.** Mobilbilder har ofte ansiktene i øverste tredjedel,
  så et kvadratisk utsnitt midtstilt kutter hoder. Regn med
  `window_top = focus_y × (H_kilde − H_synlig)`. Bilder der hele høyden er
  motivet får `frame: 'tall'` i stedet.

## Datoer

Kildebildene har ikke EXIF-datoer lenger, så det står ingen datoer noe sted.
`date`-feltet i `src/photo-meta.js` og undertittelen i `src/title.js` er tomme og
klare til å fylles ut.

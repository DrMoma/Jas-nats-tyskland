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
| `scripts/process-images.mjs` | lager 384px/640px/1600px versjoner i JPEG og WebP, skriver `src/manifest.json` |
| `src/device.js` | avgjør én gang om dette er en telefon, og om WebP virker |
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
- Panorering og zoom leser aldri layout underveis — all geometri måles i `_measure()`
  og gjenbrukes. Drag flytter kortet med `translate`, ikke `left`/`top`.

#### Lettvekt på telefon

Tavla er en flate på 1900×2600 med ~70 objekter på seg, og den tegnes på nytt hver
gang skalaen endres — altså hvert bilde av en knipebevegelse. Effektene som får den
til å se ut som en ekte oppslagstavle er nettopp de dyre typene: `filter` og
`mix-blend-mode` tvinger nettleseren til å tegne i egne buffere og lese piksler
tilbake. Det merkes ikke på en PC. Det koster hele bildefrekvensen på en telefon.

Telefoner bytter derfor til billigere varianter — alt samlet i **én** blokk nederst i
`src/style.css`, med samme mediespørring som `LITE_QUERY` i `src/device.js`:

| Effekt | På PC | På telefon |
|---|---|---|
| Skygge under rammen | `filter: drop-shadow` over hele tavla | `box-shadow` på `.board-frame::before` |
| Teip og tegninger | `mix-blend-mode: multiply` (~47 stk.) | vanlig gjennomsiktighet |
| Tegningenes skjelving | SVG `feTurbulence` + `feDisplacementMap` | ingen — strekene er ujevne fra før |
| Sveving | 42 kort svever i ring | står stille |
| Slørede bakgrunner | `backdrop-filter: blur()` | tettere ensfarget slør |
| Fargestikk på bildene | permanent `filter` på 30 bilder | ingen |
| Lys i tavleflaten | `inset 0 0 200px` | vignett som gradient |

Rammeskyggen er den viktigste av dem: et `filter` må tegne **hele** elementet til en
egen buffer først, og det elementet er hele tavla — omtrent 48 megapiksler på en 3×-skjerm,
gjort om igjen for hver eneste endring i skala.

#### Bilder

Tre størrelser, i JPEG og WebP. Telefoner starter på 384px — tavla åpner på 0,62×, der
bildevinduet i en polaroid er ~113 px — og bytter opp til 640px hvis du zoomer forbi
1,3× (`UPGRADE_SCALE` i `src/polaroid.js`). Bare kortene som er på skjermen byttes;
resten tar det igjen når de kommer inn i synsfeltet.

| | JPEG | WebP |
|---|---|---|
| 384px (telefon) | 684 kB | **388 kB** |
| 640px (PC) | 1,5 MB | **872 kB** |
| 1600px (lysboks) | 11 MB | **3,6 MB** |

Polaroidene bruker `<picture>` og velger format selv. Lysboksen setter `src` fra
JavaScript og har ingen markup å falle tilbake på, så den sjekker WebP-støtte via
`SUPPORTS_WEBP`. Faller `cwebp` bort fra byggemaskinen lager skriptet bare JPEG, og
alt virker fortsatt — det blir bare tyngre.

Skriftene ligger i `public/fonts/` i stedet for hos Google: stylesheetet derfra
blokkerer opptegning og ligger bak oppslag og håndtrykk mot to andre tjenere.

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

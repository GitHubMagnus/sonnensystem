# Interaktives 3D-Sonnensystem

🌍 **Deutsch** | [English](#interactive-3d-solar-system)

> Das Modell selbst ist zweisprachig: oben rechts mit dem **EN/DE**-Knopf umschalten.

Ein vollständiges, interaktives 3D-Modell unseres Sonnensystems – von der Merkur-Oberfläche bis zum kosmischen Netz, alles in einer einzigen HTML-Datei ohne Installation oder Abhängigkeiten.

**[Demo ansehen](https://githubmagnus.github.io/sonnensystem/)**

---

## Empfohlener Einstieg

Für das beste Erlebnis beim ersten Start:

1. **Vollbild aktivieren** – Klick auf den ⛶-Knopf im Steuermenü (rechts)
2. **Musik einschalten** – Klick auf den 🔇-Knopf (rechts unten), er wechselt zu 🔊
3. **Jahreszeiten-Demo** – Im Steuermenü auf 🍂 **Jahreszeiten** klicken: ein ganzes Erdjahr im Zeitraffer mit Live-Erklärung warum es Sommer und Winter gibt
4. **Kamerafahrt starten** – Auf 🎬 **Reise** klicken: eine filmische Reise von Merkur bis zum kosmischen Netz

---

## Was dich erwartet

Starte die Seite und du stehst mitten im Sonnensystem. Ziehen dreht die Ansicht, Scrollen zoomt – und wenn du weit genug herausscrollst, öffnet sich nach und nach die Milchstraße, dann die Lokale Gruppe mit Andromeda, und schließlich das kosmische Netz, in dem jeder Lichtpunkt eine ganze Galaxie mit Milliarden Sternen ist.

### Die Planeten

Alle 8 Planeten mit NASA-Texturen, echten Bahnneigungen und physikalisch korrekten Eigenrotationen. Die Erde ist besonders detailliert: ein eigener Shader zeigt auf der Nachtseite die Lichter der Städte, dazu 4K-Wolken, Ozean-Glanzlichter und einen Fresnel-Atmosphären-Saum. Gasriesen wie Jupiter und Saturn sind realistisch abgeplattet, Saturn wirft echte Schatten durch seine Ringe. Dazu 5 Zwergplaneten (Pluto, Ceres, Eris, Makemake, Haumea) und der Komet Halley mit seinem der Sonne abgewandten Schweif.

### Echte Physik

Die Planetenpositionen basieren auf den JPL-Näherungsformeln (J2000-Ephemeriden) mit Kepler-Gleichung – zu jedem Datum stimmen die Positionen mit der Realität überein. Du kannst die **Zeitmaschine** öffnen, dein Geburtsdatum eingeben und sehen, wo die Planeten damals standen.

### Werkzeuge

| Werkzeug | Beschreibung |
|---|---|
| **Zeitmaschine** | Echte Planetenpositionen zu jedem Datum, ±100 Jahre per Slider |
| **Jahreszeiten-Demo** | Ein Jahr im Zeitraffer mit Live-Erklärung, warum es Sommer und Winter gibt |
| **Blick von der Erde** | Welche Planeten stehen heute am Abend- oder Morgenhimmel? |
| **Konjunktions-Finder** | Wann stehen zwei Planeten das nächste Mal eng beieinander? |
| **Mondphasen** | Echte Mondphase zum eingestellten Datum |
| **Kamerafahrt** | Filmische Reise von Merkur bis zum kosmischen Netz, in Endlosschleife |
| **Geführte Tour** | Automatischer Flug von Planet zu Planet mit Infotexten |
| **Planetenvergleich** | Zwei Planeten nebeneinander – Größe, Schwerkraft, Temperatur, Monde |
| **Weltraum-Rechner** | Dein Gewicht auf anderen Welten, Reisezeit mit Auto/Flugzeug/Rakete/Licht |
| **Lichtstrahl-Demo** | Ein Photon fliegt von der Sonne los – nach 8 Minuten erreicht es die Erde |
| **Screenshot** | Aktuellen Blick als PNG speichern |

### Raumsonden & Satelliten

- **Voyager 1 & 2** mit abspielbarennachgestellten Flugbahnen (Start 1977 bis heute) und der Golden Record
- **ISS, Hubble-Teleskop, James-Webb-Teleskop** (JWST korrekt am Lagrange-Punkt L2)
- Alle erscheinen erst ab ihrem echten Startdatum in der Zeitmaschine

### Der Blick hinaus

Ab einer bestimmten Zoomstufe blenden die Nahbereichssterne aus und die Milchstraße erscheint als 3D-Spiralgalaxie mit vier Armen – unser Sonnensystem markiert mit einem Pfeil an seiner echten Position im Orion-Arm. Noch weiter draußen: Andromeda, die Dreiecksgalaxie und die Magellanschen Wolken in ihren echten Himmelsrichtungen. Ganz außen: das kosmische Netz aus Galaxienhaufen und Filamenten.

### Sound

Generative Weltraum-Musik, die live im Browser synthetisiert wird – keine Audiodateien, vollständig lizenzfrei und offline. Dazu atmosphärische Klangeffekte für Planetenauswahl, Kameraflüge und kosmische Meilensteine.

---

## Technisches

- **Kein Build-System, keine npm-Pakete** – reines HTML/CSS/JavaScript
- **Three.js r128** via CDN (cdnjs.cloudflare.com)
- **NASA-Texturen** via GitHub (jeromeetienne/threex.planets und mrdoob/three.js) – mit prozeduralem Fallback wenn offline
- Zweisprachige Oberfläche (Deutsch / Englisch), zur Laufzeit umschaltbar
- Läuft vollständig im Browser, auch offline nach dem ersten Laden
- Getestet in Chrome, Firefox, Safari (Desktop & Mobile)

### Projektstruktur

Der Code ist in klar getrennte Dateien aufgeteilt (klassische `<script>`-Einbindung, kein Modul-Bundler – läuft daher auch per Doppelklick):

```
sonnensystem/
├─ index.html        Grundgerüst, lädt CSS & Skripte in fester Reihenfolge
├─ css/
│  └─ styles.css     gesamtes Layout & Design
└─ js/
   ├─ i18n.js        Sprachen, Übersetzungen, Anzeigenamen
   ├─ data.js        Bahnelemente (JPL) und Planeten-/Körperdaten
   ├─ scene.js       Three.js-Aufbau: Renderer, Texturen, Sterne, Galaxien, Körper, Sonden
   ├─ ui.js          Bedienung: Kamera, Auswahl, Werkzeuge, Modals, Jahreszeiten, Audio
   └─ main.js        Animationsschleife, Sprachanwendung, Programmstart
```

> Die Skripte teilen sich einen gemeinsamen globalen Scope; die Reihenfolge in `index.html` (i18n → data → scene → ui → main) stellt sicher, dass alles vor seiner Verwendung definiert ist.

---

## Starten

Einfach das Repository herunterladen und `index.html` im Browser öffnen – fertig. Kein Server, kein Build nötig.

```bash
git clone https://github.com/GitHubMagnus/sonnensystem
# index.html im Browser öffnen
```

Oder direkt die [Live-Demo](https://githubmagnus.github.io/sonnensystem/) aufrufen.

---

## Bedienung

| Aktion | Eingabe |
|---|---|
| Drehen | Klicken und ziehen |
| Zoomen | Mausrad / Pinch |
| Planet auswählen & verfolgen | Klicken |
| Verfolgen beenden | ✕ in der Infokarte oder 🧭-Knopf |
| Übersicht | 🧭-Knopf (rechts unten) |
| Musik | 🔊-Knopf |
| Einstellungen (Mobile) | ⚙-Knopf |

---

## Quellen & Danksagungen

- **Planetentexturen**: [jeromeetienne/threex.planets](https://github.com/jeromeetienne/threex.planets) – basierend auf NASA-Bilddaten (gemeinfrei)
- **Erd-Nachtlichter**: [mrdoob/three.js](https://github.com/mrdoob/three.js) – NASA Black Marble
- **4K-Erdkarte**: [turban/webgl-earth](https://github.com/turban/webgl-earth) – NASA Blue Marble
- **Bahnelemente**: JPL Solar System Dynamics (J2000-Näherungsformeln)
- **3D-Engine**: [Three.js r128](https://threejs.org)

---

## Lizenz

MIT – frei verwendbar, veränderbar und weiterzugeben. Bei Verwendung der NASA-Texturen gelten deren eigene Nutzungsbedingungen (gemeinfrei für nicht-kommerzielle Zwecke).

---
---

# Interactive 3D Solar System

[Deutsch](#interaktives-3d-sonnensystem) | 🌍 **English**

> The model itself is bilingual: switch with the **EN/DE** button in the top right.

A complete, interactive 3D model of our Solar System – from the surface of Mercury to the cosmic web, all in a single HTML file with no installation or dependencies.

**[View demo](https://githubmagnus.github.io/sonnensystem/)**

---

## Recommended start

For the best experience on your first launch:

1. **Enable fullscreen** – click the ⛶ button in the control menu (right)
2. **Turn on the music** – click the 🔇 button (bottom right); it switches to 🔊
3. **Seasons demo** – click 🍂 **Seasons** in the control menu: a whole Earth year in fast-forward with a live explanation of why summer and winter happen
4. **Start the journey** – click 🎬 **Journey**: a cinematic flight from Mercury to the cosmic web

---

## What awaits you

Launch the page and you stand right in the middle of the Solar System. Drag to rotate, scroll to zoom – and if you zoom out far enough, the Milky Way gradually opens up, then the Local Group with Andromeda, and finally the cosmic web, in which every point of light is an entire galaxy with billions of stars.

### The planets

All 8 planets with NASA textures, real orbital inclinations and physically correct rotations. Earth is especially detailed: a custom shader shows the city lights on the night side, plus 4K clouds, ocean specular highlights and a Fresnel atmospheric rim. Gas giants like Jupiter and Saturn are realistically flattened, and Saturn casts real shadows through its rings. Plus 5 dwarf planets (Pluto, Ceres, Eris, Makemake, Haumea) and Halley's Comet with its tail pointing away from the Sun.

### Real physics

Planet positions are based on the JPL approximation formulas (J2000 ephemerides) with Kepler's equation – at any date the positions match reality. You can open the **time machine**, enter your birth date and see where the planets stood back then.

### Tools

| Tool | Description |
|---|---|
| **Time machine** | Real planet positions at any date, ±100 years via slider |
| **Seasons demo** | A year in fast-forward with a live explanation of why we have summer and winter |
| **View from Earth** | Which planets are in the evening or morning sky today? |
| **Conjunction finder** | When will two planets next appear close together? |
| **Moon phases** | The real Moon phase for the chosen date |
| **Camera journey** | A cinematic trip from Mercury to the cosmic web, on a loop |
| **Guided tour** | An automatic flight from planet to planet with info texts |
| **Planet comparison** | Two planets side by side – size, gravity, temperature, moons |
| **Space calculator** | Your weight on other worlds, travel time by car/aeroplane/rocket/light |
| **Light-ray demo** | A photon sets off from the Sun – after 8 minutes it reaches Earth |
| **Screenshot** | Save the current view as a PNG |

### Probes & satellites

- **Voyager 1 & 2** with replayable reconstructed flight paths (launch 1977 to today) and the Golden Record
- **ISS, Hubble Telescope, James Webb Telescope** (JWST correctly at Lagrange point L2)
- All appear only from their real launch date in the time machine

### The view outward

Beyond a certain zoom level the nearby stars fade out and the Milky Way appears as a 3D spiral galaxy with four arms – our Solar System marked with an arrow at its real position in the Orion Arm. Further out: Andromeda, the Triangulum Galaxy and the Magellanic Clouds in their real sky directions. Furthest out: the cosmic web of galaxy clusters and filaments.

### Sound

Generative space music synthesized live in the browser – no audio files, fully royalty-free and offline. Plus atmospheric sound effects for selecting planets, camera flights and cosmic milestones.

---

## Technical

- **No build system, no npm packages** – plain HTML/CSS/JavaScript
- **Three.js r128** via CDN (cdnjs.cloudflare.com)
- **NASA textures** via GitHub (jeromeetienne/threex.planets and mrdoob/three.js) – with a procedural fallback when offline
- Bilingual interface (German / English), switchable at runtime
- Runs entirely in the browser, even offline after the first load
- Tested in Chrome, Firefox, Safari (desktop & mobile)

### Project structure

The code is split into clearly separated files (classic `<script>` includes, no module bundler – so it still runs from a double-click):

```
sonnensystem/
├─ index.html        scaffold, loads CSS & scripts in a fixed order
├─ css/
│  └─ styles.css     all layout & design
└─ js/
   ├─ i18n.js        languages, translations, display names
   ├─ data.js        orbital elements (JPL) and planet/body data
   ├─ scene.js       Three.js setup: renderer, textures, stars, galaxies, bodies, probes
   ├─ ui.js          interaction: camera, selection, tools, modals, seasons, audio
   └─ main.js        animation loop, language application, startup
```

> The scripts share one global scope; the order in `index.html` (i18n → data → scene → ui → main) ensures everything is defined before it is used.

---

## Run it

Just download the repository and open `index.html` in your browser – done. No server, no build needed.

```bash
git clone https://github.com/GitHubMagnus/sonnensystem
# open index.html in your browser
```

Or open the [live demo](https://githubmagnus.github.io/sonnensystem/) directly.

---

## Controls

| Action | Input |
|---|---|
| Rotate | Click and drag |
| Zoom | Mouse wheel / pinch |
| Select & follow a planet | Click |
| Stop following | ✕ in the info card or the 🧭 button |
| Overview | 🧭 button (bottom right) |
| Music | 🔊 button |
| Language | EN/DE button (top right) |
| Settings (mobile) | ⚙ button |

---

## Sources & credits

- **Planet textures**: [jeromeetienne/threex.planets](https://github.com/jeromeetienne/threex.planets) – based on NASA imagery (public domain)
- **Earth night lights**: [mrdoob/three.js](https://github.com/mrdoob/three.js) – NASA Black Marble
- **4K Earth map**: [turban/webgl-earth](https://github.com/turban/webgl-earth) – NASA Blue Marble
- **Orbital elements**: JPL Solar System Dynamics (J2000 approximation formulas)
- **3D engine**: [Three.js r128](https://threejs.org)

---

## License

MIT – free to use, modify and redistribute. When using the NASA textures, their own terms apply (public domain for non-commercial use).

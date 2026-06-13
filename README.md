# Interaktives 3D-Sonnensystem

Ein vollständiges, interaktives 3D-Modell unseres Sonnensystems – von der Merkur-Oberfläche bis zum kosmischen Netz, alles in einer einzigen HTML-Datei ohne Installation oder Abhängigkeiten.

**[Demo ansehen](https://githubmagnus.github.io/sonnensystem/sonnensystem_28.html)**

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

- **Eine einzige HTML-Datei** – kein Server, kein Build-System, keine npm-Pakete
- **Drei.js r128** via CDN (cdnjs.cloudflare.com)
- **NASA-Texturen** via GitHub (jeromeetienne/threex.planets und mrdoob/three.js) – mit prozeduralem Fallback wenn offline
- **2.662 Zeilen** Code, 106 Funktionen
- Läuft vollständig im Browser, auch offline nach dem ersten Laden
- Getestet in Chrome, Firefox, Safari (Desktop & Mobile)

---

## Starten

Einfach `sonnensystem.html` herunterladen und im Browser öffnen – fertig.

```bash
git clone https://github.com/GitHubMagnus/sonnensystem
# sonnensystem_28.html im Browser öffnen
```

Oder direkt die [Live-Demo](https://githubmagnus.github.io/sonnensystem/sonnensystem_28.html) aufrufen.

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

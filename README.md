# 🎵 SoundFont Touch Player Pro

Ein vollständiger, browserbasierter Musik-Player mit SoundFont-Samples, MIDI-Unterstützung, Drum-Sequencer, Mixer und Aufnahme-Funktion. Keine Installation nötig – einfach die HTML-Datei im Browser öffnen.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-0078D7?style=flat)
![Web MIDI API](https://img.shields.io/badge/Web_MIDI_API-4ade80?style=flat)

---

## 🚀 Schnellstart

1. Datei `player.html` herunterladen
2. In **Google Chrome** oder **Microsoft Edge** öffnen
3. Instrument wählen → **▶ Laden** klicken
4. Spielen!

> ⚠️ **Firefox wird nicht unterstützt** – die Web MIDI API ist nur in Chrome/Edge verfügbar.

---

## 📋 Funktionsübersicht

### 🎹 Klavier-Tab
- Vollständige Klaviertastatur von **C2 bis C6**
- Weiße und schwarze Tasten mit korrekter Darstellung
- Klicken mit der Maus oder Antippen auf Touchscreen
- Multi-Touch-fähig auf Smartphones und Tablets

### 🎸 Gitarren-Tab
- 6 Saiten in Standard-Stimmung (E2, A2, D3, G3, B3, E4)
- **Klicken** oder **Wischen** entlang der Saite für verschiedene Bünde (0–12)
- Touch-optimiert für Smartphone

### 🎵 Akkorde-Tab
- **6 Akkordtypen:** Dur, Moll, 7th, m7, Maj7, Sus4
- **12 Grundtöne:** C bis B (alle Vorzeichen)
- Akkord antippen → alle Noten erklingen gleichzeitig

#### 🎹 Arpeggiator
| Einstellung | Beschreibung |
|---|---|
| Muster | Aufwärts / Abwärts / Auf+Ab / Zufällig |
| BPM | 60–240 Beats pro Minute |
| Oktaven | 1–3 Oktaven |
| Swing | 0–100% Swing-Feeling |

### 🥁 Drums-Tab
- **16 Live-Pads:** Kick, Snare, Hi-Hat, Toms, Crash, Ride, Clap, Cowbell, u.v.m.
- Echte GM-Percussion-Samples (mit synthetischem Fallback)

#### 🎛️ Step-Sequencer
- **16 Steps** pro Instrument
- Farbkodiert: Kick/Snare = rot, Hi-Hat = grün, Cymbal = gold, Clap = lila, Tom = blau
- BPM-Regler (40–200)
- **▶ Play / ⏹ Stop** und **🗑 Clear**

### 📝 Noten-Tab
- Gespielte Noten erscheinen in Echtzeit im **Notensystem**
- Umschaltbar zwischen **Violinschlüssel** und **Bassschlüssel**
- Vorzeichen (♯) werden korrekt dargestellt
- Letzte 20 Noten bleiben sichtbar
- **🗑 Clear** löscht die Anzeige

### 🎚️ Mixer-Tab
Mehrspuriger Sequencer mit **4 unabhängigen Spuren**.

| Funktion | Beschreibung |
|---|---|
| Instrument | Pro Spur wählbar (15+ Instrumente) |
| Volume | Lautstärke pro Spur (0–100%) |
| Pan | Stereo-Panorama Links/Rechts |
| M (Mute) | Spur stummschalten |
| S (Solo) | Nur diese Spur hören |
| Steps | 16 Steps pro Spur ein/ausschalten |
| Note | Ton pro aktivem Step wählbar (C3–C5) |

- **Master BPM** und **Master Volume**
- **▶ Play / ⏸ Pause / ⏹ Stop**

### 🎙️ Aufnahme-Tab

#### Aufnehmen
1. **⏺ REC** klicken → Aufnahme startet (roter Blinker)
2. Noten, Akkorde oder Drums spielen
3. **⏹ Stop** → Aufnahme wird gespeichert

#### Wiedergabe
- **▶ Play** → Aufnahme mit exaktem Timing abspielen
- **🔁 Loop** → Endlosschleife ein/aus

#### Slots
- Bis zu **5 Aufnahmen** gleichzeitig speichern
- Pro Slot: Dauer und Event-Anzahl sichtbar
- ▶ Abspielen oder 🗑 Löschen

#### Export
| Format | Beschreibung |
|---|---|
| ⬇ MIDI (.mid) | Standard MIDI-Datei – importierbar in Cubase, Reaper, GarageBand, FL Studio |
| ⬇ Audio (.webm) | Echtzeit-Audio-Aufnahme des Ausgangssignals |

---

## ⚙️ Globale Einstellungen

| Regler | Funktion |
|---|---|
| 🔊 Lautstärke | Globale Lautstärke (0–100%) |
| 🌊 Hall/Reverb | Hall-Effekt (0–90%) |
| 🎼 Transpose | Tonart verschieben (−12 bis +12 Halbtöne) |
| ⛶ Vollbild | Vollbildmodus ein/aus |

---

## 🎹 MIDI-Unterstützung

> ⚠️ MIDI funktioniert nur in **Chrome/Edge** (Web MIDI API).  
> Bei Betrieb als lokale Datei (`file://`) oder auf `localhost` ist MIDI voll funktionsfähig.

### Einrichtung
1. MIDI-Gerät anschließen
2. **🎹 MIDI** Button klicken → Browser fragt nach Erlaubnis → **Zulassen**
3. MIDI-Eingang und -Ausgang aus den Dropdowns wählen

### MIDI Through Port (Linux)
Unter Linux wird **MIDI Through Port-0** automatisch erkannt und ausgewählt.  
Falls ein zweiter Synthesizer (z.B. FluidSynth) gleichzeitig läuft und Doppeltöne entstehen:

```bash
# Laufende Synthesizer anzeigen
ps aux | grep -E "fluidsynth|timidity|qsynth"

# FluidSynth beenden
pkill fluidsynth

# MIDI-Verbindungen anzeigen (ALSA)
aconnect -l
```

### MIDI-Kanäle
| Kanal | Verwendung |
|---|---|
| Kanal 1 (0) | Melodie-Instrumente (Klavier, Gitarre, Akkorde) |
| Kanal 10 (9) | Percussion / Drums (GM-Standard) |

---

## 🎼 Instrumente

Die App nutzt **FluidR3 GM SoundFont-Samples** von [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).

| Kategorie | Instrumente |
|---|---|
| 🎹 Klavier | Grand Piano, Bright Piano, Electric Piano, Harpsichord |
| 🎸 Gitarre | Guitar Nylon, Guitar Steel, Guitar Clean, Guitar Jazz, Distortion, Bass |
| 🎻 Streicher | Violin, Cello, String Ensemble |
| 🎺 Bläser | Trumpet, Alto Sax, Flute, Clarinet |
| 🎹 Orgel | Church Organ, Accordion, Choir |
| 🔔 Glocken | Glockenspiel, Vibraphone, Marimba, Tubular Bells, Tinkle Bell, Steel Drums, Xylophone |

---

## 📱 Kompatibilität

| Plattform | Browser | Status |
|---|---|---|
| Windows 10/11 | Chrome, Edge | ✅ Voll funktionsfähig inkl. MIDI |
| macOS | Chrome, Edge | ✅ Voll funktionsfähig inkl. MIDI |
| Linux | Chrome | ✅ Voll funktionsfähig inkl. MIDI |
| Android | Chrome | ✅ Touch-optimiert (kein MIDI) |
| iPhone / iPad | Safari | ⚠️ Audio funktioniert, kein MIDI |
| Firefox (alle) | Firefox | ⚠️ Kein MIDI, Audio funktioniert |

---

## 🛠️ Technische Details

- **Kein Framework** – reines HTML5, CSS3, Vanilla JavaScript
- **Web Audio API** – für Audio-Synthese, Reverb, Gain, Panning
- **Web MIDI API** – für MIDI Ein- und Ausgang
- **MediaRecorder API** – für Audio-Aufnahme
- **SoundFont-Samples** – MP3-Format, geladen via `fetch()` von GitHub CDN
- **Noten-Anzeige** – gezeichnet mit HTML5 Canvas
- **Keine externe Abhängigkeit** – läuft vollständig offline nach erstem Laden

### Lokaler Webserver (empfohlen für MIDI)
```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .
```
Dann im Browser: `http://localhost:8080/player.html`

---

## 📁 Dateistruktur

```
soundfont-touch-player/
└── player.html          # Gesamte App (eine einzelne Datei)
```

---

## 📜 Lizenz

MIT License – frei verwendbar, veränderbar und weitergabe erlaubt.

---

## 🙏 Danksagung

- [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) – FluidR3 GM SoundFont Samples
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) – MDN Dokumentation
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) – MDN Dokumentation

---

*Erstellt mit ❤️ und Claude AI*

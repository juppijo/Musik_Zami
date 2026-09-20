'use strict';

/* =========================================================
   Gitarre lernen – Skript
   Kein Audio-File nötig: Die Saiten werden per Karplus-Strong-
   Synthese direkt im Browser erzeugt.
   ========================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------------------
   Daten
   Saitennummern: 6 = tiefe E-Saite … 1 = hohe e-Saite
   frets/fingers: von Saite 6 nach Saite 1
   frets: -1 = nicht anschlagen, 0 = leer, n = Bund
   --------------------------------------------------------- */
const STRING_LETTER = { 6: 'E', 5: 'A', 4: 'D', 3: 'G', 2: 'H', 1: 'e' };
const STRING_NOUN   = { 6: 'tiefe E-Saite', 5: 'A-Saite', 4: 'D-Saite', 3: 'G-Saite', 2: 'H-Saite', 1: 'hohe e-Saite' };
const STRING_DATIVE = { 6: 'tiefen E-Saite', 5: 'A-Saite', 4: 'D-Saite', 3: 'G-Saite', 2: 'H-Saite', 1: 'hohen e-Saite' };
const FINGER_NAME   = { 1: 'Zeigefinger', 2: 'Mittelfinger', 3: 'Ringfinger', 4: 'Kleiner Finger' };
const OPEN_HZ       = { 6: 82.41, 5: 110.0, 4: 146.83, 3: 196.0, 2: 246.94, 1: 329.63 };

const CHORDS = {
  Em: { name: 'E-Moll', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], bass: [6, 5],
        tip: 'Der leichteste Akkord: nur zwei Finger, und alle sechs Saiten klingen.' },
  Am: { name: 'A-Moll', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], bass: [5, 4],
        tip: 'Gleiche Griffform wie E-Dur, nur eine Saite tiefer. Die tiefe E-Saite bleibt stumm.' },
  E:  { name: 'E-Dur', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], bass: [6, 5],
        tip: 'Wie E-Moll, dazu kommt der Zeigefinger auf der G-Saite. Alle sechs Saiten klingen.' },
  A:  { name: 'A-Dur', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], bass: [5, 4],
        tip: 'Drei Finger nebeneinander im 2. Bund. Die tiefe E-Saite bleibt stumm.' },
  D:  { name: 'D-Dur', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], bass: [4, 3],
        tip: 'Ein kleines Dreieck aus drei Fingern. Nur die vier hohen Saiten anschlagen.' },
  C:  { name: 'C-Dur', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], bass: [5, 4],
        tip: 'Die Finger bilden eine Treppe. Die tiefe E-Saite bleibt stumm.' },
  G:  { name: 'G-Dur', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], bass: [6, 4],
        tip: 'Ein großer Griff mit weiter Spanne. Alle sechs Saiten klingen.' },
  Dm: { name: 'D-Moll', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], bass: [4, 3],
        tip: 'Ähnliche Form wie D-Dur, aber der Zeigefinger greift im 1. Bund. Nur die vier hohen Saiten anschlagen.' },
  F:  { name: 'F-Dur (klein)', frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], bass: [4, 3],
        tip: 'Die kleine Barré-Version: Der Zeigefinger liegt flach über den zwei hohen Saiten. Nur die vier hohen Saiten anschlagen.' },
  E7: { name: 'E-Septakkord', frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], bass: [6, 5],
        tip: 'Wie E-Dur, nur ohne Ringfinger. Klingt bluesig.' },
  A7: { name: 'A-Septakkord', frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], bass: [5, 4],
        tip: 'Wie A-Dur, aber die G-Saite bleibt leer. Nur zwei Finger.' },
  D7: { name: 'D-Septakkord', frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], bass: [4, 3],
        tip: 'Zeigefinger im 1. Bund, Mittel- und Ringfinger daneben im 2. Bund. Nur die vier hohen Saiten anschlagen.' },
  G7: { name: 'G-Septakkord', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], bass: [6, 4],
        tip: 'Wie G-Dur, nur die hohe e-Saite wird mit dem Zeigefinger im 1. Bund gegriffen.' },
};

const GROUPS = [
  { title: 'Leichter Einstieg',  items: ['Em', 'Am', 'E', 'A', 'D'] },
  { title: 'Mehr Griffarbeit',   items: ['C', 'G', 'Dm', 'F'] },
  { title: 'Septakkorde',        items: ['E7', 'A7', 'D7', 'G7'] },
];

/* B = Basssaite des Akkords, A = zweite Basssaite (Wechselbass),
   Zahlen = Saitennummern. Eine Liste in der Liste = gleichzeitig gezupft. */
const PATTERNS = [
  { id: 'basis', name: 'Basis-Arpeggio', stepBeats: 0.5, steps: ['B', 3, 2, 1, 2, 3],
    desc: 'Daumen, dann Zeige-, Mittel- und Ringfinger, und zurück. Der Klassiker für den Einstieg.' },
  { id: 'wechsel', name: 'Wechselbass', stepBeats: 0.5, steps: ['B', 3, 'A', 2, 'B', 1, 'A', 2],
    desc: 'Der Daumen wechselt zwischen zwei Basssaiten, die Finger zupfen dazwischen die hohen Saiten. Eine Vorstufe zum Travis-Picking.' },
  { id: 'walzer', name: 'Walzer', stepBeats: 1, steps: ['B', [3, 2, 1], [3, 2, 1]],
    desc: 'Drei Schläge: erst der Bass, dann zweimal die drei hohen Saiten zusammen.' },
  { id: 'ballade', name: 'Ballade', stepBeats: 0.5, steps: ['B', 3, 2, 3, 1, 3, 2, 3],
    desc: 'Ruhige Achtel: Bass, dann ein Wechsel zwischen den Saiten 3, 2 und 1.' },
];

const PROGRESSIONS = [
  { name: 'Em – Am',        chords: ['Em', 'Am'],
    hint: 'Zwei leichte Akkorde. Die Finger wandern nur eine Saite weiter.' },
  { name: 'G – C – D',      chords: ['G', 'C', 'D'],
    hint: 'Die drei Dur-Akkorde der Tonart G. Damit lassen sich viele einfache Lieder begleiten.' },
  { name: 'E – A – D',      chords: ['E', 'A', 'D'],
    hint: 'Drei Dur-Akkorde mit vielen leeren Saiten.' },
  { name: 'Am – Dm – E',    chords: ['Am', 'Dm', 'E'],
    hint: 'Die klassische Moll-Folge in A-Moll.' },
  { name: 'Am – C – G – D', chords: ['Am', 'C', 'G', 'D'],
    hint: 'Vier Akkorde mit weichen Wechseln zwischen Moll und Dur.' },
  { name: 'C – G – Am – F', chords: ['C', 'G', 'Am', 'F'],
    hint: 'Eine bekannte Pop-Folge, hier mit dem kleinen F.' },
];

const THEMES = [
  { id: 'gold',     name: 'Gold auf Schwarz', a: '#0d0b08', b: '#d9a83a', bar: '#0d0b08' },
  { id: 'sunburst', name: 'Sunburst',         a: '#140804', b: '#ff8a3d', bar: '#140804' },
  { id: 'nacht',    name: 'Nachtblau',        a: '#060a14', b: '#6fb4ff', bar: '#060a14' },
  { id: 'wald',     name: 'Waldgrün',         a: '#08110b', b: '#a4d65e', bar: '#08110b' },
  { id: 'nylon',    name: 'Nylon hell',       a: '#e9e5d8', b: '#0f6b62', bar: '#e9e5d8' },
];

/* ---------------------------------------------------------
   Klang (Web Audio, Karplus-Strong)
   --------------------------------------------------------- */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let volume = 0.8;
  const cache = new Map();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume * volume;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5200;
      const comp = ctx.createDynamicsCompressor();
      master.connect(tone);
      tone.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (string, fret) => OPEN_HZ[string] * Math.pow(2, fret / 12);

  function makeBuffer(f) {
    const sr = ctx.sampleRate;
    const N = Math.floor(sr * 2.8);
    const buf = ctx.createBuffer(1, N, sr);
    const d = buf.getChannelData(0);
    const P = Math.max(2, Math.floor(sr / f - 0.5));
    let prev = 0;
    for (let i = 0; i < P; i++) {
      prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5;
      d[i] = prev;
    }
    const decay = 0.9975;
    for (let i = P; i < N; i++) {
      const a = d[i - P];
      const b = i - P - 1 >= 0 ? d[i - P - 1] : a;
      d[i] = decay * 0.5 * (a + b);
    }
    const fade = Math.floor(sr * 0.25);
    for (let i = 0; i < fade; i++) d[N - 1 - i] *= i / fade;
    return buf;
  }

  function pluck(string, fret, when, vel = 1) {
    ensure();
    const f = freq(string, fret);
    const key = Math.round(f * 100);
    let buf = cache.get(key);
    if (!buf) { buf = makeBuffer(f); cache.set(key, buf); }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.4 * vel;
    src.connect(g);
    g.connect(master);
    src.start(when);
  }

  function strum(key, { dir = 'down', when = null, spread = 0.034, vel = 1, onPluck = null } = {}) {
    const c = ensure();
    const chord = CHORDS[key];
    const t0 = when ?? c.currentTime + 0.02;
    const order = dir === 'down' ? [6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6];
    order.filter(s => chord.frets[6 - s] >= 0).forEach((s, k) => {
      const t = t0 + k * spread;
      pluck(s, chord.frets[6 - s], t, vel * (0.85 + 0.15 * Math.random()));
      if (onPluck) onPluck(s, Math.max(0, (t - c.currentTime) * 1000));
    });
  }

  function click(when, accent) {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, when + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g);
    g.connect(master);
    o.start(when);
    o.stop(when + 0.06);
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v * v;
  }

  return { ensure, pluck, strum, click, setVolume };
})();

/* ---------------------------------------------------------
   Griffbild (SVG)
   --------------------------------------------------------- */
let diagramId = 0;

function diagramSVG(key, { interactive = true } = {}) {
  const c = CHORDS[key];
  const id = ++diagramId;
  const X0 = 52, SP = 31.2, TOP = 76, FH = 44, NF = 5;
  const BOT = TOP + FH * NF;
  const xs = i => X0 + i * SP;
  const thick = [3.4, 2.9, 2.4, 1.9, 1.5, 1.2];

  let s = `<svg viewBox="0 0 260 340" role="img" aria-label="Griffbild ${c.name}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><pattern id="gr${id}" width="9" height="40" patternUnits="userSpaceOnUse">`
     + `<line class="dg-grain" x1="1.5" y1="0" x2="1.5" y2="40" stroke-width="1" opacity=".22"/>`
     + `<line class="dg-grain" x1="6" y1="0" x2="6" y2="40" stroke-width=".8" opacity=".12"/></pattern></defs>`;
  s += `<rect class="dg-neck" x="34" y="${TOP}" width="192" height="${FH * NF}" rx="3"/>`;
  s += `<rect x="34" y="${TOP}" width="192" height="${FH * NF}" rx="3" fill="url(#gr${id})"/>`;
  for (let k = 1; k <= NF; k++) {
    const y = TOP + FH * k;
    s += `<line class="dg-fret" x1="34" x2="226" y1="${y}" y2="${y}" stroke-width="2.4"/>`;
  }
  s += `<rect class="dg-nut" x="30" y="${TOP - 7}" width="200" height="8" rx="2"/>`;

  for (let i = 0; i < 6; i++) {
    const st = 6 - i, fr = c.frets[i], x = xs(i);
    s += `<g class="str${fr < 0 ? ' dead' : ''}" data-s="${st}">`
       + `<line class="dg-string" x1="${x}" x2="${x}" y1="${TOP}" y2="${BOT + 8}" stroke-width="${thick[i]}"/>`;
    if (interactive) {
      s += `<rect class="hit" x="${x - 15}" y="${TOP - 36}" width="30" height="${FH * NF + 52}"/>`;
    }
    s += `</g>`;
    if (fr === 0) s += `<circle class="dg-mark" cx="${x}" cy="${TOP - 24}" r="6.5"/>`;
    if (fr < 0)   s += `<path class="dg-x" d="M${x - 6} ${TOP - 30}l12 12M${x + 6} ${TOP - 30}l-12 12"/>`;
    s += `<text class="dg-label" x="${x}" y="${BOT + 32}">${STRING_LETTER[st]}</text>`;
  }

  const groups = new Map();
  c.frets.forEach((fr, i) => {
    if (fr > 0) {
      const k = `${c.fingers[i]}|${fr}`;
      if (!groups.has(k)) groups.set(k, { fg: c.fingers[i], fr, idx: [] });
      groups.get(k).idx.push(i);
    }
  });
  groups.forEach(({ fg, fr, idx }) => {
    const cy = TOP + FH * (fr - 0.5);
    const xa = xs(Math.min(...idx)), xb = xs(Math.max(...idx));
    if (idx.length > 1) {
      s += `<rect class="dg-dot" x="${xa - 15}" y="${cy - 15}" width="${xb - xa + 30}" height="30" rx="15"/>`;
    } else {
      s += `<circle class="dg-dot" cx="${xa}" cy="${cy}" r="15"/>`;
    }
    s += `<text class="dg-num" x="${(xa + xb) / 2}" y="${cy}" text-anchor="middle" dominant-baseline="central">${fg}</text>`;
  });

  return s + `</svg>`;
}

function drawDiagram(root, key, opts) {
  root.innerHTML = diagramSVG(key, opts);
}

function flashString(root, st) {
  const g = root.querySelector(`.str[data-s="${st}"]`);
  if (!g) return;
  g.classList.remove('on');
  void g.getBoundingClientRect();
  g.classList.add('on');
  clearTimeout(g._t);
  g._t = setTimeout(() => g.classList.remove('on'), 340);
}

function bindStrings(root, getKey) {
  root.addEventListener('click', e => {
    const g = e.target.closest('.str');
    if (!g) return;
    const st = +g.dataset.s;
    const fr = CHORDS[getKey()].frets[6 - st];
    if (fr < 0) return;
    Sound.pluck(st, fr, Sound.ensure().currentTime + 0.005, 1.2);
    flashString(root, st);
  });
}

/* ---------------------------------------------------------
   Sequencer (präzises Vorausplanen der Töne)
   --------------------------------------------------------- */
function createSequencer({ interval, audio, visual }) {
  let timer = null;
  let nextTime = 0;
  let index = 0;
  const pending = new Set();

  function pump() {
    const ctx = Sound.ensure();
    while (nextTime < ctx.currentTime + 0.14) {
      const i = index, t = nextTime;
      const id = setTimeout(() => { pending.delete(id); visual(i); },
                            Math.max(0, (t - ctx.currentTime) * 1000));
      pending.add(id);
      audio(i, t);
      nextTime += interval(i);
      index++;
    }
  }

  return {
    start() {
      if (timer !== null) return;
      index = 0;
      nextTime = Sound.ensure().currentTime + 0.1;
      pump();
      timer = setInterval(pump, 25);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      pending.forEach(clearTimeout);
      pending.clear();
    },
    get running() { return timer !== null; },
  };
}

/* =========================================================
   Bereich: Akkorde
   ========================================================= */
const state = { chord: 'Em' };

function buildChordPicker() {
  $('#chordPicker').innerHTML = GROUPS.map(g => `
    <div class="chip-group">
      <h3>${g.title}</h3>
      <div class="chips">
        ${g.items.map(k => `<button class="chip" type="button" data-chord="${k}" aria-pressed="false">${k}</button>`).join('')}
      </div>
    </div>`).join('');
}

function fingerRows(c) {
  const map = new Map();
  c.frets.forEach((fr, i) => {
    const fg = c.fingers[i];
    if (fr > 0 && fg > 0) {
      const k = `${fg}|${fr}`;
      if (!map.has(k)) map.set(k, { fg, fr, strings: [] });
      map.get(k).strings.push(6 - i);
    }
  });
  return [...map.values()].sort((a, b) => a.fg - b.fg);
}

function selectChord(key, { sound = true } = {}) {
  state.chord = key;
  const c = CHORDS[key];
  $$('#chordPicker .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.chord === key)));
  drawDiagram($('#chordDiagram'), key);
  $('#chordName').textContent = key;
  $('#chordFull').textContent = c.name;
  $('#chordTip').textContent = c.tip;

  $('#fingerList').innerHTML = fingerRows(c).map(r => {
    const where = r.strings.map(s => STRING_DATIVE[s]).join(' und ');
    const barre = r.strings.length > 1 ? ' (Barré)' : '';
    return `<li><span class="finger-badge">${r.fg}</span>`
         + `<span><strong>${FINGER_NAME[r.fg]}</strong> auf der ${where}, ${r.fr}. Bund${barre}</span></li>`;
  }).join('');

  const muted = [6, 5, 4, 3, 2, 1].filter(s => c.frets[6 - s] < 0).map(s => STRING_NOUN[s]);
  $('#muteNote').textContent = muted.length ? `Nicht anschlagen: ${muted.join(' und ')}.` : 'Alle sechs Saiten werden angeschlagen.';

  if (sound && $('#autoPlay').checked) strumChord('down');
}

function strumChord(dir, spread) {
  const root = $('#chordDiagram');
  Sound.strum(state.chord, {
    dir, spread,
    onPluck: (s, ms) => setTimeout(() => flashString(root, s), ms),
  });
}

/* =========================================================
   Bereich: Zupfen
   ========================================================= */
const pick = { chord: 'Em', pattern: 'basis', bpm: 70 };
const currentPattern = () => PATTERNS.find(p => p.id === pick.pattern);

function stepPicks(step, chordKey) {
  const c = CHORDS[chordKey];
  const fingerOf = { 3: 'i', 2: 'm', 1: 'a' };
  return (Array.isArray(step) ? step : [step]).map(tok => {
    const s = tok === 'B' ? c.bass[0] : tok === 'A' ? c.bass[1] : tok;
    const label = (tok === 'B' || tok === 'A') ? 'p' : fingerOf[tok];
    return { s, label };
  }).filter(p => c.frets[6 - p.s] >= 0);
}

function renderTabGrid() {
  const pat = currentPattern();
  const grid = $('#tabGrid');
  const lw = [0, 1.2, 1.5, 1.9, 2.4, 2.9, 3.4];
  grid.style.setProperty('--n', pat.steps.length);
  let html = '';
  [1, 2, 3, 4, 5, 6].forEach(s => {
    html += `<div class="tg-label">${STRING_LETTER[s]}</div>`;
    pat.steps.forEach((step, i) => {
      const p = stepPicks(step, pick.chord).find(x => x.s === s);
      html += `<div class="tg-cell" data-i="${i}" style="--lw:${lw[s]}px">${p ? `<span class="pick">${p.label}</span>` : ''}</div>`;
    });
  });
  grid.innerHTML = html;
  $('#patternDesc').textContent = pat.desc;
  drawDiagram($('#pickDiagram'), pick.chord);
}

function markStep(i) {
  const pat = currentPattern();
  const col = i % pat.steps.length;
  $$('#tabGrid .tg-cell.now').forEach(el => el.classList.remove('now'));
  $$(`#tabGrid .tg-cell[data-i="${col}"]`).forEach(el => el.classList.add('now'));
  stepPicks(pat.steps[col], pick.chord).forEach(p => flashString($('#pickDiagram'), p.s));
}

const pickSeq = createSequencer({
  interval: () => (60 / pick.bpm) * currentPattern().stepBeats,
  audio: (i, t) => {
    const pat = currentPattern();
    const chord = CHORDS[pick.chord];
    stepPicks(pat.steps[i % pat.steps.length], pick.chord).forEach((p, k) => {
      Sound.pluck(p.s, chord.frets[6 - p.s], t + k * 0.008, p.label === 'p' ? 1.15 : 0.9);
    });
  },
  visual: markStep,
});

function setPickRunning(on) {
  const b = $('#btnPickPlay');
  b.textContent = on ? 'Stopp' : 'Start';
  b.classList.toggle('running', on);
}

function stopPick() {
  pickSeq.stop();
  setPickRunning(false);
  $$('#tabGrid .tg-cell.now').forEach(el => el.classList.remove('now'));
}

/* =========================================================
   Bereich: Wechseln
   ========================================================= */
const chg = { prog: 0, bpc: 4, strum: 'all', bpm: 60, shown: 'Em', drawn: null, changes: 0 };
const progChords = () => PROGRESSIONS[chg.prog].chords;

function buildBeats() {
  $('#beatDots').innerHTML = Array.from({ length: chg.bpc }, () => '<span class="beat"></span>').join('');
}

function showChange(ci) {
  const list = progChords();
  const now = list[ci % list.length];
  const next = list[(ci + 1) % list.length];
  chg.shown = now;
  if (chg.drawn !== now) {
    drawDiagram($('#nowDiagram'), now);
    $('#nowName').textContent = now;
    chg.drawn = now;
  }
  $('#nextName').textContent = next;
  drawDiagram($('#nextDiagram'), next, { interactive: false });
}

function resetChange() {
  chg.drawn = null;
  chg.changes = 0;
  $('#changeCount').textContent = '';
  $('#changeHint').textContent = PROGRESSIONS[chg.prog].hint;
  buildBeats();
  showChange(0);
}

const changeSeq = createSequencer({
  interval: () => 60 / chg.bpm,
  audio: (i, t) => {
    const beat = i % chg.bpc;
    const list = progChords();
    const ci = Math.floor(i / chg.bpc) % list.length;
    Sound.click(t, beat === 0);
    if (chg.strum === 'all' || (chg.strum === 'one' && beat === 0)) {
      Sound.strum(list[ci], {
        when: t,
        vel: beat === 0 ? 1 : 0.8,
        onPluck: (s, ms) => setTimeout(() => flashString($('#nowDiagram'), s), ms),
      });
    }
  },
  visual: i => {
    const beat = i % chg.bpc;
    const ci = Math.floor(i / chg.bpc);
    if (beat === 0) {
      showChange(ci);
      if (i > 0) {
        chg.changes++;
        $('#changeCount').textContent = `Akkordwechsel geübt: ${chg.changes}`;
      }
    }
    $$('#beatDots .beat').forEach((el, k) => el.classList.toggle('on', k <= beat));
  },
});

function setChangeRunning(on) {
  const b = $('#btnChangePlay');
  b.textContent = on ? 'Stopp' : 'Start';
  b.classList.toggle('running', on);
}

function stopChange() {
  if (changeSeq.running) {
    changeSeq.stop();
    setChangeRunning(false);
    resetChange();
  }
}

/* =========================================================
   Bereich: Stimmen
   ========================================================= */
function buildTuning() {
  $('#tuningRow').innerHTML = [6, 5, 4, 3, 2, 1].map(s => `
    <button class="tune" type="button" data-s="${s}">
      <span class="tune-letter">${STRING_LETTER[s]}</span>
      <span class="tune-meta">${s}. Saite, ${Math.round(OPEN_HZ[s])} Hz</span>
    </button>`).join('');
}

function markTune(s, ms = 0) {
  setTimeout(() => {
    const el = $(`.tune[data-s="${s}"]`);
    if (!el) return;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 800);
  }, ms);
}

/* =========================================================
   Tabs
   ========================================================= */
const TAB_ORDER = ['akkorde', 'zupfen', 'wechseln', 'stimmen'];

function showTab(name, focus = false) {
  stopPick();
  stopChange();
  TAB_ORDER.forEach(t => {
    const on = t === name;
    const tab = $(`#tab-${t}`);
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    $(`#panel-${t}`).hidden = !on;
    if (on && focus) tab.focus();
  });
}

/* =========================================================
   Styles-Menü
   ========================================================= */
function applyTheme(id) {
  const th = THEMES.find(t => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = th.id;
  $('meta[name="theme-color"]').setAttribute('content', th.bar);
  try { localStorage.setItem('gitarre-style', th.id); } catch (e) { /* ohne Speicher weiter */ }
  $$('#styleMenu button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.theme === th.id)));
}

function buildStyleMenu() {
  const menu = $('#styleMenu');
  menu.innerHTML = THEMES.map(t => `
    <button type="button" role="menuitemradio" aria-checked="false" data-theme="${t.id}">
      <span class="swatch" style="--a:${t.a};--b:${t.b}"></span>${t.name}
    </button>`).join('');
  applyTheme(document.documentElement.dataset.theme);
}

function setMenu(open) {
  $('#styleMenu').hidden = !open;
  $('#btnStyles').setAttribute('aria-expanded', String(open));
}

/* =========================================================
   Vollbild
   ========================================================= */
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

function toggleFullscreen() {
  const el = document.documentElement;
  if (!fsElement()) {
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

function updateFullscreenButton() {
  const on = !!fsElement();
  $('#fsLabel').textContent = on ? 'Vollbild beenden' : 'Vollbild';
  $('#btnFullscreen').setAttribute('aria-pressed', String(on));
  $('#fsIcon').innerHTML = on
    ? '<path fill="currentColor" d="M8 4h2v6H4V8h4V4Zm6 0h2v4h4v2h-6V4ZM4 14h6v6H8v-4H4v-2Zm10 0h6v2h-4v4h-2v-6Z"/>'
    : '<path fill="currentColor" d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z"/>';
}

/* =========================================================
   Start
   ========================================================= */
function init() {
  /* Akkorde */
  buildChordPicker();
  $('#chordPicker').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (b) selectChord(b.dataset.chord);
  });
  bindStrings($('#chordDiagram'), () => state.chord);
  $('#btnDown').addEventListener('click', () => strumChord('down'));
  $('#btnUp').addEventListener('click', () => strumChord('up'));
  $('#btnArp').addEventListener('click', () => strumChord('down', 0.3));
  selectChord('Em', { sound: false });

  /* Zupfen */
  $('#pickChord').innerHTML = Object.keys(CHORDS)
    .map(k => `<option value="${k}">${k} (${CHORDS[k].name})</option>`).join('');
  $('#patternList').innerHTML = PATTERNS
    .map(p => `<button class="chip wide" type="button" data-pattern="${p.id}" aria-pressed="false">${p.name}</button>`).join('');
  const syncPatternChips = () => $$('#patternList .chip')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pattern === pick.pattern)));
  syncPatternChips();
  renderTabGrid();

  $('#pickChord').addEventListener('change', e => { pick.chord = e.target.value; renderTabGrid(); });
  $('#patternList').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    pick.pattern = b.dataset.pattern;
    syncPatternChips();
    renderTabGrid();
  });
  $('#pickBpm').addEventListener('input', e => {
    pick.bpm = +e.target.value;
    $('#pickBpmOut').textContent = pick.bpm;
  });
  $('#btnPickPlay').addEventListener('click', () => {
    if (pickSeq.running) { stopPick(); } else { pickSeq.start(); setPickRunning(true); }
  });
  bindStrings($('#pickDiagram'), () => pick.chord);

  /* Wechseln */
  $('#progSel').innerHTML = PROGRESSIONS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
  resetChange();
  bindStrings($('#nowDiagram'), () => chg.shown);

  $('#progSel').addEventListener('change', e => { stopChange(); chg.prog = +e.target.value; resetChange(); });
  $('#bpcSel').addEventListener('change', e => { stopChange(); chg.bpc = +e.target.value; resetChange(); });
  $('#strumSel').addEventListener('change', e => { chg.strum = e.target.value; });
  $('#chgBpm').addEventListener('input', e => {
    chg.bpm = +e.target.value;
    $('#chgBpmOut').textContent = chg.bpm;
  });
  $('#btnChangePlay').addEventListener('click', () => {
    if (changeSeq.running) {
      stopChange();
    } else {
      chg.changes = 0;
      $('#changeCount').textContent = '';
      changeSeq.start();
      setChangeRunning(true);
    }
  });

  /* Stimmen */
  buildTuning();
  $('#tuningRow').addEventListener('click', e => {
    const b = e.target.closest('.tune');
    if (!b) return;
    const s = +b.dataset.s;
    Sound.pluck(s, 0, Sound.ensure().currentTime + 0.005, 1.3);
    markTune(s);
  });
  $('#btnTuneAll').addEventListener('click', () => {
    const c = Sound.ensure();
    [6, 5, 4, 3, 2, 1].forEach((s, k) => {
      Sound.pluck(s, 0, c.currentTime + 0.05 + k * 1.1, 1.3);
      markTune(s, 50 + k * 1100);
    });
  });

  /* Tabs */
  $$('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const cur = TAB_ORDER.findIndex(t => $(`#tab-${t}`).getAttribute('aria-selected') === 'true');
    const step = e.key === 'ArrowRight' ? 1 : -1;
    showTab(TAB_ORDER[(cur + step + TAB_ORDER.length) % TAB_ORDER.length], true);
    e.preventDefault();
  });

  /* Lautstärke */
  $('#vol').addEventListener('input', e => Sound.setVolume(e.target.value / 100));

  /* Styles */
  buildStyleMenu();
  $('#btnStyles').addEventListener('click', e => {
    e.stopPropagation();
    setMenu($('#styleMenu').hidden);
  });
  $('#styleMenu').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) applyTheme(b.dataset.theme);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.menu-wrap')) setMenu(false);
  });

  /* Vollbild */
  const fsBtn = $('#btnFullscreen');
  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) fsBtn.hidden = true;
  fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

  /* Tastatur */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setMenu(false);
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey
        && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && !fsBtn.hidden) {
      toggleFullscreen();
    }
  });

  /* Audio beim ersten Tippen freischalten, im Hintergrund alles anhalten */
  ['pointerup', 'keydown', 'touchend'].forEach(ev =>
    document.addEventListener(ev, () => Sound.ensure(), { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopPick(); stopChange(); }
  });
}

document.addEventListener('DOMContentLoaded', init);

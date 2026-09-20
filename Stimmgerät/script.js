'use strict';

/* =========================================================
   Stimmgerät – Skript
   Tonhöhe per YIN-Verfahren aus dem Mikrofon, Referenztöne
   per Web Audio. Alles läuft lokal im Browser.
   ========================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------------------
   Daten (Töne als MIDI-Nummern, A4 = 69)
   Die Saiten stehen in der Reihenfolge ihrer Nummerierung
   von der höchsten Saitennummer zur niedrigsten.
   --------------------------------------------------------- */
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B', 'H'];

const INSTRUMENTS = {
  gitarre: {
    tunings: [
      { id: 'std',    name: 'Standard (E A D G H E)',              notes: [40, 45, 50, 55, 59, 64] },
      { id: 'dropd',  name: 'Drop D (D A D G H E)',                notes: [38, 45, 50, 55, 59, 64] },
      { id: 'halb',   name: 'Halbton tiefer (Es As Des Ges B Es)', notes: [39, 44, 49, 54, 58, 63],
        names: ['Es', 'As', 'Des', 'Ges', 'B', 'Es'] },
      { id: 'dadgad', name: 'DADGAD',                              notes: [38, 45, 50, 55, 57, 62] },
      { id: 'openg',  name: 'Open G (D G D G H D)',                notes: [38, 43, 50, 55, 59, 62] },
    ],
  },
  ukulele: {
    tunings: [
      { id: 'std',       name: 'Standard (G C E A)',          notes: [67, 60, 64, 69] },
      { id: 'lowg',      name: 'Low G (tiefes G, C E A)',     notes: [55, 60, 64, 69] },
      { id: 'bariton',   name: 'Bariton (D G H E)',           notes: [50, 55, 59, 64] },
      { id: 'dstimmung', name: 'D-Stimmung (A D Fis H)',      notes: [69, 62, 66, 71], names: ['A', 'D', 'F♯', 'H'] },
    ],
  },
};

const THEMES = [
  { id: 'gold',     name: 'Gold auf Schwarz', a: '#0d0b08', b: '#d9a83a', bar: '#0d0b08' },
  { id: 'sunburst', name: 'Sunburst',         a: '#140804', b: '#ff8a3d', bar: '#140804' },
  { id: 'nacht',    name: 'Nachtblau',        a: '#060a14', b: '#6fb4ff', bar: '#060a14' },
  { id: 'wald',     name: 'Waldgrün',         a: '#08110b', b: '#a4d65e', bar: '#08110b' },
  { id: 'nylon',    name: 'Nylon hell',       a: '#e9e5d8', b: '#0f6b62', bar: '#e9e5d8' },
];

const TOLERANCE = 5;      // Cent, ab hier gilt eine Saite als gestimmt
const HOLD_MS   = 900;    // so lange muss der Ton sauber stehen für das Häkchen

/* ---------------------------------------------------------
   Zustand und Einstellungen
   --------------------------------------------------------- */
const S = {
  inst: 'gitarre',
  tuning: { gitarre: 'std', ukulele: 'std' },
  a4: 440,
  mode: 'mic',          // 'mic' | 'tone'
  sel: 'auto',          // 'auto' | 'chrom' | Saitenindex
  done: new Set(),
  detIdx: -1,
  toneIdx: null,
};

function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem('stimm-settings') || '{}');
    if (INSTRUMENTS[o.inst]) S.inst = o.inst;
    if (o.tuning) Object.assign(S.tuning, o.tuning);
    if (o.a4 >= 415 && o.a4 <= 466) S.a4 = o.a4;
  } catch (e) { /* Standardwerte */ }
}

function saveSettings() {
  try {
    localStorage.setItem('stimm-settings', JSON.stringify({ inst: S.inst, tuning: S.tuning, a4: S.a4 }));
  } catch (e) { /* ohne Speicher weiter */ }
}

const currentTuning = () => {
  const list = INSTRUMENTS[S.inst].tunings;
  return list.find(t => t.id === S.tuning[S.inst]) || list[0];
};

const hz = midi => S.a4 * Math.pow(2, (midi - 69) / 12);
const noteLabel = (t, i) => (t.names && t.names[i]) || NAMES[t.notes[i] % 12];
const octave = midi => Math.floor(midi / 12) - 1;
const fmtNote = label => label.replace('♯', '<span class="acc">♯</span>');
const fmtHz = f => `${f.toFixed(1).replace('.', ',')} Hz`;

/* ---------------------------------------------------------
   Audio: gemeinsamer Kontext, Referenzton
   --------------------------------------------------------- */
const Snd = (() => {
  let ctx = null;
  let master = null;
  let vol = 0.8;
  let tone = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol * vol;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(freq, onEnd) {
    stop();
    const c = ensure();
    const wave = c.createPeriodicWave(
      new Float32Array(6),
      new Float32Array([0, 1, 0.4, 0.18, 0.08, 0.04])
    );
    const osc = c.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freq;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.04);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    const timer = setTimeout(() => { stop(); if (onEnd) onEnd(); }, 12000);
    tone = { osc, g, timer };
  }

  function stop() {
    if (!tone) return;
    const { osc, g, timer } = tone;
    tone = null;
    clearTimeout(timer);
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.08);
    osc.stop(t + 0.1);
  }

  function setVolume(v) {
    vol = v;
    if (master) master.gain.value = v * v;
  }

  return { ensure, play, stop, setVolume, get playing() { return tone !== null; } };
})();

/* ---------------------------------------------------------
   Tonhöhenerkennung (YIN)
   --------------------------------------------------------- */
function yin(x, sr) {
  const W = x.length >> 1;
  const tauMax = Math.min(W - 1, Math.floor(sr / 60));
  const tauMin = Math.max(2, Math.floor(sr / 1200));
  const d = new Float32Array(tauMax + 2);

  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let j = 0; j < W; j++) {
      const v = x[j] - x[j + tau];
      sum += v * v;
    }
    d[tau] = sum;
  }

  let run = 0;
  d[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    run += d[tau];
    d[tau] = run ? (d[tau] * tau) / run : 1;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < 0.12) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return -1;

  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const s0 = d[tau - 1], s1 = d[tau], s2 = d[tau + 1];
    const den = s0 - 2 * s1 + s2;
    if (den !== 0) better = tau + (s0 - s2) / (2 * den);
  }
  return sr / better;
}

const median = arr => {
  const a = [...arr].sort((p, q) => p - q);
  return a[Math.floor(a.length / 2)];
};

/* ---------------------------------------------------------
   Mikrofon
   --------------------------------------------------------- */
const Mic = (() => {
  let stream = null, src = null, an = null, buf = null, timer = null, wake = null;
  let hist = [];
  let lastValid = 0;
  const handlers = { freq: () => {}, silence: () => {} };

  function detect() {
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();

    let f = -1;
    if (rms >= 0.008) f = yin(buf, an.context.sampleRate);

    if (f < 60 || f > 1200) {
      if (now - lastValid > 450) { hist = []; handlers.silence(); }
      return;
    }
    hist.push(f);
    if (hist.length > 5) hist.shift();
    lastValid = now;
    handlers.freq(median(hist));
  }

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw Object.assign(new Error('nosupport'), { name: 'NoSupport' });
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const ctx = Snd.ensure();
    src = ctx.createMediaStreamSource(stream);
    an = ctx.createAnalyser();
    an.fftSize = 4096;
    buf = new Float32Array(an.fftSize);
    src.connect(an);
    hist = [];
    lastValid = 0;
    timer = setInterval(detect, 50);
    try {
      if ('wakeLock' in navigator) wake = await navigator.wakeLock.request('screen');
    } catch (e) { /* Bildschirm darf ausgehen */ }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (src) { src.disconnect(); src = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (wake) { wake.release().catch(() => {}); wake = null; }
    an = null;
  }

  return { start, stop, handlers, get on() { return timer !== null; } };
})();

/* ---------------------------------------------------------
   Zeigerinstrument
   --------------------------------------------------------- */
const CX = 200, CY = 220, R = 180, DEG_PER_CENT = 1.4;
const needle = { cur: 0, target: 0 };

function buildGauge() {
  const pt = (deg, r) => [CX + r * Math.sin(deg * Math.PI / 180), CY - r * Math.cos(deg * Math.PI / 180)];
  const arc = (a0, a1, r) => {
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  let s = `<path class="g-band" d="${arc(-70, 70, R)}"/>`;
  s += `<path class="g-zone" d="${arc(-TOLERANCE * DEG_PER_CENT, TOLERANCE * DEG_PER_CENT, R)}"/>`;

  for (let c = -50; c <= 50; c += 5) {
    const major = c % 10 === 0;
    const a = c * DEG_PER_CENT;
    const [x1, y1] = pt(a, R - 16);
    const [x2, y2] = pt(a, R - 16 - (major ? 18 : 9));
    s += `<line class="g-tick${major ? ' major' : ''}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
  }
  [-50, -25, 0, 25, 50].forEach(c => {
    const [x, y] = pt(c * DEG_PER_CENT, R - 52);
    const txt = c === 0 ? '0' : (c > 0 ? '+' : '−') + Math.abs(c);
    s += `<text class="g-label" x="${x.toFixed(2)}" y="${(y + 5).toFixed(2)}">${txt}</text>`;
  });
  s += `<text class="g-acc" x="34" y="186">♭</text><text class="g-acc" x="366" y="186">♯</text>`;
  s += `<g id="needle" transform="rotate(0 ${CX} ${CY})">`
     + `<line class="g-needle" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 30}"/>`
     + `<circle class="g-hub" cx="${CX}" cy="${CY}" r="13"/></g>`;
  $('#gauge').innerHTML = s;
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function frame() {
  const d = needle.target - needle.cur;
  if (Math.abs(d) > 0.02) {
    needle.cur += reduceMotion ? d : d * 0.22;
    const el = $('#needle');
    if (el) el.setAttribute('transform', `rotate(${needle.cur.toFixed(2)} ${CX} ${CY})`);
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------
   Auswertung: Welche Saite, wie weit daneben?
   --------------------------------------------------------- */
const fold = c => ((((c + 600) % 1200) + 1200) % 1200) - 600;

function evaluate(f) {
  const t = currentTuning();

  if (S.sel === 'chrom') {
    const mf = 69 + 12 * Math.log2(f / S.a4);
    const m = Math.round(mf);
    return {
      idx: -1,
      cents: (mf - m) * 100,
      label: NAMES[((m % 12) + 12) % 12],
      oct: octave(m),
      target: hz(m),
    };
  }

  let idx;
  if (typeof S.sel === 'number') {
    idx = S.sel;
  } else {
    let best = null;
    t.notes.forEach((m, i) => {
      const raw = 1200 * Math.log2(f / hz(m));
      const c = { i, fc: fold(raw), ar: Math.abs(raw) };
      const diff = Math.abs(c.fc) - (best ? Math.abs(best.fc) : Infinity);
      if (!best || diff < -1 || (Math.abs(diff) <= 1 && c.ar < best.ar)) best = c;
    });
    idx = best.i;
  }

  const m = t.notes[idx];
  return {
    idx,
    cents: fold(1200 * Math.log2(f / hz(m))),
    label: noteLabel(t, idx),
    oct: octave(m),
    target: hz(m),
  };
}

/* ---------------------------------------------------------
   Anzeige
   --------------------------------------------------------- */
let hold = { idx: -1, since: 0 };
let lastStatus = '';

function setText(id, value) {
  const el = $(id);
  if (el.textContent !== value) el.textContent = value;
}

function setStatus(txt) {
  if (txt !== lastStatus) { $('#statusText').textContent = txt; lastStatus = txt; }
}

function showReading(f) {
  const r = evaluate(f);
  const inTune = Math.abs(r.cents) <= TOLERANCE;
  const tuner = $('#tuner');
  tuner.classList.remove('idle');
  tuner.classList.toggle('intune', inTune);

  const noteHtml = fmtNote(r.label);
  if ($('#noteName').innerHTML !== noteHtml) $('#noteName').innerHTML = noteHtml;
  setText('#noteOct', String(r.oct));

  const rounded = Math.round(r.cents);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  setText('#centsText', `${sign}${Math.abs(rounded)} Cent`);
  setText('#hzNow', fmtHz(f));
  setText('#hzTarget', fmtHz(r.target));

  needle.target = Math.max(-50, Math.min(50, r.cents)) * DEG_PER_CENT;

  const chrom = S.sel === 'chrom';
  if (inTune) setStatus('Gestimmt');
  else if (r.cents < 0) setStatus(chrom ? 'Zu tief' : 'Zu tief – Saite anziehen');
  else setStatus(chrom ? 'Zu hoch' : 'Zu hoch – Saite lockern');

  if (S.detIdx !== r.idx) { S.detIdx = r.idx; renderStringState(); }

  const now = performance.now();
  if (r.idx >= 0 && inTune) {
    if (hold.idx !== r.idx) hold = { idx: r.idx, since: now };
    else if (now - hold.since >= HOLD_MS && !S.done.has(r.idx)) {
      S.done.add(r.idx);
      renderStringState();
    }
  } else {
    hold.idx = -1;
  }
}

function showIdle() {
  const tuner = $('#tuner');
  tuner.classList.add('idle');
  tuner.classList.remove('intune');
  needle.target = 0;
  hold.idx = -1;

  $('#noteName').textContent = '–';
  setText('#noteOct', '');
  setText('#centsText', '');
  setText('#hzNow', '– Hz');

  const t = currentTuning();
  setText('#hzTarget', typeof S.sel === 'number' ? fmtHz(hz(t.notes[S.sel])) : '– Hz');

  if (!Mic.on) setStatus('Das Mikrofon ist aus.');
  else if (S.done.size === t.notes.length) setStatus('Alle Saiten gestimmt. Zur Sicherheit noch eine Runde prüfen.');
  else setStatus('Spiele eine Saite an.');

  if (S.detIdx !== -1) { S.detIdx = -1; renderStringState(); }
}

function showTone() {
  const tuner = $('#tuner');
  const t = currentTuning();
  tuner.classList.remove('intune');
  needle.target = 0;
  setText('#centsText', '');
  setText('#hzNow', '– Hz');

  if (S.toneIdx === null) {
    tuner.classList.add('idle');
    $('#noteName').textContent = '–';
    setText('#noteOct', '');
    setText('#hzTarget', '– Hz');
    setStatus('Tippe eine Saite, um ihren Ton zu hören.');
  } else {
    tuner.classList.remove('idle');
    $('#noteName').innerHTML = fmtNote(noteLabel(t, S.toneIdx));
    setText('#noteOct', String(octave(t.notes[S.toneIdx])));
    setText('#hzTarget', fmtHz(hz(t.notes[S.toneIdx])));
    setStatus('Referenzton läuft. Stimme die Saite auf diesen Ton.');
  }
}

/* ---------------------------------------------------------
   Saitenauswahl
   --------------------------------------------------------- */
function renderStrings() {
  const t = currentTuning();
  const n = t.notes.length;
  let html = `<button type="button" class="s-chip mode" data-sel="auto" aria-pressed="false">
      <span class="s-note">Auto</span><span class="s-sub">erkennt Saite</span></button>`;
  t.notes.forEach((m, i) => {
    html += `<button type="button" class="s-chip" data-sel="${i}" aria-pressed="false">
      <span class="s-check" aria-hidden="true">✓</span>
      <span class="s-note">${fmtNote(noteLabel(t, i))}<sub>${octave(m)}</sub></span>
      <span class="s-sub">${n - i}. Saite</span></button>`;
  });
  html += `<button type="button" class="s-chip mode" data-sel="chrom" aria-pressed="false">
      <span class="s-note">Alle Töne</span><span class="s-sub">chromatisch</span></button>`;
  $('#stringRow').innerHTML = html;
  renderStringState();
}

function renderStringState() {
  const tone = S.mode === 'tone';
  $$('#stringRow .s-chip').forEach(b => {
    const key = b.dataset.sel;
    const isMode = key === 'auto' || key === 'chrom';
    const idx = isMode ? -2 : +key;
    b.disabled = tone && isMode;
    const pressed = !tone && String(S.sel) === key;
    b.setAttribute('aria-pressed', String(pressed));
    b.classList.toggle('done', !isMode && S.done.has(idx));
    b.classList.toggle('det', !tone && S.sel === 'auto' && S.detIdx === idx);
    b.classList.toggle('playing', tone && S.toneIdx === idx);
  });
  $('#btnClearDone').hidden = S.done.size === 0;
  $('#stringHint').textContent = tone
    ? 'Tippe eine Saite, um ihren Ton zu hören. Tippe erneut, um ihn zu stoppen.'
    : 'Auto erkennt die nächstliegende Saite. Tippe eine Saite an, um gezielt darauf zu stimmen. Ein Häkchen erscheint, wenn der Ton eine Sekunde lang sauber steht.';
}

function resetReading() {
  S.detIdx = -1;
  hold.idx = -1;
  if (S.mode === 'tone') showTone(); else showIdle();
  renderStringState();
}

/* ---------------------------------------------------------
   Steuerung
   --------------------------------------------------------- */
function showError(msg) {
  const el = $('#micError');
  el.textContent = msg || '';
  el.hidden = !msg;
}

async function startMic() {
  const btn = $('#btnMic');
  showError('');
  btn.disabled = true;
  try {
    await Mic.start();
    btn.textContent = 'Mikrofon stoppen';
    btn.classList.add('running');
    showIdle();
  } catch (e) {
    const msg = {
      NotAllowedError: 'Der Zugriff auf das Mikrofon wurde verweigert. Erlaube ihn in den Browser-Einstellungen und starte erneut.',
      SecurityError:   'Der Zugriff auf das Mikrofon wurde verweigert. Erlaube ihn in den Browser-Einstellungen und starte erneut.',
      NotFoundError:   'Es wurde kein Mikrofon gefunden.',
      NotReadableError:'Das Mikrofon wird gerade von einer anderen Anwendung benutzt.',
      NoSupport:       'Dieser Browser bietet keinen Mikrofonzugriff. Das Stimmgerät braucht eine sichere Seite (https oder localhost).',
    }[e.name] || 'Das Mikrofon konnte nicht gestartet werden.';
    showError(msg);
    Mic.stop();
  } finally {
    btn.disabled = false;
  }
}

function stopMic() {
  Mic.stop();
  const btn = $('#btnMic');
  btn.textContent = 'Mikrofon starten';
  btn.classList.remove('running');
  showIdle();
}

function stopTone() {
  Snd.stop();
  S.toneIdx = null;
}

function setMode(mode) {
  S.mode = mode;
  $$('#modeSeg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  const isTone = mode === 'tone';
  $('#btnMic').hidden = isTone;
  showError('');
  if (isTone) { if (Mic.on) stopMic(); showTone(); }
  else { stopTone(); showIdle(); }
  renderStringState();
}

function fillTunings() {
  const sel = $('#tuningSel');
  sel.innerHTML = INSTRUMENTS[S.inst].tunings
    .map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  sel.value = currentTuning().id;
}

function tuningChanged() {
  stopTone();
  S.sel = 'auto';
  S.done.clear();
  S.detIdx = -1;
  renderStrings();
  resetReading();
  saveSettings();
}

function setInstrument(inst) {
  S.inst = inst;
  $$('#instSeg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.inst === inst)));
  fillTunings();
  tuningChanged();
}

function setA4(v) {
  S.a4 = Math.max(415, Math.min(466, v));
  $('#a4Out').textContent = `${S.a4} Hz`;
  if (S.mode === 'tone' && S.toneIdx !== null) {
    Snd.play(hz(currentTuning().notes[S.toneIdx]), () => { S.toneIdx = null; resetReading(); });
  }
  resetReading();
  saveSettings();
}

/* ---------------------------------------------------------
   Styles-Menü
   --------------------------------------------------------- */
function applyTheme(id) {
  const th = THEMES.find(t => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = th.id;
  $('meta[name="theme-color"]').setAttribute('content', th.bar);
  try { localStorage.setItem('stimm-style', th.id); } catch (e) { /* ohne Speicher weiter */ }
  $$('#styleMenu button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.theme === th.id)));
}

function buildStyleMenu() {
  $('#styleMenu').innerHTML = THEMES.map(t => `
    <button type="button" role="menuitemradio" aria-checked="false" data-theme="${t.id}">
      <span class="swatch" style="--a:${t.a};--b:${t.b}"></span>${t.name}
    </button>`).join('');
  applyTheme(document.documentElement.dataset.theme);
}

function setMenu(open) {
  $('#styleMenu').hidden = !open;
  $('#btnStyles').setAttribute('aria-expanded', String(open));
}

/* ---------------------------------------------------------
   Vollbild
   --------------------------------------------------------- */
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

function toggleFullscreen() {
  const el = document.documentElement;
  if (!fsElement()) (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
}

function updateFullscreenButton() {
  const on = !!fsElement();
  $('#fsLabel').textContent = on ? 'Vollbild beenden' : 'Vollbild';
  $('#btnFullscreen').setAttribute('aria-pressed', String(on));
  $('#fsIcon').innerHTML = on
    ? '<path fill="currentColor" d="M8 4h2v6H4V8h4V4Zm6 0h2v4h4v2h-6V4ZM4 14h6v6H8v-4H4v-2Zm10 0h6v2h-4v4h-2v-6Z"/>'
    : '<path fill="currentColor" d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z"/>';
}

/* ---------------------------------------------------------
   Start
   --------------------------------------------------------- */
function init() {
  loadSettings();
  buildGauge();
  requestAnimationFrame(frame);

  Mic.handlers.freq = showReading;
  Mic.handlers.silence = showIdle;

  /* Instrument, Stimmung, Modus, Kammerton */
  $$('#instSeg button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.inst !== S.inst) setInstrument(b.dataset.inst);
  }));
  $('#tuningSel').addEventListener('change', e => {
    S.tuning[S.inst] = e.target.value;
    tuningChanged();
  });
  $$('#modeSeg button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode !== S.mode) setMode(b.dataset.mode);
  }));
  $('#a4Minus').addEventListener('click', () => setA4(S.a4 - 1));
  $('#a4Plus').addEventListener('click', () => setA4(S.a4 + 1));

  /* Saiten */
  $('#stringRow').addEventListener('click', e => {
    const b = e.target.closest('.s-chip');
    if (!b || b.disabled) return;
    const key = b.dataset.sel;

    if (S.mode === 'tone') {
      const idx = +key;
      if (S.toneIdx === idx) {
        stopTone();
      } else {
        S.toneIdx = idx;
        Snd.play(hz(currentTuning().notes[idx]), () => { S.toneIdx = null; resetReading(); });
      }
      showTone();
      renderStringState();
      return;
    }

    S.sel = (key === 'auto' || key === 'chrom') ? key : +key;
    S.detIdx = -1;
    hold.idx = -1;
    showIdle();
    renderStringState();
  });
  $('#btnClearDone').addEventListener('click', () => {
    S.done.clear();
    resetReading();
  });

  /* Mikrofon und Lautstärke */
  $('#btnMic').addEventListener('click', () => { if (Mic.on) stopMic(); else startMic(); });
  $('#vol').addEventListener('input', e => Snd.setVolume(e.target.value / 100));

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

  /* Mikrofon und Ton anhalten, wenn die Seite verschwindet */
  const release = () => {
    if (Mic.on) stopMic();
    if (Snd.playing) { stopTone(); if (S.mode === 'tone') { showTone(); renderStringState(); } }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  window.addEventListener('pagehide', release);

  /* Erste Darstellung */
  $$('#instSeg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.inst === S.inst)));
  fillTunings();
  $('#a4Out').textContent = `${S.a4} Hz`;
  renderStrings();
  showIdle();
}

document.addEventListener('DOMContentLoaded', init);

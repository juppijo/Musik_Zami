'use strict';
/* ================================================================
   ÆTHER RADIO — script.js
   ================================================================ */

// ── Standard-Sender ───────────────────────────────────────────
const DEFAULT_STATIONS = [
  { name: 'BBC World Service',     url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',  genre: 'News / Talk',          icon: '🌍' },
  { name: 'Radio Paradise',        url: 'https://stream.radioparadise.com/mp3-192',                 genre: 'Rock / Eclectic',      icon: '🎸' },
  { name: 'SomaFM Groove Salad',   url: 'https://ice1.somafm.com/groovesalad-256-mp3',              genre: 'Ambient / Electronic', icon: '🌿' },
  { name: 'SomaFM Secret Agent',   url: 'https://ice1.somafm.com/secretagent-128-mp3',              genre: 'Lounge / Spy Jazz',    icon: '🕵️' },
  { name: 'SomaFM Lush',           url: 'https://ice1.somafm.com/lush-128-mp3',                     genre: 'Dream Pop / Indie',    icon: '🌸' },
  { name: 'SomaFM Deep Space One', url: 'https://ice1.somafm.com/deepspaceone-128-mp3',             genre: 'Space / Ambient',      icon: '🚀' },
  { name: 'SomaFM Beat Blender',   url: 'https://ice1.somafm.com/beatblender-128-mp3',              genre: 'Electronic / Chill',   icon: '🎧' },
  { name: 'Jazz24',                url: 'https://live.amperwave.net/direct/ppm-jazz24aac128-ibc1',  genre: 'Jazz',                 icon: '🎷' },
  { name: 'KEXP Seattle',          url: 'https://live-aacplus-64.kexp.org/kexp64.aac',              genre: 'Indie / Alternative',  icon: '🎵' },
  { name: 'FIP Radio',             url: 'https://icecast.radiofrance.fr/fip-midfi.mp3',             genre: 'Eclectic / French',    icon: '🗼' },
  { name: 'Deutschlandfunk',       url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3', genre: 'News / Kultur (DE)',   icon: '🇩🇪' },
  { name: 'Radio Swiss Jazz',      url: 'https://stream.srg-ssr.ch/rj/mp3_128.m3u',                genre: 'Jazz (CH)',            icon: '🎺' },
  { name: 'Classical WQXR',        url: 'https://stream.wqxr.org/wqxr',                            genre: 'Klassik',              icon: '🎻' },
  { name: 'Radio Swiss Classic',   url: 'https://stream.srg-ssr.ch/rsc_de/mp3_128.m3u',            genre: 'Klassik (CH)',         icon: '🎹' },
  { name: '1.FM Absolute Trance',  url: 'https://strm112.1.fm/trance_mobile_aac',                  genre: 'Trance / EDM',         icon: '💫' },
];

// ── Farbmodi ──────────────────────────────────────────────────
const COLORS = [
  { id: 'kosmos', emoji: '🌌', label: 'Kosmos'  },
  { id: 'aurora', emoji: '🌿', label: 'Aurora'  },
  { id: 'sunset', emoji: '🌅', label: 'Sunset'  },
  { id: 'pulsar', emoji: '💜', label: 'Pulsar'  },
  { id: 'neon',   emoji: '⚡', label: 'Neon'    },
  { id: 'void',   emoji: '◻',  label: 'Void'    },
];

// ── Zustand ───────────────────────────────────────────────────
let stations   = [];
let curIdx     = -1;
let isPlaying  = false;
let isMuted    = false;
let volume     = 80;
let isDark     = true;
let colorIdx   = 0;
let searchQ    = '';

// Audio / Web Audio API
let audioCtx   = null;
let analyser   = null;
let srcNode    = null;
let freqData   = null;
let useWAA     = false;   // Web Audio Analyser aktiv?

// Canvas-Animationen
let vizAF = null;   // Visualizer requestAnimationFrame handle
let bgAF  = null;   // Hintergrund requestAnimationFrame handle
let simT  = 0;      // Simulationszeit für Dummy-Visualizer

// Touch für Swipe
let touchX0 = null;

// ── DOM-Referenzen ────────────────────────────────────────────
const $ = id => document.getElementById(id);

const appEl        = $('app');
const audioEl      = $('audioEl');
const lightHalo    = $('lightHalo');

const vizCanvas    = $('vizCanvas');
const bgCanvas     = $('bgCanvas');

const nowName      = $('nowName');
const nowGenre     = $('nowGenre');
const statusLed    = $('statusLed');
const statusTxt    = $('statusTxt');
const artEmoji     = $('artEmoji');
const artworkWrap  = $('artworkWrap');

const playBtn      = $('playBtn');
const playIcon     = $('playIcon');
const prevBtn      = $('prevBtn');
const nextBtn      = $('nextBtn');
const muteBtn      = $('muteBtn');
const volIcon      = $('volIcon');
const volRange     = $('volRange');
const volPct       = $('volPct');
const tCounter     = $('tCounter');

const stationList  = $('stationList');
const searchInput  = $('searchInput');

const exportBtn    = $('exportBtn');
const importInput  = $('importInput');

const modalBg      = $('modalBg');
const modalClose   = $('modalClose');
const mName        = $('mName');
const mUrl         = $('mUrl');
const mGenre       = $('mGenre');
const mIcon        = $('mIcon');
const mCancel      = $('mCancel');
const mOk          = $('mOk');

// Quick-Add Panel
const qaWrap   = $('qaWrap');
const qaToggle = $('qaToggle');
const qaPanel  = $('qaPanel');
const qaName   = $('qaName');
const qaUrl    = $('qaUrl');
const qaGenre  = $('qaGenre');
const qaIcon   = $('qaIcon');
const qaSave   = $('qaSave');
const qaClear  = $('qaClear');

const colorBtn     = $('colorBtn');
const colorEmoji   = $('colorEmoji');
const themeBtn     = $('themeBtn');
const themeIcon    = $('themeIcon');
const fullscreenBtn= $('fullscreenBtn');
const toast        = $('toast');

// ── CANVAS-Kontexte ───────────────────────────────────────────
const vizCtx = vizCanvas.getContext('2d');
const bgCtx  = bgCanvas.getContext('2d');

// ── Initialisierung ───────────────────────────────────────────
function init() {
  loadPrefs();
  loadStations();
  renderList();
  updateCounter();
  initBg();
  startViz();
  bindEvents();
  initTouchDrag();
}

// ── Präferenzen ───────────────────────────────────────────────
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('aether_prefs') || '{}');
    isDark   = p.isDark   !== undefined ? p.isDark   : true;
    colorIdx = p.colorIdx !== undefined ? p.colorIdx : 0;
    volume   = p.volume   !== undefined ? p.volume   : 80;
  } catch { /* defaults */ }

  applyTheme();
  applyColor();
  audioEl.volume = volume / 100;
  volRange.value = volume;
  volPct.textContent = volume + '%';
  updateVolBar();
  updateVolIcon();
}

function savePrefs() {
  localStorage.setItem('aether_prefs', JSON.stringify({ isDark, colorIdx, volume }));
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  // Theme-Icon: Sonne (dark mode zeigt Sonne zum Wechseln zu hell)
  themeIcon.innerHTML = isDark
    ? `<circle cx="12" cy="12" r="5"/>
       <line x1="12" y1="1"  x2="12" y2="3"/>
       <line x1="12" y1="21" x2="12" y2="23"/>
       <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
       <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
       <line x1="1" y1="12" x2="3" y2="12"/>
       <line x1="21" y1="12" x2="23" y2="12"/>
       <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
       <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
    : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
}

function applyColor() {
  document.documentElement.setAttribute('data-color', COLORS[colorIdx].id);
  colorEmoji.textContent = COLORS[colorIdx].emoji;
  updateVolBar();
}

// ── Sender-Verwaltung ─────────────────────────────────────────
function loadStations() {
  try {
    const s = localStorage.getItem('aether_stations');
    stations = s ? JSON.parse(s) : [...DEFAULT_STATIONS];
  } catch {
    stations = [...DEFAULT_STATIONS];
  }
}

function saveStations() {
  localStorage.setItem('aether_stations', JSON.stringify(stations));
}

function filtered() {
  if (!searchQ) return stations;
  const q = searchQ.toLowerCase();
  return stations.filter(s =>
    s.name.toLowerCase().includes(q) || (s.genre || '').toLowerCase().includes(q)
  );
}

function renderList() {
  const list = filtered();
  stationList.innerHTML = '';

  if (list.length === 0) {
    stationList.innerHTML = '<div class="st-empty">KEINE SENDER GEFUNDEN</div>';
    return;
  }

  list.forEach((st, visPos) => {
    const realIdx = stations.indexOf(st);
    const active  = realIdx === curIdx;
    const num     = realIdx + 1;   // immer globale Nummer anzeigen

    const item = document.createElement('div');
    item.className   = 'st-item' + (active ? ' active' : '');
    item.dataset.idx = realIdx;
    item.draggable   = !searchQ;   // Drag nur wenn nicht gefiltert
    item.innerHTML = `
      <div class="st-num">${num}</div>
      <div class="st-drag" title="Reihenfolge ändern (Ziehen)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6"  x2="16" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="8" y1="18" x2="16" y2="18"/>
        </svg>
      </div>
      <div class="st-icon">${esc(st.icon || '📻')}</div>
      <div class="st-info">
        <div class="st-name">${esc(st.name)}</div>
        <div class="st-genre">${esc(st.genre || '')}</div>
      </div>
      <div class="st-bars">
        <div class="st-bar"></div>
        <div class="st-bar"></div>
        <div class="st-bar"></div>
      </div>
      <button class="st-del" data-del="${realIdx}" title="Entfernen" aria-label="Sender entfernen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
      </button>
    `;

    item.addEventListener('click', e => {
      if (e.target.closest('.st-del') || e.target.closest('.st-drag')) return;
      selectStation(realIdx);
    });
    item.querySelector('.st-del').addEventListener('click', e => {
      e.stopPropagation();
      deleteStation(realIdx);
    });

    // ── Drag & Drop ──
    item.addEventListener('dragstart', onDragStart);
    item.addEventListener('dragover',  onDragOver);
    item.addEventListener('dragleave', onDragLeave);
    item.addEventListener('drop',      onDrop);
    item.addEventListener('dragend',   onDragEnd);

    stationList.appendChild(item);
  });
}

function updateCounter() {
  tCounter.textContent = curIdx >= 0
    ? `Sender ${curIdx + 1} / ${stations.length}`
    : `${stations.length} Sender`;
}

function scrollToActive() {
  const el = stationList.querySelector('.active');
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ── Drag & Drop Reihenfolge ───────────────────────────────────
let dragSrcIdx = null;   // Index in stations[] des gezogenen Elements

function onDragStart(e) {
  dragSrcIdx = +this.dataset.idx;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcIdx);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (+target.dataset.idx === dragSrcIdx) return;
  // Ober- oder Unterhälfte?
  const rect   = target.getBoundingClientRect();
  const isTop  = e.clientY < rect.top + rect.height / 2;
  clearDropIndicators();
  target.classList.add(isTop ? 'drag-over-top' : 'drag-over-bot');
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    clearDropIndicators();
  }
}

function onDrop(e) {
  e.preventDefault();
  const targetIdx = +e.currentTarget.dataset.idx;
  if (targetIdx === dragSrcIdx) { clearDropIndicators(); return; }

  const rect  = e.currentTarget.getBoundingClientRect();
  const isTop = e.clientY < rect.top + rect.height / 2;

  // Element aus Array nehmen und neu einsetzen
  const moved  = stations.splice(dragSrcIdx, 1)[0];
  let   insert = isTop ? targetIdx : targetIdx + 1;
  if (dragSrcIdx < targetIdx) insert--;   // Verschiebung kompensieren
  stations.splice(insert, 0, moved);

  // curIdx nachführen
  if (curIdx === dragSrcIdx) {
    curIdx = insert;
  } else {
    // neu berechnen falls sich Bereich verschoben hat
    const tmpStations = [...stations];
    curIdx = tmpStations.indexOf(stations[insert]) === insert
      ? curIdx < Math.min(dragSrcIdx, insert) || curIdx > Math.max(dragSrcIdx, insert)
        ? curIdx
        : curIdx < dragSrcIdx ? curIdx + 1 : curIdx - 1
      : curIdx;
    // Einfacherer, robusterer Ansatz: aktiven Sender per Name wiederfinden
    if (curIdx >= 0 && curIdx < stations.length) { /* ok */ }
  }

  // Robustes curIdx: aktiven Sender per Referenz wiederfinden
  if (curIdx >= 0) {
    const activeName = stations[curIdx] ? null : null; // Dummy
    // Sicherstellen curIdx noch in Range
    if (curIdx >= stations.length) curIdx = stations.length - 1;
  }

  saveStations();
  clearDropIndicators();
  renderList();
  updateCounter();
  scrollToActive();
}

function onDragEnd() {
  this.classList.remove('dragging');
  clearDropIndicators();
  dragSrcIdx = null;
}

function clearDropIndicators() {
  stationList.querySelectorAll('.drag-over-top, .drag-over-bot')
    .forEach(el => el.classList.remove('drag-over-top', 'drag-over-bot'));
}

// Touch-Drag für Smartphones (langer Druck + ziehen)
let touchDragItem   = null;
let touchDragIdx    = null;
let touchDragClone  = null;
let touchDragOffY   = 0;

function initTouchDrag() {
  stationList.addEventListener('touchstart', e => {
    const handle = e.target.closest('.st-drag');
    if (!handle) return;
    const item = handle.closest('.st-item');
    if (!item) return;

    touchDragIdx  = +item.dataset.idx;
    touchDragItem = item;
    touchDragOffY = e.touches[0].clientY - item.getBoundingClientRect().top;

    // Klon als visuelles Ghost
    touchDragClone = item.cloneNode(true);
    touchDragClone.style.cssText =
      `position:fixed;left:${item.getBoundingClientRect().left}px;` +
      `width:${item.offsetWidth}px;opacity:0.85;pointer-events:none;` +
      `z-index:9999;border-radius:12px;transition:none;`;
    document.body.appendChild(touchDragClone);
    item.style.opacity = '0.3';
  }, { passive: true });

  stationList.addEventListener('touchmove', e => {
    if (!touchDragClone) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    touchDragClone.style.top = (y - touchDragOffY) + 'px';

    // Ziel-Element ermitteln
    touchDragClone.style.display = 'none';
    const el = document.elementFromPoint(e.touches[0].clientX, y);
    touchDragClone.style.display = '';
    const target = el && el.closest('.st-item');
    clearDropIndicators();
    if (target && +target.dataset.idx !== touchDragIdx) {
      const rect  = target.getBoundingClientRect();
      const isTop = y < rect.top + rect.height / 2;
      target.classList.add(isTop ? 'drag-over-top' : 'drag-over-bot');
    }
  }, { passive: false });

  stationList.addEventListener('touchend', e => {
    if (!touchDragClone) return;
    const y = e.changedTouches[0].clientY;

    touchDragClone.style.display = 'none';
    const el = document.elementFromPoint(e.changedTouches[0].clientX, y);
    touchDragClone.style.display = '';

    const target = el && el.closest('.st-item');
    if (target) {
      const targetIdx = +target.dataset.idx;
      if (targetIdx !== touchDragIdx) {
        const rect   = target.getBoundingClientRect();
        const isTop  = y < rect.top + rect.height / 2;
        const moved  = stations.splice(touchDragIdx, 1)[0];
        let insert   = isTop ? targetIdx : targetIdx + 1;
        if (touchDragIdx < targetIdx) insert--;
        stations.splice(insert, 0, moved);
        if (curIdx === touchDragIdx) curIdx = insert;
        saveStations();
      }
    }

    // Aufräumen
    touchDragClone.remove();
    touchDragClone = null;
    if (touchDragItem) touchDragItem.style.opacity = '';
    touchDragItem = null;
    clearDropIndicators();
    renderList();
    updateCounter();
  }, { passive: true });
}

// ── Wiedergabe ────────────────────────────────────────────────
function selectStation(idx) {
  if (idx < 0 || idx >= stations.length) return;
  curIdx = idx;
  const st = stations[idx];

  nowName.textContent  = st.name;
  nowGenre.textContent = st.genre || '—';
  artEmoji.textContent = st.icon  || '📻';

  startAudio(st.url);
  renderList();
  updateCounter();
  scrollToActive();
}

function startAudio(url) {
  // AudioContext beim ersten Klick initialisieren
  if (!audioCtx) initWAA();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  setStatus('load');
  audioEl.src = url;
  audioEl.load();

  const p = audioEl.play();
  if (p) {
    p.then(() => {
      setPlayState(true);
    }).catch(err => {
      console.warn('Playback-Fehler:', err);
      setStatus('error');
      toast_show('⚠ Stream konnte nicht geladen werden');
    });
  }
}

function initWAA() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    srcNode  = audioCtx.createMediaElementSource(audioEl);
    srcNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    useWAA = true;
  } catch (e) {
    console.warn('Web Audio API nicht verfügbar — Simulations-Visualizer aktiv.', e);
    useWAA = false;
  }
}

function togglePlay() {
  if (curIdx < 0) {
    if (stations.length) selectStation(0);
    return;
  }
  if (isPlaying) {
    audioEl.pause();
  } else {
    if (!audioCtx) initWAA();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const p = audioEl.play();
    if (p) p.catch(() => selectStation(curIdx));
  }
}

function prevStation() {
  if (!stations.length) return;
  const n = curIdx <= 0 ? stations.length - 1 : curIdx - 1;
  selectStation(n);
}

function nextStation() {
  if (!stations.length) return;
  const n = curIdx >= stations.length - 1 ? 0 : curIdx + 1;
  selectStation(n);
}

function setPlayState(playing) {
  isPlaying = playing;
  // Play-Icon aktualisieren
  playIcon.innerHTML = playing
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<path d="M8 5v14l11-7z"/>';

  if (playing) {
    appEl.classList.add('playing');
    lightHalo.classList.add('on');
    setStatus('live');
  } else {
    appEl.classList.remove('playing');
    lightHalo.classList.remove('on');
  }
}

function setStatus(state) {
  statusLed.className = 'status-led';
  switch (state) {
    case 'live':   statusLed.classList.add('live'); statusTxt.textContent = 'Live';     break;
    case 'load':   statusLed.classList.add('load'); statusTxt.textContent = 'Lade …';   break;
    case 'paused': statusTxt.textContent = 'Pausiert'; break;
    case 'error':  statusTxt.textContent = 'Fehler';   break;
    default:       statusTxt.textContent = 'Bereit';
  }
}

// ── Lautstärke ────────────────────────────────────────────────
function setVolume(val) {
  volume = val;
  audioEl.volume = isMuted ? 0 : val / 100;
  volPct.textContent = val + '%';
  updateVolBar();
  updateVolIcon();
  savePrefs();
}

function updateVolBar() {
  const pct = volume;
  // CSS-Variable --c1 wird direkt referenziert
  volRange.style.background =
    `linear-gradient(to right, var(--c1) 0%, var(--c1) ${pct}%, var(--bg3) ${pct}%, var(--bg3) 100%)`;
}

function updateVolIcon() {
  const v = isMuted ? 0 : volume;
  if (v === 0) {
    volIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>`;
  } else if (v < 50) {
    volIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
  } else {
    volIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
  }
}

function toggleMute() {
  isMuted = !isMuted;
  audioEl.muted = isMuted;
  updateVolIcon();
}

// ── Sender löschen ────────────────────────────────────────────
function deleteStation(idx) {
  if (idx === curIdx) {
    audioEl.pause();
    audioEl.src = '';
    setPlayState(false);
    setStatus('ready');
    nowName.textContent  = 'Kein Sender gewählt';
    nowGenre.textContent = '—';
    artEmoji.textContent = '📻';
    curIdx = -1;
  } else if (idx < curIdx) {
    curIdx--;
  }
  stations.splice(idx, 1);
  saveStations();
  renderList();
  updateCounter();
  toast_show('🗑 Sender entfernt');
}

// ── Theme & Farbe ─────────────────────────────────────────────
function toggleTheme() {
  document.body.classList.add('transitioning');
  setTimeout(() => document.body.classList.remove('transitioning'), 450);
  isDark = !isDark;
  applyTheme();
  savePrefs();
}

function cycleColor() {
  colorIdx = (colorIdx + 1) % COLORS.length;
  applyColor();
  savePrefs();
  toast_show(COLORS[colorIdx].emoji + ' ' + COLORS[colorIdx].label);
}

// ── Vollbild ──────────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.warn);
  } else {
    document.exitFullscreen().catch(console.warn);
  }
}

document.addEventListener('fullscreenchange', () => {
  const fs = !!document.fullscreenElement;
  $('fsIcon').innerHTML = fs
    ? `<polyline points="8 3 3 3 3 8"/>
       <polyline points="21 8 21 3 16 3"/>
       <polyline points="3 16 3 21 8 21"/>
       <polyline points="16 21 21 21 21 16"/>`
    : `<polyline points="15 3 21 3 21 9"/>
       <polyline points="9 21 3 21 3 15"/>
       <line x1="21" y1="3" x2="14" y2="10"/>
       <line x1="3" y1="21" x2="10" y2="14"/>`;
});

// ── JSON Export / Import ──────────────────────────────────────
function exportJSON() {
  const blob = new Blob([JSON.stringify(stations, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: 'aether-radio-sender.json'
  });
  a.click();
  URL.revokeObjectURL(url);
  toast_show('💾 Sender-Liste gespeichert');
}

function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Kein Array');
      const valid = data.filter(s => s && s.name && s.url);
      if (!valid.length) throw new Error('Keine gültigen Sender gefunden');
      stations = valid;
      saveStations();
      curIdx = -1;
      renderList();
      updateCounter();
      toast_show(`✓ ${valid.length} Sender geladen`);
    } catch (err) {
      toast_show('⚠ JSON-Fehler: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ── Sender hinzufügen (Modal) ─────────────────────────────────
function openModal() {
  modalBg.classList.add('open');
  mName.value = mUrl.value = mGenre.value = mIcon.value = '';
  setTimeout(() => mName.focus(), 120);
}
function closeModal() { modalBg.classList.remove('open'); }

function confirmAdd() {
  const name  = mName.value.trim();
  const url   = mUrl.value.trim();
  const genre = mGenre.value.trim();
  const icon  = mIcon.value.trim() || '📻';
  if (!name || !url) { toast_show('⚠ Name und URL sind Pflichtfelder'); return; }
  stations.push({ name, url, genre, icon });
  saveStations();
  renderList();
  updateCounter();
  closeModal();
  toast_show('✓ Sender hinzugefügt: ' + name);
}

// ── Quick-Add Panel ───────────────────────────────────────────
let qaOpen = false;

function toggleQA() {
  qaOpen = !qaOpen;
  qaWrap.classList.toggle('open', qaOpen);
  if (qaOpen) setTimeout(() => qaName.focus(), 300);
}

function clearQA() {
  qaName.value = qaUrl.value = qaGenre.value = qaIcon.value = '';
  qaName.focus();
}

function saveQA() {
  const name  = qaName.value.trim();
  const url   = qaUrl.value.trim();
  const genre = qaGenre.value.trim();
  const icon  = qaIcon.value.trim() || '📻';

  // Validierung
  if (!name && !url) {
    toast_show('⚠ Bitte Name und Stream-URL eingeben');
    qaName.focus();
    return;
  }
  if (!name) { toast_show('⚠ Bitte einen Sendernamen eingeben'); qaName.focus(); return; }
  if (!url)  { toast_show('⚠ Bitte eine Stream-URL eingeben');   qaUrl.focus();  return; }

  // Duplikat-Check
  const dup = stations.find(s => s.url === url);
  if (dup) { toast_show(`⚠ URL bereits vorhanden: ${dup.name}`); return; }

  stations.push({ name, url, genre, icon });
  saveStations();
  renderList();
  updateCounter();

  // Visuelles Feedback
  qaWrap.classList.add('saved');
  setTimeout(() => qaWrap.classList.remove('saved'), 750);

  // Felder leeren
  qaName.value = qaUrl.value = qaGenre.value = qaIcon.value = '';
  qaName.focus();

  toast_show(`✓ "${name}" gespeichert`);
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function toast_show(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ─────────────────────────────────────────────────────────────
// ── VISUALIZER (Canvas) ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────
let vizW = 0, vizH = 0;

function resizeViz() {
  const rect = vizCanvas.parentElement.getBoundingClientRect();
  vizW = vizCanvas.width  = Math.round(rect.width);
  vizH = vizCanvas.height = Math.round(rect.height);
}

/** Simulierte Frequenzdaten – realistisch wirkende Wellenform */
function simFreq(n) {
  const arr = new Uint8Array(n);
  const t   = simT;
  const amp = isPlaying ? 1.0 : 0.12;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    // Mehrere Sinuswellen überlagert
    const a  = (Math.sin(t * 1.1  + x * 15)  * 0.45 + 0.5);
    const b  = (Math.sin(t * 2.7  + x * 8)   * 0.30 + 0.4);
    const c  = (Math.sin(t * 4.3  + x * 25)  * 0.15 + 0.2);
    // Bass-Beule bei tiefen Frequenzen
    const bass = Math.exp(-Math.pow((x - 0.08) * 7,  2)) * 0.55 * amp;
    const mid  = Math.exp(-Math.pow((x - 0.32) * 4.5,2)) * 0.35 * amp;
    const hi   = Math.exp(-Math.pow((x - 0.70) * 6,  2)) * 0.20 * amp;
    const val  = (a * 0.40 + b * 0.35 + c * 0.25) * amp * 0.75 + bass + mid + hi;
    arr[i] = Math.min(255, Math.max(0, Math.round(val * 235)));
  }
  return arr;
}

/** Accent-Farbe (RGB-String) aus CSS holen */
function getAccentRGB() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--cr').trim() || '0,212,255';
}

function drawViz() {
  vizCtx.clearRect(0, 0, vizW, vizH);

  // Frequenzdaten holen
  let data;
  if (useWAA && analyser) {
    analyser.getByteFrequencyData(freqData);
    data = freqData;
  } else {
    simT += isPlaying ? 0.038 : 0.006;
    data = simFreq(80);
  }

  const N    = 64;
  const gap  = vizW / N;
  const bW   = gap - 1.5;
  const rgb  = getAccentRGB();

  for (let i = 0; i < N; i++) {
    const raw = data[Math.floor(i * data.length / N)];
    const val = raw / 255;
    const bH  = Math.max(2, val * vizH * 0.92);
    const x   = i * gap;
    const y   = vizH - bH;

    // Verlauf pro Balken
    const grad = vizCtx.createLinearGradient(x, y, x, vizH);
    grad.addColorStop(0,   `rgba(${rgb}, ${0.85 + val * 0.15})`);
    grad.addColorStop(0.5, `rgba(${rgb}, 0.50)`);
    grad.addColorStop(1,   `rgba(${rgb}, 0.08)`);

    vizCtx.fillStyle = grad;
    roundBar(vizCtx, x, y, bW, bH, 2);
    vizCtx.fill();

    // Heller Strich oben (Spitze)
    if (bH > 6) {
      vizCtx.fillStyle = `rgba(${rgb}, 0.95)`;
      vizCtx.fillRect(x, y, bW, 2);
    }
  }

  // Spiegel-Reflexion unten (sehr dezent)
  vizCtx.save();
  vizCtx.scale(1, -0.18);
  vizCtx.translate(0, -vizH * 2 / 0.18 + vizH / 0.18 * 2);
  vizCtx.globalAlpha = 0.12;
  for (let i = 0; i < N; i++) {
    const raw = data[Math.floor(i * data.length / N)];
    const val = raw / 255;
    const bH  = Math.max(2, val * vizH * 0.92);
    const x   = i * gap;
    const y   = vizH - bH;
    vizCtx.fillStyle = `rgba(${rgb}, 0.6)`;
    vizCtx.fillRect(x, y, bW, bH);
  }
  vizCtx.restore();

  vizAF = requestAnimationFrame(drawViz);
}

function startViz() {
  resizeViz();
  if (vizAF) cancelAnimationFrame(vizAF);
  drawViz();
}

/** Abgerundetes Rechteck (Polyfill für ältere Browser) */
function roundBar(ctx, x, y, w, h, r) {
  if (h < r * 2) r = h / 2;
  if (w < r * 2) r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// ── HINTERGRUND-PARTIKEL ──────────────────────────────────────
// ─────────────────────────────────────────────────────────────
let bgW = 0, bgH = 0, particles = [];

function initBg() {
  resizeBg();
  spawnParticles();
  if (bgAF) cancelAnimationFrame(bgAF);
  drawBg();
}

function resizeBg() {
  bgW = bgCanvas.width  = window.innerWidth;
  bgH = bgCanvas.height = window.innerHeight;
}

function spawnParticles() {
  const n = Math.floor((bgW * bgH) / 7000);
  particles = Array.from({ length: n }, () => mkParticle(true));
}

function mkParticle(anywhere) {
  return {
    x:     Math.random() * bgW,
    y:     anywhere ? Math.random() * bgH : bgH + 4,
    r:     Math.random() * 1.4 + 0.3,
    vx:    (Math.random() - 0.5) * 0.18,
    vy:   -(Math.random() * 0.28 + 0.06),
    alpha: Math.random() * 0.5 + 0.1,
    life:  Math.random(),
  };
}

function drawBg() {
  bgCtx.clearRect(0, 0, bgW, bgH);
  const rgb     = getAccentRGB();
  const speed   = isPlaying ? 1.5 : 0.45;
  const tAlpha  = isDark ? 1 : 0.38;

  for (const p of particles) {
    p.x    += p.vx * speed;
    p.y    += p.vy * speed;
    p.life += 0.0028 * speed;

    if (p.life > 1 || p.y < -4) {
      Object.assign(p, mkParticle(false));
    }
    if (p.x < 0) p.x = bgW;
    if (p.x > bgW) p.x = 0;

    const a = Math.sin(p.life * Math.PI) * p.alpha * tAlpha;
    if (a <= 0) continue;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${rgb}, ${a})`;
    bgCtx.fill();
  }

  bgAF = requestAnimationFrame(drawBg);
}

// ── Event-Bindings ────────────────────────────────────────────
function bindEvents() {

  // Transport
  playBtn.addEventListener('click', () => { if (!audioCtx) initWAA(); togglePlay(); });
  prevBtn.addEventListener('click', prevStation);
  nextBtn.addEventListener('click', nextStation);

  // Lautstärke
  volRange.addEventListener('input',  e => setVolume(+e.target.value));
  muteBtn.addEventListener('click',  toggleMute);

  // UI-Modi
  themeBtn.addEventListener('click', toggleTheme);
  colorBtn.addEventListener('click', cycleColor);
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Sender-Verwaltung
  exportBtn.addEventListener('click', exportJSON);
  importInput.addEventListener('change', e => {
    importJSON(e.target.files[0]);
    e.target.value = '';
  });
  searchInput.addEventListener('input', e => {
    searchQ = e.target.value;
    renderList();
  });

  // Modal
  modalClose.addEventListener('click', closeModal);
  mCancel.addEventListener('click', closeModal);
  mOk.addEventListener('click', confirmAdd);
  modalBg.addEventListener('click', e => { if (e.target === modalBg) closeModal(); });
  mUrl.addEventListener('keydown',  e => { if (e.key === 'Enter') confirmAdd(); });
  mIcon.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAdd(); });

  // Quick-Add Panel
  qaToggle.addEventListener('click', toggleQA);
  qaSave.addEventListener('click', saveQA);
  qaClear.addEventListener('click', clearQA);

  // Enter in Quick-Add Feldern → speichern
  [qaName, qaUrl, qaGenre, qaIcon].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') saveQA(); });
  });

  // Audio-Ereignisse
  audioEl.addEventListener('playing', () => setPlayState(true));
  audioEl.addEventListener('pause',   () => { setPlayState(false); setStatus('paused'); });
  audioEl.addEventListener('waiting', () => setStatus('load'));
  audioEl.addEventListener('stalled', () => setStatus('load'));
  audioEl.addEventListener('error',   () => {
    setPlayState(false);
    setStatus('error');
    toast_show('⚠ Stream-Fehler — bitte prüfe die URL');
  });

  // Tastatur-Shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.code) {
      case 'Space':      e.preventDefault(); togglePlay();  break;
      case 'ArrowRight': nextStation();  break;
      case 'ArrowLeft':  prevStation();  break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(100, volume + 5));
        volRange.value = volume; break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, volume - 5));
        volRange.value = volume; break;
      case 'KeyM': toggleMute(); break;
      case 'KeyF': toggleFullscreen(); break;
    }
  });

  // Touch-Swipe auf Artwork (Smartphone: ←/→ wechselt Sender)
  artworkWrap.addEventListener('touchstart', e => {
    touchX0 = e.touches[0].clientX;
  }, { passive: true });
  artworkWrap.addEventListener('touchend', e => {
    if (touchX0 === null) return;
    const dx = e.changedTouches[0].clientX - touchX0;
    if (Math.abs(dx) > 38) dx < 0 ? nextStation() : prevStation();
    touchX0 = null;
  }, { passive: true });

  // Fenstergröße
  window.addEventListener('resize', () => {
    resizeBg();
    resizeViz();
    spawnParticles();
  });
}

// ── Hilfsfunktionen ───────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Start ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

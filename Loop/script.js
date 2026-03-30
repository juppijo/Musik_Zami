/* ============================================================
   LOOP MATRIX — script.js
   ============================================================ */
'use strict';

// ── Constants ──────────────────────────────────────────────────
const NUM_LOOPS = 16;

// Per-loop accent colours (independent of theme)
const LC = [
  '#00ff88','#00ccff','#ff3377','#ff9900',
  '#cc44ff','#ffe033','#33ff99','#ff5533',
  '#33bbff','#ff44aa','#aaff33','#ff7733',
  '#44aaff','#ff99cc','#55ffcc','#ffbb44',
];

const THEMES = {
  neon:   { ac:'#00ff88', ac2:'#00cc66', glow:'rgba(0,255,136,.35)',  sub:'rgba(0,255,136,.08)'  },
  cyber:  { ac:'#00d4ff', ac2:'#0099cc', glow:'rgba(0,212,255,.35)',  sub:'rgba(0,212,255,.08)'  },
  plasma: { ac:'#bf00ff', ac2:'#9900cc', glow:'rgba(191,0,255,.35)',  sub:'rgba(191,0,255,.08)'  },
  solar:  { ac:'#ff8800', ac2:'#cc6600', glow:'rgba(255,136,0,.35)',  sub:'rgba(255,136,0,.08)'  },
  rose:   { ac:'#ff0066', ac2:'#cc0044', glow:'rgba(255,0,102,.35)',  sub:'rgba(255,0,102,.08)'  },
};

// ── State ───────────────────────────────────────────────────────
let audioCtx      = null;
let masterGain    = null;
let masterAnalyser= null;
let isLightMode   = false;
let lightSound    = true;
let currentTheme  = 'neon';
let animRunning   = false;
let toastTimer    = null;
const loops       = [];
const rings       = [];          // background pulse rings
const particles   = [];          // floating sparks

// ── BPM Beat State ──────────────────────────────────────────────
let bpm           = 120;
let beatInterval  = 500;         // ms per beat (60000 / bpm)
let lastBeatTime  = 0;           // performance.now() of last beat
let beatPhase     = 0;           // 0..1 decay within one beat
let beatActive    = false;       // true while BPM clock is running

// ── Master Recording State ──────────────────────────────────────
let masterRecorder  = null;
let masterRecChunks = [];
let masterRecording = false;
let masterRecStart  = 0;
let masterRecTick   = null;

// ── Audio Init ──────────────────────────────────────────────────
let masterRecDest = null;   // MediaStreamDestinationNode

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  audioCtx       = new (window.AudioContext || window.webkitAudioContext)();
  masterGain     = audioCtx.createGain();
  masterGain.gain.value = 0.8;
  masterAnalyser = audioCtx.createAnalyser();
  masterAnalyser.fftSize      = 2048;
  masterAnalyser.smoothingTimeConstant = 0.78;
  masterRecDest  = audioCtx.createMediaStreamDestination();

  masterGain.connect(masterAnalyser);
  masterAnalyser.connect(audioCtx.destination);
  masterGain.connect(masterRecDest);   // tap for recording
}

// ── Loop Object ─────────────────────────────────────────────────
function mkLoop(i) {
  return {
    i,
    buf:   null,   // AudioBuffer
    blob:  null,   // original File / Blob (for saving)
    src:   null,   // BufferSourceNode (live)
    gain:  null,   // GainNode
    asr:   null,   // AnalyserNode (per loop)
    looping: true,
    playing: false,
    recording: false,
    vol:   0.8,
    rate:  1.0,
    name:  `LOOP ${String(i+1).padStart(2,'0')}`,
    color: LC[i % LC.length],
    // DOM
    card:null, waveCV:null, vuCV:null,
    playB:null, loopB:null, recB:null,
    volSl:null, rateSl:null,
    volVal:null, rateVal:null,
    nameIn:null, led:null, saveB:null, loadB:null,
  };
}

// ── Build DOM ───────────────────────────────────────────────────
function buildGrid() {
  const grid = document.getElementById('loopGrid');
  grid.innerHTML = '';

  for (let i = 0; i < NUM_LOOPS; i++) {
    const lp = mkLoop(i);
    loops.push(lp);

    const card = document.createElement('div');
    card.className = 'loop-card';
    card.id = `lc${i}`;
    card.style.setProperty('--lc', lp.color);
    lp.card = card;

    card.innerHTML = `
      <div class="card-head">
        <span class="loop-num">◈ ${String(i+1).padStart(2,'0')}</span>
        <input class="loop-name-input" type="text" value="${lp.name}" maxlength="22" spellcheck="false">
        <div class="status-led"></div>
      </div>
      <div class="wave-wrap" title="Klicken: Play / Stop">
        <canvas class="waveform-cv" height="48"></canvas>
      </div>
      <canvas class="vu-cv" height="5"></canvas>
      <div class="ctrl-row">
        <button class="lbtn play-b" title="Play / Stop">▶</button>
        <button class="lbtn loop-b on" title="Loop ein/aus">↺</button>
        <button class="lbtn rec-b"  title="Mikrofon aufnehmen">⏺</button>
        <div class="spacer"></div>
        <button class="lbtn save-b" title="Als WAV speichern">↓</button>
      </div>
      <div class="sliders">
        <div class="sl-row">
          <span class="sl-lbl">VOL</span>
          <input type="range" class="vol-sl" min="0" max="1" step="0.01" value="0.8">
          <span class="sl-val vol-v">80%</span>
        </div>
        <div class="sl-row">
          <span class="sl-lbl">SPEED</span>
          <input type="range" class="rate-sl" min="0.25" max="2" step="0.01" value="1">
          <span class="sl-val rate-v">1.00×</span>
        </div>
      </div>
      <div class="file-row">
        <button class="fbtn load-b">📂 Laden</button>
        <input type="file" class="file-in" accept=".mp3,.wav,.ogg,.flac,audio/*" style="display:none">
      </div>`;

    // Refs
    lp.nameIn  = card.querySelector('.loop-name-input');
    lp.waveCV  = card.querySelector('.waveform-cv');
    lp.vuCV    = card.querySelector('.vu-cv');
    lp.playB   = card.querySelector('.play-b');
    lp.loopB   = card.querySelector('.loop-b');
    lp.recB    = card.querySelector('.rec-b');
    lp.saveB   = card.querySelector('.save-b');
    lp.loadB   = card.querySelector('.load-b');
    lp.volSl   = card.querySelector('.vol-sl');
    lp.rateSl  = card.querySelector('.rate-sl');
    lp.volVal  = card.querySelector('.vol-v');
    lp.rateVal = card.querySelector('.rate-v');
    lp.led     = card.querySelector('.status-led');
    const fileIn = card.querySelector('.file-in');
    const waveWrap = card.querySelector('.wave-wrap');

    // Events
    lp.nameIn.addEventListener('change', () => lp.name = lp.nameIn.value);

    waveWrap.addEventListener('click', () => togglePlay(lp));
    lp.playB.addEventListener('click', () => togglePlay(lp));
    lp.loopB.addEventListener('click', () => {
      lp.looping = !lp.looping;
      lp.loopB.classList.toggle('on', lp.looping);
      if (lp.src) lp.src.loop = lp.looping;
    });
    lp.recB.addEventListener('click', () => toggleRec(lp));
    lp.volSl.addEventListener('input', () => {
      lp.vol = +lp.volSl.value;
      lp.volVal.textContent = Math.round(lp.vol * 100) + '%';
      if (lp.gain) lp.gain.gain.setTargetAtTime(lp.vol, audioCtx.currentTime, 0.02);
    });
    lp.rateSl.addEventListener('input', () => {
      lp.rate = +lp.rateSl.value;
      lp.rateVal.textContent = lp.rate.toFixed(2) + '×';
      if (lp.src) lp.src.playbackRate.value = lp.rate;
    });
    lp.saveB.addEventListener('click', () => saveAudio(lp));
    lp.loadB.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) loadFile(lp, f);
      e.target.value = '';
    });

    // Drag & drop audio onto card
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault(); card.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('audio/')) loadFile(lp, f);
    });

    drawEmptyWave(lp);
    grid.appendChild(card);
  }
}

// ── Waveform Drawing ────────────────────────────────────────────
function canvasBg() {
  return isLightMode ? '#e6e6f4' : '#0c0c1a';
}

function drawEmptyWave(lp) {
  const cv = lp.waveCV;
  cv.width = cv.offsetWidth || 220;
  const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
  ctx.fillStyle = canvasBg();
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = lp.color + '40';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
  ctx.fillStyle   = lp.color + '55';
  ctx.font        = `9px 'Orbitron',monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText('NO AUDIO – DATEI LADEN', w/2, h/2+4);
}

function drawWaveform(lp) {
  if (!lp.buf) { drawEmptyWave(lp); return; }
  const cv = lp.waveCV;
  cv.width = cv.offsetWidth || 220;
  const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;

  ctx.fillStyle = canvasBg();
  ctx.fillRect(0,0,w,h);

  const data = lp.buf.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / w));

  // Fill
  ctx.beginPath();
  ctx.fillStyle = lp.color + '25';
  ctx.moveTo(0, h/2);
  const mxArr = [];
  const mnArr = [];
  for (let x=0; x<w; x++) {
    let mn=1, mx=-1;
    const base = x*step;
    for (let j=0;j<step;j++) { const v=data[base+j]||0; if(v<mn)mn=v; if(v>mx)mx=v; }
    mxArr.push(mx); mnArr.push(mn);
    ctx.lineTo(x, ((1-mx)/2)*h);
  }
  for (let x=w-1; x>=0; x--) ctx.lineTo(x, ((1-mnArr[x])/2)*h);
  ctx.closePath(); ctx.fill();

  // Stroke
  ctx.beginPath();
  ctx.strokeStyle = lp.color;
  ctx.lineWidth = 1;
  for (let x=0; x<w; x++) {
    const y1 = ((1-mxArr[x])/2)*h;
    const y2 = ((1-mnArr[x])/2)*h;
    if (x===0) ctx.moveTo(x,y1);
    ctx.lineTo(x,y1); ctx.lineTo(x,y2);
  }
  ctx.stroke();
}

// ── Load Audio File ─────────────────────────────────────────────
async function loadFile(lp, file) {
  initAudio();
  toast(`⏳ Lade ${file.name.substring(0,28)}…`);
  try {
    const ab = await file.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(ab.slice(0));
    lp.buf  = buf;
    lp.blob = file;
    const rawName = file.name.replace(/\.[^.]+$/, '').substring(0,22);
    lp.name = rawName;
    lp.nameIn.value = rawName;
    lp.loadB.classList.add('has-audio');
    lp.loadB.textContent = '✓ ' + rawName.substring(0,12);
    drawWaveform(lp);
    toast(`✓ Geladen: ${file.name.substring(0,28)}`);
  } catch(e) {
    toast(`✗ Fehler: ${e.message}`);
  }
}

// ── Playback ────────────────────────────────────────────────────
function togglePlay(lp) {
  initAudio();
  lp.playing ? stopLoop(lp) : startLoop(lp);
}

function startLoop(lp) {
  if (!lp.buf) { toast('Kein Audio geladen!'); return; }
  stopLoop(lp);

  lp.gain = audioCtx.createGain();
  lp.gain.gain.value = lp.vol;

  lp.asr = audioCtx.createAnalyser();
  lp.asr.fftSize = 256;
  lp.asr.smoothingTimeConstant = 0.5;

  const src = audioCtx.createBufferSource();
  src.buffer           = lp.buf;
  src.loop             = lp.looping;
  src.playbackRate.value = lp.rate;
  src.connect(lp.gain);
  lp.gain.connect(lp.asr);
  lp.asr.connect(masterGain);
  src.start(0);

  lp.src     = src;
  lp.playing = true;
  updateCardUI(lp);
  if (!beatActive) startBeatClock(); // start BPM clock on first play

  src.onended = () => {
    if (!lp.looping) {
      lp.playing = false;
      lp.src = null;
      updateCardUI(lp);
    }
  };
}

function stopLoop(lp) {
  if (lp.src) { try { lp.src.stop(); } catch(_){} lp.src = null; }
  lp.playing = false;
  updateCardUI(lp);
}

function updateCardUI(lp) {
  const p = lp.playing;
  lp.card.classList.toggle('playing', p);
  lp.playB.classList.toggle('on', p);
  lp.playB.textContent = p ? '■' : '▶';
  if (p) {
    const [r,g,b] = hexRgb(lp.color);
    lp.card.style.boxShadow   = `0 0 22px rgba(${r},${g},${b},.28), inset 0 0 30px rgba(${r},${g},${b},.04)`;
    lp.card.style.borderColor = lp.color + 'aa';
  } else {
    lp.card.style.boxShadow   = '';
    lp.card.style.borderColor = '';
    // clear VU
    clearVU(lp);
  }
}

function clearVU(lp) {
  const cv = lp.vuCV;
  if (!cv) return;
  cv.width = cv.offsetWidth || 200;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = canvasBg();
  ctx.fillRect(0,0,cv.width,cv.height);
}

// ── Recording ───────────────────────────────────────────────────
let mrec  = null;
let mchunks = [];
let mloop   = null;
let mstream = null;

async function toggleRec(lp) {
  initAudio();
  if (lp.recording) { stopRec(); return; }
  // Stop any other recording
  if (mloop && mloop !== lp) stopRec();
  try {
    mstream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) { toast(`Mikrofon: ${e.message}`); return; }

  mchunks = [];
  mrec    = new MediaRecorder(mstream);
  mloop   = lp;
  lp.recording = true;
  lp.recB.classList.add('recording');
  lp.recB.title = 'Aufnahme beenden';

  mrec.ondataavailable = e => { if (e.data.size > 0) mchunks.push(e.data); };
  mrec.onstop = async () => {
    const blob = new Blob(mchunks, { type: 'audio/webm' });
    try {
      const ab  = await blob.arrayBuffer();
      const buf = await audioCtx.decodeAudioData(ab);
      mloop.buf  = buf;
      mloop.blob = blob;
      mloop.name = `REC ${String(mloop.i+1).padStart(2,'0')}`;
      mloop.nameIn.value = mloop.name;
      mloop.loadB.classList.add('has-audio');
      mloop.loadB.textContent = '✓ ' + mloop.name;
      drawWaveform(mloop);
      toast('✓ Aufnahme gespeichert');
    } catch(e) { toast(`Dekodierungsfehler: ${e.message}`); }
    mloop.recording = false;
    mloop.recB.classList.remove('recording');
    mloop.recB.title = 'Mikrofon aufnehmen';
    mloop = null;
    if (mstream) { mstream.getTracks().forEach(t=>t.stop()); mstream=null; }
  };

  mrec.start(100);
  toast('⏺ Aufnahme läuft – nochmal drücken zum Stoppen');
}

function stopRec() {
  if (mrec && mrec.state !== 'inactive') mrec.stop();
}

// ── Save Audio (WAV) ────────────────────────────────────────────
function saveAudio(lp) {
  if (!lp.buf) { toast('Kein Audio zum Speichern!'); return; }
  if (lp.blob) {
    // Save original file directly
    const ext = lp.blob.name
      ? lp.blob.name.replace(/.*\./, '').toLowerCase()
      : (lp.blob.type.includes('mp3') ? 'mp3' : lp.blob.type.includes('wav') ? 'wav' : 'webm');
    dlBlob(lp.blob, `${sanitize(lp.name)}.${ext}`);
    toast(`↓ ${lp.name}.${ext} gespeichert`);
    return;
  }
  const ab  = bufToWav(lp.buf);
  const bl  = new Blob([ab], { type:'audio/wav' });
  dlBlob(bl, `${sanitize(lp.name)}.wav`);
  toast(`↓ ${lp.name}.wav gespeichert`);
}

function dlBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function sanitize(s) { return s.replace(/[\\/:*?"<>|]/g,'_').trim() || 'audio'; }

function bufToWav(buf) {
  const nCh  = Math.min(buf.numberOfChannels, 2);
  const sr   = buf.sampleRate;
  const bps  = 2;  // 16-bit
  const n    = buf.length;
  const data = 44 + n*nCh*bps;
  const ab   = new ArrayBuffer(data);
  const dv   = new DataView(ab);
  const ws   = (o,s) => { for (let i=0;i<s.length;i++) dv.setUint8(o+i,s.charCodeAt(i)); };
  ws(0,'RIFF'); dv.setUint32(4,data-8,true);
  ws(8,'WAVE'); ws(12,'fmt ');
  dv.setUint32(16,16,true); dv.setUint16(20,1,true);
  dv.setUint16(22,nCh,true); dv.setUint32(24,sr,true);
  dv.setUint32(28,sr*nCh*bps,true); dv.setUint16(32,nCh*bps,true);
  dv.setUint16(34,16,true); ws(36,'data'); dv.setUint32(40,n*nCh*bps,true);
  const chs = []; for (let c=0;c<nCh;c++) chs.push(buf.getChannelData(c));
  let off = 44;
  for (let i=0;i<n;i++) {
    for (let c=0;c<nCh;c++) {
      const v = Math.max(-1,Math.min(1,chs[c][i]));
      dv.setInt16(off, v<0 ? v*32768 : v*32767, true);
      off += 2;
    }
  }
  return ab;
}

// ── Session ─────────────────────────────────────────────────────
function saveSession() {
  const s = {
    version:1, theme:currentTheme, dark:!isLightMode,
    masterVol: masterGain ? masterGain.gain.value : 0.8,
    bpm: +document.getElementById('bpmInput').value,
    loops: loops.map(lp => ({
      name:lp.name, vol:lp.vol, rate:lp.rate,
      looping:lp.looping, hasAudio:!!lp.buf
    }))
  };
  const bl = new Blob([JSON.stringify(s,null,2)],{type:'application/json'});
  dlBlob(bl,'loopmatrix_session.json');
  toast('↓ Session gespeichert (Audio-Dateien separat sichern)');
}

function loadSession(json) {
  try {
    const s = JSON.parse(json);
    if (s.theme) applyTheme(s.theme);
    if (s.dark !== undefined) {
      isLightMode = !s.dark;
      document.body.classList.toggle('theme-light', isLightMode);
      loops.forEach(lp => lp.buf ? drawWaveform(lp) : drawEmptyWave(lp));
    }
    if (s.masterVol !== undefined && masterGain) {
      masterGain.gain.value = s.masterVol;
      document.getElementById('masterVolume').value = s.masterVol;
    }
    if (s.bpm) document.getElementById('bpmInput').value = s.bpm;
    s.loops?.forEach((d,i) => {
      if (i >= loops.length) return;
      const lp = loops[i];
      lp.name = d.name||lp.name; lp.nameIn.value = lp.name;
      lp.vol  = d.vol??lp.vol;   lp.volSl.value  = lp.vol;
      lp.volVal.textContent = Math.round(lp.vol*100)+'%';
      lp.rate = d.rate??lp.rate; lp.rateSl.value = lp.rate;
      lp.rateVal.textContent = lp.rate.toFixed(2)+'×';
      lp.looping = d.looping??true;
      lp.loopB.classList.toggle('on', lp.looping);
    });
    toast('✓ Session geladen');
  } catch(e) { toast(`Session-Fehler: ${e.message}`); }
}

// ── Theme ────────────────────────────────────────────────────────
function applyTheme(name) {
  document.body.classList.remove(...Object.keys(THEMES).map(k=>`color-${k}`));
  document.body.classList.add(`color-${name}`);
  currentTheme = name;
  const t = THEMES[name];
  const r = document.documentElement;
  r.style.setProperty('--ac',    t.ac);
  r.style.setProperty('--ac2',   t.ac2);
  r.style.setProperty('--ac-glow', t.glow);
  r.style.setProperty('--ac-sub',  t.sub);
  // Update all range slider thumbs (custom property trick)
  document.querySelectorAll('.color-dot').forEach(b => b.classList.toggle('active', b.dataset.color===name));
}

// ── Fullscreen ───────────────────────────────────────────────────
function toggleFS() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// ── BPM Beat Clock ───────────────────────────────────────────────
function updateBeatClock(now) {
  if (!beatActive) return;
  const elapsed = now - lastBeatTime;
  if (elapsed >= beatInterval) {
    lastBeatTime = now - (elapsed % beatInterval); // keep phase tight
    beatPhase    = 1.0;   // fresh flash
    // Flash header dot
    const dot = document.getElementById('bpmDot');
    if (dot) {
      dot.classList.add('flash');
      setTimeout(() => dot.classList.remove('flash'), Math.min(80, beatInterval * 0.18));
    }
    // Fire beat blinker on all playing cards
    drawBeatBlinker(1.0);
  } else {
    // Exponential decay between beats
    beatPhase = Math.max(0, 1.0 - (elapsed / beatInterval) * 2.2);
  }
}

function drawBeatBlinker(phase) {
  loops.forEach(lp => {
    if (!lp.card) return;
    const [r,g,b] = hexRgb(lp.color);
    if (lp.playing) {
      // Bright flash on beat, fades out
      const a = phase * 0.55;
      lp.card.style.outline = `2px solid rgba(${r},${g},${b},${0.4 + phase * 0.6})`;
      lp.card.style.outlineOffset = `${phase * 4}px`;
    } else {
      // Subtle idle pulse on all cards (dimmer)
      const a = phase * 0.15;
      lp.card.style.outline = `1px solid rgba(${r},${g},${b},${a})`;
      lp.card.style.outlineOffset = `0px`;
    }
  });
}

function startBeatClock() {
  bpm          = Math.max(1, +document.getElementById('bpmInput').value || 120);
  beatInterval = 60000 / bpm;
  lastBeatTime = performance.now();
  beatPhase    = 0;
  beatActive   = true;
}

function stopBeatClock() {
  beatActive = false;
  beatPhase  = 0;
  loops.forEach(lp => {
    if (lp.card) { lp.card.style.outline = ''; lp.card.style.outlineOffset = ''; }
  });
}

// ── Animation Loop ───────────────────────────────────────────────
function startAnim() {
  if (animRunning) return;
  animRunning = true;
  (function loop() {
    if (!animRunning) return;
    requestAnimationFrame(loop);
    const now = performance.now();
    updateBeatClock(now);
    if (beatActive) drawBeatBlinker(beatPhase);
    drawSpectrum();
    drawAllVU();
    if (lightSound) drawBgFx();
  })();
}

// Spectrum Analyzer
const specBuf = new Uint8Array(1024);
function drawSpectrum() {
  if (!masterAnalyser) return;
  const cv = document.getElementById('spectrumCanvas');
  const ctx = cv.getContext('2d');
  if (cv.width !== cv.offsetWidth) cv.width = cv.offsetWidth;
  if (cv.height !== cv.offsetHeight) cv.height = cv.offsetHeight;
  const W = cv.width, H = cv.height;
  if (!W||!H) return;

  masterAnalyser.getByteFrequencyData(specBuf);
  ctx.clearRect(0,0,W,H);

  const bars = Math.min(specBuf.length, Math.floor(W/3));
  const bw   = W / bars;
  const [r,g,b] = hexRgb(THEMES[currentTheme].ac);

  for (let i=0;i<bars;i++) {
    const v  = specBuf[i] / 255;
    const bh = v * H;
    const al = 0.25 + v*0.75;
    ctx.fillStyle = `rgba(${r},${g},${b},${al})`;
    ctx.fillRect(i*bw, H-bh, bw-1, bh);
    if (v > 0.6) {
      ctx.fillStyle = `rgba(${r},${g},${b},${v})`;
      ctx.fillRect(i*bw, H-bh-2, bw-1, 2);
    }
  }
}

// Per-loop VU meters
const vuBuf = new Uint8Array(128);
function drawAllVU() {
  loops.forEach(lp => {
    if (!lp.asr || !lp.playing) return;
    lp.asr.getByteTimeDomainData(vuBuf);
    let max = 0;
    for (let i=0;i<vuBuf.length;i++) { const v=Math.abs(vuBuf[i]-128)/128; if(v>max) max=v; }

    const cv = lp.vuCV;
    cv.width = cv.offsetWidth || 200;
    const ctx = cv.getContext('2d'), w=cv.width, h=cv.height;
    ctx.fillStyle = canvasBg();
    ctx.fillRect(0,0,w,h);

    if (max > 0.004) {
      const grd = ctx.createLinearGradient(0,0,w,0);
      const [r,g,b] = hexRgb(lp.color);
      grd.addColorStop(0,   `rgba(${r},${g},${b},0.6)`);
      grd.addColorStop(0.7, lp.color);
      grd.addColorStop(1,   '#ff4444');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0, max*w, h);
    }
  });
}

// ── Background Light-Sound Effect ────────────────────────────────
const bgAmp  = new Uint8Array(64);
let bgCleared = false;

function drawBgFx() {
  const cv = document.getElementById('bgCanvas');
  const ctx = cv.getContext('2d');

  // Resize check
  if (cv.width!==window.innerWidth||cv.height!==window.innerHeight) {
    cv.width=window.innerWidth; cv.height=window.innerHeight;
  }
  const W = cv.width, H = cv.height;

  // Trail fade
  ctx.fillStyle = isLightMode ? 'rgba(240,240,248,0.22)' : 'rgba(7,7,15,0.22)';
  ctx.fillRect(0,0,W,H);

  // Grid lines (subtle)
  const gc = isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.018)';
  ctx.strokeStyle = gc; ctx.lineWidth = 1;
  const gs = 64;
  for (let x=0;x<W;x+=gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0;y<H;y+=gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Per-loop glow + ring spawning
  loops.forEach(lp => {
    if (!lp.asr || !lp.playing || !lp.card) return;
    lp.asr.getByteTimeDomainData(bgAmp);
    let sum=0; for (let i=0;i<bgAmp.length;i++) sum+=Math.abs(bgAmp[i]-128);
    const amp = sum / bgAmp.length / 128;
    if (amp < 0.008) return;

    const rect = lp.card.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    const [r,g,b] = hexRgb(lp.color);

    // Inner radial glow
    const grd = ctx.createRadialGradient(cx,cy,0, cx,cy, 90*amp+50);
    grd.addColorStop(0, `rgba(${r},${g},${b},${Math.min(0.18,amp*0.45)})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(cx-200,cy-200,400,400);

    // Spawn ring
    if (Math.random() < 0.25 + amp*0.4) {
      rings.push({
        x:cx, y:cy,
        r: 8 + amp*20,
        maxR: 80 + amp*180,
        color: lp.color,
        alpha: Math.min(0.9, 0.3 + amp*0.6),
        speed: 1.5 + amp*3.5,
      });
    }

    // Spawn particle
    if (amp > 0.15 && Math.random() < 0.3) {
      particles.push({
        x: cx + (Math.random()-0.5)*rect.width*0.6,
        y: cy + (Math.random()-0.5)*rect.height*0.6,
        vx: (Math.random()-0.5)*1.5,
        vy: -(1 + Math.random()*2)*amp*4,
        life: 1.0,
        decay: 0.02 + Math.random()*0.03,
        size: 1.5 + Math.random()*2*amp,
        color: lp.color,
      });
    }
  });

  // Draw & update rings
  for (let i=rings.length-1; i>=0; i--) {
    const rg = rings[i];
    rg.r    += rg.speed;
    rg.alpha *= 0.94;
    if (rg.r > rg.maxR || rg.alpha < 0.01) { rings.splice(i,1); continue; }
    const [r,g,b] = hexRgb(rg.color);
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${rg.alpha})`;
    ctx.lineWidth = 1.5 * rg.alpha + 0.3;
    ctx.stroke();
  }

  // Draw & update particles
  for (let i=particles.length-1; i>=0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.04; // gravity
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i,1); continue; }
    const [r,g,b] = hexRgb(p.color);
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
    ctx.fillStyle = `rgba(${r},${g},${b},${p.life})`;
    ctx.fill();
  }

  // Pool limits
  if (rings.length > 250) rings.splice(0, rings.length-250);
  if (particles.length > 300) particles.splice(0, particles.length-300);
  bgCleared = false;
}

function clearBg() {
  if (bgCleared) return;
  const cv = document.getElementById('bgCanvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  bgCleared = true;
}

// ── Helpers ──────────────────────────────────────────────────────
function hexRgb(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

let toastTid = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTid);
  toastTid = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Master Recorder ──────────────────────────────────────────────
function toggleMasterRec() {
  masterRecording ? stopMasterRec() : startMasterRec();
}

function startMasterRec() {
  initAudio();
  if (!masterRecDest) { toast('Audio nicht initialisiert!'); return; }

  // Choose best supported format
  const mime = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg']
    .find(m => MediaRecorder.isTypeSupported(m)) || '';

  masterRecChunks = [];
  masterRecorder  = new MediaRecorder(masterRecDest.stream, mime ? { mimeType: mime } : {});
  masterRecorder.ondataavailable = e => { if (e.data.size > 0) masterRecChunks.push(e.data); };
  masterRecorder.onstop = finishMasterRec;
  masterRecorder.start(200);

  masterRecording = true;
  masterRecStart  = performance.now();
  updateRecBtn();
  startRecTimer();
  toast('⏺ Master-Aufnahme läuft…');
}

function stopMasterRec() {
  if (masterRecorder && masterRecorder.state !== 'inactive') masterRecorder.stop();
  masterRecording = false;
  clearInterval(masterRecTick);
  updateRecBtn();
}

function finishMasterRec() {
  const mime = masterRecChunks[0]?.type || 'audio/webm';
  const ext  = mime.includes('ogg') ? 'ogg' : 'webm';
  const blob = new Blob(masterRecChunks, { type: mime });
  const dur  = ((performance.now() - masterRecStart) / 1000).toFixed(1);

  // Offer download immediately
  dlBlob(blob, `loopmatrix_rec_${timestamp()}.${ext}`);
  toast(`✓ Aufnahme gespeichert (${dur}s) — als ${ext.toUpperCase()}`);

  // Reset timer display
  const el = document.getElementById('recTimer');
  if (el) el.textContent = '';
}

function startRecTimer() {
  const el = document.getElementById('recTimer');
  masterRecTick = setInterval(() => {
    if (!masterRecording || !el) return;
    const s = Math.floor((performance.now() - masterRecStart) / 1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s % 60).padStart(2,'0');
    el.textContent = `${mm}:${ss}`;
  }, 500);
}

function updateRecBtn() {
  const btn = document.getElementById('masterRecBtn');
  if (!btn) return;
  btn.classList.toggle('recording', masterRecording);
  btn.innerHTML = masterRecording
    ? '<span class="rec-dot"></span> STOP REC'
    : '<span class="rec-dot"></span> REC';
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
}

// ── Master Controls ──────────────────────────────────────────────
function playAll() {
  initAudio();
  loops.forEach(lp => { if (lp.buf && !lp.playing) startLoop(lp); });
  startBeatClock();
}
function stopAll() {
  loops.forEach(lp => stopLoop(lp));
  stopBeatClock();
}

// ── Resize ───────────────────────────────────────────────────────
function onResize() {
  const cv = document.getElementById('bgCanvas');
  cv.width  = window.innerWidth;
  cv.height = window.innerHeight;
  loops.forEach(lp => lp.buf ? drawWaveform(lp) : drawEmptyWave(lp));
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGrid();

  // Background canvas size
  const bgCV = document.getElementById('bgCanvas');
  bgCV.width  = window.innerWidth;
  bgCV.height = window.innerHeight;

  // Color theme buttons
  document.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.color));
  });

  // Light-Sound toggle
  document.getElementById('lightSoundBtn').addEventListener('click', function() {
    lightSound = !lightSound;
    this.classList.toggle('active', lightSound);
    if (!lightSound) clearBg();
  });

  // Dark/Light toggle
  document.getElementById('darkModeBtn').addEventListener('click', () => {
    isLightMode = !isLightMode;
    document.body.classList.toggle('theme-light', isLightMode);
    loops.forEach(lp => lp.buf ? drawWaveform(lp) : drawEmptyWave(lp));
    if (!lightSound && !isLightMode) clearBg();
  });

  // Fullscreen
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFS);
  document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreenBtn').classList.toggle('active', !!document.fullscreenElement);
  });

  // Master volume
  document.getElementById('masterVolume').addEventListener('input', e => {
    if (masterGain) masterGain.gain.setTargetAtTime(+e.target.value, audioCtx.currentTime, 0.02);
  });

  // BPM input — update clock live
  document.getElementById('bpmInput').addEventListener('input', () => {
    if (beatActive) startBeatClock(); // restart with new BPM
  });
  document.getElementById('bpmInput').addEventListener('change', () => {
    if (beatActive) startBeatClock();
  });

  // Play all / Stop all
  document.getElementById('playAllBtn').addEventListener('click', playAll);
  document.getElementById('stopAllBtn').addEventListener('click', stopAll);
  document.getElementById('masterRecBtn').addEventListener('click', toggleMasterRec);

  // Session save/load
  document.getElementById('saveSessionBtn').addEventListener('click', () => {
    initAudio();
    saveSession();
  });
  document.getElementById('loadSessionBtn').addEventListener('click', () => {
    document.getElementById('sessionFileInput').click();
  });
  document.getElementById('sessionFileInput').addEventListener('change', e => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = ev => loadSession(ev.target.result);
    reader.readAsText(e.target.files[0]);
    e.target.value = '';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Only if no text input focused
    if (document.activeElement.tagName === 'INPUT') return;

    // Space = play/stop all
    if (e.code === 'Space') {
      e.preventDefault();
      const anyPlaying = loops.some(lp => lp.playing);
      anyPlaying ? stopAll() : playAll();
    }

    // 1–9 = toggle loops 1–9, 0 = loop 10
    const num = parseInt(e.key);
    if (!isNaN(num)) {
      const idx = num === 0 ? 9 : num - 1;
      if (idx < loops.length) togglePlay(loops[idx]);
    }

    // F = fullscreen
    if (e.key === 'f' || e.key === 'F') toggleFS();

    // D = dark/light toggle
    if (e.key === 'd' || e.key === 'D') {
      isLightMode = !isLightMode;
      document.body.classList.toggle('theme-light', isLightMode);
      loops.forEach(lp => lp.buf ? drawWaveform(lp) : drawEmptyWave(lp));
    }
  });

  window.addEventListener('resize', onResize);

  // Start animation
  startAnim();

  toast('◈ LOOP MATRIX bereit — Dateien laden oder aufnehmen');
});

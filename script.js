// ═══════════════════════════════════════════════
//  KONSTANTEN
// ═══════════════════════════════════════════════
const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK  = new Set([1,3,6,8,10]);

const CHORDS = {
  major:   { label:'Major',  intervals:[0,4,7] },
  minor:   { label:'Minor',  intervals:[0,3,7] },
  seventh: { label:'Dom7',   intervals:[0,4,7,10] },
};

function noteNum(root, oct) { return (oct+1)*12 + ROOTS.indexOf(root); }
function noteName(midi)     { return ROOTS[midi%12] + (Math.floor(midi/12)-1); }
function fmtMs(ms)          { return ms >= 1000 ? (ms/1000).toFixed(1)+'s' : ms+'ms'; }

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════

let midiInput    = null;
let midiOutput   = null;
let recording    = false;
let playing      = false;
let recStart     = 0;
let sequence     = [];   // {time, notes, dur, pause, label, type}
let playTimers   = [];
let customChords = [];
let editIdx      = null;

// ═══════════════════════════════════════════════
//  MIDI
// ═══════════════════════════════════════════════

function handleMidiMessage(msg) {
  const [status, data1, data2] = msg.data;
  const type = status & 0xf0; // NoteOn, NoteOff, etc.
  
  if (type === 144 && data2 > 0) { // Note On
    console.log("MIDI In Note:", data1);
    // Hier könntest du z.B. eine Funktion aufrufen, 
    // die den entsprechenden Akkord im Pad spielt.
  }
}

async function initMIDI() {
  const el = document.getElementById('midi-status');
  if (!navigator.requestMIDIAccess) { el.textContent='✗ Web MIDI nicht unterstützt'; return; }
  try {
    const acc = await navigator.requestMIDIAccess();
    const upd = () => {
      const outs = [...acc.outputs.values()];
      midiOutput = outs[0] || null;
      el.textContent = midiOutput ? `✓ ${midiOutput.name}` : '⚠ Kein MIDI-Gerät';
      el.className   = 'status ' + (midiOutput ? 'connected' : 'disconnected');
    };
    upd(); acc.onstatechange = upd;
  } catch { el.textContent = '✗ MIDI-Zugriff verweigert'; }

  navigator.requestMIDIAccess().then(access => {
    const inputs = access.inputs.values();
    const select = document.getElementById('midi-in-select');
    
    for (let input of inputs) {
      let opt = document.createElement('option');
      opt.value = input.id;
      opt.textContent = input.name;
      select.appendChild(opt);
    }

    select.onchange = () => {
      if (midiInput) midiInput.onmidimessage = null;
      midiInput = access.inputs.get(select.value);
      if (midiInput) {
        midiInput.onmidimessage = handleMidiMessage;
      }
    };
  });
}

function sendNotes(notes, dur) {
  if (!midiOutput) return;
  const ch  = +document.getElementById('midi-channel').value;
  const vel = +document.getElementById('velocity').value;
  notes.forEach(n => midiOutput.send([0x90|ch, n, vel]));
  setTimeout(() => notes.forEach(n => midiOutput.send([0x80|ch, n, 0])), dur);
}

// ═══════════════════════════════════════════════
//  PLAY HELPER (Akkord / Note abspielen + aufnehmen)
// ═══════════════════════════════════════════════
// ── ARP SCHNELLZUGRIFF BUTTONS ──
document.getElementById('arp-delay-group').addEventListener('click', e => {
  const btn = e.target.closest('.arp-btn');
  if (!btn) return;
  document.querySelectorAll('#arp-delay-group .arp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('global-arp').value = btn.dataset.arp;
});

document.getElementById('arp-dir-group').addEventListener('click', e => {
  const btn = e.target.closest('.arp-btn');
  if (!btn) return;
  document.querySelectorAll('#arp-dir-group .arp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('arp-dir').value = btn.dataset.dir;
});

// ── ARP SEQUENCE ──
function arpSequence(notes) {
  const dir = document.getElementById('arp-dir').value;
  const asc = [...notes].sort((a,b) => a-b);
  if (dir === 'up')     return asc;
  if (dir === 'down')   return [...asc].reverse();
  if (dir === 'updown') return [...asc, ...[...asc].reverse().slice(1)];
  if (dir === 'random') return [...asc].sort(() => Math.random()-0.5);
  return asc;
}

// arpDelay = ms zwischen den Tönen (0 = alle gleichzeitig)
function playNotes(notes, label, type, dur, arpDelay) {
  if (dur      === undefined) dur      = +document.getElementById('note-dur').value;
  // custom-Akkorde übergeben eigenen arpDelay, Standard-Pads nutzen globale Einstellung
  if (arpDelay === undefined) arpDelay = +document.getElementById('global-arp').value;

  if (arpDelay > 0) {
    const seq = arpSequence(notes);
    seq.forEach((n, i) => setTimeout(() => sendNotes([n], dur), i * arpDelay));
  } else {
    sendNotes(notes, dur);
  }

  document.getElementById('active-chord').textContent = label;
  document.getElementById('active-notes').textContent =
    `MIDI: ${notes.join(', ')} (${notes.map(noteName).join(' ')})  |  Dur: ${fmtMs(dur)}  Arp: ${arpDelay ? fmtMs(arpDelay) : 'Chord'}`;

  if (recording) {
    sequence.push({ time: Date.now()-recStart, notes:[...notes], dur, arpDelay, label, type });
    renderTimeline();
    updateSeqInfo();
  }
}

// ═══════════════════════════════════════════════
//  KEYBOARD 49 TASTEN (C2–C6 = MIDI 36–84)
// ═══════════════════════════════════════════════
function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  for (let i = 0; i < 49; i++) {
    const midi = 36 + i;
    const semi = midi % 12;
    const oct  = Math.floor(midi/12)-1;
    const isBlack = BLACK.has(semi);
    const rootName = ROOTS[semi];
    const k = document.createElement('div');
    k.className = `key ${isBlack ? 'black' : 'white'}`;
    const lbl = document.createElement('span');
    lbl.className = 'key-label';
    lbl.textContent = isBlack ? '' : `${rootName}${oct}`;
    k.appendChild(lbl);
    const play = () => {
      k.classList.add('active');
      setTimeout(() => k.classList.remove('active'), 180);
      playNotes([midi], `${rootName}${oct}`, 'note');
    };
    k.addEventListener('mousedown', play);
    k.addEventListener('touchstart', e => { e.preventDefault(); play(); });
    kb.appendChild(k);
  }
}

// ═══════════════════════════════════════════════
//  STANDARD AKKORD PADS
// ═══════════════════════════════════════════════
function createPads(type, containerId) {
  const { intervals, label } = CHORDS[type];
  const container = document.getElementById(containerId);
  ROOTS.forEach(root => {
    const btn = makePadBtn(root, label, type, () => {
      const oct = +document.getElementById('octave').value;
      return intervals.map(i => noteNum(root, oct)+i);
    });
    container.appendChild(btn);
  });
}

function makePadBtn(name, typeLbl, cssClass, getNotes, dur, pause, showTiming) {
  const btn = document.createElement('button');
  btn.className = `pad ${cssClass}`;
  let timingHtml = '';
  if (showTiming) {
    timingHtml = `<div class="pad-timing">
      <span class="t-dur">♩${fmtMs(dur)}</span>
      <span class="t-pause">⏸${fmtMs(pause)}</span>
    </div>`;
  }
  btn.innerHTML = `
    <div class="chord-name">${name}</div>
    <div class="chord-type">${typeLbl}</div>
    ${timingHtml}`;

  const play = () => {
    const notes = getNotes();
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 200);
    playNotes(notes, `${name} ${typeLbl}`, cssClass, dur, pause);
  };
  btn.addEventListener('mousedown', play);
  btn.addEventListener('touchstart', e => { e.preventDefault(); play(); });
  return btn;
}

// ═══════════════════════════════════════════════
//  CUSTOM AKKORD BUILDER
// ═══════════════════════════════════════════════
const bName  = document.getElementById('b-name');
const bRoot  = document.getElementById('b-root');
const bInter = document.getElementById('b-intervals');
const bDur   = document.getElementById('b-dur');
const bPause = document.getElementById('b-pause');
const bPrev  = document.getElementById('b-preview');

function parseIntervals() {
  return bInter.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
}

function updatePreview() {
  const ivs = parseIntervals();
  if (!ivs.length) { bPrev.textContent = 'Intervalle eingeben…'; return; }
  const root = bRoot.value;
  const oct  = +document.getElementById('octave').value;
  const notes = ivs.map(i => noteNum(root, oct)+i);
  bPrev.textContent =
    `Töne: ${notes.map(noteName).join(' – ')}  |  MIDI: ${notes.join(', ')}  |  ` +
    `Dauer: ${fmtMs(+bDur.value)}  |  Arpeggio-Delay: ${fmtMs(+bPause.value)}  |  Intervalle: ${ivs.map(i=>`+${i}`).join(' ')}`;
}

bInter.addEventListener('input', updatePreview);
bRoot.addEventListener('change', updatePreview);
bDur.addEventListener('input', updatePreview);
bPause.addEventListener('input', updatePreview);

// Preset-Buttons (Builder)
document.querySelectorAll('.preset-btn[data-dur]').forEach(btn => {
  btn.addEventListener('click', () => {
    bDur.value   = btn.dataset.dur;
    bPause.value = btn.dataset.pause;
    updatePreview();
  });
});

document.getElementById('b-add').addEventListener('click', () => {
  const ivs = parseIntervals();
  if (!ivs.length) { alert('Bitte mindestens ein Intervall eingeben.'); return; }
  const name  = bName.value.trim() || `${bRoot.value}?`;
  const dur      = Math.max(50, +bDur.value)   || 600;
  const arpDelay = Math.max(0,  +bPause.value) || 0;
  const chord = { name, root: bRoot.value, intervals: ivs, dur, arpDelay };
  customChords.push(chord);
  addCustomPad(chord);
  bName.value=''; bInter.value='';
  bPrev.textContent='Intervalle eingeben…';
});

document.getElementById('b-clear-custom').addEventListener('click', () => {
  customChords=[];
  document.getElementById('custom-pads').innerHTML='';
});

function addCustomPad(chord) {
  const container = document.getElementById('custom-pads');
  const btn = makePadBtn(chord.name, chord.root, 'custom', () => {
    const oct = +document.getElementById('octave').value;
    return chord.intervals.map(i => noteNum(chord.root, oct)+i);
  }, chord.dur, chord.arpDelay, true);
  container.appendChild(btn);
}

// Update makePadBtn timing badge label
function makePadBtn(name, typeLbl, cssClass, getNotes, dur, arpDelay, showTiming) {
  const btn = document.createElement('button');
  btn.className = `pad ${cssClass}`;
  let timingHtml = '';
  if (showTiming) {
    timingHtml = `<div class="pad-timing">
      <span class="t-dur">♩${fmtMs(dur)}</span>
      <span class="t-pause">🎸${arpDelay ? fmtMs(arpDelay) : 'chord'}</span>
    </div>`;
  }
  btn.innerHTML = `
    <div class="chord-name">${name}</div>
    <div class="chord-type">${typeLbl}</div>
    ${timingHtml}`;

  const play = () => {
    const notes = getNotes();
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 200);
    playNotes(notes, `${name} ${typeLbl}`, cssClass, dur, arpDelay);
  };
  btn.addEventListener('mousedown', play);
  btn.addEventListener('touchstart', e => { e.preventDefault(); play(); });
  return btn;
}

// ═══════════════════════════════════════════════
//  TIMELINE RENDERN
// ═══════════════════════════════════════════════
function renderTimeline() {
  const tl = document.getElementById('seq-timeline');
  if (!sequence.length) {
    tl.innerHTML = '<span class="tl-empty">Noch keine Events aufgenommen.</span>'; return;
  }
  tl.innerHTML = '';
  sequence.forEach((ev, idx) => {
    const chip = document.createElement('div');
    const isPause = ev.type === 'pause';
    chip.className = `seq-event ${ev.type==='note'?'note-ev':''} ${isPause?'pause-ev':''}`;
    chip.title = `t=${ev.time}ms | Dur=${ev.dur}ms | Pause=${ev.pause||0}ms | MIDI: ${ev.notes?.join(',')??'–'}`;

    if (isPause) {
      chip.innerHTML = `<span>⏸ Pause</span><div class="ev-timing"><span class="t-pause">${fmtMs(ev.dur)}</span></div>`;
    } else {
      chip.innerHTML = `
        <span>${ev.label}</span>
        <div class="ev-timing">
          <span class="t-dur">♩${fmtMs(ev.dur)}</span>
          <span class="t-pause">⏸${fmtMs(ev.pause||0)}</span>
        </div>
        <span class="edit-hint">✏</span>`;
    }
    chip.addEventListener('click', () => openEditModal(idx));
    tl.appendChild(chip);
  });
}

function updateSeqInfo() {
  document.getElementById('seq-count').textContent = `${sequence.length} Events`;
  if (sequence.length) {
    const last = sequence[sequence.length-1];
    const total = last.time + last.dur + (last.pause||0);
    document.getElementById('seq-duration').textContent = `Länge: ${(total/1000).toFixed(2)}s`;
  } else {
    document.getElementById('seq-duration').textContent = '';
  }
  document.getElementById('play-btn').disabled    = !sequence.length;
  document.getElementById('download-btn').disabled = !sequence.length;
}

// ═══════════════════════════════════════════════
//  EDIT MODAL
// ═══════════════════════════════════════════════
const modal  = document.getElementById('edit-modal');
const eLabel = document.getElementById('e-label');
const eNotes = document.getElementById('e-notes');
const eTime  = document.getElementById('e-time');
const eDur   = document.getElementById('e-dur');
const ePause = document.getElementById('e-pause');

function openEditModal(idx) {
  editIdx = idx;
  const ev = sequence[idx];
  eLabel.value = ev.label;
  eNotes.value = ev.notes ? ev.notes.join(',') : '';
  eTime.value  = ev.time;
  eDur.value   = ev.dur;
  ePause.value = ev.pause || 0;

  // Noten-Feld verstecken bei Pause
  eNotes.parentElement.style.display = ev.type === 'pause' ? 'none' : '';
  modal.classList.remove('hidden');
}

document.getElementById('e-save').addEventListener('click', () => {
  if (editIdx === null) return;
  const ev = sequence[editIdx];
  const isPause = ev.type === 'pause';
  const notes = isPause ? [] : eNotes.value.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n));
  if (!isPause && !notes.length) { alert('Mindestens eine MIDI-Note erforderlich.'); return; }
  sequence[editIdx] = {
    ...ev,
    label: eLabel.value.trim() || ev.label,
    notes: isPause ? [] : notes,
    time:  Math.max(0,  +eTime.value),
    dur:   Math.max(50, +eDur.value),
    pause: Math.max(0,  +ePause.value),
  };
  sequence.sort((a,b) => a.time - b.time);
  renderTimeline();
  updateSeqInfo();
  modal.classList.add('hidden');
});

document.getElementById('e-delete').addEventListener('click', () => {
  if (editIdx === null) return;
  sequence.splice(editIdx, 1);
  renderTimeline(); updateSeqInfo();
  modal.classList.add('hidden');
});
document.getElementById('e-cancel').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target===modal) modal.classList.add('hidden'); });

// ═══════════════════════════════════════════════
//  PAUSE MODAL (manuell einfügen)
// ═══════════════════════════════════════════════
const pauseModal = document.getElementById('pause-modal');
const pDur       = document.getElementById('p-dur');

document.getElementById('add-pause-btn').addEventListener('click', () => {
  pauseModal.classList.remove('hidden');
});

// Preset-Buttons (Pause-Modal)
document.querySelectorAll('.preset-btn[data-pause-only]').forEach(btn => {
  btn.addEventListener('click', () => { pDur.value = btn.dataset.pauseOnly; });
});

document.getElementById('p-add').addEventListener('click', () => {
  const dur = Math.max(50, +pDur.value);
  const t   = sequence.length
    ? sequence[sequence.length-1].time + sequence[sequence.length-1].dur + (sequence[sequence.length-1].pause||0)
    : 0;
  sequence.push({ time: t, notes: [], dur, pause: 0, label: 'Pause', type: 'pause' });
  renderTimeline(); updateSeqInfo();
  pauseModal.classList.add('hidden');
});
document.getElementById('p-cancel').addEventListener('click', () => pauseModal.classList.add('hidden'));
pauseModal.addEventListener('click', e => { if (e.target===pauseModal) pauseModal.classList.add('hidden'); });

// ═══════════════════════════════════════════════
//  RECORDER
// ═══════════════════════════════════════════════
const recBtn  = document.getElementById('rec-btn');
const seqStat = document.getElementById('seq-status');

recBtn.addEventListener('click', () => {
  if (recording) {
    recording = false;
    recBtn.textContent = '⏺ Aufnahme';
    recBtn.classList.remove('recording');
    seqStat.textContent = `Gestoppt – ${sequence.length} Events`;
    updateSeqInfo();
  } else {
    sequence=[]; recStart=Date.now(); recording=true;
    recBtn.textContent = '⏹ Stoppen';
    recBtn.classList.add('recording');
    seqStat.textContent = '● Aufnahme läuft…';
    renderTimeline(); updateSeqInfo();
  }
});

// ═══════════════════════════════════════════════
//  ABSPIELEN (mit Pausen)
// ═══════════════════════════════════════════════
document.getElementById('play-btn').addEventListener('click', () => {
  if (!sequence.length) return;
  playing = true;
  seqStat.textContent = '▶ Wiedergabe…';
  document.getElementById('stop-btn').disabled  = false;
  document.getElementById('play-btn').disabled  = true;

  // Pausen in das absolute Timeline-Timing einrechnen
  // Pausen-Events haben notes=[], bei ihnen wird einfach gewartet
  const chips = document.querySelectorAll('.seq-event');

  // Rebuild absolute timings respecting pauses
  let cursor = 0;
  const timed = sequence.map((ev, i) => {
    const t = cursor;
    cursor += (ev.type==='pause' ? ev.dur : ev.dur + (ev.pause||0));
    return { ev, t, i };
  });

  playTimers = timed.map(({ ev, t, i }) =>
    setTimeout(() => {
      if (!playing) return;
    if (ev.type !== 'pause' && ev.notes.length) {
        const arp = ev.arpDelay || 0;
        if (arp > 0) {
          ev.notes.forEach((n, i) => setTimeout(() => sendNotes([n], ev.dur), i * arp));
        } else {
          sendNotes(ev.notes, ev.dur);
        }
      }
      document.getElementById('active-chord').textContent = ev.label;
      chips[i]?.classList.add('playing-ev');
      setTimeout(() => chips[i]?.classList.remove('playing-ev'), ev.dur);
    }, t)
  );

  const total = cursor + 300;
  playTimers.push(setTimeout(() => {
    playing = false;
    seqStat.textContent = 'Wiedergabe beendet';
    document.getElementById('stop-btn').disabled = true;
    document.getElementById('play-btn').disabled = false;
  }, total));
});

document.getElementById('stop-btn').addEventListener('click', () => {
  playing = false; playTimers.forEach(clearTimeout);
  seqStat.textContent = 'Gestoppt';
  document.getElementById('stop-btn').disabled = true;
  document.getElementById('play-btn').disabled = !sequence.length;
});

document.getElementById('clear-seq').addEventListener('click', () => {
  playing=false; recording=false; playTimers.forEach(clearTimeout);
  sequence=[];
  recBtn.textContent='⏺ Aufnahme'; recBtn.classList.remove('recording');
  seqStat.textContent='Bereit';
  document.getElementById('stop-btn').disabled=true;
  renderTimeline(); updateSeqInfo();
});

// ═══════════════════════════════════════════════
//  MIDI DOWNLOAD
// ═══════════════════════════════════════════════
document.getElementById('download-btn').addEventListener('click', () => {
  if (!sequence.length) return;
  const TPB   = 480, TEMPO = 500000;
  const MS2TK = v => Math.round(v / (TEMPO/1000/TPB));
  const varLen= v => {
    let b=[v&0x7F]; v>>=7;
    while(v>0){ b.unshift((v&0x7F)|0x80); v>>=7; } return b;
  };

  const ch  = +document.getElementById('midi-channel').value;
  const vel = +document.getElementById('velocity').value;

  let raw = [];
  let cursor = 0;
  sequence.forEach(ev => {
    if (ev.type !== 'pause' && ev.notes.length) {
      const onT  = MS2TK(cursor);
      const offT = MS2TK(cursor + ev.dur);
      ev.notes.forEach(n => {
        raw.push({ t:onT,  msg:[0x90|ch, n, vel] });
        raw.push({ t:offT, msg:[0x80|ch, n, 0]   });
      });
    }
    cursor += ev.type==='pause' ? ev.dur : ev.dur + (ev.pause||0);
  });
  raw.sort((a,b) => a.t - b.t);

  let evts = [0x00,0xFF,0x51,0x03,(TEMPO>>16)&0xFF,(TEMPO>>8)&0xFF,TEMPO&0xFF];
  let lastTick=0;
  raw.forEach(e => {
    const d=e.t-lastTick; lastTick=e.t;
    evts.push(...varLen(d), ...e.msg);
  });
  evts.push(0x00,0xFF,0x2F,0x00);

  const tLen=evts.length;
  const header=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(TPB>>8)&0xFF,TPB&0xFF];
  const tHdr=[0x4D,0x54,0x72,0x6B,(tLen>>24)&0xFF,(tLen>>16)&0xFF,(tLen>>8)&0xFF,tLen&0xFF];

  const blob=new Blob([new Uint8Array([...header,...tHdr,...evts])],{type:'audio/midi'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='chord_sequence.mid'; a.click();
  URL.revokeObjectURL(a.href);
});

// ═══════════════════════════════════════════════
//  FULLSCREEN + VELOCITY
// ═══════════════════════════════════════════════
document.getElementById('fullscreen-btn').addEventListener('click', () => {
  const btn = document.getElementById('fullscreen-btn');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.warn);
    btn.textContent = '✕';
  } else {
    document.exitFullscreen();
    btn.textContent = '⛶';
  }
  document.onfullscreenchange = () => {
    if (!document.fullscreenElement) btn.textContent = '⛶';
  };
});

document.getElementById('velocity').addEventListener('input', function() {
  document.getElementById('vel-display').textContent = this.value;
});

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
buildKeyboard();
createPads('major','major-pads');
createPads('minor','minor-pads');
createPads('seventh','seventh-pads');
initMIDI();
renderTimeline();
updateSeqInfo();

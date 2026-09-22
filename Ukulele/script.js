// Vollbild-Funktionalität
const fullscreenBtn = document.getElementById('fullscreenBtn');

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
    });
    fullscreenBtn.textContent = 'Vollbild Beenden 🗗';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      fullscreenBtn.textContent = 'Vollbild ⛶';
    }
  }
});

// Audio Context für Ukulele-Klangerzeugung
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Spielt einen einzelnen Ukulele-Ton (kurz & helles Pluck-Geräusch)
 */
function playNote(freq, delay = 0, duration = 1.2) {
  setTimeout(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Sinus mit leichtem Triangle-Gemisch für einen zarten Ukulele-Klang
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Schnelles Pluck-Abklingen (typisch für Nylon-Saiten einer Ukulele)
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }, delay);
}

/**
 * Spielt einen Ukulele-Akkord (schnelles Strumming)
 */
function playUkuleleChord(frequencies) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  frequencies.forEach((freq, index) => {
    playToneWithDelay(freq, index * 35); // Zügiger Anschlag
  });
}

function playToneWithDelay(freq, delay) {
  playNote(freq, delay, 1.4);
}

/**
 * Zupfmuster 1 (4/4-Takt)
 */
function playPattern1() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // Töne: C4 (261Hz), E4 (329Hz), A4 (440Hz), E4 (329Hz)
  const notes = [261.63, 329.63, 440.00, 329.63];
  notes.forEach((freq, index) => {
    playNote(freq, index * 280, 1.0);
  });
}

/**
 * Zupfmuster 2 (Insel-Zupfen)
 */
function playPattern2() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // Töne: G4 (392Hz), C4 (261Hz), E4 (329Hz), A4 (440Hz)
  const notes = [392.00, 261.63, 329.63, 440.00];
  notes.forEach((freq, index) => {
    playNote(freq, index * 260, 1.0);
  });
}
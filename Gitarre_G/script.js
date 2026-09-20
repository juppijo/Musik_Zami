// Vollbild-Logik
const fullscreenBtn = document.getElementById('fullscreenBtn');

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
    });
    fullscreenBtn.textContent = 'Vollbild Beenden';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      fullscreenBtn.textContent = 'Vollbild';
    }
  }
});

// Audio-Synthese für Gitarrenklang
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, delay = 0, duration = 1.5) {
  setTimeout(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Gitarrenähnlicher Klang (Triangle-Welle)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Sanftes Abklingen der Saite
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }, delay);
}

// Akkord abspielen (Strumming-Effekt)
function playChord(frequencies) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  frequencies.forEach((freq, index) => {
    playTone(freq, index * 40, 2); // Leicht zeitversetzt für Strumming
  });
}

// Zupfmuster 1 abspielen
function playPattern(sequence) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  sequence.forEach((freq, index) => {
    playTone(freq, index * 300, 1.2);
  });
}

// Zupfmuster 2 (Walzer) abspielen
function playWaltzPattern() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // Bass
  playTone(110, 0, 1.5);
  // Akkord-Gleichzeitig 1
  playTone(196, 400, 1);
  playTone(246.94, 400, 1);
  playTone(329.63, 400, 1);
  // Akkord-Gleichzeitig 2
  playTone(196, 800, 1);
  playTone(246.94, 800, 1);
  playTone(329.63, 800, 1);
}
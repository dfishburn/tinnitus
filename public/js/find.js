/*global $:true, render:true*/
var find = (function () {
"use strict";

var find = {};
var ctx = document.querySelector('canvas').getContext('2d');
var osc;
var voices = [];
var voiceCount = 129;
var analyser;
var gainNode;
var freqDisplay = $('#freq');
var gainDisplay = $('#gainDisplay');
var running = null;
var slider = document.querySelector('#freqSlider');
var gainSlider = document.querySelector('#gainSlider');
var widthSlider = document.querySelector('#widthSlider');
var widthDisplay = $('#widthDisplay');
var widthRange = $('#widthRange');
var waveSelect = document.querySelector('#waveType');
var touch = 'createTouch' in document;
var ready = false;

var waveGainCompensation = {
  'sine':     1.0,
  'square':   0.5,
  'triangle': 0.85,
  'sawtooth': 0.7
};

function applyWaveCompensation(type) {
  if (gainNode) {
    var base = gainSlider ? gainSlider.value / 100 : 0.5;
    gainNode.gain.value = base * (waveGainCompensation[type] || 1.0);
  }
}

function frequencyRange() {
  var frequency = Number(slider.value);
  var width = Number(widthSlider.value);
  var maxFrequency = audio ? Math.min(22000, audio.sampleRate / 2) : 22000;
  return {
    low: Math.max(0, frequency - width / 2),
    high: Math.min(maxFrequency, frequency + width / 2)
  };
}

function addVoice(offset) {
  var oscillator = audio.createOscillator();
  var gain = audio.createGain();
  gain.gain.value = 0;
  oscillator.type = waveSelect.value;
  oscillator.frequency.value = Math.max(0, Math.min(audio.sampleRate / 2,
    Number(slider.value) + offset * Number(widthSlider.value) / 2));
  oscillator.connect(gain);
  gain.connect(analyser);
  voices.push({ oscillator: oscillator, gain: gain, offset: offset });
  // Stagger initial phases so closely spaced pitches do not all cancel or
  // reinforce together. The short fade in updateWidth smooths their entrance.
  oscillator.start(audio.currentTime + Math.random() * 0.02);
  return oscillator;
}

function updateWidth() {
  var width = Number(widthSlider.value);
  var frequency = Number(slider.value);
  var range = frequencyRange();
  widthDisplay.text(width);
  widthRange.text(width ? 'Range: ' + Math.round(range.low) + '–' + Math.round(range.high) + ' Hz.' : '');
  if (!osc) { return; }

  // Build nearby voices only when needed; reuse them for live slider changes.
  if (width > 0 && voices.length === 1) {
    for (var i = 0; i < voiceCount; i++) {
      var offset = 2 * i / (voiceCount - 1) - 1;
      if (offset !== 0) { addVoice(offset); }
    }
  }

  var weights = voices.map(function (voice) {
    var pitch = frequency + voice.offset * width / 2;
    if (!width) { return voice.offset === 0 ? 1 : 0; }
    if (pitch < range.low || pitch > range.high) { return 0; }
    // Raised-cosine envelope: strongest at the centre, fading at the edges.
    return Math.pow(Math.cos(voice.offset * Math.PI / 2), 2);
  });
  var total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
  voices.forEach(function (voice, index) {
    var pitch = Math.max(range.low, Math.min(range.high, frequency + voice.offset * width / 2));
    voice.oscillator.frequency.setTargetAtTime(pitch, audio.currentTime, 0.02);
    // Sum-normalize so adding pitches cannot multiply the peak volume.
    voice.gain.gain.setTargetAtTime(weights[index] / total, audio.currentTime, 0.02);
  });
}

function start() {
  if (!ready) {
    return;
  }

  if (osc) {
    // Oscillator already exists — just reconnect and restart visualizer
    resume();
  } else {
    // First time — build the audio graph
    find.analyser = analyser = audio.createAnalyser();

    if (!gainNode) {
      gainNode = audio.createGain();
      gainNode.connect(audio.destination);
    }

    find.osc = osc = addVoice(0);
    analyser.connect(gainNode);

    slider.max = Math.min(22000, audio.sampleRate / 2);
    freqDisplay.text(slider.value);
    updateWidth();
    applyWaveCompensation(osc.type);

    update();
  }
}

function stop() {
  window.cancelAnimationFrame(running);
  running = null;
  // Disconnect analyser from gain so no sound plays, but keep osc alive
  if (analyser && gainNode) {
    try { analyser.disconnect(gainNode); } catch(e) {}
  }
}

function resume() {
  applyWaveCompensation(waveSelect.value);
  if (analyser && gainNode) {
    try { analyser.connect(gainNode); } catch(e) {}
  }
  if (analyser) {
    window.cancelAnimationFrame(running);
    update();
  }
}

function setup(touch) {
  slider.oninput = function () {
    freqDisplay.text(this.value);
    updateWidth();
    if (window.notch) {
      window.notch.value = this.value;
    }
  };

  widthSlider.oninput = updateWidth;
  updateWidth();

  if (gainSlider) {
    gainSlider.oninput = function () {
      gainDisplay.html(this.value);
      var type = waveSelect ? waveSelect.value : 'sine';
      applyWaveCompensation(type);
    };
  }

  if (waveSelect) {
    waveSelect.onchange = function () {
      var type = this.value;
      voices.forEach(function (voice) { voice.oscillator.type = type; });
      applyWaveCompensation(type);
    };
  }

  ready = true;
  $(document).trigger('audioready');

  if (touch) {
    start();
  }
}

function update() {
  running = window.requestAnimationFrame(update);
  var data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  window.render.buffer = data;
}

find.start = start;
find.stop = stop;
find.resume = resume;
find.setup = setup;
find.audiocanvas = ctx;
find.initGainNode = function () {
  if (!gainNode) {
    gainNode = audio.createGain();
    var base = gainSlider ? gainSlider.value / 100 : 0.5;
    gainNode.gain.value = base;
    gainNode.connect(audio.destination);
  }
};
Object.defineProperty(find, 'gainNode', { get: function() { return gainNode; } });

return find;

})();

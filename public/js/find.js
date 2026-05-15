/*global $:true, render:true*/
var find = (function () {
"use strict";

var find = {};
var ctx = document.querySelector('canvas').getContext('2d');
var osc;
var analyser;
var gainNode;
var freqDisplay = $('#freq');
var gainDisplay = $('#gainDisplay');
var running = null;
var slider = document.querySelector('#freqSlider');
var gainSlider = document.querySelector('#gainSlider');
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

    gainNode = audio.createGain();

    find.osc = osc = audio.createOscillator();
    analyser.input = osc;
    analyser.connect(gainNode);
    gainNode.connect(audio.destination);

    osc.type = waveSelect ? waveSelect.value : 'sine';
    slider.value = 440;
    slider.oninput.call(slider);
    applyWaveCompensation(osc.type);
    osc.start(0);

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
  if (analyser && gainNode) {
    try { analyser.connect(gainNode); } catch(e) {}
  }
  if (analyser) {
    update();
  }
}

function setup(touch) {
  slider.max = 22000;
  slider.value = 440;
  slider.oninput = function () {
    if (osc) {
      freqDisplay.html(osc.frequency.value = this.value);
    }
    if (window.notch) {
      window.notch.value = this.value;
    }
  };

  if (gainSlider) {
    gainSlider.oninput = function () {
      gainDisplay.html(this.value);
      var type = waveSelect ? waveSelect.value : 'sine';
      applyWaveCompensation(type);
    };
  }

  if (waveSelect) {
    waveSelect.onchange = function () {
      if (find.osc) {
        find.osc.type = this.value;
        applyWaveCompensation(this.value);
      }
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

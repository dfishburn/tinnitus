/*global $:true, render:true*/
var find = (function () {
"use strict";

var find = {};
var ctx = document.querySelector('canvas').getContext('2d');
var osc; // used to find the tinitus frequency
var analyser;
var gainNode;
var freqDisplay = $('#freq');
var gainDisplay = $('#gainDisplay');
var running = null;
var slider = document.querySelector('#freqSlider');
var gainSlider = document.querySelector('#gainSlider');
var touch = 'createTouch' in document;
var ready = false;

function start() {
  if (!ready) {
    return;
  }

  if (analyser) {
    analyser.input = osc;
  } else {
    stop();

    find.analyser = analyser = audio.createAnalyser();

    if (osc) {
      osc.stop(0);
      osc.output = null;
    }

    gainNode = audio.createGain();
    gainNode.gain.value = gainSlider ? gainSlider.value / 100 : 0.5;

    find.osc = osc = audio.createOscillator();
    analyser.input = osc;
    analyser.connect(gainNode);
    gainNode.connect(audio.destination);  // connect to speakers

    osc.type = 'sine';
    slider.value = 440;
    slider.oninput.call(slider);
    osc.start(0);

    update();
  }
}

function stop() {
  window.cancelAnimationFrame(running);
  if (osc) {
    osc.stop(0);
  }
  if (analyser) {
    analyser.input = null;
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
      if (gainNode) {
        gainNode.gain.value = this.value / 100;
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
find.setup = setup;
find.audiocanvas = ctx;
Object.defineProperty(find, 'gainNode', { get: function() { return gainNode; } });

return find;

})();
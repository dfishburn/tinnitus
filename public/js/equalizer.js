/*global audio:true, centreFreq:true*/
var equalizer = (function () {
"use strict";

// Standard 10-band frequencies
var BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
var LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
var MIN_DB = -24;
var MAX_DB = 0;
var filters = [];
var manual = false;

// Build the EQ filter chain using peaking filters
function buildFilters() {
  filters = BANDS.map(function (freq) {
    var f = audio.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = freq;
    f.Q.value = 1.4;
    f.gain.value = 0;
    return f;
  });

  // Chain filters together
  for (var i = 1; i < filters.length; i++) {
    filters[i - 1].connect(filters[i]);
  }
}

// Return the first filter (input) and last filter (output) for patching into chain
function getInput()  { return filters[0]; }
function getOutput() { return filters[filters.length - 1]; }

// Calculate what the notch should look like for a given tinnitus frequency.
// Returns an array of gain values (dB) for each band — negative around the notch centre.
function calcNotchGains(tinnitusFreq) {
  var notchCentre = centreFreq(tinnitusFreq);
  return BANDS.map(function (freq) {
    // Distance in octaves from the notch centre
    var octaveDist = Math.abs(Math.log2(freq / notchCentre));
    if (octaveDist < 0.5) {
      // Within half an octave — deep cut
      return -24;
    } else if (octaveDist < 1.0) {
      // Taper from -24 to 0 between 0.5 and 1.0 octaves
      return -24 * (1 - (octaveDist - 0.5) * 2);
    } else {
      return 0;
    }
  });
}

// Set filter gains from an array and update the UI sliders
function applyGains(gains) {
  gains.forEach(function (db, i) {
    if (filters[i]) {
      filters[i].gain.value = db;
    }
    var slider = document.querySelector('#eq-band-' + i);
    var label  = document.querySelector('#eq-val-' + i);
    if (slider) { slider.value = db; }
    if (label)  { label.textContent = Math.round(db) + 'dB'; }
  });
}

// Build the slider UI inside #eq-container
function buildUI() {
  var container = document.querySelector('#eq-container');
  if (!container) { return; }

  container.innerHTML = BANDS.map(function (freq, i) {
    return [
      '<div class="d-flex flex-column align-items-center" style="min-width:50px">',
      '  <small id="eq-val-' + i + '" class="mb-1 text-nowrap">0dB</small>',
      '  <input id="eq-band-' + i + '"',
      '         type="range"',
      '         orient="vertical"',
      '         min="' + MIN_DB + '"',
      '         max="' + MAX_DB + '"',
      '         value="0"',
      '         step="0.5"',
      '         class="eq-slider"',
      '         disabled',
      '         style="writing-mode:vertical-lr; direction:rtl; height:120px;">',
      '  <small class="mt-1">' + LABELS[i] + '</small>',
      '</div>'
    ].join('\n');
  }).join('\n');

  // Attach input handlers
  BANDS.forEach(function (freq, i) {
    var slider = document.querySelector('#eq-band-' + i);
    var label  = document.querySelector('#eq-val-' + i);
    if (slider) {
      slider.addEventListener('input', function () {
        if (!manual) { return; }
        var db = parseFloat(this.value);
        if (filters[i]) { filters[i].gain.value = db; }
        if (label) { label.textContent = Math.round(db) + 'dB'; }
      });
    }
  });

  // Manual checkbox
  var checkbox = document.querySelector('#eqManual');
  if (checkbox) {
    checkbox.addEventListener('change', function () {
      manual = this.checked;
      BANDS.forEach(function (freq, i) {
        var slider = document.querySelector('#eq-band-' + i);
        if (slider) { slider.disabled = !manual; }
      });
    });
  }
}

// Public API
return {
  buildUI: function () {
    buildUI();
  },
  buildFilters: function () {
    buildFilters();
  },
  filtersBuilt: function () {
    return filters.length > 0;
  },
  getInput:  getInput,
  getOutput: getOutput,
  setNotch: function (tinnitusFreq) {
    var gains = tinnitusFreq > 0 ? calcNotchGains(tinnitusFreq) : BANDS.map(function () { return 0; });
    applyGains(gains);
  },
  isManual: function () { return manual; }
};

})();

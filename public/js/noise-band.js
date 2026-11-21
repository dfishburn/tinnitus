/*global audio:true*/
var noiseBand = (function () {
"use strict";

var stages = 4;

// Cascaded unity-peak bandpasses shape any noise colour without boosting its
// level. Steeper skirts also suppress the bass/treble-heavy colours' tails.
// Web Audio uses a digital filter: centre / width alone does not produce the
// requested bandwidth at high frequencies. Account for frequency warping.
function settings(sampleRate, frequency, width) {
  var maxFrequency = Math.min(22000, sampleRate / 2 - 20);
  frequency = Math.max(20, Math.min(maxFrequency, frequency));
  width = Math.max(20, Math.min(20000, sampleRate / 2 - 20, width));
  var omega = 2 * Math.PI * frequency / sampleRate;
  var halfBandwidth = Math.PI * width / sampleRate;
  var alpha = Math.tan(halfBandwidth);
  var middle = Math.acos(Math.max(-1, Math.min(1, Math.cos(omega) * Math.cos(halfBandwidth))));
  return {
    frequency: frequency,
    width: width,
    // Widen each stage so the whole cascade has the requested −3 dB width.
    q: Math.sin(omega) / (2 * alpha) * Math.sqrt(Math.pow(2, 1 / stages) - 1),
    stages: stages,
    low: (middle - halfBandwidth) * sampleRate / (2 * Math.PI),
    high: (middle + halfBandwidth) * sampleRate / (2 * Math.PI)
  };
}

function create(context) {
  var input = context.createGain();
  var output = context.createGain();
  var filters = [];
  var dry = context.createGain();
  var wet = context.createGain();
  for (var i = 0; i < stages; i++) {
    var filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filters.push(filter);
    if (i > 0) { filters[i - 1].connect(filter); }
  }
  dry.gain.value = 1;
  wet.gain.value = 0;
  input.connect(dry);
  dry.connect(output);
  input.connect(filters[0]);
  filters[filters.length - 1].connect(wet);
  wet.connect(output);

  return {
    input: input,
    output: output,
    update: function (enabled, frequency, width, immediate) {
      var band = settings(context.sampleRate, frequency, width);
      function set(parameter, value) {
        if (immediate) { parameter.value = value; }
        else { parameter.setTargetAtTime(value, context.currentTime, 0.02); }
      }
      filters.forEach(function (filter) {
        set(filter.frequency, band.frequency);
        set(filter.Q, band.q);
      });
      set(dry.gain, enabled ? 0 : 1);
      set(wet.gain, enabled ? 1 : 0);
    },
    disconnect: function () {
      [input, dry, wet, output].concat(filters).forEach(function (node) { node.disconnect(); });
    }
  };
}

return { settings: settings, create: create };
})();

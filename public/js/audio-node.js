(function () {
"use strict";

if (!window.AudioContext && !window.webkitAudioContext) { return; }

var AudioNode = window.AudioNode;

if (!AudioNode) { return; }

function toString(node) {
  return (node || 'null').toString().replace(/\[object (.*)\]/, '$1');
}

Object.defineProperty(AudioNode.prototype, 'input', {
  get: function() {
    return this._input;
  },
  set: function(node) {
    console.log(toString(node), '->', toString(this));
    if (this._input) { this._input.disconnect(); }
    if (node) { node.connect(this); }
    this._input = node;
  },
  configurable: true
});

Object.defineProperty(AudioNode.prototype, 'output', {
  get: function() {
    return this._output;
  },
  set: function(node) {
    if (node) { node.input = this; }
    else if (this._output) { this._output.input = null; }
    this._output = node;
  },
  configurable: true
});

})();

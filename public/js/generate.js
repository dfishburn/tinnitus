// taken from https://github.com/mattdiamond/synthjs
function generateWhiteNoise(stereo, bufSize){
  bufSize = bufSize || 2048;
  var node = audio.createScriptProcessor(bufSize, 1, 2);
  node.onaudioprocess = function(e){
    var outBufferL = e.outputBuffer.getChannelData(0);
    var outBufferR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < bufSize; i++){
      outBufferL[i] = Math.random() * 2 - 1;
      outBufferR[i] = stereo ? Math.random() * 2 - 1 : outBufferL[i];
    }
  };
  return node;
}

function centreFreq(f) {
  var lower = f / 1.41;
  var upper = lower * 2;
  return lower + (upper - lower) / 2;
}

function singleNotch(value) {
  var notch = audio.createBiquadFilter();
  notch.type = 'notch';
  notch.frequency.value = centreFreq(value);
  notch.Q.value = 1;
  notch.gain.value = 0;

  return notch;
}

function Notch(value, n) {
  if (this == window) {
    return new Notch(value, n);
  }

  var i, notch, last;

  if (!n) n = 5;

  this._value = value;
  this.notches = [];

  last = singleNotch(value);
  this.notches.push(last);
  for (i = 1; i < n; i++) {
    notch = singleNotch(value);
    notch.input = this.notches[this.notches.length - 1];
    this.notches.push(notch);
  }

  return this;
}

Object.defineProperty(Notch.prototype, 'input', {
  get: function() { return this.notches[0].input; },
  set: function(node) { this.notches[0].input = node; }
});

Object.defineProperty(Notch.prototype, 'output', {
  get: function() { return this.notches[this.notches.length - 1].output; },
  set: function(node) { this.notches[this.notches.length - 1].output = node; }
});

Object.defineProperty(Notch.prototype, 'value', {
  get: function() { return this._value; },
  set: function(value) {
    var i = this.notches.length;
    while (i--) {
      this.notches[i].frequency.value = centreFreq(value);
    }
    this._value = value;
  }
});

Notch.prototype.allpass = function() {
  var i = this.notches.length;
  while (i--) {
    this.notches[i].type = 'allpass';
  }
};

Notch.prototype.notch = function() {
  var i = this.notches.length;
  while (i--) {
    this.notches[i].type = 'notch';
  }
};

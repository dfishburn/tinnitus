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

// Pink noise — equal energy per octave (1/f spectrum)
function generatePinkNoise(bufSize) {
  bufSize = bufSize || 2048;
  var node = audio.createScriptProcessor(bufSize, 1, 2);
  var b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  node.onaudioprocess = function(e) {
    var out = e.outputBuffer.getChannelData(0);
    var outR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      var pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      out[i] = pink;
      outR[i] = pink;
    }
  };
  return node;
}

// Brown noise — 1/f² spectrum, deeper/rumblier than pink
function generateBrownNoise(bufSize) {
  bufSize = bufSize || 2048;
  var node = audio.createScriptProcessor(bufSize, 1, 2);
  var lastOut = 0;
  node.onaudioprocess = function(e) {
    var out = e.outputBuffer.getChannelData(0);
    var outR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      var brown = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brown;
      out[i] = brown * 3.5; // scale up
      outR[i] = out[i];
    }
  };
  return node;
}

// Blue noise — emphasis on higher frequencies (differentiated white)
function generateBlueNoise(bufSize) {
  bufSize = bufSize || 2048;
  var node = audio.createScriptProcessor(bufSize, 1, 2);
  var lastOut = 0;
  node.onaudioprocess = function(e) {
    var out = e.outputBuffer.getChannelData(0);
    var outR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      var blue = white - lastOut;
      lastOut = white;
      out[i] = blue * 0.5;
      outR[i] = out[i];
    }
  };
  return node;
}

// Violet noise — steepest high-frequency emphasis (differentiated blue)
function generateVioletNoise(bufSize) {
  bufSize = bufSize || 2048;
  var node = audio.createScriptProcessor(bufSize, 1, 2);
  var last0 = 0, last1 = 0;
  node.onaudioprocess = function(e) {
    var out = e.outputBuffer.getChannelData(0);
    var outR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      var blue  = white - last0;
      var violet = blue - last1;
      last0 = white;
      last1 = blue;
      out[i] = violet * 0.15;
      outR[i] = out[i];
    }
  };
  return node;
}

// Factory — returns a noise node by type name
function generateNoise(type, bufSize) {
  switch (type) {
    case 'pink':   return generatePinkNoise(bufSize);
    case 'brown':  return generateBrownNoise(bufSize);
    case 'blue':   return generateBlueNoise(bufSize);
    case 'violet': return generateVioletNoise(bufSize);
    default:       return generateWhiteNoise(false, bufSize); // white
  }
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

Notch.prototype.disconnect = function() {
  var i = this.notches.length;
  while (i--) {
    try { this.notches[i].disconnect(); } catch(e) {}
  }
};

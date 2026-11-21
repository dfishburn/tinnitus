/*global find:true, $:true, generateNoise:true, noiseBand:true, equalizer:true, musicPlayer:true*/
"use strict";

var audio;
var notchPlaying = false;
var notchNoiseNode = null;
var notchKeeperNode = null;
var notchNoiseBand = null;
var notchMatchGain = null;
var notchEQGain = null;
var findPlaying = false;

function initAudio() {
  if (audio) { return audio; }
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audio = new AudioContext();
    // New AudioContext starts in running state — suspend immediately
    // so user controls when sound starts
    audio.suspend();
    updateNoiseControls();
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
  return audio;
}

// --- Notch noise helpers ---

function updateNoiseControls(immediate) {
  var frequency = document.querySelector('#noiseFreqSlider');
  var width = document.querySelector('#noiseWidthSlider');
  var enabled = document.querySelector('#noiseBandEnabled').checked;
  var sampleRate = audio ? audio.sampleRate : 48000;
  frequency.max = Math.floor(Math.min(22000, sampleRate / 2 - 20) / 10) * 10;
  width.max = Math.floor(Math.min(20000, sampleRate / 2 - 20) / 10) * 10;
  var band = noiseBand.settings(sampleRate, Number(frequency.value), Number(width.value));
  frequency.disabled = !enabled;
  width.disabled = !enabled;
  $('#notchNoiseFrequency').prop('disabled', !enabled);
  $('#noiseFreqDisplay').text(band.frequency);
  $('#noiseWidthDisplay').text(band.width);
  $('#noiseBandRange').text(enabled ? 'Approximate −3 dB band: ' + Math.round(band.low) + '–' + Math.round(band.high) + ' Hz (soft edges).' : 'Full spectrum.');
  if (notchNoiseBand) {
    notchNoiseBand.update(enabled, band.frequency, band.width, immediate === true);
  }
}

function updateNoiseMatchMode(immediate) {
  var matching = document.querySelector('#noiseMatchMode').checked;
  $('#noiseMatchStatus').text(matching ? 'Matching: notch/EQ bypassed for noise only.' : 'Notch/EQ applied. Enable Match mode to find your frequency without cutting it out.');
  if (notchMatchGain && notchEQGain) {
    if (immediate === true) {
      notchMatchGain.gain.value = matching ? 1 : 0;
      notchEQGain.gain.value = matching ? 0 : 1;
    } else {
      notchMatchGain.gain.setTargetAtTime(matching ? 1 : 0, audio.currentTime, 0.02);
      notchEQGain.gain.setTargetAtTime(matching ? 0 : 1, audio.currentTime, 0.02);
    }
  }
}

function stopNotchNoise() {
  if (notchNoiseNode) {
    try { notchNoiseNode.disconnect(); } catch(e) {}
    notchNoiseNode = null;
  }
  if (notchKeeperNode) {
    try { notchKeeperNode.disconnect(); } catch(e) {}
    notchKeeperNode = null;
  }
  if (equalizer.filtersBuilt() && find.gainNode) {
    if (notchEQGain) {
      try { equalizer.getOutput().disconnect(notchEQGain); } catch(e) {}
    }
    try { equalizer.getOutput().disconnect(find.gainNode); } catch(e) {}
  }
  if (notchNoiseBand) { notchNoiseBand.disconnect(); notchNoiseBand = null; }
  if (notchMatchGain) { notchMatchGain.disconnect(); notchMatchGain = null; }
  if (notchEQGain) { notchEQGain.disconnect(); notchEQGain = null; }
  notchPlaying = false;
  $('#notchPlayBtn').html('<i class="bi bi-play-fill"></i>');
}

function startNotchNoise() {
  if (!initAudio()) { return; }

  if (!equalizer.filtersBuilt()) {
    equalizer.buildFilters();
  }
  if (!find.gainNode) {
    find.initGainNode();
  }

  stopNotchNoise();

  var noiseType = document.querySelector('#noiseType').value;
  var freqValue = parseFloat(document.querySelector('#freqSlider').value) || 0;

  if (!equalizer.isManual()) {
    equalizer.setNotch(freqValue);
  }

  notchNoiseNode = generateNoise(noiseType);
  notchNoiseBand = noiseBand.create(audio);
  notchNoiseNode.connect(notchNoiseBand.input);
  notchNoiseBand.output.connect(equalizer.getInput());
  notchMatchGain = audio.createGain();
  notchEQGain = audio.createGain();
  notchNoiseBand.output.connect(notchMatchGain);
  equalizer.getOutput().connect(notchEQGain);
  notchMatchGain.connect(find.gainNode);
  notchEQGain.connect(find.gainNode);
  updateNoiseControls(true);
  updateNoiseMatchMode(true);
  find.gainNode.gain.value = Number(document.querySelector('#notchGainSlider').value) / 100;

  notchKeeperNode = audio.createGain();
  notchKeeperNode.gain.value = 0;
  notchNoiseNode.connect(notchKeeperNode);
  notchKeeperNode.connect(audio.destination);

  audio.resume();
  notchPlaying = true;
  $('#notchPlayBtn').html('<i class="bi bi-pause-fill"></i>');
}

// --- Init ---

function init() {
  equalizer.buildUI();
  find.setup(false);
  updateNoiseControls();
  updateNoiseMatchMode();

  $('#noiseBandEnabled').on('change', updateNoiseControls);
  $('#noiseFreqSlider, #noiseWidthSlider').on('input', updateNoiseControls);
  $('#noiseMatchMode').on('change', updateNoiseMatchMode);
  $('#notchNoiseFrequency').on('click', function () {
    if (!document.querySelector('#noiseBandEnabled').checked) { return; }
    var frequency = document.querySelector('#freqSlider');
    frequency.value = document.querySelector('#noiseFreqSlider').value;
    equalizer.setManual(false);
    frequency.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#noiseMatchMode').checked = false;
    updateNoiseMatchMode();
  });

  // Find tab — play/pause button
  $('#startBtn').on('click', function () {
    if (!initAudio()) { return; }

    if (!audio._setupDone) {
      if (!equalizer.filtersBuilt()) { equalizer.buildFilters(); }
      audio._setupDone = true;
    }

    if (!findPlaying) {
      // Start/resume
      audio.resume();
      find.start();
      findPlaying = true;
      $(this).html('<i class="bi bi-pause-fill"></i>');
    } else {
      // Pause
      find.stop();
      audio.suspend();
      findPlaying = false;
      $(this).html('<i class="bi bi-play-fill"></i>');
    }
  });

  // Notch tab — play/pause button
  $('#notchPlayBtn').on('click', function () {
    if (notchPlaying) {
      stopNotchNoise();
      audio.suspend();
    } else {
      startNotchNoise();
    }
  });

  // Noise type change — restart if playing
  $('#noiseType').on('change', function () {
    if (notchPlaying) {
      startNotchNoise();
    }
  });

  // Tab switching
  $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
    var show = e.target.hash.substr(1);

    if (show === 'find') {
      // Leaving Notch tab — stop all notch sources
      stopNotchNoise();
      musicPlayer.stop();
      if (audio) { audio.suspend(); }
      findPlaying = false;
      $('#startBtn').html('<i class="bi bi-play-fill"></i>');

    } else {
      // Leaving Find tab — pause oscillator
      if (findPlaying) {
        find.stop();
        if (audio) { audio.suspend(); }
        findPlaying = false;
        $('#startBtn').html('<i class="bi bi-play-fill"></i>');
      }
      // Enable notch play button
      $('#notchPlayBtn').prop('disabled', false);

      // Reset notch button state
      notchPlaying = false;
      $('#notchPlayBtn').html('<i class="bi bi-play-fill"></i>');

      // Update EQ preview
      var freqValue = parseFloat(document.querySelector('#freqSlider').value) || 0;
      if (!equalizer.isManual()) {
        equalizer.setNotch(freqValue);
      }
    }
  });

  // Source type toggle (Noise / Music)
  $('input[name="sourceType"]').on('change', function () {
    var isMusic = this.value === 'music';
    $('#noiseControls').toggle(!isMusic);
    $('#musicControls').toggle(isMusic);
    // Stop whichever source was playing
    stopNotchNoise();
    musicPlayer.stop();
    if (audio) { audio.suspend(); }
  });

  // Music file pickers
  $('#musicFiles').on('change', function () {
    if (!initAudio()) { return; }
    if (!equalizer.filtersBuilt()) {
      equalizer.buildFilters();
    }
    if (!find.gainNode) {
      find.initGainNode();
    }
    musicPlayer.addFiles(this.files);
    this.value = '';
  });

  $('#musicFolder').on('change', function () {
    if (!initAudio()) { return; }
    if (!equalizer.filtersBuilt()) {
      equalizer.buildFilters();
    }
    if (!find.gainNode) {
      find.initGainNode();
    }
    musicPlayer.addFiles(this.files);
    this.value = '';
  });

  $('#clearPlaylist').on('click', function () {
    musicPlayer.clear();
  });

  // Music playback controls
  $('#musicPlayBtn').on('click', function () {
    if (!initAudio()) { return; }
    if (!equalizer.filtersBuilt()) {
      equalizer.buildFilters();
    }
    if (!find.gainNode) {
      find.initGainNode();
    }
    if (audio.state === 'suspended') { audio.resume(); }
    musicPlayer.play();
  });

  $('#musicPrevBtn').on('click', function () {
    musicPlayer.prev();
  });

  $('#musicNextBtn').on('click', function () {
    musicPlayer.next();
  });

  // Notch tab volume slider
  $(document).on('input', '#notchGainSlider', function () {
    $('#notchGainDisplay').text(this.value);
    if (find.gainNode) {
      find.gainNode.gain.value = this.value / 100;
    }
  });

  // Freq slider changes update EQ preview
  $(document).on('input', '#freqSlider', function () {
    var freqValue = parseFloat(this.value) || 0;
    if (!equalizer.isManual()) {
      equalizer.setNotch(freqValue);
    }
  });

  setTimeout(function () {
    window.scrollTo(0, 1);
  }, 1000);
}

window.addEventListener('load', init, false);

/*global find:true, $:true, generateNoise:true, equalizer:true*/
"use strict";

var audio;
var notchPlaying = false;
var notchNoiseNode = null;
var notchKeeperNode = null;
var findPlaying = false;

function initAudio() {
  if (audio) { return audio; }
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audio = new AudioContext();
    // New AudioContext starts in running state — suspend immediately
    // so user controls when sound starts
    audio.suspend();
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
  return audio;
}

// --- Notch noise helpers ---

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
    try { equalizer.getOutput().disconnect(find.gainNode); } catch(e) {}
  }
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
  notchNoiseNode.connect(equalizer.getInput());
  equalizer.getOutput().connect(find.gainNode);

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

  // Find tab — play/pause button
  $('#startBtn').on('click', function () {
    if (!initAudio()) { return; }

    if (!audio._setupDone) {
      equalizer.buildFilters();
      find.setup(true);
      audio._setupDone = true;
    }

    if (!findPlaying) {
      // Start/resume
      audio.resume();
      find.resume();
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
      // Leaving Notch tab — stop noise
      stopNotchNoise();
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

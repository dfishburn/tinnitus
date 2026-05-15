/*global find:true, $:true, Notch:true, generateWhiteNoise:true*/
"use strict";

var audio,
    notch;

function initAudio() {
  if (audio) {
    // Resume if suspended (required by modern browsers after user gesture)
    if (audio.state === 'suspended') {
      audio.resume();
    }
    return;
  }
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audio = new AudioContext();
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}

function init() {
  var touch = 'createTouch' in document;

  $('#startBtn').on('click', function () {
    initAudio();
    $(this).prop('disabled', true);
    $('#stopBtn').prop('disabled', false);
    find.setup(true);
  });

  $('#stopBtn').on('click', function () {
    if (audio) {
      audio.suspend();
    }
    $(this).prop('disabled', true);
    $('#startBtn').text('Resume').prop('disabled', false);
  });

  $(document).on('audioready', function () {
    $('#mute').on('click', function () {
      if (!find.gainNode) { return; }
      var muted = $(this).hasClass('active');
      find.gainNode.gain.value = muted ? 0 : (document.querySelector('#gainSlider').value / 100);
      $(this)
        .toggleClass('btn-secondary', !muted)
        .toggleClass('btn-warning', muted);
    });
  });

  $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
    var show = e.target.hash.substr(1);
    if (show === 'find') {
      find.start();
    } else {
      // generate
      var wn = generateWhiteNoise();
      notch = new Notch(document.querySelector('input').value, 3);
      notch.input = wn;

      // need to set to null, because notch isn't an audio node, it's a custom object without .input
      find.analyser.input = null;
      notch.output = find.analyser;
    }
  });

  setTimeout(function () {
    window.scrollTo(0, 1);
  }, 1000);
}

window.addEventListener('load', init, false);

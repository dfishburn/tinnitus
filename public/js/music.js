/*global audio:true, equalizer:true, find:true*/
var musicPlayer = (function () {
"use strict";

var playlist = [];
var currentIndex = -1;
var bufferSource = null;
var isPlaying = false;
var startTime = 0;
var pauseOffset = 0;
var currentBuffer = null;
var autoAdvance = false;  // only true when a track plays to natural completion

// Audio file extensions to accept
var AUDIO_EXTENSIONS = /\.(mp3|mp4|m4a|aac|ogg|oga|opus|wav|wave|flac|webm|weba|3gp|3g2|aiff|aif)$/i;

function isAudioFile(file) {
  return AUDIO_EXTENSIONS.test(file.name) ||
         (file.type && file.type.match(/^audio\//));
}

// --- UI helpers ---

function renderPlaylist() {
  var $list = $('#playlist');
  $list.empty();
  playlist.forEach(function (item, i) {
    var active = i === currentIndex ? ' active' : '';
    var $li = $('<li type="button" class="list-group-item list-group-item-action' + active + '">')
      .text(item.name)
      .on('click', function () {
        loadAndPlay(i);
      });
    $list.append($li);
  });
  updateControls();
}

function updateControls() {
  var hasFiles = playlist.length > 0;
  $('#musicPlayBtn').prop('disabled', !hasFiles);
  $('#musicPrevBtn').prop('disabled', !hasFiles || currentIndex <= 0);
  $('#musicNextBtn').prop('disabled', !hasFiles || currentIndex >= playlist.length - 1);
}

function setNowPlaying(name) {
  $('#musicNowPlaying').text(name || 'No file loaded');
}

// --- Audio helpers ---

function stopCurrent() {
  autoAdvance = false;
  if (bufferSource) {
    try { bufferSource.onended = null; } catch(e) {}
    try { bufferSource.stop(); } catch(e) {}
    try { bufferSource.disconnect(); } catch(e) {}
    bufferSource = null;
  }
  isPlaying = false;
  pauseOffset = 0;
  $('#musicPlayBtn').html('<i class="bi bi-play-fill"></i>');
}

function connectToEQ(source) {
  if (!equalizer.filtersBuilt()) {
    equalizer.buildFilters();
  }
  if (!find.gainNode) {
    find.initGainNode();
  }
  source.connect(equalizer.getInput());
  equalizer.getOutput().connect(find.gainNode);
}

function playBuffer(buffer, offset) {
  offset = offset || 0;
  stopCurrent();

  bufferSource = audio.createBufferSource();
  bufferSource.buffer = buffer;
  connectToEQ(bufferSource);

  autoAdvance = true;
  bufferSource.onended = function () {
    if (autoAdvance) {
      autoAdvance = false;
      isPlaying = false;
      // Auto-advance to next track
      if (currentIndex < playlist.length - 1) {
        loadAndPlay(currentIndex + 1);
      } else {
        setNowPlaying('End of playlist');
        $('#musicPlayBtn').html('<i class="bi bi-play-fill"></i>');
        updateControls();
      }
    }
  };

  bufferSource.start(0, offset);
  startTime = audio.currentTime - offset;
  isPlaying = true;
  pauseOffset = 0;
  $('#musicPlayBtn').html('<i class="bi bi-pause-fill"></i>');
}

function loadAndPlay(index) {
  if (index < 0 || index >= playlist.length) { return; }
  currentIndex = index;
  renderPlaylist();
  setNowPlaying('Loading: ' + playlist[index].name);

  var reader = new FileReader();
  reader.onload = function (e) {
    // Clone the ArrayBuffer — decodeAudioData detaches it
    var arrayBuffer = e.target.result.slice(0);
    audio.decodeAudioData(arrayBuffer, function (buffer) {
      currentBuffer = buffer;
      setNowPlaying(playlist[index].name);
      playBuffer(buffer, 0);
    }, function (err) {
      // Skip undecodable file and try next
      console.warn('Cannot decode:', playlist[index].name, err);
      setNowPlaying('Skipping (unsupported): ' + playlist[index].name);
      if (index + 1 < playlist.length) {
        loadAndPlay(index + 1);
      } else {
        setNowPlaying('No playable files found');
        currentBuffer = null;
        updateControls();
      }
    });
  };
  reader.onerror = function () {
    console.warn('FileReader error for:', playlist[index].name);
    if (index + 1 < playlist.length) {
      loadAndPlay(index + 1);
    }
  };
  reader.readAsArrayBuffer(playlist[index].file);
}

// --- Public API ---

function addFiles(files) {
  var added = 0;
  Array.prototype.forEach.call(files, function (file) {
    if (isAudioFile(file)) {
      playlist.push({ name: file.name, file: file });
      added++;
    }
  });
  if (added === 0) {
    console.info('No audio files found in selection');
  }
  renderPlaylist();
  if (currentIndex === -1 && playlist.length > 0) {
    currentIndex = 0;
    setNowPlaying(playlist[0].name);
    updateControls();
  }
}

function play() {
  if (!audio || playlist.length === 0) { return; }
  if (currentIndex === -1) { currentIndex = 0; }

  if (isPlaying) {
    // Pause — record offset
    pauseOffset = audio.currentTime - startTime;
    autoAdvance = false;
    if (bufferSource) {
      try { bufferSource.onended = null; } catch(e) {}
      try { bufferSource.stop(); } catch(e) {}
      try { bufferSource.disconnect(); } catch(e) {}
      bufferSource = null;
    }
    isPlaying = false;
    $('#musicPlayBtn').html('<i class="bi bi-play-fill"></i>');
  } else if (currentBuffer) {
    // Resume from pause offset
    playBuffer(currentBuffer, pauseOffset);
  } else {
    // First play
    loadAndPlay(currentIndex);
  }
}

function prev() {
  if (currentIndex > 0) {
    loadAndPlay(currentIndex - 1);
  }
}

function next() {
  if (currentIndex < playlist.length - 1) {
    loadAndPlay(currentIndex + 1);
  } else {
    stopCurrent();
    setNowPlaying('End of playlist');
  }
}

function clear() {
  stopCurrent();
  playlist = [];
  currentIndex = -1;
  currentBuffer = null;
  renderPlaylist();
  setNowPlaying('No file loaded');
}

function stop() {
  if (isPlaying) {
    pauseOffset = audio.currentTime - startTime;
  }
  stopCurrent();
}

function disconnect() {
  stop();
  if (equalizer.filtersBuilt() && find.gainNode) {
    try { equalizer.getOutput().disconnect(find.gainNode); } catch(e) {}
  }
}

return {
  addFiles:   addFiles,
  play:       play,
  prev:       prev,
  next:       next,
  clear:      clear,
  stop:       stop,
  disconnect: disconnect,
  isPlaying:  function () { return isPlaying; }
};

})();

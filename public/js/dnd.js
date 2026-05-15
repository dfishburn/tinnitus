// Drag and drop audio files onto the page — adds to music playlist
(function () {

var root = document.documentElement;

root.ondragover = function () { this.className = 'hover'; return false; };
root.ondragend  = function () { this.className = ''; return false; };
root.ondrop     = function (e) {
  this.className = '';
  e.preventDefault();

  var files = e.dataTransfer.files;
  if (files && files.length > 0) {
    // Switch to Music source if not already
    document.querySelector('#sourceMusic').checked = true;
    $('input[name="sourceType"]').trigger('change');

    musicPlayer.addFiles(files);
  }

  return false;
};

})();

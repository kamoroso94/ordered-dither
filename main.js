'use strict';

const ditherWorker = new Worker('worker.js');

const fullscreenElement = [
  'fullscreenElement',
  'webkitFullscreenElement',
  'mozFullScreenElement',
  'msFullscreenElement'
].find(prop => prop in document);
const exitFullscreen = [
  'exitFullscreen',
  'webkitExitFullscreen',
  'mozCancelFullScreen',
  'msExitFullscreen'
].find(prop => prop in document);
const requestFullscreen = [
  'requestFullscreen',
  'webkitRequestFullscreen',
  'mozRequestFullScreen',
  'msRequestFullscreen'
].find(prop => prop in Element.prototype);
const fullscreenerror = [
  'fullscreenerror',
  'webkitfullscreenerror',
  'mozfullscreenerror',
  'msfullscreenerror'
].find(eventName => 'on' + eventName in document);

window.addEventListener('load', function() {
  const img = new Image();
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const form = document.getElementById('dither');
  const uploadLbl = document.getElementById('uploadLbl');
  const uploader = document.getElementById('uploader');
  const formButtons = document.getElementById('formButtons');
  const statusBox = document.getElementById('processing');
  const hint = document.getElementById('hint');
  const output = document.getElementById('output');
  const downloadBtn = document.getElementById('download');

  img.addEventListener('load', () => draw(ctx, img));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const reader = new FileReader();
    const file = uploader.files[0];

    if(file == null || !(/image\/.+/).test(file.type) && file.type) {
      return;
    }

    const name = file.name || 'ditheredImage';
    downloadBtn.dataset.download = name.replace(/\.[^.]+$/, '');

    reader.addEventListener('load', () => {
      if(img.src != reader.result) {
        img.src = reader.result;
      } else {
        draw(ctx, img);
      }
    });

    reader.readAsDataURL(uploader.files[0]);

    // update UI
    statusBox.classList.remove('hidden');
    hint.classList.add('hidden');
    output.classList.add('hidden');
    formButtons.setAttribute('disabled', true);
  });

  form.addEventListener('reset', () => {
    hint.classList.remove('hidden');
    output.classList.add('hidden');
    uploadLbl.textContent = 'Upload';
  });

  uploader.addEventListener('change', () => {
    const file = uploader.files[0];
    let name;

    if(file == null) {
      name = 'Upload';
    } else {
      name = file.name || 'Uploaded';
    }

    uploadLbl.textContent = name.length > 20 ? name.slice(0, 19) + '…' : name;
  });

  canvas.addEventListener('click', () => {
    if(document[fullscreenElement]) {
      document[exitFullscreen]();
      canvas.title = 'Open preview';
    } else {
      document.getElementById('fullscreen')[requestFullscreen]();
      canvas.title = 'Close preview';
    }
  });

  document.addEventListener(fullscreenerror, () => {
    canvas.title = 'Open preview';
  });

  downloadBtn.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      const url = window.URL.createObjectURL(blob);
      const aTag = document.createElement('a');

      aTag.href = canvas.toDataURL();
      aTag.download = downloadBtn.dataset.download;
      aTag.style.display = 'none';
      document.body.append(aTag);
      aTag.click();
      aTag.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 0);
    });
  });

  ditherWorker.addEventListener('message', (event) => {
    const imageData = event.data;
    drawCanvas(ctx, imageData, 'putImageData');

    // update UI
    statusBox.classList.add('hidden');
    output.classList.remove('hidden');
    formButtons.removeAttribute('disabled');
  });
});

function draw(ctx, img) {
  drawCanvas(ctx, img, 'drawImage');
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  ditherWorker.postMessage({
    imageData,
    ditherId: document.getElementById('bitdepth').value
  }, [imageData.data.buffer]);
}

function drawCanvas(ctx, img, methodName) {
  const { canvas } = ctx;
  canvas.width = img.width;
  canvas.height = img.height;
  ctx[methodName](img, 0, 0);
}

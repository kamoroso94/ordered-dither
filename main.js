"use strict";

let canvas, ctx, form, formButtons, statusBox, hint, output, downloadBtn, downloadTag;
const ditherWorker = new Worker("worker.js");
const img = new Image();

const fullscreenElement = ["fullscreenElement", "webkitFullscreenElement", "mozFullScreenElement", "msFullscreenElement"].find(prop => prop in document);
const exitFullscreen = ["exitFullscreen", "webkitExitFullscreen", "mozCancelFullScreen", "msExitFullscreen"].find(prop => prop in document);
const requestFullscreen = ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"].find(prop => prop in Element.prototype);
const fullscreenerror = ["fullscreenerror", "webkitfullscreenerror", "mozfullscreenerror", "msfullscreenerror"].find(eventName => "on" + eventName in document);

window.addEventListener("load", function() {
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");
	form = document.getElementById("dither");
	formButtons = document.getElementById("formButtons");
	statusBox = document.getElementById("processing");
	hint = document.getElementById("hint");
	output = document.getElementById("output");
	downloadBtn = document.getElementById("downloadBtn");
	downloadTag = document.getElementById("download");

	img.addEventListener("load", draw);

	form.addEventListener("submit", function(e) {
		e.preventDefault();
		const reader = new FileReader();

		reader.addEventListener("load", function() {
			if(img.src != this.result) {
				img.src = this.result;
			} else {
				draw();
			}
		});

		reader.readAsDataURL(document.getElementById("uploader").files[0]);

		// update UI
		statusBox.classList.remove("hidden");
		hint.classList.add("hidden");
		output.classList.add("hidden");
		formButtons.setAttribute("disabled", true);
	});

	form.addEventListener("reset", function() {
		hint.classList.remove("hidden");
		output.classList.add("hidden");
	});

	canvas.addEventListener("click", function() {
		if(document[fullscreenElement]) {
			document[exitFullscreen]();
			this.setAttribute("title", "Open preview");
		} else {
			output[requestFullscreen]();
			this.setAttribute("title", "Close preview");
		}
	});

	document.addEventListener(fullscreenerror, function() {
		canvas.setAttribute("title", "Open preview");
	});

	downloadBtn.addEventListener("click", function() {
		downloadTag.href = canvas.toDataURL();
		downloadTag.download = "ditheredImage";
		downloadTag.click();
	});

	ditherWorker.addEventListener("message", function(event) {
		const imageData = event.data;
		drawCanvas(imageData, "putImageData");

		// update UI
		statusBox.classList.add("hidden");
		output.classList.remove("hidden");
		formButtons.removeAttribute("disabled");
	});
});

function draw() {
	drawCanvas(img, "drawImage");
	const imageData = ctx.getImageData(0, 0, img.width, img.height);

	ditherWorker.postMessage({
		imageData,
		ditherId: document.getElementById("bitdepth").value
	}, [imageData.data.buffer]);
}

function drawCanvas(img, methodName) {
	canvas.width = img.width;
	canvas.height = img.height;
	ctx[methodName](img, 0, 0);
}

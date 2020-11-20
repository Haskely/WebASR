import { scaleImageData } from '../../Drawer/Drawer.js';

const width = 200;
const height = 100;
$('body').append(`<div style="text-align:center;"><canvas id='testCanvas' width="${Math.round(width)}" height="${Math.round(height)}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
const testCanvasEl = document.querySelector('#testCanvas');
const canvas_ctx = testCanvasEl.getContext('2d');
let imageData = new ImageData(width, height);
for (let h = 0; h < imageData.height; h++) {
    for (let i = imageData.width * h * 4; i < imageData.width * (h + 1) * 4; i += 4) {
        imageData.data[i + 0] = Math.round(h / imageData.height * 200);
        imageData.data[i + 1] = Math.round(h / imageData.height * 200);
        imageData.data[i + 2] = Math.round(h / imageData.height * 200);
        imageData.data[i + 3] = 255;
    };
};
canvas_ctx.putImageData(imageData, 0, 0);

$('body').append(`<div style="text-align:center;"><canvas id='testCanvas2' width="${Math.round(width)}" height="${Math.round(height)}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
const testCanvasEl2 = document.querySelector('#testCanvas2');
const canvas_ctx2 = testCanvasEl2.getContext('2d');
let imageData2 = scaleImageData(imageData, Math.round(width * 0.7), Math.round(height * 0.65));
canvas_ctx2.putImageData(imageData2, 0, 0);




let cyclicFloat32Array;
let cyclicImageData;
async function Test() {
    // const { CyclicFloat32Array } = await import('./CyclicContainer.js');

    // cyclicFloat32Array = new CyclicFloat32Array(7);
    // for (let arr of [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9], []]) {
    //     cyclicFloat32Array.update(arr);
    //     console.log(`update:${arr}\t result:${cyclicFloat32Array.toArray()}`);
    // };
    // let arr = [];
    // for (let i = -cyclicFloat32Array.length; i < cyclicFloat32Array.length; i += 1) {
    //     arr.push(cyclicFloat32Array.get(i));
    // };
    // console.log(arr);
    const { CyclicImageData } = await import('./CyclicContainer.js');

    cyclicImageData = new CyclicImageData(width, height);


    for (let k = 0; k < 15; k++) {
        let imageData = new ImageData(width, Math.floor(height / (k + 1.5)));
        for (let h = 0; h < imageData.height; h++) {
            for (let i = width * h * 4; i < width * (h + 1) * 4; i += 4) {
                imageData.data[i + 0] = Math.round(h / imageData.height * 200);
                imageData.data[i + 1] = Math.round(h / imageData.height * 200);
                imageData.data[i + 2] = Math.round(h / imageData.height * 200);
                imageData.data[i + 3] = 255;
            };
        };
        cyclicImageData.update(imageData);
        canvas_ctx.putImageData(cyclicImageData.toImageData(), 0, 0);
        canvas_ctx2.putImageData(cyclicImageData.toImageDataT(), 0, 0);
        console.log(`update:${imageData}`);
    };
    console.log(cyclicImageData);
};


const width = 50;
const height = 100;
$('body').append(`<div style="text-align:center;"><canvas id='testCanvas' width="${Math.round(width)}" height="${Math.round(height)}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
const testCanvasEl = document.querySelector('#testCanvas');
const canvas_ctx = testCanvasEl.getContext('2d');

$('body').append(`<div style="text-align:center;"><canvas id='testCanvas2' width="${Math.round(height)}" height="${Math.round(width)}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
const testCanvasEl2 = document.querySelector('#testCanvas2');
const canvas_ctx2 = testCanvasEl2.getContext('2d');

Test();

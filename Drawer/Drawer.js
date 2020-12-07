import { CyclicImageData } from '../utils/CyclicContainer.js';

class Drawer {
    constructor(id = 'DrawerCanvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`canvas#${id}`);
        if (!this.canvas) {
            $('body').append(`<div style="margin:1 auto;"><canvas id='${id}' width="${Math.round(width)}" height="${Math.round(height)}" style="max-width: 95vw;text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
            this.canvas = document.querySelector(`#${id}`);
        } else {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.canvas_ctx = this.canvas.getContext('2d');
        this.data = null;
        this.next_data_ready = false;
        this.next_frame_ready = false;
        window.requestAnimationFrame(this.requestAF);

    };

    draw = async (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    _process_draw = async () => {
        await this.draw(this.data);
        window.requestAnimationFrame(this.requestAF);
    };

    requestAF = () => {
        if (this.next_data_ready) {
            this.next_data_ready = false;
            this._process_draw();
        } else {
            this.next_frame_ready = true;
        };
    };

    setData = (data) => {
        this.data = data;
        if (this.next_frame_ready) {
            this.next_frame_ready = false;
            this._process_draw();
        } else {
            this.next_data_ready = true;
        };
    };

};

//这个是有可能实现的，但是太累人了
class SequenceDrawer extends Drawer {
    constructor(id = 'SequenceDrawerCanvas', width = document.body.clientWidth * 0.8, height = 100) {
        super(id, width, height);
        this.cyclicImageData = new CyclicImageData(this.canvas.height, this.canvas.width);
        this.leftedData = null;
    };

    dataSlice2imageData = (dataSlice) => {

    };

    updateData = (dataSlice) => {
        const [imageData, leftedData] = dataSlice2imageData(dataSlice);
        this.leftedData = leftedData;
        this.cyclicImageData.update(imageData);
        this.setData(this.cyclicImageData);
    };

    draw = async (data) => {
        const imageData = this.cyclicImageData.toImageDataT();
        this.canvas_ctx.putImageData(imageData, this.canvas.width - imageData.width, 0);
    };
};

/**
 * 
 * @param {ImageData} originalImageData 
 * @param {Int32} targetWidth 
 * @param {Int32} targetHeight 
 */
function scaleImageData(originalImageData, targetWidth, targetHeight) {
    const targetImageData = new ImageData(targetWidth, targetHeight);
    const h1 = originalImageData.height;
    const w1 = originalImageData.width;
    const h2 = targetImageData.height;
    const w2 = targetImageData.width;
    const kh = h1 / h2;
    const kw = w1 / w2;
    const cur_img1pixel_sum = new Int32Array(4);
    for (let i2 = 0; i2 < h2; i2 += 1) {
        for (let j2 = 0; j2 < w2; j2 += 1) {
            for (let i in cur_img1pixel_sum) cur_img1pixel_sum[i] = 0;
            let cur_img1pixel_n = 0;
            for (let i1 = Math.ceil(i2 * kh); i1 < (i2 + 1) * kh; i1 += 1) {
                for (let j1 = Math.ceil(j2 * kw); j1 < (j2 + 1) * kw; j1 += 1) {
                    const cur_p1 = (i1 * w1 + j1) * 4;
                    for (let k = 0; k < 4; k += 1) {
                        cur_img1pixel_sum[k] += originalImageData.data[cur_p1 + k];
                    };
                    cur_img1pixel_n += 1;
                };
            };
            const cur_p2 = (i2 * w2 + j2) * 4;
            for (let k = 0; k < 4; k += 1) {
                targetImageData.data[cur_p2 + k] = cur_img1pixel_sum[k] / cur_img1pixel_n;
            };
        };
    };
    return targetImageData;
};

export { Drawer };
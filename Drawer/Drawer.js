class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`canvas#${id}`);
        if (!this.canvas) {
            $('body').append(`<div style="text-align:center;"><canvas id='${id}' width="${width}" height="${height}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
            this.canvas = document.querySelector(`#${id}`);
        };
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

    set_data = (data) => {
        this.data = data;
        if (this.next_frame_ready) {
            this.next_frame_ready = false;
            this._process_draw();
        } else {
            this.next_data_ready = true;
        };
    };

};

function scale_imageMatrix(imgM1, imgM2) {
    const h1 = imgM1.length;
    const w1 = imgM1[0].length;
    const h2 = imgM2.length;
    const w2 = imgM2[0].length;
    const kh = h1 / h2;
    const kw = w1 / w2;
    for (let i2 = 0; i2 < h2; i2 += 1) {
        for (let j2 = 0; j2 < w2; j2 += 1) {
            let cur_img1pixel_sum = 0;
            let cur_img1pixel_n = 0;
            for (let i1 = i2 * kh; i1 < (i2 + 1) * kh; i1 += 1) {
                for (let j1 = j2 * kw; j1 < (j2 + 1) * kw; j1 += 1) {
                    cur_img1pixel_sum += imgM1[i1][j1];
                    cur_img1pixel_n += 1;
                };
            };
            const cur_img1pixel = cur_img1pixel_sum / cur_img1pixel_n;
            img2[i2][j2] = cur_img1pixel;
        };
    };
};

export { Drawer }
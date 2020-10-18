class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`#${id}`);
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


class WaveDrawer extends Drawer {
    constructor(id = 'audioWave', width = 1000, height = 100, total_duration = 10, show_time = true) {
        super(id, width, height);
        this.total_duration = total_duration;
        this.show_time = show_time;
    };

    /**
     * 
     * @param {Object} data 具有如下格式的对象：
     *                      {
     *                          sampleRate: Number, 音频采样率，单位Hz
     *                          channels: Array[Float32Array], 数组，每个元素代表一个通道，
     *                                                          每个通道为浮点数数组。
     *                                                          每个通道长度应该相同。
     *                                                          每个通道中的每个元素为一个采样点。
     *                          timeStamp: Date.now(), 音频末尾时间
     *                      }
     */
    draw = async (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.canvas_ctx.beginPath();
        const dx = this.canvas.width / (this.total_duration * data.sampleRate);
        const wave_area_height = this.show_time ? this.canvas.height - 20 : this.canvas.height;
        const end_dy = wave_area_height / (data.channels.length * 2);
        for (let ch_n = 0; ch_n < data.channels.length; ch_n += 1) {
            let audio_pcm = data.channels[ch_n];
            let end_y = end_dy * (ch_n * 2 + 1);
            this.canvas_ctx.moveTo(this.canvas.width, end_y);
            for (let i = 1; i <= audio_pcm.length && dx * i <= this.canvas.width; i += 1) {
                let cur_y = end_y - Math.round(audio_pcm[audio_pcm.length - i] * end_dy);
                this.canvas_ctx.lineTo(this.canvas.width - dx * i, cur_y);
            };
        };
        this.canvas_ctx.stroke();
        this.canvas_ctx.closePath();

        if (this.show_time) {
            const end_time = data.audioTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);
            const audio_canvas_length = Math.round(data.channels[0].length * dx);
            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= Math.min(this.canvas.width, audio_canvas_length); i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
    };
};

class StftDrawer extends Drawer {
    constructor(id = 'audioStft', width = 1000, height = null, total_duration = 10, show_time = true) {
        super(id, width, height);
        this.total_duration = total_duration;
        this.adaptive_height = (!height);

        this.show_time = show_time;

    };

    /**
     * 
     * @param {Object} data 具有如下格式的对象：
     *                      {
     *                          timeStamp: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Array[Float32Array], stft数据，为一个嵌套Float32Array
     *                      }
     */
    draw = async (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const stft_time_n = data.stft.length;
        const stft_frequency_n = data.stft[0].length;

        const time_area_h = this.show_time ? 20 : 0;
        if (this.adaptive_height) {
            this.canvas.height = time_area_h + this.canvas.width * stft_frequency_n * data.hop_n / (this.total_duration * data.sampleRate);
            this.adaptive_height = false;
        };

        const pad_n = data.fft_n / data.hop_n + 1;
        const padded_time_n = Math.round(stft_time_n + pad_n);
        const half_pad_n = Math.round(pad_n / 2);
        const flattened_stft_array = new Float32Array(padded_time_n * stft_frequency_n);
        let max_x = flattened_stft_array[0];
        let min_x = flattened_stft_array[0];
        for (let i = 0; i < stft_frequency_n; i += 1) {
            for (let j = 0; j < stft_time_n; j += 1) {
                flattened_stft_array[i * padded_time_n + j + half_pad_n] = data.stft[j][i];
                if (data.stft[j][i] > max_x) {
                    max_x = data.stft[j][i];
                } else if (data.stft[j][i] < min_x) {
                    min_x = data.stft[j][i];
                };
            };
        };
        const jc = max_x - min_x;
        const imageData = this.canvas_ctx.createImageData(padded_time_n, stft_frequency_n);
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const onescaled_stft_point = (flattened_stft_array[p] - min_x) / jc;
            imageData.data[i + 0] = onescaled_stft_point * 255; // R value
            imageData.data[i + 1] = onescaled_stft_point * 255; // G value
            imageData.data[i + 2] = onescaled_stft_point * 255; // B value
            imageData.data[i + 3] = 255; // A value
        };

        const new_height = this.canvas.height - time_area_h;
        const new_width = imageData.width * new_height / imageData.height;
        const imageBitmap = await createImageBitmap(imageData);
        this.canvas_ctx.drawImage(imageBitmap,
            this.canvas.width - new_width, 0,
            new_width, new_height,
        );
        // this.canvas.width - new_width
        if (this.show_time) {
            const end_time = data.audioTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);
            const stft_canvas_length = new_width;
            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= Math.min(this.canvas.width, stft_canvas_length); i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
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
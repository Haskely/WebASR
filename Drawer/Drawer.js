class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`#${id}`);
        if (!this.canvas) {
            $('body').append(`<canvas id='${id}' width="${width}" height="${height}"></canvas>`);
            this.canvas = document.querySelector(`#${id}`);
        };
        this.canvas_ctx = this.canvas.getContext('2d');

        this.data = null;
        this.next_data_ready = false;
        this.next_frame_ready = false;
        window.requestAnimationFrame(this.requestAF);

    };

    draw = (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    _process_draw = () => {
        this.draw(this.data);
        this.next_data_ready = false;
        this.next_frame_ready = false;
        window.requestAnimationFrame(this.requestAF);
    };

    requestAF = () => {
        this.next_frame_ready = true;
        if (this.next_data_ready) {
            this._process_draw();
        };
    };

    set_data(data) {
        this.data = data;
        this.next_data_ready = true;
        if (this.next_frame_ready) {
            this._process_draw();
        };
    };

};


class WaveDrawer extends Drawer {
    constructor(id = 'audioWave', width = 1000, height = 100, total_duration = 10) {
        super(id, width, height);
        this.total_duration = total_duration;

    };

    /**
     * 
     * @param {Object} data 具有如下格式的对象：
                            {
                                sampleRate: Number, 音频采样率，单位Hz
                                channels: Array[Float32Array], 数组，每个元素代表一个通道，
                                                                每个通道为浮点数数组。
                                                                每个通道长度应该相同。
                                                                每个通道中的每个元素为一个采样点。
                                timeStamp: Date.now(), 音频末尾时间
                            }
     */
    draw = (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.canvas_ctx.beginPath();
        let dx = this.canvas.width / (this.total_duration * data.sampleRate);
        let end_dy = this.canvas.height / (data.channels.length * 2);
        for (let ch_n = 0; ch_n < data.channels.length; ch_n += 1) {
            let audio_pcm = data.channels[ch_n];
            let end_y = end_dy * (ch_n * 2 + 1);
            this.canvas_ctx.moveTo(this.canvas.width, end_y);
            for (let i = 1; i < audio_pcm.length + 1 && dx * i <= this.canvas.width; i += 1) {
                let cur_y = end_y - Math.round(audio_pcm[audio_pcm.length - i] * end_dy);
                this.canvas_ctx.lineTo(this.canvas.width - dx * i, cur_y);
            };
        };
        this.canvas_ctx.stroke();
        this.canvas_ctx.closePath();
    };
};

class StftDrawer extends Drawer {
    constructor(id = 'audioStft', width = 1000, height = null, total_duration = 10) {
        super(id, width, height);
        this.total_duration = total_duration;
        this.adaptive_height = (!height);

    };

    /**
     * 
     * @param {Object} data 具有如下格式的对象：
                            {
                                timeStamp: Number, 音频末尾时间戳，用于时间定位
                                sampleRate:  Number, 音频采样率，单位Hz
                                fft_s: 0.032, 傅里叶变换窗口，单位为秒
                                hop_s: 0.008, 窗之间间隔长，单位为秒
                                stft: null, stft数据，为一个二维数组
                            }
     */
    draw = async (data) => {
        let stft_tensor = tf.tensor(this.data.stft);
        // console.log(`draw stft:${stft_tensor.shape}`)

        if (this.adaptive_height) {
            const timelength = stft_tensor.shape[0] * this.data.hop_s;
            this.canvas.height = stft_tensor.shape[1] * this.canvas.width * timelength / (this.total_duration * stft_tensor.shape[0])
            this.adaptive_height = false;
        };

        let imageData = this.canvas_ctx.createImageData(stft_tensor.shape[0], stft_tensor.shape[1]);
        const stft_1scaled_array = tf.tidy(() => {
            const maxminsub = stft_tensor.max().sub(stft_tensor.min());
            if (maxminsub.arraySync()) {
                return stft_tensor.sub(stft_tensor.min()).div(stft_tensor.max().sub(stft_tensor.min())).arraySync();
            } else {
                return stft_tensor.arraySync();
            };
        });
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const r_p = Math.floor(p / stft_tensor.shape[0]);
            const c_p = (p) % stft_tensor.shape[0];

            imageData.data[i + 0] = stft_1scaled_array[c_p][r_p] * 255; // R value
            imageData.data[i + 1] = stft_1scaled_array[c_p][r_p] * 255; // G value
            imageData.data[i + 2] = stft_1scaled_array[c_p][r_p] * 255; // B value
            imageData.data[i + 3] = 255; // A value
        };

        const new_width = imageData.width * this.canvas.height / imageData.height;
        const imageBitmap = await createImageBitmap(imageData);
        this.canvas_ctx.drawImage(imageBitmap,
            this.canvas.width - new_width, 0,
            new_width, this.canvas.height,
        );
        // this.canvas.width - new_width


    };
};


class FrequencyDrawer extends Drawer {
    constructor(id = 'audioFrequency', width = 1000, height = null, total_duration = 10) {
        super(id, width, height);
        this.total_duration = total_duration;
        this.adaptive_height = (!height);

    };

    /**
     * 
     * @param {Float32_2DArray} data 
     */
    draw = async (data) => {
        let stft_tensor = tf.tensor(this.data.frequency._float32dataArray, [this.data.frequency.height, this.data.frequency.width]);
        // console.log(`draw stft:${stft_tensor.shape}`)

        if (this.adaptive_height) {
            const timelength = stft_tensor.shape[0] * this.data.hop_s;
            this.canvas.height = stft_tensor.shape[1] * this.canvas.width * timelength / (this.total_duration * stft_tensor.shape[0])
            this.adaptive_height = false;
        };

        let imageData = this.canvas_ctx.createImageData(stft_tensor.shape[0], stft_tensor.shape[1]);
        const stft_1scaled_array = tf.tidy(() => {
            const maxminsub = stft_tensor.max().sub(stft_tensor.min());
            if (maxminsub.arraySync()) {
                return stft_tensor.sub(stft_tensor.min()).div(stft_tensor.max().sub(stft_tensor.min())).arraySync();
            } else {
                return stft_tensor.arraySync();
            };
        });
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const r_p = Math.floor(p / stft_tensor.shape[0]);
            const c_p = (p) % stft_tensor.shape[0];

            imageData.data[i + 0] = stft_1scaled_array[c_p][r_p] * 255; // R value
            imageData.data[i + 1] = stft_1scaled_array[c_p][r_p] * 255; // G value
            imageData.data[i + 2] = stft_1scaled_array[c_p][r_p] * 255; // B value
            imageData.data[i + 3] = 255; // A value
        };

        const new_width = imageData.width * this.canvas.height / imageData.height;
        const imageBitmap = await createImageBitmap(imageData);
        this.canvas_ctx.drawImage(imageBitmap,
            this.canvas.width - new_width, 0,
            new_width, this.canvas.height,
        );
        // this.canvas.width - new_width


    };
};
class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`#${id}`);
        if (!this.canvas) {
            $('body').append(`<div><canvas id='${id}' width="${width}" height="${height}"></canvas></div>`);
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
    draw = (data) => {
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
            const end_time = Number(new Date(data.timeStamp).toISOString().slice(-7, -1));
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);
            const audio_canvas_length = Math.round(data.channels[0].length / data.sampleRate * this.canvas.width / this.total_duration);
            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= Math.min(this.canvas.width, audio_canvas_length); i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText(end_time.toString(), this.canvas.width - time_dx * (i + 0.5), e_y);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
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
     *                      {
     *                          timeStamp: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Array[Float32Array], stft数据，为一个嵌套Float32Array
     *                      }
     */
    draw = async (data) => {

        const stft_time_n = this.data.stft.length;
        const stft_frequency_n = this.data.stft[0].length;
        // console.log(`draw stft:${stft_tensor.shape}`)

        if (this.adaptive_height) {
            this.canvas.height = this.canvas.width * stft_frequency_n * this.data.hop_n / (this.total_duration * this.data.sampleRate);
            this.adaptive_height = false;
        };

        const imageData = this.canvas_ctx.createImageData(stft_time_n, stft_frequency_n);

        const flattened_array = new Float32Array(stft_time_n * stft_frequency_n);
        for (let i = 0; i < stft_frequency_n; i += 1) {
            for (let j = 0; j < stft_time_n; j += 1) {
                flattened_array[i * stft_time_n + j] = this.data.stft[j][i];
            };
        };
        // const flattened_array = this.data.stft._float32dataArray;
        let max_x = flattened_array[0];
        let min_x = flattened_array[0];
        for (let i = 0; i < flattened_array.length; i += 1) {
            if (flattened_array[i] > max_x) {
                max_x = flattened_array[i];
            } else if (flattened_array[i] < min_x) {
                min_x = flattened_array[i];
            };
        };
        const jc = max_x - min_x;

        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const onescaled_stft_point = (flattened_array[p] - min_x) / jc;
            imageData.data[i + 0] = onescaled_stft_point * 255; // R value
            imageData.data[i + 1] = onescaled_stft_point * 255; // G value
            imageData.data[i + 2] = onescaled_stft_point * 255; // B value
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
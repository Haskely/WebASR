import { Drawer } from '../Drawer/Drawer.js';

class WaveDrawer extends Drawer {
    constructor(id = 'audioWave', width = document.body.clientWidth * 0.8, height = 125, total_duration = 10, show_time = true) {
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
        const perpixel_n = Math.round(this.total_duration * data.sampleRate / this.canvas.width);
        const audio_canvas_length = Math.ceil(data.channels[0].length / perpixel_n);
        const wave_area_height = this.show_time ? this.canvas.height - 20 : this.canvas.height;
        const end_dy = wave_area_height / (data.channels.length * 2);


        const flatten_wave_imgArray_count = new Float32Array(audio_canvas_length * wave_area_height);
        let max_count = 0;
        for (let ch_n = 0; ch_n < data.channels.length; ch_n += 1) {
            let audio_pcm = data.channels[ch_n];
            let end_y = end_dy * (ch_n * 2 + 1);
            for (let i = 0; i < audio_canvas_length; i += 1) {
                const cur_x = i;
                for (let cp = 0; cp < perpixel_n && cp < audio_pcm.length - i * perpixel_n; cp += 1) {
                    const cur_w = (audio_pcm[i * perpixel_n + cp]);
                    const cur_y = Math.round(cur_w * end_dy + end_y);
                    const cur_n = flatten_wave_imgArray_count[cur_x + cur_y * audio_canvas_length] + 1;
                    flatten_wave_imgArray_count[cur_x + cur_y * audio_canvas_length] = cur_n;
                    if (cur_n > max_count) max_count = cur_n;
                };
            };
        };
        const imageData = this.canvas_ctx.createImageData(audio_canvas_length, wave_area_height);
        for (let i = 0; i < flatten_wave_imgArray_count.length; i += 1) {
            const p = i * 4;
            // const cur_pixel = flatten_wave_imgArray_count[i] ? 0.5 + flatten_wave_imgArray_count[i] * 0.5 / max_count : 0;

            const cur_pixel = flatten_wave_imgArray_count[i] ? circle_one(flatten_wave_imgArray_count[i] / max_count) : 0;
            // const cur_pixel = flatten_wave_imgArray_count[i] ? 1 : 0;

            imageData.data[p + 0] = 255 * cur_pixel; // R value
            imageData.data[p + 1] = 255 * cur_pixel; // G value
            imageData.data[p + 2] = 255 * cur_pixel; // B value
            imageData.data[p + 3] = 255; // A value
        };
        this.canvas_ctx.putImageData(imageData, this.canvas.width - audio_canvas_length, 0);

        if (this.show_time) {
            const end_time = data.audioTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);

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

function sin_one(x) {
    return Math.sin(x * Math.PI / 2);
};

function circle_one(x) {
    if (x >= 0) return Math.sqrt(x * (2 - x));
    else return -Math.sqrt(-x * (2 - x));
};


class StftDrawer extends Drawer {
    constructor(id = 'audioStft', width = document.body.clientWidth * 0.8, height = null, total_duration = 10, show_time = true) {
        super(id, width, height);
        this.total_duration = total_duration;
        this.adaptive_height = (!height);

        this.show_time = show_time;

    };

    /**
     * 
     * @param {StftData} stftData 具有如下格式的对象：
     *                      {
     *                          audioTime: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Float32Matrix, stft数据
     *                      }
     */
    draw = async (stftData) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const stft_time_n = stftData.stft.height;
        const stft_frequency_n = stftData.stft.width;

        const time_area_h = this.show_time ? 20 : 0;
        if (this.adaptive_height) {
            this.canvas.height = time_area_h + this.canvas.width * stft_frequency_n * stftData.hop_n / (this.total_duration * stftData.sampleRate);
            this.adaptive_height = false;
        };

        const pad_n = stftData.fft_n / stftData.hop_n + 1;
        const padded_time_n = Math.round(stft_time_n + pad_n);
        const half_pad_n = Math.round(pad_n / 2);
        const flattened_stft_array = new Float32Array(padded_time_n * stft_frequency_n);
        let max_x = flattened_stft_array[0];
        let min_x = flattened_stft_array[0];
        for (let i = 0; i < stft_frequency_n; i += 1) {
            for (let j = 0; j < stft_time_n; j += 1) {
                flattened_stft_array[i * padded_time_n + j + half_pad_n] = stftData.stft.get(j, i);
                if (stftData.stft.get(j, i) > max_x) {
                    max_x = stftData.stft.get(j, i);
                } else if (stftData.stft.get(j, i) < min_x) {
                    min_x = stftData.stft.get(j, i);
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
            const end_time = stftData.audioTime;
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

export { WaveDrawer, StftDrawer }
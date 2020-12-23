import { Drawer } from '../Drawer/Drawer.js';
import { AudioData, StftData, AudioDataCyclicContainer, StftDataCyclicContainer } from './AudioContainer.js';
import { CyclicFloat32Array, CyclicImageData, Float32Matrix } from '../utils/CyclicContainer.js';

/*ToDo:
    流程标准化，将每一个data update都直接生成合适大小的
*/


export const TIME_AREA_H = 20;
const RGBcolors = [[255, 255, 240], [255, 240, 245], [0, 191, 255], [160, 32, 240]];

/**
 * 
 * @param {Number} num 0-1之间的浮点数
 */
export function num2color(num) {
    const RGBcolor = convert_to_rgb(num, RGBcolors);

    const RGBAcolor = new Uint8ClampedArray(4);
    RGBAcolor[0] = RGBcolor[0];
    RGBAcolor[1] = RGBcolor[1];
    RGBAcolor[2] = RGBcolor[2];
    RGBAcolor[3] = 255;

    return RGBAcolor;
};

/**
 * 
 * @param {Number} val 
 * @param {Array[Uint8ClampedArray(3)]} RGBcolors Example:[[255, 255, 240], [255, 240, 245], [0, 191, 255], [160, 32, 240]]
 * @param {Number} min_val 
 * @param {Number} max_val 
 */
function convert_to_rgb(val, RGBcolors, min_val = 0, max_val = 1) {
    val = (val - min_val) / (max_val - min_val);
    const i_f = val * (RGBcolors.length - 1);

    const i = Math.floor(i_f / 1), f = i_f % 1;  // Split into whole & fractional parts.
    if (f == 0) {
        return RGBcolors[i]
    } else {
        const [[r1, g1, b1], [r2, g2, b2]] = [RGBcolors[i], RGBcolors[i + 1]];
        return [Math.round(r1 + f * (r2 - r1)), Math.round(g1 + f * (g2 - g1)), Math.round(b1 + f * (b2 - b1))];
    };
};

function sin_one(x) {
    return Math.sin(x * Math.PI / 2);
};

function circle_one(x) {
    if (x == 0) return 0;
    x = Math.abs(x);
    const r = 0.7;
    if (x > r) x = r;
    const y = Math.sqrt(x * (2 * r - x)) + 1 - r;
    return y

};

class WaveDrawer extends Drawer {
    constructor(id = 'audioWave',
        sampleRate = 8000,
        numberOfChannels = 1,
        total_duration = 10,
        show_time = true,
    ) {
        const sample_n_per_pixel = 64 * sampleRate / 8000;
        const width = Math.floor(total_duration * sampleRate / sample_n_per_pixel);
        const height = Math.round(width / 10);
        super(id, width, height);
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.total_duration = total_duration;
        this.show_time = show_time;

        this.sample_nf_per_pixel = sample_n_per_pixel;

        this.wave_area_length = show_time ? this.canvas.height - TIME_AREA_H : this.canvas.height;
        this.leftedAudioData = null;
        this.leftedAudioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, numberOfChannels, Math.ceil(this.sample_nf_per_pixel) / sampleRate);
        this.cyclicImageData = new CyclicImageData(this.wave_area_length, this.canvas.width);
    };

    _checkAudioData = (audioData) => {
        if (!(audioData instanceof AudioData)) throw new Error("传入的 audioData 类型不为 AudioData ");
        else if (audioData.sampleRate !== this.sampleRate) throw new Error(`传入的 audioData.sampleRate(${audioData.sampleRate}) 与 WaveDrawer.sampleRate(${this.sampleRate}) 不相等`);
    };

    audioData2imageData = (audioData) => {
        const leftedSampleLength = this.leftedAudioDataCyclicContainer.sampleLength;
        const wave_image_length = Math.floor((audioData.sampleLength + leftedSampleLength) / this.sample_nf_per_pixel);
        const wave_imgMatrix_count = new Float32Matrix(wave_image_length, this.wave_area_length);
        const per_wave_len = this.wave_area_length / audioData.channels.length;
        let row_i = 0;
        let each_pixel_sampleGroup_begin = 0;
        let each_imgMatrix_countRow_begin_i = 0;
        if (row_i < wave_image_length) {
            const leftedAudioData = this.leftedAudioDataCyclicContainer.getdata();
            for (let k = 0; k < leftedAudioData.sampleLength; k++) {
                for (let chN = 0; chN < leftedAudioData.channels.length; chN++) {
                    const cur_audio_sample = leftedAudioData.channels[chN][k];
                    const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                    wave_imgMatrix_count.typedArrayView[cur_colI] += 1;
                };
            };
            const nf_left = this.sample_nf_per_pixel - leftedSampleLength;
            for (let k = 0; k < nf_left; k++) {
                for (let chN = 0; chN < audioData.channels.length; chN++) {
                    const cur_audio_sample = audioData.channels[chN][k];
                    const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                    wave_imgMatrix_count.typedArrayView[cur_colI] += 1;
                };
            };
            row_i += 1;
            each_pixel_sampleGroup_begin = this.sample_nf_per_pixel - leftedSampleLength;
            each_imgMatrix_countRow_begin_i += this.wave_area_length;
            while (row_i < wave_image_length) {
                const start_k = Math.round(each_pixel_sampleGroup_begin);
                const end_k = start_k + this.sample_nf_per_pixel;
                for (let k = start_k; k < end_k; k++) {
                    for (let chN = 0; chN < audioData.channels.length; chN++) {
                        const cur_audio_sample = audioData.channels[chN][k];
                        const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                        wave_imgMatrix_count.typedArrayView[each_imgMatrix_countRow_begin_i + cur_colI] += 1;
                    };
                };
                each_pixel_sampleGroup_begin += this.sample_nf_per_pixel;
                each_imgMatrix_countRow_begin_i += this.wave_area_length;
                row_i += 1;
            };
        };
        this.leftedAudioDataCyclicContainer.cleardata();
        this.leftedAudioDataCyclicContainer.updatedata(
            new AudioData(
                audioData.sampleRate,
                audioData.channels.map(ch => ch.slice(each_pixel_sampleGroup_begin)),
                audioData.audioEndTime,
            ),
        );

        if (!wave_image_length) return;
        const imageData = new ImageData(this.wave_area_length, wave_image_length);
        for (let i = 0; i < wave_imgMatrix_count.typedArrayView.length; i += 1) {
            const p = i * 4;
            const cur_pixel = circle_one(wave_imgMatrix_count.typedArrayView[i] / this.sample_nf_per_pixel);
            const color = num2color(cur_pixel);
            imageData.data[p + 0] = color[0]; // R value
            imageData.data[p + 1] = color[1]; // G value
            imageData.data[p + 2] = color[2]; // B value
            imageData.data[p + 3] = color[3]; // A value
        };
        return imageData;
    };

    /**
     * 
     * @param {AudioData} data 具有如下格式的对象：
     *                      {
     *                          sampleRate: Number, 音频采样率，单位Hz
     *                          channels: Array[Float32Array], 数组，每个元素代表一个通道，
     *                                                          每个通道为浮点数数组。
     *                                                          每个通道长度应该相同。
     *                                                          每个通道中的每个元素为一个采样点。
     *                          timeStamp: Date.now(), 音频末尾时间
     *                      }
     */
    updateAudioData = (audioData) => {
        this._checkAudioData(audioData);
        const imageData = this.audioData2imageData(audioData);
        if (!imageData) return;
        this.cyclicImageData.update(imageData);
        this.setData(
            {
                cyclicImageData: this.cyclicImageData,
                audioEndTime: audioData.audioEndTime,
            }
        );
    };

    draw = async ({ cyclicImageData, audioEndTime }) => {
        const imageData = cyclicImageData.toImageDataT();
        this.canvas_ctx.putImageData(imageData,
            this.canvas.width - imageData.width, 0,
        );

        this.audioEndTime = audioEndTime;
        if (this.show_time) {
            const end_time = audioEndTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);

            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= imageData.width; i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
    };
};

;

class WaveDrawerFlexible extends Drawer {
    constructor(id = 'audioWave',
        width = null,
        height = 125,
        sampleRate = 8000,
        numberOfChannels = 1,
        total_duration = 10,
        show_time = true,
    ) {
        if (!width) width = Math.floor(total_duration * sampleRate / 64);
        super(id, width, height);
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.total_duration = total_duration;
        this.show_time = show_time;

        this.sample_nf_per_pixel = this.total_duration * this.sampleRate / this.canvas.width;

        this.wave_area_length = show_time ? this.canvas.height - TIME_AREA_H : this.canvas.height;
        this.leftedAudioData = null;
        this.leftedAudioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, numberOfChannels, Math.ceil(this.sample_nf_per_pixel) / sampleRate);
        this.cyclicImageData = new CyclicImageData(this.wave_area_length, this.canvas.width);
    };

    _checkAudioData = (audioData) => {
        if (!(audioData instanceof AudioData)) throw new Error("传入的 audioData 类型不为 AudioData ");
        else if (audioData.sampleRate !== this.sampleRate) throw new Error(`传入的 audioData.sampleRate(${audioData.sampleRate}) 与 WaveDrawer.sampleRate(${this.sampleRate}) 不相等`);
    };

    audioData2imageData = (audioData) => {
        const leftedSampleLength = this.leftedAudioData ? this.leftedAudioData.sampleLength : this.leftedAudioDataCyclicContainer.sampleLength;
        const wave_image_length = Math.floor((audioData.sampleLength + leftedSampleLength) / this.sample_nf_per_pixel);
        const wave_imgMatrix_count = new Float32Matrix(wave_image_length, this.wave_area_length);
        const per_wave_len = this.wave_area_length / audioData.channels.length;
        let row_i = 0;
        let each_pixel_sampleGroup_begin = 0;
        let each_imgMatrix_countRow_begin_i = 0;
        if (row_i < wave_image_length) {
            if (!this.leftedAudioData) {
                this.leftedAudioData = this.leftedAudioDataCyclicContainer.getdata();
                this.leftedAudioDataCyclicContainer.cleardata();
            };
            const leftedAudioData = this.leftedAudioData;
            for (let k = 0; k < leftedAudioData.sampleLength; k++) {
                for (let chN = 0; chN < leftedAudioData.channels.length; chN++) {
                    const cur_audio_sample = leftedAudioData.channels[chN][k];
                    const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                    wave_imgMatrix_count.typedArrayView[cur_colI] += 1;
                };
            };
            const nf_left = this.sample_nf_per_pixel - leftedSampleLength;
            for (let k = 0; k < nf_left; k++) {
                for (let chN = 0; chN < audioData.channels.length; chN++) {
                    const cur_audio_sample = audioData.channels[chN][k];
                    const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                    wave_imgMatrix_count.typedArrayView[cur_colI] += 1;
                };
            };
            row_i += 1;
            each_pixel_sampleGroup_begin = this.sample_nf_per_pixel - leftedSampleLength;
            each_imgMatrix_countRow_begin_i += this.wave_area_length;
            while (row_i < wave_image_length) {
                const start_k = Math.round(each_pixel_sampleGroup_begin);
                const end_k = start_k + this.sample_nf_per_pixel;
                for (let k = start_k; k < end_k; k++) {
                    for (let chN = 0; chN < audioData.channels.length; chN++) {
                        const cur_audio_sample = audioData.channels[chN][k];
                        const cur_colI = Math.round((cur_audio_sample * 0.5 + 0.5 + chN) * per_wave_len);
                        wave_imgMatrix_count.typedArrayView[each_imgMatrix_countRow_begin_i + cur_colI] += 1;
                    };
                };
                each_pixel_sampleGroup_begin += this.sample_nf_per_pixel;
                each_imgMatrix_countRow_begin_i += this.wave_area_length;
                row_i += 1;
            };
            this.leftedAudioData = new AudioData(
                audioData.sampleRate,
                audioData.channels.map(ch => ch.slice(each_pixel_sampleGroup_begin)),
                audioData.audioEndTime
            );
        } else {
            if (this.leftedAudioData) this.leftedAudioDataCyclicContainer.updatedata(this.leftedAudioData);
            this.leftedAudioDataCyclicContainer.updatedata(
                new AudioData(
                    audioData.sampleRate,
                    audioData.channels.map(ch => ch.slice(each_pixel_sampleGroup_begin)),
                    audioData.audioEndTime,
                ),
            );
            this.leftedAudioData = null;
        };

        if (!wave_image_length) return;
        const imageData = new ImageData(this.wave_area_length, wave_image_length);
        for (let i = 0; i < wave_imgMatrix_count.typedArrayView.length; i += 1) {
            const p = i * 4;
            const cur_pixel = circle_one(wave_imgMatrix_count.typedArrayView[i] / this.sample_nf_per_pixel);
            const color = num2color(cur_pixel);
            imageData.data[p + 0] = color[0]; // R value
            imageData.data[p + 1] = color[1]; // G value
            imageData.data[p + 2] = color[2]; // B value
            imageData.data[p + 3] = color[3]; // A value
        };
        return imageData;
    };

    /**
     * 
     * @param {AudioData} data 具有如下格式的对象：
     *                      {
     *                          sampleRate: Number, 音频采样率，单位Hz
     *                          channels: Array[Float32Array], 数组，每个元素代表一个通道，
     *                                                          每个通道为浮点数数组。
     *                                                          每个通道长度应该相同。
     *                                                          每个通道中的每个元素为一个采样点。
     *                          timeStamp: Date.now(), 音频末尾时间
     *                      }
     */
    updateAudioData = (audioData) => {
        this._checkAudioData(audioData);
        const imageData = this.audioData2imageData(audioData);
        if (!imageData) return;
        this.cyclicImageData.update(imageData);
        this.setData(
            {
                cyclicImageData: this.cyclicImageData,
                audioEndTime: audioData.audioEndTime,
            }
        );
    };

    draw = async ({ cyclicImageData, audioEndTime }) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const imageData = cyclicImageData.toImageDataT();
        this.canvas_ctx.putImageData(imageData,
            this.canvas.width - imageData.width, 0,
        );

        if (this.show_time) {
            const end_time = audioEndTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);

            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= imageData.width; i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
    };
};

export { WaveDrawer };
import { Drawer } from '../../../Drawer/Drawer.js';
import { StftData } from '../../../Audio/AudioContainer.js';
import { CyclicFloat32Array, CyclicImageData } from '../../../utils/CyclicContainer.js';
import { TIME_AREA_H, num2color } from '../../../Audio/AudioDrawer.js';

class StftDrawer extends Drawer {
    constructor(
        id = 'audioStft',
        fft_n = 256,
        hop_n = 64,
        sampleRate = 8000,
        total_duration = 10,
        show_time = true) {
        const time_area_h = show_time ? TIME_AREA_H : 0;
        const stftFrequencyN = (fft_n / 2 + 1);
        const maxStftTimeN = Math.ceil(total_duration * sampleRate / hop_n);
        const width = maxStftTimeN;
        const height = stftFrequencyN + time_area_h;
        super(id, width, height);
        this.fft_n = fft_n;
        this.hop_n = hop_n;
        this.sampleRate = sampleRate;
        this.total_duration = total_duration;
        this.show_time = show_time;
        this.stftAreaHeight = this.canvas.height - time_area_h;

        this.cyclicImageData = new CyclicImageData(stftFrequencyN, maxStftTimeN);
        this.cyclicStftMaxValues = new CyclicFloat32Array(Math.round(sampleRate / fft_n));
        // this._half_pad_n = (fft_n / hop_n - 1) * 0.5 * this.stftAreaHeight / stftFrequencyN;
        this.audioEndTime = null;
    };

    _check_stftData(stftData) {
        if (!(stftData instanceof StftData))
            throw new Error("传入的 stftData 类型不为 StftData ");
        else {
            for (let prop_name of ['sampleRate', 'fft_n', 'hop_n']) {
                if (stftData[prop_name] !== this[prop_name])
                    throw new Error(`传入的 stftData.${[prop_name]}(${stftData[prop_name]})与 StftDrawer.${[prop_name]}(${this[prop_name]})不相等`);
            };
        };
    };

    /**
     *
     * @param {StftData} stftData 具有如下格式的对象：
     *                      {
     *                          audioEndTime: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Float32Matrix, stft数据
     *                      }
     */
    updateStftData = (stftData) => {
        this._check_stftData(stftData);
        if (!stftData.stft.rowsN)
            return;

        const imageData = this.canvas_ctx.createImageData(stftData.stft.columnsN, stftData.stft.rowsN);

        this.cyclicStftMaxValues.update([Math.max(...stftData.stft.typedArrayView)]);
        const max_value = Math.max(...this.cyclicStftMaxValues.typedArrayView);
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const onescaled_stft_point = max_value ? (stftData.stft.typedArrayView[p] / max_value) : 0;
            const color = num2color(onescaled_stft_point);
            imageData.data[i + 0] = color[0]; // R value
            imageData.data[i + 1] = color[1]; // G value
            imageData.data[i + 2] = color[2]; // B value
            imageData.data[i + 3] = color[3]; // A value
        };

        this.cyclicImageData.update(imageData);
        this.setData({
            cyclicImageData: this.cyclicImageData,
            audioEndTime: stftData.audioEndTime,
        });
    };

    draw = async ({ cyclicImageData, audioEndTime }) => {
        const imageData = cyclicImageData.toImageDataT();
        this.canvas_ctx.putImageData(imageData,
            this.canvas.width - imageData.width, 0
        );
        this.audioEndTime = audioEndTime;
        if (this.show_time) {
            const end_time = audioEndTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);
            const stft_canvas_length = imageData.width;
            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= stft_canvas_length; i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
    };
};

class StftDrawerFlexible extends Drawer {
    constructor(
        id = 'audioStft',
        width = null,
        height = null,
        fft_n = 256,
        hop_n = 64,
        sampleRate = 8000,
        total_duration = 10,
        show_time = true) {
        const time_area_h = show_time ? TIME_AREA_H : 0;
        const stftFrequencyN = (fft_n / 2 + 1);
        const maxStftTimeN = Math.ceil(total_duration * sampleRate / hop_n)
        if (!width) width = maxStftTimeN;
        if (!height) {
            width = Math.round(width);
            height = Math.round(width * stftFrequencyN * hop_n / (total_duration * sampleRate)) + time_area_h;
        };
        super(id, width, height);
        this.fft_n = fft_n;
        this.hop_n = hop_n;
        this.sampleRate = sampleRate;
        this.total_duration = total_duration;
        this.show_time = show_time;
        this.stftAreaHeight = this.canvas.height - time_area_h;

        this.cyclicImageData = new CyclicImageData(stftFrequencyN, maxStftTimeN);
        this.cyclicStftMaxValues = new CyclicFloat32Array(Math.round(sampleRate / fft_n));
        // this._half_pad_n = (fft_n / hop_n - 1) * 0.5 * this.stftAreaHeight / stftFrequencyN;
    };

    _check_stftData(stftData) {
        if (!(stftData instanceof StftData)) throw new Error("传入的 stftData 类型不为 StftData ");
        else {
            for (let prop_name of ['sampleRate', 'fft_n', 'hop_n']) {
                if (stftData[prop_name] !== this[prop_name]) throw new Error(`传入的 stftData.${[prop_name]}(${stftData[prop_name]})与 StftDrawer.${[prop_name]}(${this[prop_name]})不相等`);
            };
        };
    };

    /**
     * 
     * @param {StftData} stftData 具有如下格式的对象：
     *                      {
     *                          audioEndTime: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Float32Matrix, stft数据
     *                      }
     */
    updateStftData = (stftData) => {
        this._check_stftData(stftData);
        if (!stftData.stft.rowsN) return;

        const imageData = this.canvas_ctx.createImageData(stftData.stft.columnsN, stftData.stft.rowsN);

        this.cyclicStftMaxValues.update([Math.max(...stftData.stft.typedArrayView)])
        const max_value = Math.max(...this.cyclicStftMaxValues.typedArrayView)
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const onescaled_stft_point = max_value ? (stftData.stft.typedArrayView[p] / max_value) : 0;
            const color = num2color(onescaled_stft_point);
            imageData.data[i + 0] = color[0]; // R value
            imageData.data[i + 1] = color[1]; // G value
            imageData.data[i + 2] = color[2]; // B value
            imageData.data[i + 3] = color[3]; // A value
        };

        this.cyclicImageData.update(imageData);
        this.setData({
            cyclicImageData: this.cyclicImageData,
            audioEndTime: stftData.audioEndTime,
        });
    };

    draw = async ({ cyclicImageData, audioEndTime }) => {
        const imageData = cyclicImageData.toImageDataT();
        const new_height = this.stftAreaHeight;
        // const new_width = new_height * imageData.width / imageData.height;
        const new_width = imageData.width * this.hop_n * this.canvas.width / (this.sampleRate * this.total_duration);

        const imageBitmap = await createImageBitmap(imageData);

        this.canvas_ctx.drawImage(imageBitmap,
            this.canvas.width - new_width, 0,
            new_width, new_height,
        );
        if (this.show_time) {
            const end_time = audioEndTime;
            this.canvas_ctx.beginPath();
            const dt = 0.5;
            const time_dx = Math.round(dt * this.canvas.width / this.total_duration);
            const stft_canvas_length = new_width;
            const s_y = this.canvas.height - 20, e_y = this.canvas.height - 10;

            for (let i = 1; time_dx * i <= stft_canvas_length; i += 1) {
                this.canvas_ctx.moveTo(this.canvas.width - time_dx * i, s_y);
                this.canvas_ctx.lineTo(this.canvas.width - time_dx * i, e_y);
                this.canvas_ctx.fillText((end_time - dt * i).toFixed(3).toString(), this.canvas.width - time_dx * (i + 0.5), this.canvas.height);
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
    };
};

class StftDrawer2 extends Drawer {
    // 测试自己写的图像矩阵缩放，结果太慢了。。
    constructor(id = 'audioStft', width = document.body.clientWidth * 0.8, height = null, total_duration = 10, show_time = true) {
        super(id, width, height);
        this.total_duration = total_duration;

        this.show_time = show_time;

        this._inited = false;

    };

    _init_stftData = (stftData) => {
        if (!this._inited) {
            const time_area_h = this.show_time ? TIME_AREA_H : 0;
            if (!this.canvas.height) {
                this.stftAreaHeight = Math.round(this.canvas.width * stftData.stft.columnsN * stftData.hop_n / (this.total_duration * stftData.sampleRate));
                this.canvas.height = this.stftAreaHeight + time_area_h;
            } else {
                this.stftAreaHeight = this.canvas.height - time_area_h;
            }
            this.cyclicImageData = new CyclicImageData(stftData.stft.columnsN, Math.round(this.total_duration * stftData.sampleRate / stftData.hop_n));
            this._inited = true;
        };
    };

    /**
     * 
     * @param {StftData} stftData 具有如下格式的对象：
     *                      {
     *                          audioEndTime: Number, 音频末尾时间戳，用于时间定位，单位毫秒（ms）
     *                          sampleRate:  Number, 音频采样率，单位赫兹（Hz）
     *                          fft_n: 256, 傅里叶变换窗口，单位为采样点个数（1）
     *                          hop_n: 64, 窗之间间隔长，单位为采样点个数（1）
     *                          stft: Float32Matrix, stft数据
     *                      }
     */
    updateStftData = (stftData) => {
        this._init_stftData(stftData);

        // const pad_n = stftData.fft_n / stftData.hop_n + 1;
        // const half_pad_n = Math.round(pad_n / 2);
        // const padded_time_n = Math.round(stft_time_n + pad_n);

        let max_value = stftData.stft.typedArrayView[0];
        for (let i = 1; i < stftData.stft.typedArrayView.length; i += 1) {
            const cur_value = stftData.stft.typedArrayView[i];
            if (max_value < cur_value) max_value = cur_value;
        };
        const imageData = this.canvas_ctx.createImageData(stftData.stft.columnsN, stftData.stft.rowsN);
        for (let p = 0; p * 4 < imageData.data.length; p += 1) {
            const i = p * 4;
            const onescaled_stft_point = stftData.stft.typedArrayView[p] / max_value;
            imageData.data[i + 0] = onescaled_stft_point * 255; // R value
            imageData.data[i + 1] = onescaled_stft_point * 255; // G value
            imageData.data[i + 2] = onescaled_stft_point * 255; // B value
            imageData.data[i + 3] = 255; // A value
        };

        this.cyclicImageData.update(imageData);
        this.setData({
            cyclicImageData: this.cyclicImageData,
            audioEndTime: stftData.audioEndTime,
        });
    };



    draw = async ({ cyclicImageData, audioEndTime }) => {
        const imageData = cyclicImageData.toImageDataT();
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const new_height = this.stftAreaHeight;
        const new_width = Math.round(imageData.width * new_height / imageData.height);
        if (new_width) {
            const scaled_imageData = scaleImageData(imageData, new_width, new_height);
            this.canvas_ctx.putImageData(scaled_imageData,
                this.canvas.width - new_width, 0);
        };

        // this.canvas.width - new_width
        if (this.show_time) {
            const end_time = audioEndTime;
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

export { StftDrawer };

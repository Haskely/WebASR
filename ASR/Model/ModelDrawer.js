
import { Drawer } from '.../Drawer/Drawer.js';

class SoftmaxDrawer extends Drawer {
    constructor(
        id = 'softmaxDrawer',
        total_duration = 10,
        show_time = true) {
        const time_area_h = show_time ? TIME_AREA_H : 0;
        const stftFrequencyN = (fft_n / 2 + 1);
        const maxStftTimeN = Math.ceil(total_duration * sampleRate / hop_n)
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
        this.cyclicStftMaxValues = new CyclicFloat32Array(Math.round(sampleRate/fft_n));
        // this._half_pad_n = (fft_n / hop_n - 1) * 0.5 * this.stftAreaHeight / stftFrequencyN;
        this.audioEndTime = null;
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
        this.canvas_ctx.putImageData(imageData,
            this.canvas.width - imageData.width, 0,
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
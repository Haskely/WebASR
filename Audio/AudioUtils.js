import { StftData } from './AudioContainer.js'
import { Float32Matrix } from '../utils/CyclicContainer.js'





class AudioUtils {
    constructor() {
        throw new Error('不要对AudioUtils进行实例化，直接使用里面的静态函数即可。例如:AudioUtils.getAudioClipStftData(...)');
    };

    static nj_stft_old(audio_slice, fft_n, hop_n) {
        // fft_n必须为2的n次幂
        const timeN = Math.floor((audio_slice.length - fft_n) / hop_n) + 1;
        const frequencyN = Math.round(fft_n / 2 + 1);
        const stftMatrix = new Float32Matrix(timeN, frequencyN);

        let cur_n = 0;
        const RI = nj.zeros([fft_n, 2], 'float32');

        for (let time_i = 0; time_i < timeN; time_i += 1) {

            for (let i = 0; i < fft_n; i += 1) {
                RI.set(i, 0, audio_slice[cur_n + i] * Math.sin(i * Math.PI / fft_n) ** 2);
            };
            const fft = nj.fft(RI);
            for (let frequency_i = 0; frequency_i < frequencyN; frequency_i += 1) {
                const S_db = Math.sqrt(fft.get(frequency_i, 0) ** 2 + fft.get(frequency_i, 1) ** 2);
                stftMatrix.set(time_i, frequency_i, S_db);
            };

            cur_n += hop_n;
        };
        return stftMatrix;
    };

    static nj_stft_new(audio_slice, fft_n, hop_n) {
        // fft_n必须为2的n次幂
        const timeN = Math.floor((audio_slice.length - fft_n) / hop_n) + 1;
        const frequencyN = Math.round(fft_n / 2 + 1);
        const stftMatrix = new Float32Matrix(timeN, frequencyN);

        
        const splited_audio_slice = nj.zeros([timeN,fft_n], 'float32');

        // const hann_window = nj.sin(nj.arange(fft_n).multiply(Math.PI/fft_n));
        const hann_window = nj.ones(fft_n);

        let cur_n = 0;
        for (let time_i = 0; time_i < timeN; time_i += 1) {
            for (let i = 0; i < fft_n; i += 1) {
                splited_audio_slice.set(time_i, i, audio_slice[cur_n + i]*hann_window.get(i));
            };
            cur_n += hop_n;
        };
        const windowed_splited_audio_slice = splited_audio_slice;
        const RI = nj.stack([windowed_splited_audio_slice,nj.zeros([timeN,fft_n],'float32')],-1);
        const nj_stft = nj.fft(RI).slice(null,[0,frequencyN]);

        const nj_stft_real = nj_stft.slice(null,null,[0,1]).reshape([timeN,frequencyN]);
        const nj_stft_img = nj_stft.slice(null,null,[1,2]).reshape([timeN,frequencyN]);
        const nj_stft_power = nj_stft_real.pow(2).add(nj_stft_img.pow(2));
        const stft = nj.sqrt(nj_stft_power);
        const max_v = stft.max();
        if (max_v) stft.divide(max_v,false);
        return stft;
    };

    static logstft(audio_slice, fft_n, hop_n){
        const stftMatrix = AudioUtils.nj_stft_old(audio_slice, fft_n, hop_n);

        const MIN_V = -3

        const stftFlatArr = stftMatrix.typedArrayView;
        for (let i=0;i<stftFlatArr.length;i+=1){
            stftFlatArr[i] = stftFlatArr[i]>10**MIN_V? Math.log10(stftFlatArr[i])/(-MIN_V) + 1:0;
        };
        const logstftMatrix = stftMatrix;
        
        return logstftMatrix
    };

    static combine_channels(channels) {
        if (channels.length == 1) return channels[0];
        else if (channels.length >= 2) {
            const result = new Float32Array(channels[0].length);
            for (let i = 0; i < result.length; i += 1) {
                for (let ch of channels) {
                    result[i] += ch[i];
                };
                result[i] /= channels.length;
            };
            return result;
        };
    };

    static getAudioClipStftData = (full_audioData, audio_cliplength, fft_n, hop_n) => {
        const cur_audio_slice4stft = AudioUtils.combine_channels(full_audioData.channels).slice(-(audio_cliplength + fft_n - hop_n));
        const logstft = AudioUtils.logstft(cur_audio_slice4stft, fft_n, hop_n);
        // stftMatrix.divide(stftMatrix.max(),false);

        const stftData = new StftData(
            full_audioData.sampleRate,
            fft_n,
            hop_n,
            stftMatrix,
            full_audioData.audioEndTime
        );
        return stftData;
    };
};

export { AudioUtils }
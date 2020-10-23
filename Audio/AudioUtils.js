import { StftData } from './AudioContainer.js'
import { Float32Matrix } from '../utils/CyclicContainer.js'
class AudioUtils {
    constructor() {
        throw new Error('不要对AudioUtils进行实例化，直接使用里面的静态函数即可。例如:AudioUtils.getAudioClipStftData(...)');
    };

    static nj_stft(audio_slice, fft_n, hop_n) {
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
                let powerS_db = 5 + Math.log10(fft.get(frequency_i, 0) ** 2 + fft.get(frequency_i, 1) ** 2);
                powerS_db = powerS_db > 0 ? powerS_db : 0;
                stftMatrix.set(time_i, frequency_i, powerS_db);
            };

            cur_n += hop_n;
        };
        return stftMatrix;
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
        const stftData = new StftData(
            full_audioData.sampleRate,
            fft_n,
            hop_n,
            AudioUtils.nj_stft(cur_audio_slice4stft, fft_n, hop_n),
            full_audioData.audioTime
        );
        return stftData;
    };
};

export { AudioUtils }
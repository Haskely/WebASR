import { Float32Matrix } from "../../../utils/CyclicContainer.js";

/**
 * 
 * @param {*} audio_slice 
 * @param {*} fft_n 
 * @param {*} hop_n 
 */
function nj_stft(audio_slice, fft_n, hop_n) {

    let alignLen = audio_slice.length - fft_n;
    if (alignLen < 0) {
        const ori_audioslice = audio_slice;
        audio_slice = new Float32Array(fft_n);
        const pad_n = Math.round(-alignLen / 2);
        for (let i = 0; i < ori_audioslice.length; i++) {
            audio_slice[i + pad_n] = ori_audioslice[i];
        };
        alignLen = 0;
    };
    // fft_n必须为2的n次幂
    const timeN = Math.floor((alignLen) / hop_n) + 1;
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

export { nj_stft };
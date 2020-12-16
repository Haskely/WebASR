
import {nj_stft} from './stft.js';

function logstft(audio_slice, fft_n, hop_n){
    const stftMatrix = nj_stft(audio_slice, fft_n, hop_n);

    const MIN_V = -3

    const stftFlatArr = stftMatrix.typedArrayView;
    for (let i=0;i<stftFlatArr.length;i+=1){
        stftFlatArr[i] = stftFlatArr[i]>10**MIN_V? Math.log10(stftFlatArr[i])/(-MIN_V) + 1:0;
    };
    const logstftMatrix = stftMatrix;
    
    return logstftMatrix
};

export {logstft};
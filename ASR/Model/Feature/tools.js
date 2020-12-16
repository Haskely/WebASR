import { AudioData } from "../../../Audio/AudioContainer.js";

/**
 * 
 * @param {[AudioData]} audioDataArray 
 */
function concatenateAudioData(audioDataArray){
    const Len = audioDataArray.length
    if(Len == 0) return null;
    else if (Len == 1) return audioDataArray[0];
    else {
        let audioData = audioDataArray[0];
        let totalSampleLength = audioData.sampleLength;
        const sampleRate = audioData.sampleRate;
        const numberOfChannels = audioData.numberOfChannels;
        for (let i=1;i<Len;i+=1){
            audioData = audioDataArray[i];
            if (audioData.sampleRate !== sampleRate)
            if (audioData.numberOfChannels !== numberOfChannels)
            totalSampleLength += audioData.sampleLength;
        };
        const concatedAudioData = new AudioData(audioData.sampleRate,new Array(audioData.numberOfChannels),audioData.audioEndTime);
        for (let i=0;i<concatedAudioData.numberOfChannels;i++){
            concatedAudioData.channels[i] = new Float32Array(totalSampleLength);
        };
        let k=0;
        for (let i=0;i<Len;i+=1){
            audioData = audioDataArray[i];
            for (let j=0;j<concatedAudioData.numberOfChannels;j++){
                for (let _k =0;_k<audioData.sampleLength;_k+=1){
                    concatedAudioData.channels[j][k] = audioData.channels[j][_k];
                    k += 1;
                };
            };
        };
        return concatedAudioData;
    };
};

function combine_channels(channels) {
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

export {concatenateAudioData,combine_channels};
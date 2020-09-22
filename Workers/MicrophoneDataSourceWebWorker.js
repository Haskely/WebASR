"use strict";
importScripts("tensorflowjs/tfjs@2.3.0.js");
importScripts("utils/CyclicContainer.js");
importScripts("ASR/Asr.js");
class AudioDataCyclicContainer {
    constructor(
        sampleRate,
        numberOfChannels,
        max_duration = 10,
    ) {
        this.sampleRate = sampleRate;
        this.max_duration = max_duration;

        this.audioCyclicChannels = Array(numberOfChannels);
        for (let i = 0; i < numberOfChannels; i += 1) {
            this.audioCyclicChannels[i] = new Float32CyclicArray(Math.round(sampleRate * max_duration));
        };
        this.timeStamp = null;
    };

    updatedata = (data) => {
        for (let i = 0; i < data.numberOfChannels; i += 1) {
            this.audioCyclicChannels[i].update(data.channels[i])
        };
        this.timeStamp = data.timeStamp;
    };

    getdata = () => {
        return {
            timeStamp: this.timeStamp,
            sampleRate: this.sampleRate,
            channels: this.audioCyclicChannels.map((cyclic_channel) => {
                return cyclic_channel.toArray();
            }),
        };
    };

};

class StftDataCyclicContainer {
    constructor(sampleRate, fft_s, hop_s, max_duration = 10) {
        this.sampleRate = sampleRate;
        this.fft_s = fft_s;
        this.hop_s = hop_s;
        this.max_duration = max_duration;

        this.stftCyclicData = new CyclicTensorBuffer([Math.ceil(max_duration / hop_s), Math.ceil(fft_s * sampleRate / 2) + 1], 0, 'float32');
        this.timeStamp = null;
    };

    updatedata = (data) => {
        this.stftCyclicData.update(data.stft.bufferSync());
        this.timeStamp = data.timeStamp;
    };

    getdata = () => {
        return {
            timeStamp: this.timeStamp,
            sampleRate: this.sampleRate,
            fft_s: this.fft_s,
            hop_s: this.hop_s,
            stft: this.stftCyclicData.toBuffer().toTensor(),
        };
    };


}



let audio_data_cyclic_container;
let stft_data_cyclic_container;
const Asr = new ASR([1]);
onmessage = function ({
    data
}) {
    const cur_audio_data = data;
    // const data = {
    //     duration: inputBuffer.duration,
    //     length: inputBuffer.length,
    //     numberOfChannels: inputBuffer.numberOfChannels,
    //     sampleRate: inputBuffer.sampleRate,
    //     channels: channels,
    //     timeStamp: Date.now(),
    // };

    // console.log('MicrophoneDataSourceWebWorker.js onmessage');

    if (!audio_data_cyclic_container) audio_data_cyclic_container = new AudioDataCyclicContainer(cur_audio_data.sampleRate, cur_audio_data.numberOfChannels, 10);
    audio_data_cyclic_container.updatedata(cur_audio_data);

    const full_audio_data = audio_data_cyclic_container.getdata()
    postMessage({
        type: 'original_data',
        data: full_audio_data,
    });

    const stft_data = {
        timeStamp: cur_audio_data.timeStamp,
        sampleRate: cur_audio_data.sampleRate,
        fft_s: 0.032,
        hop_s: 0.008,
        stft: null,
    };
    const hop_n = (hop_s * cur_audio_data.sampleRate);
    const audio_data_clip = cut_audio_data(full_audio_data, null, full_audio_data.channels[0].length, cur_audio_data.length + cur_audio_data.length - hop_n);
    stft_data.stft = Asr.stft_audio_clip(combine_channels(audio_data_clip.channels), stft_data.sampleRate, stft_data.fft_s, stft_data.hop_s)
    if (!stft_data_cyclic_container) stft_data_cyclic_container = new StftDataCyclicContainer(stft_data.sampleRate, stft_data.fft_s, stft_data.hop_s, 10);
    stft_data_cyclic_container.updatedata(stft_data);

    const full_stft_data = stft_data_cyclic_container.getdata();
    full_stft_data.stft = full_stft_data.stft.arraySync();
    postMessage({
        type: 'stft_data',
        data: full_stft_data,
    });

};
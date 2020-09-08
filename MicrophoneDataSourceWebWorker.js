"use strict";

let audio_cyclic;
onmessage = function ({
    data
}) {
    // const data = {
    //     duration: inputBuffer.duration,
    //     length: inputBuffer.length,
    //     numberOfChannels: inputBuffer.numberOfChannels,
    //     sampleRate: inputBuffer.sampleRate,
    //     channels: channels,
    //     timeStamp: Date.now(),
    // };

    console.log('MicrophoneDataSourceWebWorker.js onmessage');
    if (!audio_cyclic) audio_cyclic = new AudioCyclicContainer(data.sampleRate);
    audio_cyclic.updatedata(data.channels[0])

    // postMessage(data);


};

class AudioCyclicContainer {
    /**
     * 
     * @param {Number} sampleRate 
     * @param {Number} max_duration 保留音频的最大时间长度，单位：秒
     */
    constructor(sampleRate, max_duration = 10) {
        this.max_duration = max_duration;
        this.audioCyclicArray = new Float32CyclicArray(Math.round(sampleRate * max_duration));
    };

    /**
     * 
     * @param {Float32Array} audio_channel_data 
     */
    updatedata = (audio_channel_data) => {
        this.audioCyclicArray.update(audio_channel_data);
    };

    getAudioData = () => {
        return this.audioCyclicArray.toArray();
    };

}


class Float32CyclicArray {
    constructor(length) {
        this._float32array = new Float32Array(length);
        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Float32Array} data 
     */
    update(data) {
        this.end_point = (this.end_point + data.length) % this._float32array.length;
        this.data_length = min([this.data_length + data.length, this._float32array.length]);
        for (let i = 1; i < min(data.length, this._float32array.length) + 1; i += 1) {
            this._float32array[end_point - i] = data[0 - i];
        };
        return true;
    };

    toArray() {
        array = new Float32Array(this.data_length);
        for (let i = 1; i < this.data_length + 1; i += 1) {
            array[0 - i] = this._float32array[this.end_point - i];
        };
        return array;
    };
}

class ASR {
    /**
     * 
     * @param {Float32Array} predict_delays 进行音频预测的延迟时间列表,元素Number，单位：秒
     */
    constructor(predict_delays = [0.032, 1, 10]) {

        this.predict_delays = predict_delays;


    };

    predict = () => {
        audio_data = this.audioCyclicArray.toArray();

    };


}
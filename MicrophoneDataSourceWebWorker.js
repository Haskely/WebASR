"use strict";

let audio_data_cyclic_container;
let Asr = new ASR([1, 10]);
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

    if (!audio_data_cyclic_container) audio_data_cyclic_container = new AudioDataCyclicContainer(data.sampleRate, data.numberOfChannels);
    audio_data_cyclic_container.updatedata(data);

    postMessage({
        type: 'original_data',
        data: audio_data_cyclic_container.getdata(),
    });

    Asr.predict(audio_data_cyclic_container);

};

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
        this.data_length = Math.min(this.data_length + data.length, this._float32array.length);
        for (let i = 1; i < Math.min(data.length, this._float32array.length) + 1; i += 1) {
            this._float32array[(this._float32array.length + this.end_point - i) % this._float32array.length] = data[data.length - i];
        };
        return true;
    };

    toArray() {
        let array = new Float32Array(this.data_length);
        for (let i = 1; i < this.data_length + 1; i += 1) {
            array[array.length - i] = this._float32array[(this._float32array.length + this.end_point - i) % this._float32array.length];
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
        this.last_pridect_timeStamp = null;

    };

    predict = (audio_data_cyclic_container) => {
        const audio_data = audio_data_cyclic_container.getdata();

        // audio_data = {
        //     timeStamp: this.timeStamp,
        //     sampleRate: this.sampleRate,
        //     channels:channels,
        // };
        audio_data.pcm = combine_channels(audio_data.channels);
        this.predict_delays.forEach((delay) => {
            if (this.last_pridect_timeStamp && audio_data.timeStamp - this.last_pridect_timeStamp < delay) return;

            const audio_clip = audio_data.pcm.slice(-Math.round(delay * audio_data.sampleRate));
            const stft_data = this.stft_audio_clip(audio_clip)

            postMessage({
                type: 'stft_data',
                data: stft_data,
            });

            const liner_out = this.network_predict(stft_data);

            postMessage({
                type: 'liner_out',
                data: liner_out,
            });

            const decoded_data = this.myctc_decode(liner_out);

            postMessage({
                type: 'decoded_data',
                data: decoded_data,
            });
        });

    };

    stft_audio_clip(audio_clip, sampleRate, fft_s, hop_s) {
        const frameLength = Math.round(fft_s * sampleRate);
        const frameStep = Math.round(hop_s * sampleRate);
        const ori_stft_data = tf.signal.stft(audio_clip, frameLength, frameStep);
        const S = ori_stft_data.abs();
        const powerS = S.square();

        const powerS_db = 10 * powerS.log().div(tf.log(10));
        let result = powerS_db.transpose();
        result = result.maximum(-50).add(50);
        result = result.div(result.where(result.equal(0), result.mean()).sub(result.mean()).square().mean().sqrt())

        return result
    };

    network_predict(stft_data) {

    };

    myctc_decode(liner_out) {

    };


};

function combine_channels(channels) {
    if (channels.length == 1) return channels[0];
    else if (channels.length >= 2) {
        result = new Float32Array(channels[0].length);
        for (let i = 0; i < channels[0].length; i += 1) {
            let d = 0;
            channels.forEach((ch) => {
                d += ch[i]
            });
            d = d / channels.length;
            result[i] = d;
        };
        return result;
    };
};
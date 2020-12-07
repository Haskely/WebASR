import { CyclicFloat32Array, CyclicFloat32Matrix, Float32Matrix } from '../utils/CyclicContainer.js';


class AudioData {
    /**
     * 
     * @param {int32} sampleRate 
     * @param {Array[Float32Array]} channels 
     * @param {float32} audioTime 
     */
    constructor(sampleRate, channels, audioTime) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.audioTime = audioTime;

        this.numberOfChannels = channels.length;
        this.sampleLength = channels[0].length;
        this.timeLength = this.sampleLength / this.sampleRate;
    };
};

class StftData {
    /**
     * 
     * @param {int32} sampleRate 
     * @param {int32} fft_n 
     * @param {int32} hop_n 
     * @param {Float32Matrix} stft 
     * @param {float32} audioTime 
     */
    constructor(sampleRate, fft_n, hop_n, stft, audioTime) {
        this.sampleRate = sampleRate;
        this.fft_n = fft_n;
        this.hop_n = hop_n;
        this.stft = stft;
        this.audioTime = audioTime;
    };
};

class AudioDataCyclicContainer {
    constructor(
        sampleRate,
        numberOfChannels,
        max_duration = 10,
    ) {
        this.sampleRate = sampleRate;
        this.max_duration = max_duration;
        this.numberOfChannels = numberOfChannels;

        this.audioCyclicChannels = Array(numberOfChannels);
        for (let i = 0; i < numberOfChannels; i += 1) {
            this.audioCyclicChannels[i] = new CyclicFloat32Array(Math.round(sampleRate * max_duration));
        };
        this.audioTime = null;
    };

    get sampleLength() {
        return this.audioCyclicChannels[0].length;
    }

    get timeLength() {
        return this.sampleLength / this.sampleRate;
    };

    cleardata = (clearLength = undefined) => {
        for (let i = 0; i < this.numberOfChannels; i += 1) {
            this.audioCyclicChannels[i].clear(clearLength);
        };
    };

    _checkAudioData = (audioData) => {
        if (!(audioData instanceof AudioData)) throw new Error("传入的audioData类型不为AudioData");
        else if (audioData.sampleRate !== this.sampleRate) throw new Error(`传入的audioData.sampleRate(${audioData.sampleRate})与AudioDataCyclicContainer.sampleRate(${this.sampleRate})不相等`);
        else if (audioData.numberOfChannels !== this.numberOfChannels) throw new Error(`传入的audioData.numberOfChannels(${audioData.numberOfChannels})与AudioDataCyclicContainer.numberOfChannels(${this.numberOfChannels})不相等`);
    };

    updatedata = (audioData) => {
        this._checkAudioData(audioData);
        for (let i = 0; i < audioData.channels.length; i += 1) {
            this.audioCyclicChannels[i].update(audioData.channels[i])
        };
        this.audioTime = audioData.audioTime;
    };

    getdata = (startSample = undefined, endSample = undefined) => {
        return new AudioData(
            this.sampleRate,
            this.audioCyclicChannels.map((cyclic_channel) => {
                return cyclic_channel.toArray(startSample, endSample);
            }),
            this.audioTime,
        );
    };

    popdata = (popSampleLength) => {
        return new AudioData(
            this.sampleRate,
            this.audioCyclicChannels.map(cyclic_channel => cyclic_channel.popArray(popSampleLength)),
            this.audioTime,
        );
    }
};

class StftDataCyclicContainer {
    constructor(sampleRate, fft_n, hop_n, max_duration = 10) {
        this.sampleRate = sampleRate;
        this.fft_n = fft_n;
        this.hop_n = hop_n;

        this.max_duration = max_duration;

        this.stftCyclicMatrix = new CyclicFloat32Matrix(Math.round(sampleRate * max_duration / hop_n), Math.ceil(this.fft_n / 2) + 1);

        this.audioTime = null;
    };

    _checkStftData = (stftData) => {
        if (!(stftData instanceof StftData)) throw new Error("传入的stftData类型不为StftData");
        else {
            for (let prop_name of ['sampleRate', 'fft_n', 'hop_n']) {
                if (stftData[prop_name] !== this[prop_name]) throw new Error(`传入的stftData.${[prop_name]}(${stftData[prop_name]})与StftDataCyclicContainer.${[prop_name]}(${this[prop_name]})不相等`);
            };
        };
    };

    get timeLength() {
        return this.stftCyclicMatrix.curRowsN * this.hop_n / this.sampleRate;
    };

    cleardata = (clearLength = undefined) => {
        this.stftCyclicMatrix.clear(clearLength);
    };

    updatedata = (stftData) => {
        this.stftCyclicMatrix.update(stftData.stft);
        this.audioTime = stftData.audioTime;
    };


    getdata = () => {
        return new StftData(
            this.sampleRate,
            this.fft_n,
            this.hop_n,
            this.stftCyclicMatrix.toMatrix(),
            this.audioTime,
        );
    };
};

class AudioContainer {
    constructor(sampleRate, fft_s, hop_s, numberOfChannels, max_duration, save_audio = true, save_stft = true) {
        this.sampleRate = sampleRate;
        this.fft_s = fft_s;
        this.hop_s = hop_s;
        this.fft_n = Math.ceil(fft_s * sampleRate);
        this.hop_n = Math.ceil(hop_s * sampleRate);
        this.numberOfChannels = numberOfChannels;
        this.max_duration = max_duration;

        if (save_audio) this.audioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, numberOfChannels, max_duration);
        if (save_stft) this.stftDataCyclicContainer = new StftDataCyclicContainer(sampleRate, this.fft_n, this.hop_n, max_duration);
    };

    updateAudioDataClip(audioData) {
        this.audioDataCyclicContainer.updatedata(audioData);
    };

    updateStftDataClip(stftData) {
        this.stftDataCyclicContainer.updatedata(stftData);
    };

    getAudioData() {
        return this.audioDataCyclicContainer.getdata();
    };

    getStftData() {
        return this.stftDataCyclicContainer.getdata();
    };
};

export { AudioData, AudioDataCyclicContainer, StftData, StftDataCyclicContainer, AudioContainer }

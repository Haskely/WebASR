
class AudioContainer {
    constructor(sampleRate, fft_s, hop_s, numberOfChannels, max_duration) {
        this.sampleRate = sampleRate;
        this.fft_s = fft_s;
        this.hop_s = hop_s;
        this.fft_n = Math.ceil(fft_s * sampleRate);
        this.hop_n = Math.ceil(hop_s * sampleRate);
        this.numberOfChannels = numberOfChannels;
        this.max_duration = max_duration;

        this.audioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, numberOfChannels, max_duration);
        this.stftDataCyclicContainer = new StftDataCyclicContainer(sampleRate, this.fft_n, this.hop_n, max_duration);
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


class AudioData {
    /**
     * 
     * @param {int32} sampleRate 
     * @param {Array[Float32Array]} channels 
     * @param {int64} timeStamp 
     */
    constructor(sampleRate, channels, timeStamp) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.timeStamp = timeStamp;
    };
};

class StftData {
    /**
     * 
     * @param {int32} sampleRate 
     * @param {int32} fft_n 
     * @param {int32} hop_n 
     * @param {Array[Float32Array]} stft 
     * @param {int64} timeStamp 
     */
    constructor(sampleRate, fft_n, hop_n, stft, timeStamp) {
        this.sampleRate = sampleRate;
        this.fft_n = fft_n;
        this.hop_n = hop_n;
        this.stft = stft;
        this.timeStamp = timeStamp;
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

        this.audioCyclicChannels = Array(numberOfChannels);
        for (let i = 0; i < numberOfChannels; i += 1) {
            this.audioCyclicChannels[i] = new Float32CyclicArray(Math.round(sampleRate * max_duration));
        };
        this.timeStamp = null;
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
        this.timeStamp = audioData.timeStamp;
    };

    getdata = () => {
        return new AudioData(
            this.sampleRate,
            this.audioCyclicChannels.map((cyclic_channel) => {
                return cyclic_channel.toArray();
            }),
            this.timeStamp
        );
    };
};
class StftDataCyclicContainer {
    constructor(sampleRate, fft_n, hop_n, max_duration = 10) {
        this.sampleRate = sampleRate;
        this.fft_n = fft_n;
        this.hop_n = hop_n;

        this.max_duration = max_duration;

        this.stft2DCyclicArray = new Float32_2DCyclicArray(Math.round(sampleRate * max_duration / hop_n), Math.ceil(this.fft_n / 2) + 1);

        this.timeStamp = null;
    };

    _checkStftData = (stftData) => {
        if (!(stftData instanceof StftData)) throw new Error("传入的stftData类型不为StftData");
        else {
            for (let prop_name of ['sampleRate', 'fft_n', 'hop_n']) {
                if (stftData[prop_name] !== this[prop_name]) throw new Error(`传入的stftData.${[prop_name]}(${stftData[prop_name]})与StftDataCyclicContainer.${[prop_name]}(${this[prop_name]})不相等`);
            };
        };
    };

    updatedata = (stftData) => {
        const _2darray = new Float32_2DArray(stftData.stft.length, stftData.stft[0].length);
        for (let i = 0; i < _2darray.height; i += 1) {
            for (let j = 0; j < _2darray.width; j += 1) {
                _2darray.set(i, j, stftData.stft[i][j]);
            };
        };
        this.stft2DCyclicArray.update(_2darray);
        this.timeStamp = stftData.timeStamp;
    };

    getdata = () => {
        return new StftData(
            this.sampleRate,
            this.fft_n,
            this.hop_n,
            this.stft2DCyclicArray.to2DArray().toList()
        );
    };
};


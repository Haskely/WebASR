import { AudioData, StftData, AudioDataCyclicContainer, StftDataCyclicContainer } from './AudioContainer.js';
import { AudioFlowProcesser } from './AudioFlowProcesser.js';
import { AudioUtils } from './AudioUtils.js';
import { WaveDrawer, StftDrawer } from './AudioDrawer.js';

class MyEvent {
    constructor() {
        this.Listeners = {};
    };

    trigger = (...args) => {
        for (let listenerID in this.Listeners) {
            this.Listeners[listenerID](...args);
        };
    };

    hasListener = (listenerID = "", callbackfn = null) => {
        if (!listenerID) listenerID = callbackfn.toString();
        return (listenerID in this.Listeners);
    };

    addListener = (callbackfn, listenerID = "") => {
        if (!listenerID) listenerID = callbackfn.toString();
        let i = 1;
        while (listenerID in this.Listeners) {
            console.warn(`警告，listenerID:${listenerID}已经存在,将自动替换为:${listenerID}_${i}`)
            listenerID = listenerID + `_${i}`;
            i++;
        };
        this.Listeners[listenerID] = callbackfn;

        return listenerID;
    };

    removeListener = (listenerID = "", callbackfn = null) => {
        if (!listenerID) listenerID = callbackfn.toString();
        delete this.Listeners[listenerID];
    };
};

class AudioFlow extends AudioFlowProcesser {
    constructor(
        audioSource = null,
        sampleRate = 8000,
        numberOfChannels = 1,
        ScriptNode_bufferSize = 256,
        audioDestination = 'sound',
    ) {
        const reciveAudioDataEvent = new MyEvent();
        super(audioSource,
            audioDestination,
            sampleRate,
            undefined,
            ScriptNode_bufferSize,
            numberOfChannels,
            (audioData) => {
                reciveAudioDataEvent.trigger(audioData);
            });
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.reciveAudioDataEvent = reciveAudioDataEvent;

    };

    keepAudio = (
        keeping_duration = 10,
    ) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行openAudio。然而传入了${keeping_duration}`);
        this.audioDataCyclicContainer = new AudioDataCyclicContainer(this.sampleRate, this.numberOfChannels, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepAudio')) this.reciveAudioDataEvent.removeListener('keepAudio');
        this.reciveAudioDataEvent.addListener((audioData) => { this.audioDataCyclicContainer.updatedata(audioData); }, 'keepAudio');
        this.getAudioData = (startSample = undefined, endSample = undefined) => {
            return this.audioDataCyclicContainer.getdata(startSample, endSample);
        };
    };

    openWaveDraw = (id = 'audioWave', total_duration = 10, show_time = false) => {
        if (!this.reciveAudioDataEvent.hasListener('waveDrawer.updateAudioData')) {
            this.waveDrawer = new WaveDrawer(id, this.sampleRate, this.numberOfChannels, total_duration, show_time);
            this.reciveAudioDataEvent.addListener((audioData) => { this.waveDrawer.updateAudioData(audioData) }, 'waveDrawer.updateAudioData')
        };
    };

    openStft = (fft_s = 0.032, hop_s = 0.008) => {
        if (!this.reciveStftDataEvent) {
            this.fft_s = fft_s;
            this.hop_s = hop_s;
            this.fft_n = Math.round(fft_s * this.sampleRate);
            this.hop_n = Math.round(hop_s * this.sampleRate);
            const stftoverflapN = this.fft_n - this.hop_n;
            this.cacheAudioData4StftCyclicContainer = new AudioDataCyclicContainer(this.sampleRate, this.numberOfChannels, (this.options.ScriptNodeOptions.ScriptNode_bufferSize + this.fft_n + stftoverflapN) / this.sampleRate);
            this.reciveStftDataEvent = new MyEvent();
            this.reciveAudioDataEvent.addListener(
                (audioData) => {
                    this.cacheAudioData4StftCyclicContainer.updatedata(audioData);
                    const cachedSampleLength = this.cacheAudioData4StftCyclicContainer.sampleLength;
                    const curAudioLength = cachedSampleLength - (cachedSampleLength - stftoverflapN) % this.fft_n;
                    if (curAudioLength >= this.fft_n) {
                        const cachedAudioData = this.cacheAudioData4StftCyclicContainer.getdata(0, curAudioLength);
                        this.cacheAudioData4StftCyclicContainer.cleardata(curAudioLength - stftoverflapN);
                        const stftData = new StftData(
                            cachedAudioData.sampleRate,
                            this.fft_n,
                            this.hop_n,
                            AudioUtils.nj_stft(AudioUtils.combine_channels(cachedAudioData.channels), this.fft_n, this.hop_n),
                            cachedAudioData.audioTime,
                        );
                        this.reciveStftDataEvent.trigger(stftData);
                    };
                },
                'getStftData',
            );


        } else {
            console.warn('AudioFlow已经开启过openStft了，不需重复开启');
        };
    };

    keepStft = (keeping_duration = 10) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行 keepStft 。然而传入了${keeping_duration}`);
        this.stftDataCyclicContainer = new StftDataCyclicContainer(this.sampleRate, this.fft_n, this.hop_n, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepStft')) this.reciveAudioDataEvent.removeListener('keepStft');
        this.reciveStftDataEvent.addListener((stftData) => { this.stftDataCyclicContainer.updatedata(stftData); }, 'keepStft');
        this.getStftData = () => {
            return this.stftDataCyclicContainer.getdata();
        };
    };

    openStftDraw = (id = 'stftWave', total_duration = 10, show_time = false) => {
        if (!this.reciveStftDataEvent) throw new Error("还未开启openStft,没有stft数据!");
        if (!this.reciveStftDataEvent.hasListener('stftDrawer.updateStftData')) {
            this.stftDrawer = new StftDrawer(id, this.fft_n, this.hop_n, this.sampleRate, total_duration, show_time);
            this.reciveStftDataEvent.addListener((stftData) => { this.stftDrawer.updateStftData(stftData); }, 'stftDrawer.updateStftData');
        };
    };


};

export { AudioFlow }
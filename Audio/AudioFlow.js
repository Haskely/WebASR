import { AudioDataCyclicContainer, Au, StftDataCyclicContainer } from './AudioContainer.js'
import { AudioFlowProcesser } from './AudioFlowProcesser.js';
import { AudioUtils } from './AudioUtils.js';
import { WaveDrawer, StftDrawer } from './AudioDrawer.js';

class AudioFlow {
    constructor(
        audioSource = null,
        keeping_duration = 10,
        sampleRate = 8000,
        numberOfChannels = 1,
        ScriptNode_bufferSize = 256,
        audioDestination = 'sound',
    ) {

        this.keeping_duration = keeping_duration;
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.ScriptNode_bufferSize = ScriptNode_bufferSize;
        this.audioDestination = audioDestination;


        this.audioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, numberOfChannels, keeping_duration);


        this.audioFlowProcesser = new AudioFlowProcesser(
            audioSource,
            audioDestination,
            sampleRate,
            undefined,
            ScriptNode_bufferSize,
            numberOfChannels,
            (audioData) => {
                this.audioDataCyclicContainer.updatedata(audioData);

            },
            null
        );

    };

    getAudioData() {
        return this.audioDataCyclicContainer.getdata();
    };

    openWaveDraw(id = 'audioWave', width = 1000, height = 100) {
        if (!this.waveDrawer) {
            this.waveDrawer = WaveDrawer(id, width, height, this.keeping_duration, show_time = true);
            this.onReciveAudioDate((audioData) => { this.waveDrawer.set_data() })
        };
    };

    openStft(fft_s = 0.032, hop_s = 0.008) {
        if (!this.stftDataCyclicContainer) {
            this.fft_s = fft_s;
            this.hop_s = hop_s;
            this.fft_n = Math.ceil(fft_s * sampleRate);
            this.hop_n = Math.ceil(hop_s * sampleRate);
            this.stftDataCyclicContainer = new StftDataCyclicContainer(this.sampleRate, this.fft_n, this.hop_n, this.keeping_duration);
            this.onReciveAudioDate((audioData) => {
                const stftData = AudioUtils.getAudioClipStftData(this.getAudioData(), audioData.channels[0].length, this.fft_n, this.hop_n);
                this.stftDataCyclicContainer.updatedata(stftData);
            });
        } else {

        };
    };

    openStftDraw(id = 'stftWave', width = 1000, height = 100) {
        if (!this.stftDrawer) {
            if (!this.stftDataCyclicContainer) throw new Error("还未开启openStft,没有stft数据!")
            this.stftDrawer = StftDrawer(id, width, height, this.keeping_duration, show_time = true);
            this.onReciveAudioDate((audioData) => { this.stftDrawer.set_data(this.stftDataCyclicContainer.getdata()) })
        };
    };
};

export { AudioFlow }
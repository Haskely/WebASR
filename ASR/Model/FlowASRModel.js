import { ASRModel } from "./ASRModel.js";


class FlowASRModel extends ASRModel{
    constructor(){
        super();

        this.overlap_n = this.feature.fft_n - this.feature.hop_n;
        this.leftedAudioDataCyclicContainer = new AudioDataCyclicContainer(this.feature.sampleRate, 1, this.feature.hop_n / this.feature.sampleRate);
    };

    init = async (ModelDir,maxPredictTime,minPinYinN) => {
        await super.init(ModelDir);


        const maxPinYinN = Math.ceil(maxPredictTime / this.asrModel.featureConfig.hop_s / this.asrModel.viewK);
        const _x = Math.floor(minPinYinN / 2);
        const overlapPinYinN = _x + _x % 2;
        this.setFlowPredictConfig(maxPinYinN,minPinYinN,overlapPinYinN);
    };

    logstft_audioDataFlow = (audioData) => {
        const currentAudioData = audioData;
        currentAudioData.channels = [combine_channels(currentAudioData.channels)];
        currentAudioData.numberOfChannels = 1;

        const totalAudioSampleLength = currentAudioData.sampleLength + this.leftedAudioDataCyclicContainer.sampleLength;
        const alignedAudioSampleLength = totalAudioSampleLength - (totalAudioSampleLength - this.overlap_n) % this.hop_n;
        if (alignedAudioSampleLength >= this.fft_n){
            const preleftedAudioData = this.leftedAudioDataCyclicContainer.popdata();
            const leftedAudioData = new AudioData(currentAudioData.sampleRate,[new Float32Array(totalAudioSampleLength - alignedAudioSampleLength)],currentAudioData.audioEndTime);
            const alignedAudioData = new AudioData(currentAudioData.sampleRate,[new Float32Array(alignedAudioSampleLength)],currentAudioData.audioEndTime - leftedAudioData.sampleLength/currentAudioData.sampleRate);
            
            let k=0,_k=0;
            while(k<preleftedAudioData.sampleLength){
                alignedAudioData.channels[0][k] = preleftedAudioData.channels[0][_k];
                k += 1;
                _k += 1;
            };
            _k=0;
            while(k<alignedAudioData.sampleLength){
                alignedAudioData.channels[0][k] = currentAudioData.channels[0][_k];
                k+=1;       
                _k+=1;
            };
            k = 0;
            while(_k<currentAudioData.sampleLength){
                leftedAudioData.channels[0][k] = currentAudioData.channels[0][_k];
                k += 1;
                _k+=1;
            };
            this.leftedAudioDataCyclicContainer.updatedata(leftedAudioData);

            const stftData = new StftData(
                alignedAudioData.sampleRate,
                this.fft_n,
                this.hop_n,
                this.feature.logstft_audioData(alignedAudioData),
                alignedAudioData.audioEndTime,
            );
            return stftData;
        } else {
            return null;
        };
    };

    setFlowPredictConfig = (maxPinYinN,minPinYinN,overlapPinYinN) => {
        this.flowPredictConfig = { maxPinYinN, minPinYinN, overlapPinYinN };
        const maxStftTimeN = maxPinYinN * this.viewK;
        if (this.maxStftTimeN !== maxStftTimeN){
            if (this.maxStftTimeN) console.log(`maxStftTimeN更新为${maxStftTimeN},重新初始化stftDataCyclicContainer`);
            this.stftDataCyclicContainer = new StftDataCyclicContainer(
                this.feature.sampleRate,
                this.feature.fft_n,
                this.feature.hop_n,
                maxStftTimeN * this.feature.hop_s,
            );
            this.maxStftTimeN = maxStftTimeN;
        };

        this.eachStftFlattenN = minPinYinN * this.viewK * this.stftDataCyclicContainer.frequencyN;
        this.overlapStftFlattenN = overlapPinYinN * this.viewK * this.stftDataCyclicContainer.frequencyN;
    };

    predictAudioDataFlow = (audioData) => {
        const logstftData = this.logstft_audioDataFlow(audioData);
        if (logstftData){
            return this.predictStftDataFlow(logstftData);
        } else {
            return null;
        }
    };

    predictStftDataFlow = (stftData) => {
        this.stftDataCyclicContainer.updatedata(stftData);
        const cur_stft_flattenLen = this.stftDataCyclicContainer.stftCyclicMatrix.length;
        if (cur_stft_flattenLen >= this.eachStftFlattenN) {
            const full_stftData = this.stftDataCyclicContainer.getdata();
            this.stftDataCyclicContainer.cleardata(cur_stft_flattenLen - this.overlapStftFlattenN);
            
            return this.predictStftData(full_stftData);
        } else {
            return null;
        }
    };

};

export {FlowASRModel};
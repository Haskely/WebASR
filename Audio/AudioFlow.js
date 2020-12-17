import { AudioData, StftData, AudioDataCyclicContainer, StftDataCyclicContainer } from './AudioContainer.js';
import { AudioFlowProcesser } from './AudioFlowProcesser.js';
import { WaveDrawer } from './AudioDrawer.js';
import { StftDrawer } from "../ASR/Model/Feature/StftDrawer.js";
import { PinYinDrawer } from '../ASR/Model/Label/PinYinDrawer.js';
import { LogStftFeature } from '../ASR/Model/Feature/DataParser.js';
import { ASRModel } from '../ASR/Model/ASRModel.js';
import { WorkerASRModel } from '../ASR/Model/WorkerASRModel.js';
import { CyclicArray } from '../utils/CyclicContainer.js';
import Stats from '../utils/stats/stats.module.js';
import { combine_channels } from "../ASR/Model/Feature/tools.js";
class MyEvent {
    constructor() {
        this.Listeners = {};
        this.suspendedListeners = {};
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

    suspendListener = (listenerID = "", callbackfn = null) => {
        if (!listenerID) listenerID = callbackfn.toString();
        if (listenerID in this.suspendedListeners) {
            console.warn(`重复执行suspendListener: listenerID(${listenerID})已经被suspended了`);
        } else if (this.hasListener(listenerID)) {
            this.suspendedListeners[listenerID] = this.Listeners[listenerID];
            this.Listeners[listenerID] = () => null;
        } else {
            console.warn(`无法执行suspendListener: listenerID(${listenerID})不存在于Listeners中`);
        };
    };

    resumeListener = (listenerID = "", callbackfn = null) => {
        if (!listenerID) listenerID = callbackfn.toString();
        if (listenerID in this.suspendedListeners) {
            this.Listeners[listenerID] = this.suspendedListeners[listenerID];
            delete this.suspendedListeners[listenerID];
        } else {
            throw Error(`无法执行resumeListener: listenerID(${listenerID})不存在于suspendedListeners中`);
        };
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
            /**
             * 
             * @param {AudioData} audioData 
             */
            (audioData) => {
                this.lastAudioData = audioData;
                reciveAudioDataEvent.trigger(audioData);
            });
        this.lastAudioData = null;
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
        this.reciveAudioDataEvent = reciveAudioDataEvent;

    };

    openAudio = () => {
        return this.reciveAudioDataEvent;
    };

    keepAudio = (keeping_duration = 10) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行openAudio。然而传入了${keeping_duration}`);
        this.audioDataCyclicContainer = new AudioDataCyclicContainer(this.sampleRate, this.numberOfChannels, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepAudio')) this.reciveAudioDataEvent.removeListener('keepAudio');
        this.reciveAudioDataEvent.addListener((audioData) => { this.audioDataCyclicContainer.updatedata(audioData); }, 'keepAudio');
        this.getAudioData = (startSample = undefined, endSample = undefined) => {
            return this.audioDataCyclicContainer.getdata(startSample, endSample);
        };

        return this.audioDataCyclicContainer;
    };

    openWaveDraw = (id = 'audioWave', total_duration = 10, show_time = false, show_fps = false) => {
        if (!this.reciveAudioDataEvent.hasListener('waveDrawer.updateAudioData')) {
            this.waveDrawer = new WaveDrawer(id, this.sampleRate, this.numberOfChannels, total_duration, show_time);
            if (show_fps) {
                const stats = new Stats();
                document.body.appendChild(stats.dom);
                this.reciveAudioDataEvent.addListener(() => { stats.update(); }, "waveDrawerStats");
            };

            this.reciveAudioDataEvent.addListener(
                (audioData) => {
                    this.waveDrawer.updateAudioData(audioData);
                }, 'waveDrawer.updateAudioData');
        };
    };

    openStft = (fft_s = 0.032, hop_s = 0.008) => {
        if (!this.reciveStftDataEvent) {
            const logstftFeature = new LogStftFeature(this.sampleRate, fft_s, hop_s),
                logstft_audioData = logstftFeature.logstft_audioData,
                sampleRate = logstftFeature.sampleRate,
                fft_n = logstftFeature.fft_n,
                hop_n = logstftFeature.hop_n,
                overlap_n = fft_n - hop_n,
                leftedAudioDataCyclicContainer = new AudioDataCyclicContainer(sampleRate, 1, (fft_n + overlap_n) / sampleRate),
                logstft_audioDataFlow = (audioData) => {
                    const currentAudioData = audioData;
                    currentAudioData.channels = [combine_channels(currentAudioData.channels)];
                    currentAudioData.numberOfChannels = 1;

                    const totalAudioSampleLength = currentAudioData.sampleLength + leftedAudioDataCyclicContainer.sampleLength;
                    const alignedAudioSampleLength = (totalAudioSampleLength) - (totalAudioSampleLength -overlap_n) % hop_n;

                    if (alignedAudioSampleLength >= fft_n) {
                        const preleftedAudioData = leftedAudioDataCyclicContainer.popdata();
                        const leftedAudioData = new AudioData(currentAudioData.sampleRate, [new Float32Array(totalAudioSampleLength - alignedAudioSampleLength + overlap_n)], currentAudioData.audioEndTime);
                        const alignedAudioData = new AudioData(currentAudioData.sampleRate, [new Float32Array(alignedAudioSampleLength)], currentAudioData.audioEndTime - leftedAudioData.timeLength);

                        let k = 0, _k = 0;
                        while (k < preleftedAudioData.sampleLength) {
                            alignedAudioData.channels[0][k] = preleftedAudioData.channels[0][_k];
                            k += 1;
                            _k += 1;
                        };
                        _k = 0;
                        while (k < alignedAudioData.sampleLength) {
                            alignedAudioData.channels[0][k] = currentAudioData.channels[0][_k];
                            k += 1;
                            _k += 1;
                        };
                        k = 0;
                        _k -= overlap_n;
                        while (_k < currentAudioData.sampleLength) {
                            leftedAudioData.channels[0][k] = currentAudioData.channels[0][_k];
                            k += 1;
                            _k += 1;
                        };
                        leftedAudioDataCyclicContainer.updatedata(leftedAudioData);

                        const stftData = new StftData(
                            alignedAudioData.sampleRate,
                            fft_n,
                            hop_n,
                            logstft_audioData(alignedAudioData),
                            alignedAudioData.audioEndTime,
                        );
                        return stftData;
                    } else {
                        return null;
                    };
                },
                reciveStftDataEvent = new MyEvent();
            this.reciveAudioDataEvent.addListener(
                (audioData) => {
                    const logstftData = logstft_audioDataFlow(audioData);
                    if (logstftData !== null) {
                        reciveStftDataEvent.trigger(logstftData);
                    };
                },
                'getStftData',
            );
            this.logstftFeature = logstftFeature;
            this.logstft_audioDataFlow = logstft_audioDataFlow;
            this.reciveStftDataEvent = reciveStftDataEvent;
        } else {
            console.warn('AudioFlow已经开启过openStft了，不需重复开启');
        };

        return this.reciveStftDataEvent;
    };

    keepStft = (keeping_duration = 10) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行 keepStft 。然而传入了${keeping_duration}`);
        this.stftDataCyclicContainer = new StftDataCyclicContainer(this.sampleRate, this.fft_n, this.hop_n, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepStft')) this.reciveAudioDataEvent.removeListener('keepStft');
        this.reciveStftDataEvent.addListener((stftData) => { this.stftDataCyclicContainer.updatedata(stftData); }, 'keepStft');
        this.getStftData = () => {
            return this.stftDataCyclicContainer.getdata();
        };

        return this.stftDataCyclicContainer;
    };

    openStftDraw = (id = 'stftWave', total_duration = 10, show_time = false) => {
        if (!this.reciveStftDataEvent) throw new Error("还未开启openStft,没有stft数据!");
        if (!this.reciveStftDataEvent.hasListener('stftDrawer.updateStftData')) {
            this.stftDrawer = new StftDrawer(id, this.fft_n, this.hop_n, this.sampleRate, total_duration, show_time);
            this.reciveStftDataEvent.addListener((stftData) => { this.stftDrawer.updateStftData(stftData); }, 'stftDrawer.updateStftData');
        };
    };

    openASR = async (ModelDir = '/ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/', maxPredictTime = 10, minPinYinN = 4, useWebWorker = true) => {
        if (this.recivePredictResultEvent) {
            console.warn('AudioFlow已经开启过openStft了，不需重复开启');
            return this.recivePredictResultEvent;
        };

        const recivePredictResultEvent = new MyEvent();


        const is_same_featureConfig = (featureConfig) => {
            for (let prop_name of ['name', 'sampleRate', 'fft_s', 'hop_s']) {
                if (featureConfig[prop_name] !== this.logstftFeature[prop_name]) {
                    console.warn(`featureConfig[${prop_name}](${featureConfig[prop_name]}) !== this.logstftFeature[${prop_name}](${this.logstftFeature[prop_name]})`)
                    return false;
                };
            };
            return true;
        };
        const getFlowPredictConfig = (maxPinYinN, minPinYinN, overlapPinYinN, viewK) => {

            const maxStftTimeN = maxPinYinN * viewK;
            const stftDataCyclicContainer = new StftDataCyclicContainer(
                asrModel.feature.sampleRate,
                asrModel.feature.fft_n,
                asrModel.feature.hop_n,
                maxStftTimeN * asrModel.feature.hop_s,
            );
            const eachStftFlattenN = minPinYinN * viewK * stftDataCyclicContainer.frequencyN;
            const overlapStftFlattenN = overlapPinYinN * viewK * stftDataCyclicContainer.frequencyN;
            return { stftDataCyclicContainer, eachStftFlattenN, overlapStftFlattenN }
        };
        const asrModel = useWebWorker ? new WorkerASRModel() : new ASRModel();
        await asrModel.init(ModelDir);
        const maxPinYinN = Math.ceil(maxPredictTime / asrModel.featureConfig.hop_s / asrModel.viewK);
        const _x = Math.floor(minPinYinN / 2);
        const overlapPinYinN = _x + _x % 2;

        this.flowPredictConfig = { maxPinYinN, minPinYinN, overlapPinYinN };
        const { stftDataCyclicContainer, eachStftFlattenN, overlapStftFlattenN } = getFlowPredictConfig(maxPinYinN, minPinYinN, overlapPinYinN, asrModel.viewK)

        const predictStftDataFlow = (stftData) => {
            stftDataCyclicContainer.updatedata(stftData);
            const cur_stft_flattenLen = stftDataCyclicContainer.stftCyclicMatrix.length;
            if (cur_stft_flattenLen >= eachStftFlattenN) {
                const full_stftData = stftDataCyclicContainer.getdata();
                stftDataCyclicContainer.cleardata(cur_stft_flattenLen - overlapStftFlattenN);

                return asrModel.predictStftData(full_stftData);
            } else {
                return null;
            };
        };
        if (!this.reciveStftDataEvent) this.openStft(asrModel.featureConfig.fft_s, asrModel.featureConfig.hop_s);
        if (!is_same_featureConfig(asrModel.featureConfig)) throw Error("ASR开启失败，模型特征配置与本AudioFlow不一致")
        this.reciveStftDataEvent.addListener(async (stftData) => {
            const predictResult = await predictStftDataFlow(stftData);
            if (predictResult) recivePredictResultEvent.trigger(predictResult);
        }, 'ASRPredict');
        this.asrModel = asrModel;
        this.recivePredictResultEvent = recivePredictResultEvent;
        return recivePredictResultEvent;
    };

    suspendASR = () => {
        if (this.recivePredictResultEvent) {
            this.reciveStftDataEvent.suspendListener('ASRPredict');
        };
    };

    resumeASR = () => {
        if (this.recivePredictResultEvent) {
            this.reciveStftDataEvent.resumeListener('ASRPredict');
        };
    };

    keepASR = (keeping_duration = 3) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行 keepASR 。然而传入了${keeping_duration}`);
        const eachPinYinTime = this.asrModel.eachOutPutTime;
        const cyclicPinYinArray = new CyclicArray(Math.ceil(keeping_duration / eachPinYinTime));
        this.pinyinEndTime = null;
        if (this.recivePredictResultEvent.hasListener('keepASR')) this.recivePredictResultEvent.removeListener('keepASR');
        const sliceN = this.flowPredictConfig.overlapPinYinN/2;
        this.recivePredictResultEvent.addListener((predictResult) => {
            const origin_pinyinArray = predictResult.pinyinArray;
            const keeped_pinyinArray = origin_pinyinArray.slice(sliceN, -sliceN);
            const eachPinYinTime_s = predictResult.timeLength / origin_pinyinArray.length;
            const keeped_startTime = predictResult.audioStartTime + eachPinYinTime_s*sliceN;
            const keeped_endTime = predictResult.audioEndTime - eachPinYinTime_s*sliceN;
            cyclicPinYinArray.update(keeped_pinyinArray);
            this.pinyinEndTime = keeped_endTime;
        }, 'keepASR');
        this.getASR = () => {
            return {
                pinyinArray: this.cyclicPinYinArray.toArray(),
                pinyinEndTime: this.pinyinEndTime,
            };
        };
        this.cyclicPinYinArray = cyclicPinYinArray;
        return cyclicPinYinArray;
    };

    openASRDraw = (id = 'pinyinDrawer', total_duration = 10) => {
        if (!this.recivePredictResultEvent) throw new Error("还未开启openASR,没有predictResult数据!");
        if (!this.recivePredictResultEvent.hasListener("pinyinDrawer.updatePinYinData")) {
            this.pinyinDrawer = new PinYinDrawer(id, total_duration, this.asrModel.eachOutPutTime);
            const sliceN = this.flowPredictConfig.overlapPinYinN/2;
            this.recivePredictResultEvent.addListener((predictResult) => {
                const origin_pinyinArray = predictResult.pinyinArray;
                const keeped_pinyinArray = origin_pinyinArray.slice(sliceN, -sliceN);
                const eachPinYinTime_s = predictResult.timeLength / origin_pinyinArray.length;
                const keeped_startTime = predictResult.audioStartTime + eachPinYinTime_s*sliceN;
                const keeped_endTime = predictResult.audioEndTime - eachPinYinTime_s*sliceN;
                this.pinyinDrawer.updatePinYinData(keeped_pinyinArray, keeped_endTime, this.lastAudioData.audioEndTime);
            }, "pinyinDrawer.updatePinYinData");
            // this.reciveAudioDataEvent.addListener((audioData)=>{
            //     this.pinyinDrawer.updateAudioEndTime(this.lastAudioData.audioEndTime);
            // });
        };
    };

    openVoiceWakeUp = () => {
        if(!this.cyclicPinYinArray) this.keepASR();
        this.voiceWakeUp = new VoiceWakeUp()
        this.voiceWakeUp.addWakeUpPinYinArray(["ni","hao"]);
        this.recivePredictResultEvent.addListener(()=>{
            this.voiceWakeUp.recivePinYinArray(this.getASR().pinyinArray);
        });

        return this.voiceWakeUp;
    };


};

export { AudioFlow };

class VoiceWakeUp{
    constructor(){
        this.wakeUpPinYinArrays = {};
        this.wakeUpCallbacks = {};
        this.awake_threshold = 0.1;
    };

    setThreshold = (threshold) => {
        this.awake_threshold = threshold;
    };

    addWakeUpPinYinArray = (pinyinArray) => {
        this.wakeUpPinYinArrays[pinyinArray] = pinyinArray;
    };

    checkAwake = (recived_pinyinArray,wakeup_pinyinArray) => {
        const pyLen = wakeup_pinyinArray.length;
        const needed_pyList = recived_pinyinArray.slice(-pyLen);
        let dis = 0;
        for (let i = 0; i < pyLen; i += 1) {
            dis += cal_pinyin_distance(needed_pyList[i], wakeup_pinyinArray[i])
        };
        return (dis < this.awake_threshold) 
    };

    recivePinYinArray = (recived_pinyinArray) =>{
        for(let pyArrID in this.wakeUpPinYinArrays){
            if (this.checkAwake(recived_pinyinArray,this.wakeUpPinYinArrays[pyArrID])) this.triggerWakeUp(this.wakeUpPinYinArrays[pyArrID]);
        };
    };

    triggerWakeUp = (pinyinArray) => {
        console.log(`${pinyinArray} 被唤醒了！`);
    };
};

function cal_pinyin_distance(py1, py2) {
    if (py1 == py2) return 0;
    return 1;
};
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
    /**
     * 
     * @param {AudioNode|AudioBuffer|Blob|MediaElement|MediaStream|null} audioSource 音频源对象，具体可为五种类型里的一种,详见 AudioFlowProcesser 的注释。
     *                              默认为null, 暂不指定音频源。可以在实例化后调用this.addAudioSource动态指定,详见 AudioFlowProcesser 的注释。
     * 
     * @param {float|undefined} sampleRate - - 用于AudioContext的sampleRate(采样量)，以每秒采样数来指定。
     *                              该值必须是一个浮点值，指示用于配置新上下文的采样率(以每秒采样为单位);
     *                              此外，该值必须为AudioBuffer.sampleRate所支持的值。
     *                              如果未指定，则默认使用上下文输出设备的首选样本率。
     * @param {int} numberOfChannels - - 整数，指定此节点输入的通道数，默认为1。支持的值最多为32。
     * @param {int|undefined} ScriptNode_bufferSize - - 以采样帧为单位的缓冲区大小。默认256。
     *                              如果指定，bufferSize必须是以下值之一:256、512、1024、2048、4096、8192、16384。
     *                              如果没有传入，或者该值为0，则实现将为给定环境选择最佳缓冲区大小，在节点的整个生命周期中，该缓冲区大小为2的常量幂。 
     *                              这个值控制了audioprocess事件被分派的频率，以及每次调用需要处理多少个样本帧。
     *                              较低的缓冲大小值将导致较低(更好)的延迟。较高的值将是必要的，以避免音频分裂和故障。
     *                              建议作者不指定这个缓冲区大小，而允许实现选择一个好的缓冲区大小来平衡延迟和音频质量。
     * @param {'sound'|'stream'|'asAudioNode'|AudioNode|null} audioDestination - - 音频目的地，把音频输出到哪里。
     *                            - 1.'sound' 输出到扬声器。
     *                            - 2.'stream' 输出到一个stream，调取 this.audioDestination 获取该stream做进一步处理。
     *                            - 3.'asAudioNode' 生成一个 AudioNode,可以继续连接其他AudioNode。调用 this.audioDestination 获取该 AudioNode。
     *                            - 4.AudioNode 传入一个AudioNode，并连接到它上面。
     *                            - 5.null 不做任何输出。
     */
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
             * @param {AudioData} audioData 类型为AudioData的实例，详见AudioData类的定义。
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

    /**
     * 开始收取音频
     */
    openAudio = () => {
        super.open();
        return this.reciveAudioDataEvent;
    };

    /**
     * 保留收取到的最近一段时间的音频
     * @param {Number} keeping_duration 保留的时间长度，单位为秒，默认10秒。
     */
    keepAudio = (keeping_duration = 10) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行openAudio。然而传入了${keeping_duration}`);
        this.audioDataCyclicContainer = new AudioDataCyclicContainer(this.sampleRate, this.numberOfChannels, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepAudio')) this.reciveAudioDataEvent.removeListener('keepAudio');
        this.reciveAudioDataEvent.addListener((audioData) => {
            this.audioDataCyclicContainer.updatedata(audioData);
        }, 'keepAudio');
        this.getAudioData = (startSample = undefined, endSample = undefined) => {
            return this.audioDataCyclicContainer.getdata(startSample, endSample);
        };

        return this.audioDataCyclicContainer;
    };

    /**
     * 开始绘制音频波形图
     * @param {str} id canvas html元素id，如果该html元素已存在则直接使用该canvas，如果不存在则自动创建新的canvas元素。
     * @param {Number} total_duration 绘制音频时长
     * @param {boolean} show_time 是否显示时间戳
     * @param {boolean} show_fps 是否显示fps
     */
    openWaveDraw = (id = 'audioWave', total_duration = 10, show_time = false, show_fps = false) => {
        if (!this.reciveAudioDataEvent.hasListener('waveDrawer.updateAudioData')) {
            this.waveDrawer = new WaveDrawer(id, this.sampleRate, this.numberOfChannels, total_duration, show_time);
            if (show_fps) {
                const stats = new Stats();
                document.body.appendChild(stats.dom);
                this.reciveAudioDataEvent.addListener(() => {
                    stats.update();
                }, "waveDrawerStats");
            };

            this.reciveAudioDataEvent.addListener(
                (audioData) => {
                    this.waveDrawer.updateAudioData(audioData);
                }, 'waveDrawer.updateAudioData');
        };
    };

    /**
     * 开始计算短时傅里叶音频频谱
     * @param {Number} fft_s 一个短时傅里叶变换的窗长，单位为秒
     * @param {Number} hop_s 短时傅里叶变换窗之间间隔长，单位为秒
     */
    openStft = (fft_s = 0.032, hop_s = 0.008) => {
        if (!this.reciveStftDataEvent) {
            const logstftFeature = new LogStftFeature(this.sampleRate, fft_s, hop_s),
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
                    const alignedAudioSampleLength = (totalAudioSampleLength) - (totalAudioSampleLength - overlap_n) % hop_n;

                    if (alignedAudioSampleLength >= fft_n) {
                        const preleftedAudioData = leftedAudioDataCyclicContainer.popdata();
                        const leftedAudioData = new AudioData(currentAudioData.sampleRate, [new Float32Array(totalAudioSampleLength - alignedAudioSampleLength + overlap_n)], currentAudioData.audioEndTime);
                        const alignedAudioData = new AudioData(currentAudioData.sampleRate, [new Float32Array(alignedAudioSampleLength)], currentAudioData.audioEndTime - leftedAudioData.timeLength);

                        let k = 0,
                            _k = 0;
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
                            logstftFeature.logstft_audioData(alignedAudioData),
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

    /**
     * 保留一段时间的音频频谱
     * @param {Number} keeping_duration 
     */
    keepStft = (keeping_duration = 10) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行 keepStft 。然而传入了${keeping_duration}`);
        this.stftDataCyclicContainer = new StftDataCyclicContainer(this.sampleRate, this.fft_n, this.hop_n, keeping_duration);
        if (this.reciveAudioDataEvent.hasListener('keepStft')) this.reciveAudioDataEvent.removeListener('keepStft');
        this.reciveStftDataEvent.addListener((stftData) => {
            this.stftDataCyclicContainer.updatedata(stftData);
        }, 'keepStft');
        this.getStftData = () => {
            return this.stftDataCyclicContainer.getdata();
        };

        return this.stftDataCyclicContainer;
    };

    /**
     * 开始绘制音频频谱图
     * @param {str} id canvas html元素id，如果该html元素已存在则直接使用该canvas，如果不存在则自动创建新的canvas元素。
     * @param {Number} total_duration 绘制频谱时长，单位为秒
     * @param {boolean} show_time 是否显示时间戳
     */
    openStftDraw = (id = 'stftWave', total_duration = 10, show_time = false) => {
        if (!this.reciveStftDataEvent) throw new Error("还未开启openStft,没有stft数据!");
        if (!this.reciveStftDataEvent.hasListener('stftDrawer.updateStftData')) {
            this.stftDrawer = new StftDrawer(id, this.fft_n, this.hop_n, this.sampleRate, total_duration, show_time);
            this.reciveStftDataEvent.addListener((stftData) => {
                this.stftDrawer.updateStftData(stftData);
            }, 'stftDrawer.updateStftData');
        };
    };

    /**
     * 开始语音识别
     * @param {str} ModelDir TensorflowJS 模型文件夹，该文件夹下应该存在一个model.json,一个feature.json,若干个.bin文件。
     * @param {Number} maxPredictTime 模型进行单次推断的音频最长时长,单位为秒
     * @param {int} minPinYinN 正整数，流式模型推断音频最小的长度；如果为4，则一次推断输出4个拼音片段，并保留中间两个；下一次推断与这次推断的覆盖长度为4/2 = 2.
     * @param {*} useWebWorker 是否使用异步进行模型推断；若为false，则模型推断与音频刷新同步进行，大概率导致音频卡顿，但是保证实时率。
     *                         若为true，则推断异步进行，不会阻塞音频流逝，但推断输出一般会有积压延迟。
     */
    openASR = async (ModelDir = './ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/', maxPredictTime = 10, minPinYinN = 4, useWebWorker = true) => {
        if (this.recivePredictResultEvent) {
            console.warn('AudioFlow已经开启过openStft了，不需重复开启');
            return this.recivePredictResultEvent;
        };

        const asrModel = useWebWorker ? new WorkerASRModel() : new ASRModel();
        await asrModel.init(ModelDir);

        const maxPinYinN = Math.ceil(maxPredictTime / asrModel.featureConfig.hop_s / asrModel.viewK);
        // 待做：通过判断概率大小选择重叠部分拼音
        const _x = Math.floor(minPinYinN / 2);
        const overlapPinYinN = _x + _x % 2;

        this.flowPredictConfig = {
            maxPinYinN,
            minPinYinN,
            overlapPinYinN
        };
        const getFlowPredictConfig = (maxPinYinN, minPinYinN, overlapPinYinN, viewK) => {

            const maxStftTimeN = maxPinYinN * viewK;
            const stftDataFlowCyclicContainer = new StftDataCyclicContainer(
                asrModel.feature.sampleRate,
                asrModel.feature.fft_n,
                asrModel.feature.hop_n,
                maxStftTimeN * asrModel.feature.hop_s,
            );
            const eachStftTimeN = minPinYinN * viewK;
            const overlapStftTimeN = overlapPinYinN * viewK;
            return {
                stftDataFlowCyclicContainer,
                eachStftTimeN,
                overlapStftTimeN
            }
        };
        const {
            stftDataFlowCyclicContainer,
            eachStftTimeN,
            overlapStftTimeN
        } = getFlowPredictConfig(maxPinYinN, minPinYinN, overlapPinYinN, asrModel.viewK)

        const setFlowPredictStftData = (stftData) => {
            stftDataFlowCyclicContainer.updatedata(stftData);
            predictStftDataFlow();
        };
        const recivePredictResultEvent = new MyEvent();
        const predictStftDataFlow = async () => {
            if (this.isASRSuspended) return;
            // if (asrModel.is_busy) return;
            const cur_stft_timeN = stftDataFlowCyclicContainer.timeN;
            if (cur_stft_timeN < eachStftTimeN) return;

            asrModel.is_busy = true;
            const full_stftData = stftDataFlowCyclicContainer.getdata();
            stftDataFlowCyclicContainer.cleardata(cur_stft_timeN - overlapStftTimeN);
            const predictResult = await asrModel.predictStftData(full_stftData)
            recivePredictResultEvent.trigger(predictResult);
            asrModel.is_busy = false;

            // setTimeout(predictStftDataFlow,1000);
        };
        if (!this.reciveStftDataEvent) this.openStft(asrModel.featureConfig.fft_s, asrModel.featureConfig.hop_s);
        const is_same_featureConfig = (featureConfig) => {
            for (let prop_name of ['name', 'sampleRate', 'fft_s', 'hop_s']) {
                if (featureConfig[prop_name] !== this.logstftFeature[prop_name]) {
                    console.warn(`featureConfig[${prop_name}](${featureConfig[prop_name]}) !== this.logstftFeature[${prop_name}](${this.logstftFeature[prop_name]})`)
                    return false;
                };
            };
            return true;
        };
        if (!is_same_featureConfig(asrModel.featureConfig)) throw Error("ASR开启失败，模型特征配置与本AudioFlow不一致");

        this.reciveStftDataEvent.addListener(setFlowPredictStftData, 'ASRPredict');
        this.isASRSuspended = true;
        this.suspendASR = () => {
            this.isASRSuspended = true;
        };
        this.resumeASR = () => {
            this.isASRSuspended = false;
            predictStftDataFlow();
        };
        this.resumeASR();
        this.asrModel = asrModel;
        this.recivePredictResultEvent = recivePredictResultEvent;
        return recivePredictResultEvent;
    };

    /**
     * 保留一段时长的语音识别推断结果
     * @param {Number} keeping_duration 保留多少音频时长的推断结果
     */
    keepASR = (keeping_duration = 3) => {
        if (keeping_duration <= 0) throw Error(`keeping_duration必须是一个大于0的数，否则等效于不运行 keepASR 。然而传入了${keeping_duration}`);
        const eachPinYinTime = this.asrModel.eachOutPutTime;
        const cyclicPinYinArray = new CyclicArray(Math.ceil(keeping_duration / eachPinYinTime));
        this.pinyinEndTime = null;
        if (this.recivePredictResultEvent.hasListener('keepASR')) this.recivePredictResultEvent.removeListener('keepASR');
        const overlapPinYinN = this.flowPredictConfig.overlapPinYinN;
        this.recivePredictResultEvent.addListener((predictResult) => {
            const {
                keeped_pinyinArray,
                keeped_endTime
            } = getKeepedPinYinArray(predictResult, overlapPinYinN);
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

    /**
     * 绘制语音识别结果
     * @param {str} id canvas html元素id，如果该html元素已存在则直接使用该canvas，如果不存在则自动创建新的canvas元素。
     * @param {Number} total_duration 绘制识别结果时长，单位为秒
     */
    openASRDraw = (id = 'pinyinDrawer', total_duration = 10) => {
        if (!this.recivePredictResultEvent) throw new Error("还未开启openASR,没有predictResult数据!");
        if (!this.recivePredictResultEvent.hasListener("pinyinDrawer.updatePinYinData")) {
            this.pinyinDrawer = new PinYinDrawer(id, total_duration, this.asrModel.eachOutPutTime);
            const overlapPinYinN = this.flowPredictConfig.overlapPinYinN;
            this.recivePredictResultEvent.addListener((predictResult) => {
                const {
                    keeped_pinyinArray,
                    keeped_endTime
                } = getKeepedPinYinArray(predictResult, overlapPinYinN);
                this.pinyinDrawer.updatePinYinData(keeped_pinyinArray, keeped_endTime, this.lastAudioData.audioEndTime);
            }, "pinyinDrawer.updatePinYinData");
            this.reciveAudioDataEvent.addListener((audioData) => {
                this.pinyinDrawer.updateAudioEndTime(this.lastAudioData.audioEndTime);
            });
        };
    };

    /**
     * （开发中）开启语音唤醒功能
     */
    openVoiceWakeUp = () => {
        if (!this.cyclicPinYinArray) this.keepASR();
        this.voiceWakeUp = new VoiceWakeUp()
        this.voiceWakeUp.addWakeUpPinYinArray(["ni", "hao"]);
        this.recivePredictResultEvent.addListener(() => {
            this.voiceWakeUp.recivePinYinArray(this.getASR().pinyinArray);
        });

        return this.voiceWakeUp;
    };


};

function getKeepedPinYinArray(predictResult, overlapPinYinN) {
    const sliceN = overlapPinYinN / 2;

    const keeped_pinyinArray = predictResult.pinyinArray.slice(sliceN, -sliceN);
    const eachPinYinTime_s = predictResult.timeLength / predictResult.pinyinArray.length;
    const keeped_startTime = predictResult.audioStartTime + eachPinYinTime_s * sliceN;
    const keeped_endTime = predictResult.audioEndTime - eachPinYinTime_s * sliceN;
    return {
        keeped_pinyinArray,
        keeped_endTime
    }
}

export {
    AudioFlow
};

class VoiceWakeUp {
    constructor() {
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

    checkAwake = (recived_pinyinArray, wakeup_pinyinArray) => {
        const pyLen = wakeup_pinyinArray.length;
        const needed_pyList = recived_pinyinArray.slice(-pyLen);
        let dis = 0;
        for (let i = 0; i < pyLen; i += 1) {
            dis += cal_pinyin_distance(needed_pyList[i], wakeup_pinyinArray[i])
        };
        return (dis < this.awake_threshold)
    };

    recivePinYinArray = (recived_pinyinArray) => {
        for (let pyArrID in this.wakeUpPinYinArrays) {
            if (this.checkAwake(recived_pinyinArray, this.wakeUpPinYinArrays[pyArrID])) this.triggerWakeUp(this.wakeUpPinYinArrays[pyArrID]);
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
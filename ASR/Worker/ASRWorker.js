import {MyWorker, MyWorkerScript} from '../../Workers/MyWorker.js';
import { AudioData, StftData, AudioDataCyclicContainer, StftDataCyclicContainer } from '../../Audio/AudioContainer.js';
import {Float32Matrix} from '../../utils/CyclicContainer.js';

import '../Model/tensorflowjs/tfjs@2.7.0.js';
class ASRWorker extends MyWorker{
    constructor(WebWorkScriptURL){
        super(WebWorkScriptURL);
        this.reciveData('Event', (content) => {
            switch (content) {
                case 'Created':
                    console.log('myWorkerScript Created!');
                    this.onScriptCreated();
                    break;
                case 'ModelInited':
                    console.log('myWorkerScript ModelInited!');
                    this.onModelInited();

                    break;
                case 'InitFinished':
                    console.log('myWorkerScript InitFinished!');
                    this.onInitFinished();
                    break;
                case 'ReadyToPredict':
                    console.log('myWorkerScript ReadyToPredict!');
                    this.onReadyToPredict();
                    break;
                default:
                    console.error(`[MainThread]收到未知Event:${content}`);
            };
        });
        this.reciveData('FeatureInfo',(featureInfo)=>{
            this.featureInfo = featureInfo;
            this.onReciveFeatureInfo(featureInfo);
        });
        this.reciveData('ModelInfo',(modelInfo) => {
            this.modelInfo = modelInfo;
            this.onReciveModelInfo(modelInfo);
        });
        this.reciveData('PredictResult',(predictResult)=>{
            this.onRecivePredictResult(predictResult);
        })
    };

    onScriptCreated = () => {};

    /**
     * 
     * @param {*} featureInfo {                
     *          sampleRate : this.sampleRate,
                fft_s : this.fft_s,
                hop_s : this.hop_s,
            }
     */
    onReciveFeatureInfo = (featureInfo) => {}; 
    
    /**
     * 
     * @param {Object} modelInfo {
                viewK:this.viewK,
            }
     */
    onReciveModelInfo = (modelInfo) => {}; 
    onModelInited = () => {};
    onInitFinished = () => {};
    onReadyToPredict =() => {};

    /**
     * 
     * @param {*} predictResult {
                        'softmax_resArray':softmax_res.arraySync(),
                        'pinyinArray':pinyinArray,
                        'audioEndTime':full_stftData.audioEndTime,
                        'audioStartTime':full_stftData.audioStartTime,
                        'timeLength':full_stftData.timeLength,
                    };
     */
    onRecivePredictResult = (predictResult) => {};

    setPredictConfig = (max_each_predict_pinyin_num,min_each_predict_pinyin_num,overlap_predict_pinyin_num) => {
        this.predictConfig = {max_each_predict_pinyin_num,min_each_predict_pinyin_num,overlap_predict_pinyin_num};
        this.sendData('PredictConfig',this.predictConfig);
    };

    /**
     * 
     * @param {StftData} stftData_Clip 
     */
    sendStftData = (stftData_Clip) => {
        this.sendData(
            'stftData',
            {
                sampleRate: stftData_Clip.sampleRate,
                fft_n: stftData_Clip.fft_n,
                hop_n: stftData_Clip.hop_n,
                stft: {
                    stftMartrixArrayBuffer: stftData_Clip.stft.arrayBuffer,
                    stftMartrixHeight: stftData_Clip.stft.rowsN,
                    stftMartrixWidth: stftData_Clip.stft.columnsN,
                },
                audioEndTime: stftData_Clip.audioEndTime,
            },
            [stftData_Clip.stft.arrayBuffer],
        );
    }
};


class ASRWorkerScript extends MyWorkerScript{
    constructor(worker_self,ModelDir = './Model/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/'){
        super(worker_self);
        this.ModelDir = ModelDir;
        this.sendData('Event', 'Created');
        this.init();
    };

    init = async () => {
        this.initReciveFunctions();
        await this.initFeatureConfig(this.ModelDir);
        await this.initModel(this.ModelDir);
        await this.initPinYin();
        
        this.sendEvent('InitFinished')
    };

    initPinYin = async () => {
        const { PinYin } = await import('../Label/pinyinbase.js');
        this.pinyin = new PinYin('../Label/pinyin2num_dict.json');
        await this.pinyin.init();
    };

    initFeatureConfig = async (ModelDir) => {
        const response = await fetch(ModelDir + 'feature.json');
        this.featureConfig = await response.json();
        this.sampleRate = this.featureConfig.sampleRate;
        this.fft_s = this.featureConfig.fft_s;
        this.hop_s = this.featureConfig.hop_s;
        this.sendData('FeatureInfo',
            {
                sampleRate : this.sampleRate,
                fft_s : this.fft_s,
                hop_s : this.hop_s,
            }
        );
    };

    initModel = async (ModelDir) =>{
        this.log(`准备加载model...`);
        this.log(`当前tensorflowJS的Backend:${tf.getBackend()}`);
        this.model = await tf.loadGraphModel(ModelDir + 'model.json');
        this.log(`model加载完成，进行model预热...`);
        const preloadTimeN = 1024;
        const frequencyN = Math.round(this.featureConfig.fft_s * this.featureConfig.sampleRate / 2) + 1;
        const preloadRes = this.model.predict(tf.zeros([1, preloadTimeN, frequencyN]));
        const viewK = preloadTimeN/preloadRes.shape[1];
        this.log(`model时间维视野缩放比为${viewK},因此单个拼音输出视野时长为${this.featureConfig.hop_s*viewK}s`);
        this.log(`model预热完成`);
        this.viewK = viewK;
        this.sendData('ModelInfo',
            {
                viewK:this.viewK,
            }
        );
        this.sendData('Event', 'ModelInited');
    };

    initReciveFunctions = () => {
        this.reciveData('PredictConfig',(predictConfig) => {
            const maxStftTimeN = predictConfig.max_each_predict_pinyin_num * this.viewK;
            if (this.maxStftTimeN !== maxStftTimeN){
                this.log(`maxStftTimeN更新为${maxStftTimeN},重新初始化stftDataCyclicContainer`);
                this.stftDataCyclicContainer = new StftDataCyclicContainer(
                    this.featureConfig.sampleRate,
                    this.featureConfig.fft_s * this.featureConfig.sampleRate,
                    this.featureConfig.hop_s * this.featureConfig.sampleRate,
                    maxStftTimeN * this.featureConfig.hop_s,
                );
                this.maxStftTimeN = maxStftTimeN;
            };

            this.eachStftFlattenN = predictConfig.min_each_predict_pinyin_num * this.viewK * this.stftDataCyclicContainer.frequencyN;
            this.overlapStftFlattenN = predictConfig.overlap_predict_pinyin_num * this.viewK * this.stftDataCyclicContainer.frequencyN;

            this.sendData('Event', 'ReadyToPredict');
        });

        this.reciveData(
            'stftData',
            (stftDataContent) => {
                const stft = new Float32Matrix(
                    stftDataContent.stft.stftMartrixHeight,
                    stftDataContent.stft.stftMartrixWidth,
                    stftDataContent.stft.stftMartrixArrayBuffer
                );
                this.stftDataCyclicContainer.updatedata(
                    new StftData(
                        stftDataContent.sampleRate,
                        stftDataContent.fft_n,
                        stftDataContent.hop_n,
                        stft,
                        stftDataContent.audioEndTime
                    )
                );
                const cur_stft_flattenLen = this.stftDataCyclicContainer.stftCyclicMatrix.length;
                if (cur_stft_flattenLen >= this.eachStftFlattenN) {
                    const full_stftData = this.stftDataCyclicContainer.getdata();
                    const onebatch_stft_tfTensor = tf.tensor(full_stftData.stft.typedArrayView, [1, full_stftData.stft.rowsN, full_stftData.stft.columnsN]);
                    const predict_res = this.model.predict(onebatch_stft_tfTensor);
                    const softmax_res = predict_res.squeeze(0).softmax();
                    const argmax_res_array = softmax_res.argMax(-1).arraySync();
                    const pinyinArray = argmax_res_array.map(max_arg => this.pinyin.num2py(max_arg));
                    const predictResult = {
                        // 'softmax_resArray':softmax_res.arraySync(),
                        'pinyinArray':pinyinArray,
                        'audioEndTime':full_stftData.audioEndTime,
                        'audioStartTime':full_stftData.audioStartTime,
                        'timeLength':full_stftData.timeLength,
                    };
                    this.sendData('PredictResult', predictResult);
                    this.stftDataCyclicContainer.cleardata(cur_stft_flattenLen - this.overlapStftFlattenN);
                };
            },
        );
    };

    sendEvent = (event) => {
        this.sendData('Event',event);
    };



};

export {ASRWorker, ASRWorkerScript};
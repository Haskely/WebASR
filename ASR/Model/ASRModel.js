import { tf } from './Network/Network.js';
import { LogStftFeature } from './Feature/DataParser.js';
import { PinYin } from './Label/pinyinbase.js';
import { baseURI } from "../../utils/other_utils.js";

class ASRModel {
    constructor() {
        // this.init();
    };

    init = async (ModelDir = './ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/') => {

        ModelDir = new URL(ModelDir, baseURI).href;
        await this.initFeature(ModelDir);
        await this.initPinYin();
        await this.initNetwork(ModelDir);

        this.ModelDir = ModelDir;

    };

    initPinYin = async () => {
        this.pinyin = new PinYin(undefined);
        await this.pinyin.init();
    };

    initFeature = async (ModelDir) => {
        console.log(`准备加载feature...`);
        const response = await fetch(ModelDir + 'feature.json');
        this.featureConfig = await response.json();
        this.feature = new LogStftFeature(this.featureConfig.sampleRate, this.featureConfig.fft_s, this.featureConfig.hop_s);
    };

    initNetwork = async (ModelDir) => {
        console.log(`准备加载model...`);
        console.log(`当前tensorflowJS的Backend:${tf.getBackend()}`);
        this.tfjs_model = await tf.loadGraphModel(ModelDir + 'model.json');
        console.log(`model加载完成，进行model预热...`);
        const preloadTimeN = 1024;
        const frequencyN = Math.round(this.feature.fft_s * this.feature.sampleRate / 2) + 1;
        const preloadRes = this.tfjs_model.predict(tf.zeros([1, preloadTimeN, frequencyN]));
        const viewK = preloadTimeN / preloadRes.shape[1];
        console.log(`model时间维视野缩放比为${viewK},因此单个拼音输出视野时长为${this.feature.hop_s * viewK}s`);
        console.log(`model预热完成`);
        this.viewK = viewK;
        this.eachOutPutTime = viewK * this.feature.hop_s;
    };

    predictAudioData = async (audioData) => {
        const logstftData = this.feature.logstft_audioData(audioData);
        return await this.predictStftData(logstftData);
    };

    predictStftData = async (stftData) => {
        const onebatch_stft_tfTensor = tf.tensor(stftData.stft.typedArrayView, [1, stftData.stft.rowsN, stftData.stft.columnsN]);
        const predict_res = await this.tfjs_model.execute(onebatch_stft_tfTensor);
        const softmax_res = predict_res.squeeze(0).softmax();
        const argmax_res_array = softmax_res.argMax(-1).arraySync();
        const pinyinArray = argmax_res_array.map(max_arg => this.pinyin.num2py(max_arg));
        const predictResult = {
            // 'softmax_resArray':softmax_res.arraySync(),
            'pinyinArray': pinyinArray,
            'audioEndTime': stftData.audioEndTime,
            'audioStartTime': stftData.audioStartTime,
            'timeLength': stftData.timeLength,
        };
        return predictResult;
    };

};

export { ASRModel };
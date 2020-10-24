"use strict";

let model, audioContainer;
async function init_import() {
    const { MyWorkerScript } = await import('../Workers/MyWorker.js');
    const { AudioContainer, AudioData, StftData } = await import('../Audio/AudioContainer.js');
    const { Float32Matrix } = await import('../utils/CyclicContainer.js');

    return { MyWorkerScript, AudioContainer, AudioData, StftData, Float32Matrix }
};


importScripts("../tensorflowjs/tfjs@2.6.0.js");
// importScripts("../Audio/AudioContainer.js");
// importScripts("../utils/myWorker.js");
// importScripts("../utils/CyclicContainer.js");

async function init_model() {
    const model = await tf.loadGraphModel('../tensorflowjs/tfjsModel/tfjs_savedModel/model.json');

    // const len = Math.round(self.audioContainer.max_duration / self.audioContainer.hop_s);
    // model.predict(tf.zeros([1, len, 129]));
    return model;
};

async function prepare_pinyin() {
    const { PinYin } = await import('../ASR/Label/pinyinbase.js');
    const pinyin = new PinYin('../ASR/Label/pinyin2num_dict.json');
    await pinyin.init();
    return pinyin;
};

async function main() {
    const { MyWorkerScript, AudioContainer, AudioData, StftData, Float32Matrix } = await init_import();
    const pinyin = await prepare_pinyin();
    const myWorkerScript = new MyWorkerScript(self);
    function log(msg) {
        // console.log(`[MyWorkerScript]${msg}`);
        myWorkerScript.sendData('Log', msg);
    };
    myWorkerScript.reciveData('initInfo',
        async (dataContent) => {
            log(`收到initInfo,准备初始化audioContainer`);
            self.audioContainer = new AudioContainer(
                dataContent.sampleRate,
                dataContent.fft_s,
                dataContent.hop_s,
                dataContent.numberOfChannels,
                dataContent.max_duration,
                false);
            log(`准备加载model...`);
            self.model = await init_model();
            const len = Math.round(self.audioContainer.max_duration / self.audioContainer.hop_s);
            self.model.predict(tf.zeros([1, len, 129]));
            log(`当前tensorflowJS的Backend:${tf.getBackend()}`);
            myWorkerScript.sendData('Event', 'inited');
        }
    );
    myWorkerScript.reciveData('stftData', (stftDataContent) => {
        const stft = new Float32Matrix(
            stftDataContent.stft.stftMartrixHeight,
            stftDataContent.stft.stftMartrixWidth
        );
        stft._arrayBuffer = stftDataContent.stft.stftMartrixArrayBuffer;
        self.audioContainer.updateStftDataClip(
            new StftData(
                stftDataContent.sampleRate,
                stftDataContent.fft_n,
                stftDataContent.hop_n,
                stft,
                stftDataContent.audioTime
            )
        );

        if (self.audioContainer.stftDataCyclicContainer.timeLength > 0.5) {
            const full_stftData = self.audioContainer.getStftData();
            const onebatch_stft_tfTensor = tf.tensor(full_stftData.stft._float32ArrayView, [1, full_stftData.stft.height, full_stftData.stft.width]);

            const predict_res = self.model.predict(onebatch_stft_tfTensor);
            const softmax_res = predict_res.squeeze(0).softmax();
            const argmax_res_array = softmax_res.argMax(-1).arraySync();
            const pinyinArray = argmax_res_array.map(max_arg => pinyin.num2py(max_arg));
            myWorkerScript.sendData('pinyinArray', pinyinArray);

            self.audioContainer.stftDataCyclicContainer.cleardata();


        };

    });
    myWorkerScript.sendData('Event', 'created');
};


/**
 *
 * @param {Object} stftDataContent 形如
 *                              {
 *                                  sampleRate: full_stftData.sampleRate,
 *                                  fft_n: full_stftData.fft_n,
 *                                  hop_n: full_stftData.hop_n,
 *                                  stft: {
 *                                      stftMartrixArrayBuffer: full_stftData.stft._arrayBuffer,
 *                                      stftMartrixHeight = full_stftData.stft.height,
 *                                      stftMartrixWidth = full_stftData.stft.width,
 *                                  },
 *                                  audioTime: full_stftData.audioTime,
 *                              }
 */

main();
"use strict";
importScripts("../tensorflowjs/tfjs@2.3.0.js");
importScripts("../tensorflowjs/tfjs@2.3.0.js");
importScripts("../Audio/AudioContainer.js");
importScripts("../utils/myWorker.js");
importScripts("../utils/CyclicContainer.js");

let audioContainer;
let model;
const myWorkerScript = new MyWorkerScript(postMessage);
myWorkerScript.reciveData('initInfo',
    async (dataContent) => {
        audioContainer = new AudioContainer(
            dataContent.sampleRate,
            dataContent.fft_s,
            dataContent.hop_s,
            dataContent.numberOfChannels,
            dataContent.max_duration,
            false);
        model = await tf.loadLayersModel(
            'https://storage.googleapis.com/tfjs-models/tfjs/iris_v1/model.json');
        model.summary();
    }
);
myWorkerScript.reciveData('stftData', deal_stftData);
onmessage = myWorkerScript.onmessage;
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

function deal_stftData(stftDataContent) {

    const stft = new Float32Matrix(
        stftDataContent.stft.stftMartrixHeight,
        stftDataContent.stft.stftMartrixWidth
    );
    stft._arrayBuffer = stftDataContent.stft.stftMartrixArrayBuffer;
    audioContainer.updateStftDataClip(
        new StftData(
            stftDataContent.sampleRate,
            stftDataContent.fft_n,
            stftDataContent.hop_n,
            stft,
            stftDataContent.audioTime
        )
    );
    const full_stftData = audioContainer.getStftData();
    const onebatch_stft_tfTensor = tf.tensor3d(full_stftData.stft._float32ArrayView, [1, full_stftData.stft.height, full_stftData.stft.width]);

    predict_res = model.predictOnBatch(onebatch_stft_tfTensor);
    myWorkerScript.sendData('predict_res', predict_res, []);
};
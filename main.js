"use strict";
import { AudioFlow } from './Audio/AudioFlow.js';
import { ASRWorker } from './ASR/Worker/ASRWorker.js';
import { createElementNS } from './utils/other_utils.js';
import { CyclicArray } from './utils/CyclicContainer.js';
import { PinYinDrawer } from './ASR/Label/PinYinDrawer.js';
import Stats from './utils/stats/stats.module.js';
// 获取页面元素
const audio_input = document.querySelector('#audio_input');
const audio_input_btn = document.querySelector('#audio_input_btn');
const record_btn = document.querySelector('#record_btn');
const audios_div = document.querySelector('#audios');
const pinyin_text = document.querySelector('#pinyin');
const oripinyin_list = document.querySelector('#oripinyin');
const switch_btn = document.querySelector('#switch_btn');
const open_model_btn = document.querySelector('#open_model_btn');
// 元素获取完毕

// 设置页面元素事件
audio_input.onchange = async (e) => {
    // 若收到音频文件，就连接到audio_element上
    // audios_div.replaceChildren();
    for (let f of e.target.files) {
        const file = f;
        const div_el = document.createElement('div');
        div_el.style.cssText = 'display: flex;width: fit-content;margin:2 auto;background-color: aliceblue;border-style: dashed;border-radius: 1cm;';

        const span_el = document.createElement('span');
        span_el.textContent = file.name;
        span_el.style.cssText = 'margin: auto;padding: 10;';

        const audio_el = document.createElement('audio');
        audio_el.setAttribute("controls", "");
        audio_el.style.cssText = 'margin-right: auto;';
        audio_el.src = URL.createObjectURL(file);
        audio_el.play();
        const curSourceID = audioFlow.addAudioSource(audio_el);

        const close_svg_btn = createElementNS('svg', {
            viewBox: "0 0 1024 1024",
            width: "20",
            height: "20",
            style: 'margin: auto;padding: 10;',
        }, "http://www.w3.org/2000/svg");
        close_svg_btn.appendChild(createElementNS('path', {
            d: "M0 512.279845C0 229.234931 229.375931 0 511.999845 0s511.999845 229.235931 511.999845 511.719845v0.56a511.068845 511.068845 0 0 1-149.806955 362.00589A511.603845 511.603845 0 0 1 511.999845 1023.99969C228.816931 1023.99969 0 794.762759 0 512.279845z m546.233835 0l178.827945-178.734946a23.272993 23.272993 0 0 0 0-33.13999l-1.093999-1.071a23.272993 23.272993 0 0 0-33.13999 0L511.999845 478.579855 333.171899 299.333909a23.272993 23.272993 0 0 0-33.13999 0l-1.093999 1.07a23.272993 23.272993 0 0 0 0 33.13999l178.827945 179.269946L298.93791 691.549791a23.272993 23.272993 0 0 0 0 33.11699l1.093999 1.093999a23.272993 23.272993 0 0 0 33.13999 0L511.999845 547.024834 690.826791 725.75978a23.272993 23.272993 0 0 0 33.13999 0l1.094999-1.093999a23.272993 23.272993 0 0 0 0-33.11699l-178.827945-179.269946z",
            fill: "#d81e06",
        }, "http://www.w3.org/2000/svg"));
        close_svg_btn.onclick = (e) => {
            audioFlow.delAudioSource(curSourceID);
            audios_div.removeChild(div_el);
        };

        div_el.append(span_el, audio_el, close_svg_btn)

        audios_div.appendChild(div_el);
    };
    e.target.value = "";
};
audio_input_btn.onclick = () => {
    //用audio_input_btn作为audio_input的马甲。
    audio_input.click();
};

let stream = null;
record_btn.onclick = async (e) => {
    // 按一下开启录音，再按一下关闭
    if (!stream) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            console.log('navigator.mediaDevices.getUserMedia supported.');
            stream = await navigator.mediaDevices.getUserMedia(
                // constraints - only audio needed for this app
                {
                    audio: true,
                });
            audioFlow.addAudioSource(stream);
            // e.target.textContent = 'StopRecord';
            const animate = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
            animate.setAttribute('attributeName', 'opacity');
            animate.setAttribute('values', '1;0.1;1');
            animate.setAttribute('dur', '1.5s');
            animate.setAttribute('repeatCount', 'indefinite');
            record_btn.querySelector('#center').appendChild(animate);

        } else {
            console.log('navigator.mediaDevices.getUserMedia not supported on your browser! 所以你的浏览器没法录音。');
            record_btn.querySelector('#outer').setAttribute('fill', 'gray');
            e.target.disabled = true;
        };
    } else {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        audioFlow.delAudioSource(stream);
        stream = null;
        // e.target.textContent = 'Record';
        record_btn.querySelector('animate').remove();

    };
};

switch_btn.onclick = function (e) {
    if (audioFlow.isRunning()) {
        audioFlow.stop();
        // e.target.textContent = "Start";
        switch_btn.querySelector('rect').remove();
        const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        path.setAttribute('id', "cricle_triangle");
        path.setAttribute('d', "M651.48928 584.76544l-158.57664 97.5872a69.18144 69.18144 0 0 1-105.472-58.92096v-195.1744a69.18144 69.18144 0 0 1 105.472-58.94144l158.57664 97.5872a69.18144 69.18144 0 0 1 0 117.8624z");
        path.setAttribute('fill', "#4089FF");
        switch_btn.querySelector('svg').appendChild(path);
    } else {
        audioFlow.start();
        // e.target.textContent = "Stop";
        switch_btn.querySelector('#cricle_triangle').remove();
        const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        rect.setAttribute('x', 362); rect.setAttribute('y', 362); rect.setAttribute('width', 300); rect.setAttribute('height', 300);
        rect.setAttribute('rx', 20); rect.setAttribute('ry', 20);
        switch_btn.querySelector('svg').appendChild(rect);
    };

};

let is_open_model = false;
open_model_btn.disabled = true;
open_model_btn.querySelector('#center').setAttribute('fill', 'gray');
// open_model_btn.textContent = "ModelLoading...";
open_model_btn.onclick = function (e) {
    if (is_open_model) {
        is_open_model = false;
        // e.target.textContent = "OpenModel";
        open_model_btn.querySelector('animate').remove();
    } else {
        is_open_model = true;
        // e.target.textContent = "StopModel";
        const animate = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
        animate.setAttribute('attributeName', 'opacity');
        animate.setAttribute('values', '1;0.1;1');
        animate.setAttribute('dur', '1.5s');
        animate.setAttribute('repeatCount', 'indefinite');
        open_model_btn.querySelector('#center').appendChild(animate);

        pinyin_text.textContent = "";
    };
};
// 页面元素事件设置完毕


// 设置音频处理流程
//基础配置
const numberOfChannels = 1, bufferSize = 256;
const max_each_predict_time_s = 10;
const min_each_predict_pinyin_num = 4;
let _x = Math.floor(min_each_predict_pinyin_num/2);
const overlap_predict_pinyin_num  = _x + _x%2;
/**
 * 
 * numberOfChannels 音频声道数。可设置为1,2,3,4,5
 * bufferSize 流式音频原子切片大小，单位是采样点。这样你的刷新帧率就是sampleRate/bufferSize。
 * 
 */
//配置完毕
let audioFlow;
const asrWorker = new ASRWorker('./ASR/Worker/ASRWorkerScript.js');
asrWorker.onReciveFeatureInfo = (featureInfo) => {
    /**
     * sampleRate 音频采样率，每秒钟采样音频的次数。可设置为8000,16000,32000,48000
     * fft_s 短时傅里叶变换的傅里叶窗长，单位为秒。
     * hop_s 短时傅里叶变换的相邻窗的滑动长度，单位为秒。这样你的相邻窗口重叠长度就为 fft_s - hop_s 秒。
     */
    const {sampleRate,fft_s,hop_s} = featureInfo;
    audioFlow = new AudioFlow(null, sampleRate, numberOfChannels, bufferSize, 'sound');
    audioFlow.open();
    audioFlow.openStft(fft_s, hop_s, 10);
    audioFlow.openWaveDraw('waveDrawer', undefined, undefined, 10, false);
    audioFlow.openStftDraw('stftDrawer', undefined, undefined, 10, false);


    const stats = new Stats();
    stats.dom.style.cssText = "";
    document.querySelector('#stats').appendChild(stats.dom);
    audioFlow.reciveStftDataEvent.addListener(
        (stftData) => {
            stats.update();
            if (is_open_model) {
                asrWorker.sendStftData(stftData);
            };
        },
        'model'
    );
};
let pinyinDrawer;
asrWorker.onReciveModelInfo = (modelInfo) => {
    const {viewK} = modelInfo;
    const each_pinyin_timelen = asrWorker.featureInfo.hop_s*viewK;
    const max_each_predict_pinyin_num = Math.ceil(max_each_predict_time_s / each_pinyin_timelen);

    asrWorker.setPredictConfig(
        max_each_predict_pinyin_num,min_each_predict_pinyin_num,overlap_predict_pinyin_num
    );

    pinyinDrawer = new PinYinDrawer('pinyinDrawer',10,each_pinyin_timelen);
};
asrWorker.onReadyToPredict = () => {
    open_model_btn.querySelector('#center').setAttribute('fill', 'red');
    open_model_btn.disabled = false;
};
asrWorker.onRecivePredictResult = (predictResults) => {
    const origin_pinyinArray = predictResults.pinyinArray;
    showOriginPinYinArray(origin_pinyinArray);

    const keeped_pinyinArray = origin_pinyinArray.slice(overlap_predict_pinyin_num/2,-overlap_predict_pinyin_num/2);
    const eachPinYinTime_s = predictResults.timeLength / origin_pinyinArray.length;
    const keeped_startTime = predictResults.audioStartTime + eachPinYinTime_s;
    const keeped_endTime = predictResults.audioEndTime - eachPinYinTime_s;
    dealPinYinArray(keeped_pinyinArray);
    pinyinDrawer.updatePinYinData(keeped_pinyinArray,keeped_endTime,audioFlow.lastAudioData.audioEndTime);
};


function showOriginPinYinArray(origin_pinyinArray){
    oripinyin_list.animate([{ backgroundColor: 'orange' }, { backgroundColor: 'white' }], {
        // timing options
        duration: 1000,
    });
    oripinyin_list.textContent = "";
    for (let py of origin_pinyinArray) {
        oripinyin_list.textContent += ` ${py}`;
    };
};

const cyclicPinYinArray = new CyclicArray(100);
function dealPinYinArray(pinyinArray) {
    cyclicPinYinArray.update(pinyinArray);
    const fullPinYinArray = cyclicPinYinArray.toArray();
    pinyin_text.textContent = "";
    let last_py = '_';
    for (let py of fullPinYinArray) {
        if (py !== '_' && py !== last_py) {
            pinyin_text.textContent += ` ${py}`;
        };
        last_py = py;
    };
    is_awake(fullPinYinArray)
};

let awake_pinyin_list = ["xiao","xing","xiao","xing"];
const awake_threshold = 0.1;
function is_awake(pinyinList){
    const pyLen = awake_pinyin_list.length;
    const needed_pyList = pinyinList.slice(-pyLen);
    let dis = 0;
    for (let i=0;i<pyLen;i+=1){
        dis += cal_pinyin_distance(needed_pyList[i],awake_pinyin_list[i])
    };
    if(dis < awake_threshold) console.log("AWAKE!")
};

function cal_pinyin_distance(py1,py2){
    if(py1 == py2) return 0;
    return 1;
};
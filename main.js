"use strict";
// 设置音频处理流程
//基础配置
const numberOfChannels = 1, bufferSize = 256, total_duration = 10;
const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
// const ModelDir = './ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/';
const ModelDir = './ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_magicdata/';
const minPinYinN = 10;
const useWebWorker = true;
/**
 * 
 * numberOfChannels 音频声道数。整数，默认为1。支持的值最多为32。
 * bufferSize 以采样帧为单位的缓冲区大小。
 *            必须是以下值之一:0、256、512、1024、2048、4096、8192、16384。为0时系统自动选择。
 *            这时你的刷新帧率就是sampleRate/bufferSize。
 * total_duration 以下各种音频绘制的时间总长度。
 * 
 * sampleRate 音频采样率 可取 8000、16000、32000、48000 之一
 * fft_s 一个短时傅里叶变换的窗长，单位为秒
 * hop_s 窗之间间隔长，单位为秒
 * 注意：以上三个参数应该与下面ModelDir文件夹下feature.json中的参数一致，否则模型将加载失败。
 * 
 * ModelDir TensorflowJS 模型文件夹，该文件夹下应该存在一个model.json,一个feature.json,若干个.bin文件。
 * minPinYinN 正整数，流式模型推断音频最小的长度；如果为4，则一次推断输出4个拼音片段，并保留中间两个；下一次推断与这次推断的覆盖长度为4/2 = 2.
 * useWebWorker 是否使用异步进行模型推断；若为false，则模型推断与音频刷新同步进行，大概率导致音频卡顿，但是保证实时率。
 *              若为true，则推断异步进行，不会阻塞音频流逝，但推断输出一般会有积压延迟。
 */
//配置完毕

import { AudioFlow } from './Audio/AudioFlow.js';
import { createElementNS } from './utils/other_utils.js';
const audioFlow = new AudioFlow(null, sampleRate, numberOfChannels, bufferSize, 'sound');
audioFlow.open();
audioFlow.openStft(fft_s, hop_s);
audioFlow.openWaveDraw('waveDrawer', total_duration, false,true);
audioFlow.openStftDraw('stftDrawer', total_duration, false);
audioFlow.openASR(ModelDir, total_duration, minPinYinN, useWebWorker).then((recivePredictResultEvent) => {
    audioFlow.suspendASR();
    open_model_btn.active();

    recivePredictResultEvent.addListener((predictResult) => {
        const origin_pinyinArray = predictResult.pinyinArray;
        showOriginPinYinArray(origin_pinyinArray);
    }, 'showOriginPinYinArray');

    audioFlow.openASRDraw('pinyinDrawer', total_duration);
    audioFlow.keepASR(total_duration).onUpdate = (cyclicPinYinArray) => {
        dealPinYinArray(cyclicPinYinArray.toArray());
    };

    audioFlow.openVoiceWakeUp();
}).catch((reason) => {
    console.log(reason);
    console.error("模型加载失败！");
    open_model_btn.disable();
});

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
            record_btn.setAttribute("title","正在录音，点击停止");
            // e.target.textContent = 'StopRecord';
            const animate = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
            animate.setAttribute('attributeName', 'opacity');
            animate.setAttribute('values', '1;0.1;1');
            animate.setAttribute('dur', '1.5s');
            animate.setAttribute('repeatCount', 'indefinite');
            record_btn.querySelector('#center').appendChild(animate);

        } else {
            console.error('navigator.mediaDevices.getUserMedia not supported on your browser! 所以你的浏览器没法录音。');
            record_btn.setAttribute("title","录音功能不可用，请检查控制台与浏览器兼容性");
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
        switch_btn.setAttribute("title","点击开始音频流");
        // e.target.textContent = "Start";
        switch_btn.querySelector('rect').remove();
        const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        path.setAttribute('id', "cricle_triangle");
        path.setAttribute('d', "M651.48928 584.76544l-158.57664 97.5872a69.18144 69.18144 0 0 1-105.472-58.92096v-195.1744a69.18144 69.18144 0 0 1 105.472-58.94144l158.57664 97.5872a69.18144 69.18144 0 0 1 0 117.8624z");
        path.setAttribute('fill', "#4089FF");
        switch_btn.querySelector('svg').appendChild(path);
    } else {
        audioFlow.start();
        switch_btn.setAttribute("title","点击暂停音频流");
        // e.target.textContent = "Stop";
        switch_btn.querySelector('#cricle_triangle').remove();
        const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        rect.setAttribute('x', 362); rect.setAttribute('y', 362); rect.setAttribute('width', 300); rect.setAttribute('height', 300);
        rect.setAttribute('rx', 20); rect.setAttribute('ry', 20);
        switch_btn.querySelector('svg').appendChild(rect);
    };

};


open_model_btn.disable = () => {
    open_model_btn.disabled = true;
    open_model_btn.setAttribute("title","模型加载失败，请检查控制台输出");
    open_model_btn.querySelector('#center').setAttribute('fill', 'gray');
};
open_model_btn.active = () => {
    open_model_btn.disabled = false;
    open_model_btn.setAttribute("title","模型加载完成，点击启动");
    open_model_btn.querySelector('#center').setAttribute('fill', 'red');
};
open_model_btn.close = () => {
    open_model_btn.is_opened = false;
    open_model_btn.setAttribute("title","点击恢复模型");
    open_model_btn.querySelector('animate').remove();
};
open_model_btn.open = () => {
    open_model_btn.is_opened = true;
    open_model_btn.setAttribute("title","点击暂停模型");
    const animate = document.createElementNS("http://www.w3.org/2000/svg", 'animate');
    animate.setAttribute('attributeName', 'opacity');
    animate.setAttribute('values', '1;0.1;1');
    animate.setAttribute('dur', '1.5s');
    animate.setAttribute('repeatCount', 'indefinite');
    open_model_btn.querySelector('#center').appendChild(animate);
};
open_model_btn.onclick = function (e) {
    if (open_model_btn.disabled) return;
    if (open_model_btn.is_opened) {
        audioFlow.suspendASR();
        open_model_btn.close();
    } else {
        audioFlow.resumeASR();
        pinyin_text.textContent = "";
        open_model_btn.open();
    };
};
open_model_btn.disable();
// 页面元素事件设置完毕




function showOriginPinYinArray(origin_pinyinArray) {
    oripinyin_list.animate([{ backgroundColor: 'orange' }, { backgroundColor: 'white' }], {
        // timing options
        duration: 1000,
    });
    oripinyin_list.textContent = "";
    for (let py of origin_pinyinArray) {
        oripinyin_list.textContent += ` ${py}`;
    };
};

function dealPinYinArray(pinyinArray) {
    pinyin_text.textContent = "";
    let last_py = '_';
    for (let py of pinyinArray) {
        if (py !== '_' && py !== last_py) {
            pinyin_text.textContent += ` ${py}`;
        };
        last_py = py;
    };
};
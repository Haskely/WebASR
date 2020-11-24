"use strict";
import { AudioFlow } from './Audio/AudioFlow.js';
import { MyWorker } from './Workers/MyWorker.js';
import { createElementNS } from './utils/other_utils.js';

//基础配置
const sampleRate = 8000, numberOfChannels = 1, bufferSize = 256, fft_s = 0.032, hop_s = 0.008;
/**
 * sampleRate 音频采样率，每秒钟采样音频的次数。可设置为8000,16000,32000,48000
 * numberOfChannels 音频声道数。可设置为1,2,3,4,5
 * bufferSize 流式音频原子切片大小，单位是采样点。这样你的刷新帧率就是sampleRate/bufferSize。
 * 
 * fft_s 短时傅里叶变换的傅里叶窗长，单位为秒。
 * hop_s 短时傅里叶变换的相邻窗的滑动长度，单位为秒。这样你的相邻窗口重叠长度就为 fft_s - hop_s 秒。
 */
//配置完毕

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
        full_pinyinArray = [];
        last_py = null;
    };
};
// 页面元素事件设置完毕


// 设置音频处理流程
const audioFlow = new AudioFlow(null, sampleRate, numberOfChannels, bufferSize, 'sound');
audioFlow.open();
audioFlow.openStft(fft_s, hop_s, 10);
audioFlow.openWaveDraw('waveDrawer', undefined, undefined, 10, false);
audioFlow.openStftDraw('stftDrawer', undefined, undefined, 10, false);

let last_py = '_';
let full_pinyinArray = [];
const myWorker = new MyWorker('./Workers/AudioProcesserWorker.js');
myWorker.reciveData('pinyinArray', (pinyinArray) => {
    oripinyin_list.animate([{ backgroundColor: 'orange' }, { backgroundColor: 'white' }], {
        // timing options
        duration: 1000,
    });
    oripinyin_list.textContent = "";
    for (let py of pinyinArray) {
        oripinyin_list.textContent += ` ${py}`;
        if (py !== '_' && py !== last_py) {
            full_pinyinArray.push(py);
            pinyin_text.textContent += ` ${py}`;
        };
        last_py = py;
    };
});
myWorker.reciveData('Event', (content) => {
    switch (content) {
        case 'created':
            console.log('myWorkerScript Created!');
            myWorker.sendData('initInfo', {
                sampleRate, fft_s, hop_s, numberOfChannels: 1, max_duration: 3
            });
            break;
        case 'inited':
            console.log('myWorkerScript Inited!');
            // open_model_btn.textContent = "OpenModel";
            open_model_btn.querySelector('#center').setAttribute('fill', 'red');
            open_model_btn.disabled = false;
            break;
        default:
            console.error(`[MainThread]收到未知Event:${content}`);
    };
});

import Stats from './utils/stats/stats.module.js';
const stats = new Stats();
stats.dom.style.cssText = "";
document.querySelector('#stats').appendChild(stats.dom);
audioFlow.reciveStftDataEvent.addListener(
    (stftData) => {
        stats.update();
        const stftData_Clip = stftData;
        if (is_open_model) {
            myWorker.sendData(
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
                    audioTime: stftData_Clip.audioTime,
                },
                [stftData_Clip.stft.arrayBuffer],
            );
        };
    },
    'model');
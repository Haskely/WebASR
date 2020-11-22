"use strict";
import { AudioFlow } from './Audio/AudioFlow.js';
import { MyWorker } from './Workers/MyWorker.js';
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
const pinyintext = document.querySelector('#pinyin');
const switch_btn = document.querySelector('#switch_btn');
const open_model_btn = document.querySelector('#open_model_btn');
// 元素获取完毕

// 设置页面元素事件
audio_input.onchange = async (e) => {
    // 若收到音频文件，就连接到audio_element上
    audios_div.replaceChildren();
    for (let f of e.target.files) {
        let div_el = document.createElement('div');
        let audio_el = document.createElement('audio');
        audio_el.setAttribute("controls", "");
        audio_el.src = URL.createObjectURL(f);
        audioFlow.addAudioSource(audio_el);
        div_el.appendChild(audio_el);
        audios_div.appendChild(div_el);
    };
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

            record_btn.querySelector('#center').remove();
            const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
            rect.setAttribute('id', 'center');
            rect.setAttribute('x', 412); rect.setAttribute('y', 412); rect.setAttribute('width', 200); rect.setAttribute('height', 200);
            record_btn.querySelector('svg').appendChild(rect);
        } else {
            console.log('navigator.mediaDevices.getUserMedia not supported on your browser! 所以你的浏览器没法录音。');
            record_btn.querySelector('#center').setAttribute('fill', 'gray');
            e.target.disabled = true;
        };
    } else {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        audioFlow.delAudioSource(stream);
        stream = null;
        // e.target.textContent = 'Record';
        record_btn.querySelector('#center').remove();
        const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute('id', 'center');
        circle.setAttribute('cx', 512); circle.setAttribute('cy', 512); circle.setAttribute('r', 100); circle.setAttribute('fill', 'red');
        record_btn.querySelector('svg').appendChild(circle);
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

        pinyintext.textContent = "";
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

let last_py = null;
let full_pinyinArray = [];
const myWorker = new MyWorker('./Workers/AudioProcesserWorker.js');
myWorker.reciveData('pinyinArray', (pinyinArray) => {
    for (let py of pinyinArray) {
        if (py !== 'sil' && py !== last_py) {
            full_pinyinArray.push(py);
            last_py = py;
            pinyintext.textContent += ` ${py}`;
        };
    };
    console.log(pinyinArray);
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

audioFlow.reciveStftDataEvent.addListener(
    (stftData) => {
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
                [stftData_Clip.stft.arrayBuffer]
            );
        };
    },
    'model');
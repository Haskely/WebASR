"use strict";
import { WaveDrawer, StftDrawer as StftDrawer } from './Audio/AudioDrawer.js'
import { AudioFlowProcesser } from './Audio/AudioFlowProcesser.js';
import { AudioUtils } from './Audio/AudioUtils.js';
import { AudioContainer } from './Audio/AudioContainer.js';
import { MyWorker } from './Workers/MyWorker.js';
// 添加页面元素
$('body').append(`
    <div>
        <input type="file" id="audio_input" accept=".wav, .mp3, .flac, .aac, .m4a, .opus, .ogg" capture="microphone"/>
        <button id="record_btn" >Record</button>
    </div>`
); const audio_input = document.querySelector('#audio_input'); const record_btn = document.querySelector('#record_btn');
$('body').append(`<div id='audios'></div>`); const audios_div = document.querySelector('#audios');

const waveDrawer = new WaveDrawer('audioWave');
const stftDrawer = new StftDrawer('audioStft');
$('body').append(`<button id='switch_btn'></button>`); const switch_btn = document.querySelector('#switch_btn');
$('body').append(`<button id='open_model_btn'></button>`); const open_model_btn = document.querySelector('#open_model_btn');
// 元素添加完毕

// 设置页面元素事件
audio_input.onchange = async (e) => {
    // 若收到音频文件，就连接到audio_element上
    audios_div.replaceChildren();
    for (let f of e.target.files) {
        let audio_el = document.createElement('audio');
        audio_el.setAttribute("controls", "");
        audio_el.src = URL.createObjectURL(f);
        audioProcesser.addAudioSource(audio_el);
        audios_div.appendChild(audio_el);
    };
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
            audioProcesser.addAudioSource(stream);
            e.target.textContent = 'StopRecord';
        } else {
            console.log('navigator.mediaDevices.getUserMedia not supported on your browser!');
            e.target.textContent = 'NotSupported!'
            e.target.disabled = true;
        };
    } else {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        audioProcesser.delAudioSource(stream);
        stream = null;
        e.target.textContent = 'Record';
    };
};

switch_btn.textContent = "Start";
switch_btn.onclick = function (e) {
    if (audioProcesser.isRunning()) {
        audioProcesser.stop();
        e.target.textContent = "Start";
    } else {
        audioProcesser.start();
        e.target.textContent = "Stop";
    };

};

let is_open_model = false;
open_model_btn.disabled = true;
open_model_btn.textContent = "ModelLoading...";
open_model_btn.onclick = function (e) {
    if (is_open_model) {
        is_open_model = false;
        e.target.textContent = "OpenModel";
    } else {
        is_open_model = true;
        e.target.textContent = "StopModel";
    };
};


// 

// 设置音频处理流程

/**
 * @param {AudioData} audioData
 */
const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
const audioContainer = new AudioContainer(sampleRate, fft_s, hop_s, 1, 10);
const myWorker = new MyWorker('./Workers/AudioProcesserWorker.js');
myWorker.reciveData('pinyinArray', (pinyinArray) => { console.log(pinyinArray) });
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
            open_model_btn.textContent = "OpenModel";
            open_model_btn.disabled = false;
            break;
        default:
            console.error(`[MainThread]收到未知Event:${content}`);
    };
});


const audioProcesser = new AudioFlowProcesser(
    null,
    'sound',
    sampleRate,
    undefined,
    256,
    1,
    (audioData_Clip) => {
        audioContainer.updateAudioDataClip(audioData_Clip);
        const cur_full_audioData = audioContainer.getAudioData();
        // waveDrawer.set_data(cur_full_audioData);
        waveDrawer.updateAudioData(audioData_Clip);

        const stftData_Clip = AudioUtils.getAudioClipStftData(cur_full_audioData, audioData_Clip.channels[0].length, audioContainer.fft_n, audioContainer.hop_n);
        // audioContainer.updateStftDataClip(stftData_Clip);
        // stftDrawer.set_data(audioContainer.getStftData());
        stftDrawer.updateStftData(stftData_Clip);

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
                [stftData_Clip.stft._arrayBuffer]
            );
        };
    },
    null,
);
audioProcesser.open();
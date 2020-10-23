"use strict";
import { WaveDrawer, StftDrawer } from './Audio/AudioDrawer.js'
import { AudioFlowProcesser } from './Audio/AudioFlowProcesser.js';
import { AudioUtils } from './Audio/AudioUtils.js';
import { AudioContainer } from './Audio/AudioContainer.js';
import { MyWorker } from './Workers/MyWorker.js';
// 添加页面元素
$('body').append(`
    <div>
        <input type="file" id="audio_input" accept="audio/*" capture="microphone"/>
        <button id="record_btn" >Record</button>
    </div>`
); const audio_input = document.querySelector('#audio_input'); const record_btn = document.querySelector('#record_btn');
$('body').append(`<div id='audios'></div>`); const audios_div = document.querySelector('#audios');

const waveDrawer = new WaveDrawer('audioWave', 1000, 125);
const stftDrawer = new StftDrawer('audioStft', 1000, null);

$('body').append(`<button id='switch_btn'></button>`); const switch_btn = document.querySelector('#switch_btn');
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

switch_btn.disabled = true;
switch_btn.textContent = "Loading..."
switch_btn.onclick = async function (e) {
    if (audioProcesser.isRunning()) {
        audioProcesser.stop();
        e.target.textContent = "Start";
    } else {
        audioProcesser.start();
        e.target.textContent = "Stop";
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
myWorker.reciveData('predict_res', (content) => { console.log(`输出长度:${content.length},${content[0].length},${content[0][0].length}`) });
myWorker.reciveData('Event', (content) => {
    switch (content) {
        case 'created':
            myWorker.sendData('initInfo', {
                sampleRate, fft_s, hop_s, numberOfChannels: 1, max_duration: 3
            });
            break;
        case 'inited':
            switch_btn.textContent = "Start";
            switch_btn.disabled = false;
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
    (audioData) => {
        audioContainer.updateAudioDataClip(audioData);
        const cur_full_audioData = audioContainer.getAudioData();
        waveDrawer.set_data(cur_full_audioData);

        const stftData = AudioUtils.getAudioClipStftData(cur_full_audioData, audioData.channels[0].length, audioContainer.fft_n, audioContainer.hop_n);
        audioContainer.updateStftDataClip(stftData);
        stftDrawer.set_data(audioContainer.getStftData());

        myWorker.sendData(
            'stftData',
            {
                sampleRate: stftData.sampleRate,
                fft_n: stftData.fft_n,
                hop_n: stftData.hop_n,
                stft: {
                    stftMartrixArrayBuffer: stftData.stft._arrayBuffer,
                    stftMartrixHeight: stftData.stft.height,
                    stftMartrixWidth: stftData.stft.width,
                },
                audioTime: stftData.audioTime,
            },
            [stftData.stft._arrayBuffer]
        );
    },
    null,
);
audioProcesser.open();
"use strict";

// 添加页面元素
$('body').append(`
    <div>
        <input type="file" id="audio_input" accept="audio/*" capture="microphone"/>
        <button id="record_btn" >Record</button>
    </div>`
); const audio_input = document.querySelector('#audio_input'); const record_btn = document.querySelector('#record_btn');
$('body').append(`<div id='audios'></div>`); const audios_div = document.querySelector('#audios');

const waveDrawer = new WaveDrawer('audioWave', 1000, 100);
const stftDrawer = new StftDrawer('audioStft', 1000, null);

$('body').append(`<button id='open_btn'>Open</button>`); const open_btn = document.querySelector('#open_btn');
$('body').append(`<button id='start_btn'>Start</button>`); const start_btn = document.querySelector('#start_btn');
$('body').append(`<button id='stop_btn'>Stop</button>`); const stop_btn = document.querySelector('#stop_btn');
$('body').append(`<button id='close_btn'>Close</button>`); const close_btn = document.querySelector('#close_btn');
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

open_btn.onclick = async function () {
    audioProcesser.open();
};

start_btn.onclick = async function () {
    audioProcesser.start();
};

stop_btn.onclick = async function () {
    audioProcesser.stop();
};

close_btn.onclick = async function () {
    audioProcesser.close();
};
// 

// 设置音频处理流程

/**
 * @param {AudioData} audioData
 */
const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
const audioContainer = new AudioContainer(sampleRate, fft_s, hop_s, 1, 10);
const myWorker = new MyWorker('Workers/AudioProcesserWorker.js',
    (data) => {

    },
);
const audioProcesser = new AudioProcesser(
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

        const cur_slice_length = audioData.channels[0].length;
        const cur_audio_slice4stft = cur_full_audioData.channels[0].slice(-(cur_slice_length + audioContainer.fft_n - audioContainer.hop_n))
        const stft = nj_stft(cur_audio_slice4stft, audioContainer.fft_n, audioContainer.hop_n);
        const stftData = new StftData(audioData.sampleRate, audioContainer.fft_n, audioContainer.hop_n, stft, audioData.audioTime)
        audioContainer.updateStftDataClip(stftData);
        const full_stftData = audioContainer.getStftData();
        stftDrawer.set_data(full_stftData);

        myWorker.sendData({
            'type': 'stftDatastft',
            'content': full_stftData.stft,
        }, [full_stftData.stft]);
    },
    null,
);
const nj_stft = (audio_slice, fft_n, hop_n) => {
    // fft_n必须为2的n次幂
    const slice_powerS_dbs = [];
    for (let cur_n = 0; cur_n + fft_n <= audio_slice.length; cur_n += hop_n) {

        const RI = nj.zeros([fft_n, 2], 'float32');
        for (let i = 0; i < fft_n; i += 1) {
            RI.set(i, 0, audio_slice[cur_n + i] * Math.sin(i * Math.PI / fft_n) ** 2);
        };
        const fft = nj.fft(RI);
        const cur_powerS_db = new Float32Array(fft_n / 2 + 1);
        for (let j = 0; j < cur_powerS_db.length; j += 1) {
            cur_powerS_db[j] = 50 + 10 * Math.log10(fft.get(j, 0) ** 2 + fft.get(j, 1) ** 2);
            if (cur_powerS_db[j] < 0) cur_powerS_db[j] = 0;
        };
        slice_powerS_dbs.push(cur_powerS_db);
    };
    return slice_powerS_dbs;
};

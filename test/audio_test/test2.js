// 添加页面元素
$('body').append(`<input type="file" id="audio_input" accept="audio/*" capture="microphone"/>`);
$('body').append(`<audio id="audio" controls></audio>`);
// 设置input
const audio_input = document.querySelector('#audio_input');
const audio_el = document.querySelector('#audio');
audio_input.onchange = async (e) => {
    // 若收到音频文件，就连接到audio_element上
    audio_el.src = URL.createObjectURL(audio_input.files[0]);
};

const waveDrawer = new WaveDrawer('audioWave', 1000, 100);
const stftDrawer = new StftDrawer('audioStft', 1000, null);
$('body').append(`<button id='open_btn'>Open</button>`);
$('body').append(`<button id='start_btn'>Start</button>`);
$('body').append(`<button id='stop_btn'>Stop</button>`);
$('body').append(`<button id='close_btn'>Close</button>`);

const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
const audioContainer = new AudioContainer(sampleRate, fft_s, hop_s, 1, 10);

nj_stft = (audio_slice, fft_n, hop_n) => {
    // fft_n必须为2的n次幂
    slice_powerS_dbs = [];
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


/**
 * @param {AudioData} audioData
 */
deal_scriptNode_data = (audioData) => {
    audioContainer.updateAudioDataClip(audioData);
    const cur_full_audioData = audioContainer.getAudioData();
    waveDrawer.set_data(cur_full_audioData);

    const cur_slice_length = audioData.channels[0].length;
    const cur_audio_slice4stft = cur_full_audioData.channels[0].slice(-(cur_slice_length + audioContainer.fft_n - audioContainer.hop_n))
    const stft = nj_stft(cur_audio_slice4stft, audioContainer.fft_n, audioContainer.hop_n);
    const stftData = new StftData(audioData.sampleRate, audioContainer.fft_n, audioContainer.hop_n, stft, audioData.timeStamp)
    audioContainer.updateStftDataClip(stftData);
    stftDrawer.set_data(audioContainer.getStftData());
};

const microphone = new MicrophoneAudioProcesser(
    true,
    sampleRate,
    undefined,
    256,
    1,
    (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const outputBuffer = audioProcessingEvent.outputBuffer;
        // inputBuffer使用指南: https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
        let channels = Array(inputBuffer.numberOfChannels);
        for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
            const input_ch = inputBuffer.getChannelData(i);
            const output_ch = outputBuffer.getChannelData(i);
            channels[i] = new Float32Array(input_ch.length);
            for (j in channels[i]) {
                channels[i][j] = input_ch[j];
                output_ch[j] = input_ch[j];
            };
        };
        // const audiodata = {
        //     duration: inputBuffer.duration,
        //     length: inputBuffer.length,
        //     numberOfChannels: inputBuffer.numberOfChannels,
        //     sampleRate: inputBuffer.sampleRate,
        //     channels: channels,
        //     timeStamp: Date.now(),
        // };
        const audioData = new AudioData(inputBuffer.sampleRate, channels, Date.now());
        deal_scriptNode_data(audioData);
    },
);
microphone.addAudioSource(audio_el);

const open_btn = document.querySelector('#open_btn');
open_btn.onclick = async function () {
    microphone.open();
};

const start_btn = document.querySelector('#start_btn');
start_btn.onclick = async function () {
    microphone.start();
};

const stop_btn = document.querySelector('#stop_btn');
stop_btn.onclick = async function () {
    microphone.stop();
};

const close_btn = document.querySelector('#close_btn');
close_btn.onclick = async function () {
    microphone.close();
};
const use_bufNode = false;
const use_elNode = false;

// 初始化AudioContext
let audioCtx = new AudioContext({
    sampleRate: 8000
});
audioCtx.suspend();
let audio_fileas_arraybuffer;
let audio_buffer;
const waveDrawer = new WaveDrawer('audioWave', 600, 100);
const stftDrawer = new StftDrawer('audioStft', 600, null);
// 添加页面元素
$('body').append(`<input type="file" id="audio_input" accept="audio/*" capture="microphone"/>`);
$('body').append(`<audio id="audio" controls></audio>`);
// 设置input
const audio_input = document.querySelector('#audio_input');
audio_input.onchange = async (e) => {
    // 若收到音频文件，就连接到audio_element上
    audio_el.src = URL.createObjectURL(audio_input.files[0]);
    if (use_elNode) {
        // 将audio_element连接到音频处理组件
        init_el();
    };
    // 若收到音频文件，就使用reader进行读取
    reader.readAsArrayBuffer(audio_input.files[0]);
};
const audio_el = document.querySelector('#audio');
let asr = new ASR();
let bufferSourceNode = audioCtx.createBufferSource();
let elementSourceNode = audioCtx.createMediaElementSource(audio_el);
let scriptNode = audioCtx.createScriptProcessor(256, 1, 1);
scriptNode.onaudioprocess = (audioProcessingEvent) => {
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
    const data = {
        duration: inputBuffer.duration,
        length: inputBuffer.length,
        numberOfChannels: inputBuffer.numberOfChannels,
        sampleRate: inputBuffer.sampleRate,
        channels: channels,
        timeStamp: Date.now(),
    };
    deal_scriptNode_data(data);
};
let analyserNode = new AnalyserNode(audioCtx, {
    fftSize: 256,
    maxDecibels: -30,
    minDecibels: -100,
    smoothingTimeConstant: 0.5,
});
analyserNode.connect(scriptNode);
scriptNode.connect(audioCtx.destination);
function init_buf() {
    bufferSourceNode.buffer = audio_buffer;
    bufferSourceNode.connect(analyserNode);
};
function init_el() {
    elementSourceNode.connect(analyserNode);
};

const reader = new FileReader();
// 设置reader
reader.onload = async function (evt) {
    // 将reader的数据进一步解码成audio_buffer
    audio_fileas_arraybuffer = evt.target.result;
    audio_buffer = await audioCtx.decodeAudioData(audio_fileas_arraybuffer);
    if (use_bufNode) {
        // 将audio_buffer连接到音频处理组件
        init_buf();
    };
    const audio_data = {
        // duration: audio_buffer.duration,
        // length: audio_buffer.length,
        // numberOfChannels: audio_buffer.numberOfChannels,
        sampleRate: audio_buffer.sampleRate,
        channels: [audio_buffer.getChannelData(0)],
        timeStamp: Date.now(),
    };
    waveDrawer.set_data(audio_data);
    const stft_data = {
        timeStamp: Date.now(),
        sampleRate: audio_buffer.sampleRate,
        fft_s: 0.032,
        hop_s: 0.008,
        stft: null,
    };
    stft_data.stft = asr.stft_audio_clip(audio_buffer.getChannelData(0), stft_data.sampleRate, stft_data.fft_s, stft_data.hop_s).arraySync();
    stftDrawer.set_data(stft_data);
};

$('body').append(`<button id='start_btn'>Start</button>`);
const start_btn = document.querySelector('#start_btn');
$('body').append(`<button id='stop_btn'>Stop</button>`);
const stop_btn = document.querySelector('#stop_btn');
start_btn.onclick = async function () {
    await audioCtx.resume();
    console.log(audioCtx.state);
};

stop_btn.onclick = async function () {
    await audioCtx.suspend();
    console.log(audioCtx.state);
    // last_deal();
};

class AudioDataCyclicContainer {
    constructor(
        sampleRate,
        numberOfChannels,
        max_duration = 10,
    ) {
        this.sampleRate = sampleRate;
        this.max_duration = max_duration;

        this.audioCyclicChannels = Array(numberOfChannels);
        for (let i = 0; i < numberOfChannels; i += 1) {
            this.audioCyclicChannels[i] = new Float32CyclicArray(Math.round(sampleRate * max_duration));
        };
        this.timeStamp = null;
    };

    updatedata = (data) => {
        for (let i = 0; i < data.numberOfChannels; i += 1) {
            this.audioCyclicChannels[i].update(data.channels[i])
        };
        this.timeStamp = data.timeStamp;
    };

    getdata = () => {
        return {
            timeStamp: this.timeStamp,
            sampleRate: this.sampleRate,
            channels: this.audioCyclicChannels.map((cyclic_channel) => {
                return cyclic_channel.toArray();
            }),
        };
    };

};
class StftDataCyclicContainer {
    constructor(sampleRate, fft_s, hop_s, max_duration = 10) {
        this.sampleRate = sampleRate;
        this.fft_s = fft_s;
        this.hop_s = hop_s;
        this.max_duration = max_duration;

        this.stftCyclicData = new CyclicTensorBuffer([Math.ceil(max_duration / hop_s), Math.ceil(fft_s * sampleRate / 2) + 1], 0, 'float32');
        this.timeStamp = null;
    };

    updatedata = (data) => {
        this.stftCyclicData.update(data.stft.bufferSync());
        this.timeStamp = data.timeStamp;
    };

    getdata = () => {
        return {
            timeStamp: this.timeStamp,
            sampleRate: this.sampleRate,
            fft_s: this.fft_s,
            hop_s: this.hop_s,
            stft: this.stftCyclicData.toBuffer().toTensor(),
        };
    };
};
class analyserFrequencyDataCyclicContainer {
    constructor(frequencyBinCount, hop_s, max_duration = 10) {
        this.hop_s = hop_s;
        this.analyserFrequencyData = new Float32_2DCyclicArray(Math.ceil(max_duration / hop_s), frequencyBinCount);
    };

    updatedata = (frequencyData) => {
        this.analyserFrequencyData.update(frequencyData.frequency);
        this.timeStamp = frequencyData.timeStamp;
    };

    getdata = () => {
        return {
            frequency: this.analyserFrequencyData.to2DArray(),
            timeStamp: this.timeStamp,
            hop_s: this.hop_s,
            maxDecibels: -30,
            minDecibels: -80,
        };
    };
};
let audio_data_cyclic_container;
let stft_data_cyclic_container;
let analyser_frequency_data_cyclic_container;
const waveDrawer2 = new WaveDrawer('audioWave2', 600, 100);
const stftDrawer2 = new StftDrawer('audioStft2', 600, null);
const stftDrawer3 = new StftDrawer('audioStft3', 600, null);
const frequencyDrawer = new FrequencyDrawer('audioFrequency', 600, null);
let audio_data_his = [];
deal_scriptNode_data = (data) => {
    // console.log('deal_scriptNode_data');

    let cur_audio_data = data;

    // audio_data_his.push(cur_audio_data);
    // if (audio_data_his.length > 1000) {
    //     audio_data_his.shift();
    // };

    if (!audio_data_cyclic_container) audio_data_cyclic_container = new AudioDataCyclicContainer(cur_audio_data.sampleRate, cur_audio_data.numberOfChannels, 10);
    audio_data_cyclic_container.updatedata(cur_audio_data);


    const full_audio_data = audio_data_cyclic_container.getdata();
    waveDrawer2.set_data(full_audio_data);

    var dataArray = new Float32Array(analyserNode.frequencyBinCount);
    analyserNode.getFloatFrequencyData(dataArray);
    let _2ddata = new Float32_2DArray(1, dataArray.length);
    _2ddata._float32dataArray = dataArray;
    let frequencyData = {
        timeStamp: data.timeStamp,
        hop_s: 0.008,
        maxDecibels: -30,
        minDecibels: -80,
        frequency: _2ddata,
    };
    if (!analyser_frequency_data_cyclic_container) analyser_frequency_data_cyclic_container = new analyserFrequencyDataCyclicContainer(analyserNode.frequencyBinCount, hop_s = 0.008)
    analyser_frequency_data_cyclic_container.updatedata(frequencyData);
    const full_frequency_data = analyser_frequency_data_cyclic_container.getdata();
    frequencyDrawer.set_data(full_frequency_data);
};

let audio_data_cyclic_container2;
simulate_deal_process_data = (audio_data_his) => {
    console.log('last_deal_data');
    cur_audio_data = audio_data_his.pop();
    if (!audio_data_cyclic_container2) audio_data_cyclic_container2 = new AudioDataCyclicContainer(cur_audio_data.sampleRate, cur_audio_data.numberOfChannels, 10);
    audio_data_cyclic_container2.updatedata(cur_audio_data);
    const full_audio_data = audio_data_cyclic_container2.getdata();

    const stft_data2 = {
        timeStamp: Date.now(),
        sampleRate: cur_audio_data.sampleRate,
        fft_s: 0.032,
        hop_s: 0.008,
        stft: null,
    };

    const hop_n = (stft_data2.hop_s * cur_audio_data.sampleRate);
    const fft_n = (stft_data2.fft_s * cur_audio_data.sampleRate);
    const audio_data_clip = cut_audio_data(full_audio_data, null, full_audio_data.channels[0].length, cur_audio_data.length + fft_n - hop_n);
    stft_data2.stft = asr.stft_audio_clip(combine_channels(audio_data_clip.channels), stft_data2.sampleRate, stft_data2.fft_s, stft_data2.hop_s)

    if (!stft_data_cyclic_container) stft_data_cyclic_container = new StftDataCyclicContainer(stft_data2.sampleRate, stft_data2.fft_s, stft_data2.hop_s, 10);
    stft_data_cyclic_container.updatedata(stft_data2);

    const full_stft_data = stft_data_cyclic_container.getdata();
    full_stft_data.stft = full_stft_data.stft.arraySync();
    stftDrawer2.set_data(full_stft_data);


    const stft_data3 = {
        timeStamp: Date.now(),
        sampleRate: cur_audio_data.sampleRate,
        fft_s: 0.032,
        hop_s: 0.008,
        stft: null,
    };
    stft_data3.stft = asr.stft_audio_clip(full_audio_data.channels[0], stft_data3.sampleRate, stft_data3.fft_s, stft_data3.hop_s);
    stft_data3.stft = stft_data3.stft.arraySync();
    stftDrawer3.set_data(stft_data3);
};
last_deal = () => {
    // for (let i = 0; i < audio_data_his.length; i += 1) {
    //     setTimeout(simulate_deal_process_data, 0, audio_data_his[i]);
    // };
    for (let i = 0; i < audio_data_his.length; i += 1) {
        setTimeout(simulate_deal_process_data, 0, audio_data_his);
    }
};

// for(let ch of audio_data_his) console.log(ch.channels[0][0]);
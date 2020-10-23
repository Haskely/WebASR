import { AudioData } from '../Audio/AudioContainer.js'

const time_fn = (fn, ...args) => {
    const s_time = Date.now();
    const res = fn(...args);
    const e_time = Date.now();
    console.log(`总耗时为: ${(e_time - s_time) * 0.001} s`);
    return res;
};

const make_fake_audioarray = (total_t = 10, samplerate = 8000) => {
    const fake_audioarray = new Float32Array(Math.round(samplerate * total_t));
    for (let i in fake_audioarray) {
        fake_audioarray[i] = Math.random();
    };
    return fake_audioarray;
};

const make_fake_audioData = (total_t = 10, samplerate = 8000) => {
    return new AudioData(samplerate, [make_fake_audioarray(total_t, samplerate)], 10.000);
};

export { time_fn, make_fake_audioData }

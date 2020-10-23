// $('body').append(`<p><input id="total_t" type="text" placeholder="10"></input></p>`);
// total_t_input = document.querySelector('#total_t');
// total_t_input.value = 10;

make_fake_audioarray = (total_t = 10, samplerate = 8000) => {
    let fake_audioarray = new Float32Array(Math.round(samplerate * total_t));
    for (i in fake_audioarray) {
        fake_audioarray[i] = Math.random();
    };
    return fake_audioarray;
};
let audio_data = {
    sampleRate: 8000,
    channels: [make_fake_audioarray()],
    timeStamp: Date.now(),
};

const audioCtx = new AudioContext({
    sampleRate: 8000
});
audioCtx.suspend();
$('body').append(`<input type="file" id="audio_input" accept="audio/*"/>`);
const audio_input = document.querySelector('#audio_input');
audio_input.onchange = async (e) => {
    // 若收到音频文件，就使用reader进行读取
    const flie = audio_input.files[0];
    const filearrayBuffer = await flie.arrayBuffer();
    const audio_buffer = await audioCtx.decodeAudioData(filearrayBuffer);
    audio_data = {
        // duration: audio_buffer.duration,
        // length: audio_buffer.length,
        // numberOfChannels: audio_buffer.numberOfChannels,
        sampleRate: audio_buffer.sampleRate,
        channels: [audio_buffer.getChannelData(0)],
        timeStamp: Date.now(),
    };
};

$('body').append(`<p><input id="slice_t" type="text" placeholder="0.032"></input></p>`);
slice_t_input = document.querySelector('#slice_t');
slice_t_input.value = 0.032;

$('body').append(`<p><input id="stft_fn" type="text" placeholder="0.032"></input></p>`);
stft_fn_input = document.querySelector('#stft_fn');
stft_fn_input.value = 'tf_stft';

$('body').append(`<button id="test_stft_cost" >test_stft_cost</button>`);
test_stft_cost_btn = document.querySelector('#test_stft_cost');
test_stft_cost_btn.onclick = () => {
    stft_fn_dict = {
        'tf_stft_tidy': tf_stft_tidy,
        'tf_stft': tf_stft,
        'nj_stft': nj_stft,
    };

    test_stft_cost(stft_fn_dict[stft_fn_input.value],
        audio_data.channels[0],
        Number(slice_t_input.value),
        audio_data.sampleRate
    );
};
// $('body').append(`<button id="test_matmulstft_cost" >test_matmulstft_cost</button>`);
// test_matmulstft_cost_btn = document.querySelector('#test_matmulstft_cost');
// test_matmulstft_cost_btn.onclick = () => {
//     test_matmulstft_cost(Number(total_t_input.value), Number(slice_t_input.value));
// };

const stftDrawer1 = new StftDrawer('audioStft1', 600, null);


make_audioarray_slices = (audioarray, slice_n = 256, fft_n = 256, hop_n = 64) => {
    const audioarray_copy = new Float32Array(audioarray.length + fft_n - hop_n);
    for (let i = 0; i < audioarray.length; i += 1) audioarray_copy[i] = audioarray[i];
    const audioarray_slices = [];
    for (let cur_n = 0; cur_n < audioarray.length; cur_n += slice_n) {
        let s = cur_n;
        let e = cur_n + slice_n + fft_n - hop_n;
        cur_audioslice = audioarray_copy.slice(s, e);
        audioarray_slices.push(cur_audioslice);
    };
    return audioarray_slices;
};


nj_stft = (audio_slice, fft_n, hop_n) => {
    // audio_fft_slices = [];
    slice_powerS_dbs = [];
    for (let cur_n = 0; cur_n + fft_n <= audio_slice.length; cur_n += hop_n) {
        // audio_fft_slices.push(audio_slice.slice(cur_n, cur_n + fft_n));

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

tf_stft_tidy = (audio_slice, fft_n, hop_n) => {
    return tf.tidy(() => { return tf_stft(audio_slice, fft_n, hop_n) })
}

tf_stft = (audio_slice, fft_n, hop_n) => {
    const ori_stft_data = tf.signal.stft(tf.tensor1d(audio_slice), fft_n, hop_n);

    const S = ori_stft_data.abs();
    const powerS = S.square();
    const powerS_db = powerS.log().div(tf.log(10)).mul(10);
    let result = powerS_db;
    result = result.maximum(-50).add(50);
    // const result_del_zero_mean = result.sum().div(result.notEqual(0).sum());
    // const result_zero2mean = result.where(result.equal(0), result_del_zero_mean);
    // const res_std = result_zero2mean.sub(result_del_zero_mean).square().mean().sqrt()
    // result = result.div(res_std.maximum(1));
    result_array = result.arraySync();

    return result_array;
};

tf_matmulstft = (audio_slice, fft_n, hop_n) => {
    audio_fft_slices = [];
    for (let cur_n = 0; cur_n + fft_n <= audio_slice.length; cur_n += hop_n) {
        let s = cur_n;
        let e = s + fft_n;
        cur_fftslice = audio_slice.slice(s, e);
        audio_fft_slices.push(cur_fftslice);
    };
    const audio_fftsliceMat = tf.tensor2d(audio_fft_slices); // 4x256
    const stftMat = tf.truncatedNormal([fft_n, Math.round(fft_n / 2)]);
    const ori_stft_data = tf.matMul(audio_fftsliceMat, stftMat);

    const S = ori_stft_data.abs();
    // const powerS = S.square();


    // const powerS_db = powerS.log().div(tf.log(10)).mul(10);
    // let result = powerS_db.transpose();
    // result = result.maximum(-50).add(50);
    // const result_del_zero_mean = result.sum().div(result.notEqual(0).sum());
    // const result_zero2mean = result.where(result.equal(0), result_del_zero_mean);
    // const res_std = result_zero2mean.sub(result_del_zero_mean).square().mean().sqrt()
    // result = result.div(res_std.maximum(1));
    S_array = S.arraySync();

    return S_array;
};

test_stft_cost = (stft_fn, audioarray, slice_t = 0.032, samplerate = 8000, fft_s = 0.032, hop_s = 0.008) => {

    const sp = samplerate;
    const slice_n = Math.round(slice_t * sp);
    const fft_n = Math.round(fft_s * sp);
    const hop_n = Math.round(hop_s * sp);
    const audioarray_slices = make_audioarray_slices(audioarray, slice_n, fft_n, hop_n);
    console.log(
        `sampleRate:${samplerate}\n` +
        `total_t:${audioarray.length / samplerate}\n` +
        `slice_t:${slice_t}\n` +
        `slice_num:${audioarray_slices.length}\n` +
        `slice_length:${audioarray_slices[0].length}` +
        `fft_n:${fft_n}\n` +
        `hop_n:${hop_n}\n`
    );

    let result_array = test_fn(() => {
        let result_array = [];
        for (let audio_slice of audioarray_slices) {

            result_array = result_array.concat(stft_fn(audio_slice, fft_n, hop_n));
            // S_array = tf_stft(audio_slice, fft_n, hop_n);
        };
        return result_array;
    });

    console.log(result_array);
    stftData = {
        timeStamp: Date.now(),
        sampleRate: samplerate,
        fft_s: fft_s,
        hop_s: hop_s,
        stft: result_array,
    };
    stftDrawer1.set_data(stftData);
};

test_fn = (fn) => {
    s_time = Date.now();
    res = fn();
    e_time = Date.now();
    console.log(`总耗时:${(e_time - s_time) * 0.001} s`);
    return res;
};
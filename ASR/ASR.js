class ASR {
    /**
     * 
     * @param {Float32Array} predict_delays 进行音频预测的延迟时间列表,元素Number，单位：秒
     */
    constructor(predict_delays = [0.032, 1, 10]) {
        this.predict_delays = predict_delays;
        this.last_pridect_timeStamp = 0;

    };

    predict = (audio_data_cyclic_container) => {

    };

    stft_audio_clip(audio_clip, sampleRate, fft_s, hop_s) {
        console.log(`音频时长:${audio_clip.length/sampleRate},fft_s:${fft_s},hop_s:${hop_s},预期stft长度:${audio_clip.length/sampleRate/hop_s}`)
        const frameLength = Math.round(fft_s * sampleRate);
        const frameStep = Math.round(hop_s * sampleRate);

        return tf.tidy(() => {

            const ori_stft_data = tf.signal.stft(tf.tensor1d(audio_clip), frameLength, frameStep);

            const S = ori_stft_data.abs();

            const powerS = S.square();

            const powerS_db = powerS.log().div(tf.log(10)).mul(10);

            let result = powerS_db.maximum(-50).add(50);
            const result_del_zero_mean = result.sum().div(result.notEqual(0).sum());
            const result_zero2mean = result.where(result.equal(0), result_del_zero_mean);
            const res_std = result_zero2mean.sub(result_del_zero_mean).square().mean().sqrt()
            result = result.div(res_std.maximum(1));
            console.log(`stft长度:${result.shape}`);
            return result;

        });
    };

    network_predict(stft_data) {

    };

    myctc_decode(liner_out) {

    };


};

function combine_channels(channels) {
    if (channels.length == 1) return channels[0];
    else if (channels.length >= 2) {
        const result = new Float32Array(channels[0].length);
        for (let i = 0; i < result.length; i += 1) {
            for (let ch of channels) {
                result[i] += ch[i];
            };
            result[i] /= channels.length;
        };
        return result;
    };
};

function cut_audio_data(audio_data, start_n = null, end_n = null, duration_n = null) {
    const cutted_audio_data = {
        timeStamp: audio_data.timeStamp,
        sampleRate: audio_data.sampleRate,
        channels: null,
    }
    if (start_n && end_n && duration_n) throw "start_n, end_n, duration_n 三个里面提供两个即可";
    if (!duration_n) {
        duration_n = end_n - start_n;
    } else if (!start_n) {
        start_n = end_n - duration_n;
    };
    cutted_audio_data.channels = Array(audio_data.channels.length).fill(new Float32Array(duration_n));

    cutted_audio_data.channels.forEach((ch, ch_n) => {
        for (let i = 0; i < duration_n; i += 1) {
            if (start_n + i >= 0 && start_n + i < audio_data.channels[0].length) {
                ch[i] = audio_data.channels[ch_n][start_n + i];
            };
        };
    });
    return cutted_audio_data;
};
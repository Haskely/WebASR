
// import '../../Audio/AudioUtils.js'
// import '../../Audio/AudioContainer.js'
// import '../../test/test_utils.js'

async function init_model() {
    const modelUrl = './tensorflowjs/tfjsModel/tfjs_savedModel/model.json';
    const model = await tf.loadGraphModel(modelUrl);
    return model;
};

async function main() {
    const { AudioUtils } = await import('../../Audio/AudioUtils.js');
    const { time_fn, make_fake_audioData } = await import('../../test/test_utils.js');
    const model = await init_model();
    const samplerate = 8000, fft_n = 256, hop_n = 64, total_t = 10;
    const fake_audioData = make_fake_audioData(total_t, samplerate);

    const fake_stftData = AudioUtils.getAudioClipStftData(fake_audioData, fake_audioData.channels[0].length, fft_n, hop_n);
    const onebatch_stft_tfTensor = tf.tensor(fake_stftData.stft._float32ArrayView, [1, fake_stftData.stft.height, fake_stftData.stft.width]);
    function model_predict(n) {
        const res = model.predict({ padded_datas: tf.zeros([1, n, 129]) });
        return res.softmax();
    };

    for (let i = 0; i < 10; i += 1) {
        const n = 17 - i
        console.log(n)
        const res = time_fn(model_predict, n);
        console.log(`模型输出shape:${res.shape}`);
    };

};



main();
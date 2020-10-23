


async function init_model() {
    const modelUrl = './test/tfjs_test/tfjs-model_yamnet_tfjs_1/model.json';
    const model = await tf.loadGraphModel(modelUrl);
    return model;
};

async function main() {
    const model = await init_model();
    const waveform = tf.zeros([8000 * 3]);
    const [scores, embeddings, spectrogram] = model.predict(waveform);
    scores.print(verbose = true);  // shape [N, 521]
    embeddings.print(verbose = true);  // shape [N, 1024]
    spectrogram.print(verbose = true);  // shape [M, 64]
    // Find class with the top score when mean-aggregated across frames.
    scores.mean(axis = 0).argMax().print(verbose = true);
    // Should print 494 corresponding to 'Silence' in YAMNet Class Map.
};

main();
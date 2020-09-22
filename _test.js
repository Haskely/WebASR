let fsize = 256;
let time = await tf.time(() => {

    const ori_stft_data = tf.signal.stft(tf.tensor1d(new Float32Array(fsize)), 256, 64);

    const S = ori_stft_data.abs();

    //     const powerS = S.square();


    //     const powerS_db = powerS.log().div(tf.log(10)).mul(10);
    //     let result = powerS_db.transpose();
    //     result = result.maximum(-50).add(50);
    //     const result_del_zero_mean = result.sum().div(result.notEqual(0).sum());
    //     const result_zero2mean = result.where(result.equal(0), result_del_zero_mean);
    //     const res_std = result_zero2mean.sub(result_del_zero_mean).square().mean().sqrt()
    //     result = result.div(res_std.maximum(1));

    return S.arraySync();
});
console.log(`kernelMs: ${time.kernelMs}, wallTimeMs: ${time.wallMs}`);
console.log(fsize / 8);


let fsize = 256;
let time = await tf.time(() => {

    const ori_stft_data1 = tf.tensor1d(new Float32Array(fsize)).rfft();
    const ori_stft_data2 = tf.tensor1d(new Float32Array(fsize)).rfft();

    const S1 = ori_stft_data1.abs();
    const S2 = ori_stft_data2.abs();

    return S1.arraySync(), S2.arraySync();
});
console.log(`kernelMs: ${time.kernelMs}, wallTimeMs: ${time.wallMs}`);
console.log(fsize / 8);

let t = 1;
let time = await tf.time(() => {
    let n = Math.round(t / 0.008);
    // let _x = tf.tensor1d(new Float32Array(256 * n * 129));
    let _x = tf.truncatedNormal([256 * n * 129]);
    let _y = tf.truncatedNormal([256 * n * 129]);
    // let res = _x.dot(_y);
    let res = tf.truncatedNormal([256 * n * 129]);


    return res.arraySync();
});
console.log(`kernelMs: ${time.kernelMs}, wallTimeMs: ${time.wallMs}`);


function iterate_buffer(buffer) {
    const cur_pos = new Int32Array(buffer.shape.length);
    for (let dim = 0; dim < cur_pos.length; cur_pos[dim] += 1) {
        // do curpos
        console.log(buffer.get(...cur_pos));


        for (dim = 0; dim < cur_pos.length && cur_pos[dim] >= buffer.shape[dim] - 1; dim += 1) {
            cur_pos[dim] = 0;
        };
    };
};

function iterate_buffer(buffer) {
    const cur_pos = new Int32Array(buffer.shape.length);
    while (true) {

        let dim = 0;
        while (true) {
            if (dim >= cur_pos.length) {
                break;
            } else if (cur_pos[dim] < buffer.shape[dim] - 1) {
                cur_pos[dim] += 1;
                break;
            } else {
                cur_pos[dim] = 0;
                dim += 1;
            };
        };
        if (dim >= cur_pos.length) break;
    };
};
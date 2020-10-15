test_stft_cost = (N = 1) => {
    let sp = 8000;
    let t = 10;
    let fft_s = 0.032;
    let hop_s = 0.008;
    let fake_audiodata = new Float32Array(sp * t);
    for (i in fake_audiodata) {
        fake_audiodata[i] = Math.random();
    };
    const fft_n = Math.round(fft_s * sp);
    const hop_n = Math.round(hop_s * sp);
    console.log(`SampleRate:${sp}Hz timelength:${t}s fft_n:${fft_n} hop_n:${hop_n}`);

    s_time = Date.now();
    let S_array;
    for (let i = 0; i < N; i += 1) {
        const ori_stft_data = tf.signal.stft(tf.tensor1d(fake_audiodata), fft_n, hop_n);

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

    };
    e_time = Date.now();
    console.log(`循环次数:${N} 总耗时:${(e_time - s_time) * 0.001} s`);
    return S_array;
};


test_matmutstft_cost = async (N = 1) => {
    let sp = 8000;
    let t = 10;
    let fft_s = 0.032;
    let hop_s = 0.008;
    let fake_audiodata = new Float32Array(sp * t);
    for (i in fake_audiodata) {
        fake_audiodata[i] = Math.random();
    };
    const fft_n = Math.round(fft_s * sp);
    const hop_n = Math.round(hop_s * sp);
    console.log(`SampleRate:${sp}Hz timelength:${t}s fft_n:${fft_n} hop_n:${hop_n}`);
    let time = await tf.time(() => {

        for (let i = 0; i < N; i += 1) {
            const ori_stft_data = tf.tensor1d(fake_audiodata)

            const S = ori_stft_data.abs();
            // const powerS = S.square();


            // const powerS_db = powerS.log().div(tf.log(10)).mul(10);
            // let result = powerS_db.transpose();
            // result = result.maximum(-50).add(50);
            // const result_del_zero_mean = result.sum().div(result.notEqual(0).sum());
            // const result_zero2mean = result.where(result.equal(0), result_del_zero_mean);
            // const res_std = result_zero2mean.sub(result_del_zero_mean).square().mean().sqrt()
            // result = result.div(res_std.maximum(1));
            const S_array = S.arraySync();
        };
    });
    console.log(`kernelMs: ${time.kernelMs}, wallTimeMs: ${time.wallMs}`);
};

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


class A {
    func1 = () => {
        console.log("func1");
    };
};

class B extends A {
    constructor() {
        super();
    };

    func2() {
        console.log("func1");
        super.func1();
    };
};

let b = new B();
b.func2();


tf_1scale_tidy = (test_array) => {
    const tf_tensor = tf.tensor(test_array, null, 'float32');
    const tf_1scaled_array = tf.tidy(() => {
        const maxminsub = tf_tensor.max().sub(tf_tensor.min());
        if (maxminsub.arraySync()) {
            return tf_tensor.sub(tf_tensor.min()).div(maxminsub);
        } else {
            return tf_tensor;
        };
    });
    return tf_1scaled_array;
};

tf_1scale = (test_array) => {
    const tf_tensor = tf.tensor(test_array, null, 'float32');
    const maxminsub = tf_tensor.max().sub(tf_tensor.min());
    if (maxminsub.arraySync()) {
        return tf_tensor.sub(tf_tensor.min()).div(maxminsub);
    } else {
        return tf_tensor;
    };
};

nj_1scale = (test_array) => {
    const nj_array = nj.array(test_array, 'float32');
    const maxminsub = nj_array.max() - nj_array.min();
    if (maxminsub > 0) {
        return nj_array.subtract(nj_array.min()).divide(maxminsub);
    } else {
        return nj_array;
    };
};

nj_1scale_ = (nj_array) => {
    const maxminsub = nj_array.max() - nj_array.min();
    if (maxminsub > 0) {
        return nj_array.subtract(nj_array.min()).divide(maxminsub);
    } else {
        return nj_array;
    };
};

my_1scale = (test_array) => {
    const res_array = test_array;
    const shape = [res_array.length, res_array[0].length]
    let max_x = res_array[0][0];
    let min_x = res_array[0][0];
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            if (res_array[i][j] > max_x) {
                max_x = res_array[i][j];
            } else if (res_array[i][j] < min_x) {
                min_x = res_array[i][j];
            };
        };
    };
    const jc = max_x - min_x;
    if (jc > 0) {
        for (let i = 0; i < shape[0]; i += 1) {
            for (let j = 0; j < shape[1]; j += 1) {
                res_array[i][j] = (res_array[i][j] - min_x) / jc;
            };
        };
    };
    return res_array;
};

my_1scale2 = (test_array) => {
    // const flattened_array = test_array.flat();
    const shape = [test_array.length, test_array[0].length]
    const flattened_array = new Float32Array(shape[0] * shape[1]);
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            flattened_array[i * shape[1] + j] = test_array[i][j];
        };
    };
    let max_x = flattened_array[0];
    let min_x = flattened_array[0];
    for (let i = 0; i < flattened_array.length; i += 1) {
        if (flattened_array[i] > max_x) {
            max_x = flattened_array[i];
        } else if (flattened_array[i] < min_x) {
            min_x = flattened_array[i];
        };
    };
    const jc = max_x - min_x;
    if (jc > 0) {
        for (let i = 0; i < flattened_array.length; i += 1) {
            flattened_array[i] = (flattened_array[i] - min_x) / jc;
        };
    };
    return flattened_array;
};

my_1scale2_1 = (test_array) => {
    // const flattened_array = test_array.flat();
    const shape = [test_array.length, test_array[0].length]
    const flattened_array = new Float32Array(shape[0] * shape[1]);
    let max_x = flattened_array[0];
    let min_x = flattened_array[0];
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            flattened_array[i * shape[1] + j] = test_array[i][j];
            if (test_array[i][j] > max_x) {
                max_x = test_array[i][j];
            } else if (test_array[i][j] < min_x) {
                min_x = test_array[i][j];
            };
        };
    };
    const jc = max_x - min_x;
    if (jc > 0) {
        for (let i = 0; i < flattened_array.length; i += 1) {
            flattened_array[i] = (flattened_array[i] - min_x) / jc;
        };
    };
    return flattened_array;
};

my_1scale3 = (test_array) => {

    const shape = [test_array.length, test_array[0].length];
    const res_array = new Float32_2DArray(shape[0], shape[1]);
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            res_array.set(i, j, test_array[i][j]);
        };
    };
    let max_x = res_array.get(0, 0);
    let min_x = res_array.get(0, 0);
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            if (res_array.get(i, j) > max_x) {
                max_x = res_array.get(i, j);
            } else if (res_array.get(i, j) < min_x) {
                min_x = res_array.get(i, j);
            };
        };
    };
    const jc = max_x - min_x;
    if (jc > 0) {
        for (let i = 0; i < shape[0]; i += 1) {
            for (let j = 0; j < shape[1]; j += 1) {
                res_array.set(i, j, (res_array.get(i, j) - min_x) / jc);
            };
        };
    };
    return res_array;
};
my_1scale4 = (test_array) => {
    const shape = [test_array.length, test_array[0].length];
    const res_array = new Float32_2DArray(shape[0], shape[1]);
    for (let i = 0; i < shape[0]; i += 1) {
        for (let j = 0; j < shape[1]; j += 1) {
            res_array.set(i, j, test_array[i][j]);
        };
    };
    const flattened_array = res_array._float32dataArray;
    let max_x = flattened_array[0];
    let min_x = flattened_array[0];
    for (let i = 0; i < flattened_array.length; i += 1) {
        if (flattened_array[i] > max_x) {
            max_x = flattened_array[i];
        } else if (flattened_array[i] < min_x) {
            min_x = flattened_array[i];
        };
    };
    const jc = max_x - min_x;
    if (jc > 0) {
        for (let i = 0; i < flattened_array.length; i += 1) {
            flattened_array[i] = (flattened_array[i] - min_x) / jc;
        };
    };
    return res_array;
};


test_fn = (fn) => {
    s_time = Date.now();
    res = fn();
    e_time = Date.now();
    console.log(`总耗时为: ${(e_time - s_time) * 0.001} s`);
    return res;
};


test_all = () => {
    const test_array = tf.randomUniform([20000, 1024], 11, 137).arraySync();
    for (let func of [tf_1scale_tidy, tf_1scale, nj_1scale, my_1scale, my_1scale2, my_1scale2_1, my_1scale3, my_1scale4]) {
        console.log(`测试函数：${func.name}`);
        test_fn(() => {
            func(test_array);
        });
    };

    const nj_test_array = nj.array(test_array, 'float32');
    console.log(`测试函数：${nj_1scale_.name}`);
    test_fn(() => {
        nj_1scale_(nj_test_array);
    });
};
test_all();



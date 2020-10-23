
const input = tf.input({ shape: [null, 129] });
let x = tf.layers.reshape({ targetShape: [-1, input.shape[2], 1] }).apply(input);
x = tf.layers.conv2d({
    kernelSize: 3,
    filters: 8,
    strides: 1,
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'varianceScaling'
}).apply(x);
x = tf.layers.reshape({ targetShape: [-1, x.shape[2] * x.shape[3]] }).apply(x);
const output = tf.layers.dense({ units: 4, activation: 'softmax' }).apply(x);

// Create the model based on the inputs.
model = tf.model({ inputs: input, outputs: output });

const test_input = tf.ones([3, 7, 129]);
const pre_res = model.predict(test_input);
pre_res.print();
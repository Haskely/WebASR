import './tensorflowjs/tfjs@2.7.0.js';
class Network{

    constructor(){

    };

    predict = (data) => {};
};

class TFJSGraphModelNetwork{
    static loadGraphModel = tf.loadGraphModel;
};

export {TFJSGraphModelNetwork};
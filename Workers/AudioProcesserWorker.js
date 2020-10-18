"use strict";
importScripts("../tensorflowjs/tfjs@2.3.0.js");
importScripts("../utils/CyclicContainer.js");

onmessage = function ({ data }) {
    switch (data.type) {
        case 'stftData':
            deal_stftData(data.content);
            break;
        default:
            postMessage(
                {
                    type: 'unknown_datatype',
                    content: data,
                }
            );
    };

};

function deal_stftData(stftData) {

};
"use strict";
importScripts("tensorflowjs/tfjs@2.3.0.js");
importScripts("utils/CyclicContainer.js");

onmessage = function ({ data }) {

    postMessage(
        {
            type: 'original_data',
            data: full_audio_data,
        }
    );

};
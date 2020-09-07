"use strict";

onmessage = function ({ data }) {
    console.log('MicrophoneDataSourceWebWorker.js onmessage');

    postMessage(data);


}
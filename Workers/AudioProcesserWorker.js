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

/**
 * 
 * @param {Object} stftDataContent 形如
 *                              {
 *                                  sampleRate: full_stftData.sampleRate,
 *                                  fft_n: full_stftData.fft_n,
 *                                  hop_n: full_stftData.hop_n,
 *                                  stft: {
 *                                      stftMartrixArrayBuffer: full_stftData.stft._arrayBuffer,
 *                                      stftMartrixHeight = full_stftData.stft.height,
 *                                      stftMartrixWidth = full_stftData.stft.width,
 *                                  },
 *                                  audioTime: full_stftData.audioTime,
 *                              }
 */
function deal_stftData(stftDataContent) {

    postMessage(
        {
            type: 'stftDataContent',
            content: stftDataContent,
        },
        undefined,
        [stftDataContent.stftMartrixArrayBuffer],
    );
};
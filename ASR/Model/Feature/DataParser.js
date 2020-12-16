
import { logstft } from "./logstft.js";
import { combine_channels } from "./tools.js";



class LogStftFeature{

    constructor(sampleRate,fft_s,hop_s){
        this.name = 'logstft';
        this.sampleRate = sampleRate;
        this.fft_s = fft_s;
        this.hop_s = hop_s;
        this.fft_n = Math.round(fft_s * this.sampleRate);
        this.hop_n = Math.round(hop_s * this.sampleRate);
    };

    logstft_audioData = (audioData) => {
        return logstft(combine_channels(audioData.channels),this.fft_n,this.hop_n);
    };
};

export {LogStftFeature};
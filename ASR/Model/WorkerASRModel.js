import { StftData } from "../../Audio/AudioContainer.js";
import { MyWorker } from "../../Workers/MyWorker.js";

class WorkerASRModel extends MyWorker{
    constructor(){
        const WebWorkScriptURL = '../ASR/Model/WorkerASRModelScript.js';
        super(WebWorkScriptURL)
        this.reciveData('SetProperties',(properties) => {
            for (let prop_name in properties){
                this[prop_name] = properties[prop_name];
            };
        });
    };

    init = async (ModelDir = 'ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/')=>{
        await this.CreatePromise;
        return await this.executeAsyncWorkerFunction('init',ModelDir);
    };

    predictAudioData = (audioData) => {
        return this.executeAsyncWorkerFunction('predictAudioData',audioData);
    };

    predictStftData = (stftData) => {
        const {dataContent,transferList} = this.getStftData2Transfer(stftData);
        return this.executeAsyncWorkerFunction('predictStftData',dataContent);
    };

    /**
     * 
     * @param {StftData} stftData_Clip 
     */
    getStftData2Transfer = (stftData_Clip) => {
        return {
            dataContent: {
                sampleRate: stftData_Clip.sampleRate,
                fft_n: stftData_Clip.fft_n,
                hop_n: stftData_Clip.hop_n,
                stft: {
                    stftMartrixArrayBuffer: stftData_Clip.stft.arrayBuffer,
                    stftMartrixHeight: stftData_Clip.stft.rowsN,
                    stftMartrixWidth: stftData_Clip.stft.columnsN,
                },
                audioEndTime: stftData_Clip.audioEndTime,
            },
            transferList: [stftData_Clip.stft.arrayBuffer]
        };
    };
};

export {WorkerASRModel};




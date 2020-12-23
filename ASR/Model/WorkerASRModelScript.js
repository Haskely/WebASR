// 将ASRModel封装成异步的形式，对外暴露API一致，这个封装需要结合".WorkerASRModel.js"一起实现。
(async () => {
    const { MyWorkerScript } = await import("../../Workers/MyWorker.js");
    const { ASRModel } = await import("./ASRModel.js");
    const { StftData } = await import("../../Audio/AudioContainer.js");
    const { Float32Matrix } = await import("../../utils/CyclicContainer.js");

    class WorkerASRModelScript extends MyWorkerScript {
        constructor(worker_self) {
            super(worker_self);
            this.asrModel = new ASRModel();

            this.registerFunctionID('init', async (...args) => {
                const theReturn = await this.asrModel.init(...args);
                const asrModel = this.asrModel;
                const feature = asrModel.feature;
                this.sendData('SetProperties', {
                    featureConfig: asrModel.featureConfig,
                    feature: {
                        name: feature.name,
                        sampleRate: feature.sampleRate,
                        fft_n: feature.fft_n,
                        fft_s: feature.fft_s,
                        hop_n: feature.hop_n,
                        hop_s: feature.hop_s,
                    },
                    viewK: asrModel.viewK,
                    eachOutPutTime: asrModel.eachOutPutTime,
                });
                return theReturn;
            });
            this.registerFunctionID('predictAudioData', this.asrModel.predictAudioData);
            this.registerFunctionID('predictStftData', (stftDataContent) => {
                const stftData = new StftData(
                    stftDataContent.sampleRate,
                    stftDataContent.fft_n,
                    stftDataContent.hop_n,
                    new Float32Matrix(
                        stftDataContent.stft.stftMartrixHeight,
                        stftDataContent.stft.stftMartrixWidth,
                        stftDataContent.stft.stftMartrixArrayBuffer
                    ),
                    stftDataContent.audioEndTime
                );
                return this.asrModel.predictStftData(stftData);
            });
        };
    };

    self.worker_asrModelScript = new WorkerASRModelScript(self);
})();



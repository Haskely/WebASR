"use strict";

async function main(){
    const { ASRWorkerScript } = await import('./ASRWorker.js');

    self.asrWorkerScript = new ASRWorkerScript(self,'../Model/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/');

};

main();

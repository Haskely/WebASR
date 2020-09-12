"use strict";

class MicrophoneDataSource {
    constructor(
        WebWorkScriptURL,
        onWebWorkMessageData = (data) => {},
        audio_constraints = true,
        sampleRate = undefined,
        latencyHint = undefined,
        ScriptProcessor_bufferSize = 256,
        ScriptProcessor_numberOfInputChannels = 1,
    ) {
        /**
         * MicrophoneDataSource
         * @param {float or undefined} sampleRate   用于AudioContext的sampleRate(采样量)，以每秒采样数来指定。
         *                              该值必须是一个浮点值，指示用于配置新上下文的采样率(以每秒采样为单位);
         *                              此外，该值必须为AudioBuffer.sampleRate所支持的值。
         *                              如果未指定，则默认使用上下文输出设备的首选样本率。
         * @param {float or string or undefined} latencyHint    AudioContext的首选最大延迟。可以通过两种方式指定此值。 
         *                              指定首选延迟的最佳方法是使用字符串枚举AudioContextLatencyCategory中的值；
         *                              实际上，latencyHint的默认值为“交互式”（意味着浏览器应尝试使用可能的最低且可靠的延迟）。 
         *                              该值也可以指定为双精度浮点值，以秒为单位指定首选的最大延迟；这样可以更精确地控制音频延迟和设备能耗之间的平衡。 
         *                              要在创建上下文后确定其实际延迟，请检查上下文的baseLatency属性的值。
         * @param {int} ScriptProcessor_bufferSize 以采样帧为单位的缓冲区大小。
         *                              如果指定，bufferSize必须是以下值之一:256、512、1024、2048、4096、8192、16384。
         *                              如果没有传入，或者该值为0，则实现将为给定环境选择最佳缓冲区大小，在节点的整个生命周期中，该缓冲区大小为2的常量幂。 
         *                              这个值控制了audioprocess事件被分派的频率，以及每次调用需要处理多少个样本帧。
         *                              较低的缓冲大小值将导致较低(更好)的延迟。较高的值将是必要的，以避免音频分裂和故障。
         *                              建议作者不指定这个缓冲区大小，而允许实现选择一个好的缓冲区大小来平衡延迟和音频质量。
         * @param {int} ScriptProcessor_numberOfInputChannels 整数，指定此节点输入的通道数，默认为2。支持的值最多为32。
         * @return {void}
         */
        this.options = {
            WebWorkScriptURL,
            audio_constraints,
            sampleRate,
            latencyHint,
            ScriptProcessor_bufferSize,
            ScriptProcessor_numberOfInputChannels
        };

        this.stream = null;
        this.audioCtx = null;
        this.sourceNone = null;
        this.scriptNode = null;

        this.myWorker = null;
        if (window.Worker) {
            this.myWorker = new Worker(WebWorkScriptURL);

            this.myWorker.onmessage = onWebWorkMessageData;
        } else {
            console.log('Your browser doesn\'t support web workers.')
        };

    };

    open = async () => {
        if (!this.stream) {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log('getUserMedia supported.');
                this.stream = await navigator.mediaDevices.getUserMedia(
                    // constraints - only audio needed for this app
                    {
                        audio: true
                    });
            } else {
                console.log('getUserMedia not supported on your browser!');
            };
            this.audioCtx = new AudioContext({
                sampleRate: this.options.sampleRate,
                latencyHint: this.options.latencyHint,
            });
            this.sourceNone = this.audioCtx.createMediaStreamSource(this.stream);
            this.scriptNode = this.audioCtx.createScriptProcessor(this.options.ScriptProcessor_bufferSize, this.options.ScriptProcessor_numberOfInputChannels, 1); // bufferSize = 4096, numberOfInputChannels = 1, numberOfOutputChannels = 1
            this.scriptNode.onaudioprocess = (audioProcessingEvent) => {
                const inputBuffer = audioProcessingEvent.inputBuffer;
                // inputBuffer使用指南: https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
                let channels = [];
                for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
                    channels[i] = inputBuffer.getChannelData(i);
                }
                const data = {
                    duration: inputBuffer.duration,
                    length: inputBuffer.length,
                    numberOfChannels: inputBuffer.numberOfChannels,
                    sampleRate: inputBuffer.sampleRate,
                    channels: channels,
                    timeStamp: Date.now(),
                };

                this.myWorker.postMessage(data);
            };
        };
        await this.audioCtx.suspend();
        this.sourceNone.connect(this.scriptNode);
        this.scriptNode.connect(this.audioCtx.destination);
        console.log("MicrophoneDataSource opened");
    };

    start = async () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
            console.log("MicrophoneDataSource.audioCtx.resume()");
        } else {
            console.log("MicrophoneDataSource 还未Open");
        }
    };

    stop = async () => {
        if (this.audioCtx && this.audioCtx.state === 'running') {
            await this.audioCtx.suspend();
            console.log("MicrophoneDataSource.audioCtx.suspend()");
        } else {
            console.log("MicrophoneDataSource 本来就没运行");
        };
    };

    close = () => {

        this.audioCtx && this.audioCtx.close();
        this.sourceNone && this.sourceNone.disconnect();
        this.scriptNode && this.scriptNode.disconnect();
        this.stream && this.stream.getTracks().forEach(track => {
            track.stop();
        });

        this.audioCtx = null;
        this.sourceNone = null;
        this.scriptNode = null;
        this.stream = null;

        console.log("MicrophoneDataSource closed");
    };

}
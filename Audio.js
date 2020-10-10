
class Audio {
    async constructor(
        audiosource = null,
        sampleRate = undefined,
        latencyHint = undefined,
        ScriptNode_bufferSize = 256,
        ScriptNode_numberOfInputChannels = 1,
        onScriptNodeprocess = (audioProcessingEvent) => { },
    ) {
        /**
         * Audio
         * @param {string or null} audiosource 音频源，可为以下五种类型里的一种：
         *                              1.AudioNode 比如 a.OscillatorNode接口代表一种随时间变化的波形，
         *                                                              比如正弦波形或三角波形。
         *                                                              类型是AudioNode，功能是音频处理模块，
         *                                                              可以产生指定频率的波形。
         *                                               b.AudioBufferSourceNode表示由内存音频数据组成的音频源，
         *                                                              音频数据存储在AudioBuffer中。
         *                                                              这是一个作为音频源的AudioNode。
         *                                               c.MediaElementAudioSourceNode接口表示由HTML5 <audio>或<video>元素生成的音频源。
         *                                                              这是一个作为音频源的AudioNode。
         *                                               d.MediaStreamAudioSourceNode接口表示由 WebRTC MediaStream（如网络摄像头或麦克风）生成的音频源。
         *                                                              这是一个作为音频源的AudioNode。
         *                                               e.其他各种各样的SourceNode。
         *                              2.AudioBuffer AudioBuffer代表内存中的一段音频数据，
         *                                                              可以通过AudioContext.decodeAudioData()方法从音频文件创建，
         *                                                              也可以通过AudioContext.createBuffer()方法从原始数据创建。
         *                                                              当音频数据被解码成这种格式之后，
         *                                                              就可以被放入一个AudioBufferSourceNode中使用。
         *                              4.MediaElement 
         *                              5.MediaStream
         *                              6.null 暂不指定音频源。但是在调用start()前必须进行指定。
         * @param {float or undefined} sampleRate 用于AudioContext的sampleRate(采样量)，以每秒采样数来指定。
         *                              该值必须是一个浮点值，指示用于配置新上下文的采样率(以每秒采样为单位);
         *                              此外，该值必须为AudioBuffer.sampleRate所支持的值。
         *                              如果未指定，则默认使用上下文输出设备的首选样本率。
         * @param {float or string or undefined} latencyHint AudioContext的首选最大延迟。可以通过两种方式指定此值。 
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
         * @param {int} ScriptProcessor_numberOfInputChannels 整数，指定此节点输入的通道数，默认为1。支持的值最多为32。
         * @return {void}
         */
        this.options = {
            audiosource,
            AudioContextOptions: {
                sampleRate,
                latencyHint,
            },
            ScriptNodeOptions: {
                ScriptNode_bufferSize,
                ScriptNode_numberOfInputChannels,
                onScriptNodeprocess,
            },
        };
    };

    setAudioSource = (audiosource) => {
        if (audiosource instanceof Array) {
            for (a_s of audiosource) {
                this.setAudioSource(a_s);
            };
        } else if (audiosource instanceof AudioNode) {
            this.sourceNodes.push(audiosource);
        } else if (audiosource instanceof AudioBuffer) {
            sourceNode = this.audioCtx.createBufferSource();
            sourceNode.buffer = audiosource;
            sourceNode.start();
            this.sourceNodes.push(sourceNode);
        } else if (audiosource instanceof HTMLMediaElement) {
            this.sourceNodes.push(this.audioCtx.createMediaElementSource(audiosource));
        } else if (audiosource instanceof MediaStream) {
            this.sourceNodes.push(this.audioCtx.createMediaStreamSource(audiosource));
        } else if (audiosource !== null) {
            console.error(`收到了奇怪的audiosource ${audiosource}`);
            sourceNode = null;
        } else {
            sourceNode = null;
        };
    };

    open = async () => {
        this.audioCtx = new AudioContext({
            sampleRate: this.options.AudioContextOptions.sampleRate,
            latencyHint: this.options.AudioContextOptions.latencyHint,
        });
        await this.audioCtx.suspend();
        this.sourceNodes = [];
        this.setAudioSource(this.options.audiosource);
        this.scriptNode = this.audioCtx.createScriptProcessor(this.options.ScriptNodeOptions.ScriptNode_bufferSize, this.options.ScriptNodeOptions.ScriptNode_numberOfInputChannels, 1); // bufferSize = 4096, numberOfInputChannels = 1, numberOfOutputChannels = 1
        this.scriptNode.onaudioprocess = this.options.ScriptNodeOptions.onScriptNodeprocess;
        if (!this.sourceNode) {
            console.error("sourceNode为null,没有初始化！")
        };
        this.sourceNode.connect(this.scriptNode);
        this.scriptNode.connect(this.audioCtx.destination);
        console.log("MicrophoneDataSource opened");
    };

    start = async () => {
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
            console.log("MicrophoneDataSource.audioCtx.resume()");
        } else {
            console.log("MicrophoneDataSource 还未Open");
        }
    };

    stop = async () => {
        if (this.audioCtx.state === 'running') {
            await this.audioCtx.suspend();
            console.log("MicrophoneDataSource.audioCtx.suspend()");
        } else {
            console.log("MicrophoneDataSource 本来就没运行");
        };
    };

    close = () => {

        this.audioCtx.close();

        for (sourceNode of this.sourceNodes) {
            sourceNode.disconnect();
            if (sourceNode instanceof MediaStreamAudioSourceNode) {
                sourceNone.mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
                sourceNone.mediaStream = null;
            };
        };
        this.scriptNode.disconnect();
        this.audioCtx = null;
        this.sourceNodes = null;
        this.scriptNode = null;

        console.log("MicrophoneDataSource closed");
    };


};
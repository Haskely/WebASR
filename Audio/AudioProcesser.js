
class AudioProcesser {
    constructor(
        audioSource = null,
        sampleRate = undefined,
        latencyHint = undefined,
        ScriptNode_bufferSize = 256,
        ScriptNode_numberOfInputChannels = 1,
        onScriptNodeprocess = (audioProcessingEvent) => { },
    ) {
        /**
         * Audio
         * @param {AudioNode or AudioBuffer or Blob or MediaElement or MediaStream or null} audioSource 音频源对象，具体可为以下五种类型里的一种：
         *                              1.AudioNode 比如 a.OscillatorNode接口代表一种随时间变化的波形，
         *                                                              比如正弦波形或三角波形。
         *                                                              类型是AudioNode，功能是音频处理模块，
         *                                                              可以产生指定频率的波形。
         *                                               b.AudioBufferSourceNode表示由内存音频数据组成的音频源，
         *                                                              音频数据存储在AudioBuffer中。
         *                                                              这是一个作为音频源的AudioNode。
         *                                                              注意，需要手动调用AudioBufferSourceNode.start()开始音频处理。
         *                                               c.MediaElementAudioSourceNode接口表示由HTML5 <audio>或<video>元素生成的音频源。
         *                                                              这是一个作为音频源的AudioNode。
         *                                                              注意，需要手动点击MediaElement播放键或者调用播放函数开始音频处理流程。
         *                                               d.MediaStreamAudioSourceNode接口表示由 WebRTC MediaStream（如网络摄像头或麦克风）生成的音频源。
         *                                                              这是一个作为音频源的AudioNode。
         *                                               e.其他各种各样的SourceNode。
         *                              2.AudioBuffer AudioBuffer代表内存中的一段音频数据，
         *                                                              可以通过AudioContext.decodeAudioData()方法从音频文件创建，
         *                                                              也可以通过AudioContext.createBuffer()方法从原始数据创建。
         *                                                              当音频数据被解码成这种格式之后，
         *                                                              就可以被放入一个AudioBufferSourceNode中使用。
         *                              3.Blob Blob 对象表示一个不可变、原始数据的类文件对象(从inputElement选取的音频文件对象就是一种特殊的Blob对象)。
         *                                                              它的数据可以按文本或二进制的格式进行读取，也可以转换成 ReadableStream 来用于数据操作。 
         *                                                              Blob 表示的不一定是JavaScript原生格式的数据。File 接口基于Blob，继承了 blob 的功能并将其扩展使其支持用户系统上的文件。
         *                                                              要从其他非blob对象和数据构造一个 Blob，请使用 Blob() 构造函数。要创建一个 blob 数据的子集 blob，请使用 slice() 方法。要获取用户文件系统上的文件对应的 Blob 对象，请参阅 File 文档。
         *                                                              接受 Blob 对象的API也被列在 File 文档中。
         *                              4.MediaElement 例如<audio> <video>的Element对象。
         *                                                              注意，需要手动点击MediaElement播放键或者调用播放函数开始音频处理流程。
         *                              5.MediaStream MediaStream为navigator.mediaDevices.getUserMedia()的返回对象，用于调用麦克风。
         *                                                              具体参见navigator.mediaDevices文档；具体实现样例可参见下面的MicrophoneAudioProcesser子类。
         *                              6.null 暂不指定音频源。但是在调用AudioProcesser.start()前需要调用this.addAudioSource进行指定。
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
            AudioSources: [],
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
        this.addAudioSource(audioSource);
    };

    addAudioSource = async (audioSource) => {
        if (audioSource) {
            this.options.AudioSources.push(audioSource);
            if (this.audioCtx) {
                await this._setAudioSource(audioSource);
            };
        };
    };

    _setAudioSource = async (audioSource) => {
        let sourceNode;
        if (audioSource instanceof AudioNode) {
            sourceNode = audioSource;
        } else if (audioSource instanceof AudioBuffer) {
            sourceNode = this.audioCtx.createBufferSource();
            sourceNode.buffer = audioSource;
            sourceNode.start();
        } else if (audioSource instanceof Blob) {
            this._setAudioSource(await this.audioCtx.decodeAudioData(await audioSource.arrayBuffer()));
        } else if (audioSource instanceof HTMLMediaElement) {
            sourceNode = this.audioCtx.createMediaElementSource(audioSource);
        } else if (audioSource instanceof MediaStream) {
            sourceNode = this.audioCtx.createMediaStreamSource(audioSource);
        } else {
            console.error(`收到了奇怪的audioSource: ${audioSource}`);
            sourceNode = null;
        };

        if (sourceNode) {
            this.sourceNodes.push(sourceNode);
            sourceNode.connect(this.scriptNode);
        };
    };

    async open() {
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext({
                sampleRate: this.options.AudioContextOptions.sampleRate,
                latencyHint: this.options.AudioContextOptions.latencyHint,
            });
            await this.audioCtx.suspend();
            this.scriptNode = this.audioCtx.createScriptProcessor(this.options.ScriptNodeOptions.ScriptNode_bufferSize, this.options.ScriptNodeOptions.ScriptNode_numberOfInputChannels, 1); // bufferSize = 4096, numberOfInputChannels = 1, numberOfOutputChannels = 1
            this.scriptNode.onaudioprocess = this.options.ScriptNodeOptions.onScriptNodeprocess;
            this.sourceNodes = [];
            for (audioSource of this.options.AudioSources) {
                this._setAudioSource(audioSource);
            };
            this.scriptNode.connect(this.audioCtx.destination);
            console.log("Audio opened");
        } else {
            console.log("Audio already opened");
        };
    };

    start = async () => {
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
            console.log("Audio.audioCtx.resume()");
        } else {
            console.log("Audio 还未Open");
        };
    };

    stop = async () => {
        if (this.audioCtx.state === 'running') {
            await this.audioCtx.suspend();
            console.log("Audio.audioCtx.suspend()");
        } else {
            console.log("Audio 本来就没运行");
        };
    };

    close() {

        this.audioCtx.close();

        for (let sourceNode of this.sourceNodes) {
            sourceNode.disconnect();
        };
        this.scriptNode.disconnect();
        this.audioCtx = null;
        this.sourceNodes = null;
        this.scriptNode = null;

        console.log("Audio closed");
    };
};


class MicrophoneAudioProcesser extends AudioProcesser {
    constructor(
        audio_constraints = true,
        sampleRate = undefined,
        latencyHint = undefined,
        ScriptNode_bufferSize = 256,
        ScriptNode_numberOfInputChannels = 1,
        onScriptNodeprocess = (audioProcessingEvent) => { },
    ) {
        super(null, sampleRate, latencyHint, ScriptNode_bufferSize, ScriptNode_numberOfInputChannels, onScriptNodeprocess);
        this.options.audio_constraints = audio_constraints;
        this.stream = null;
    };

    open = async () => {
        await super.open();
        if (!this.stream) {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log('navigator.mediaDevices.getUserMedia supported.');
                this.stream = await navigator.mediaDevices.getUserMedia(
                    // constraints - only audio needed for this app
                    {
                        audio: this.options.audio_constraints,
                    });
            } else {
                console.log('navigator.mediaDevices.getUserMedia not supported on your browser!');
            };
            this.addAudioSource(this.stream);
        };
    };

    close = () => {
        this.stream && this.stream.getTracks().forEach(track => {
            track.stop();
        });
        this.stream = null;
        super.close();
    };
};
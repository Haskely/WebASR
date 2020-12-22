# WebASR
网页版且离线的语音识别项目

* v0.1.0版完成！工程方面的基础功能全部实现，接下来就是研究模型了~
* 查看DEMO：https://haskely.github.io/WebASR 
* （国内访问 https://haskely.gitee.io/webasr ）
  ![WebASR网页截图](https://gitee.com/Haskely/WebASR/raw/master/screenshot/WebASR.png)
[TOC]

## Introduction - 介绍
* 基于TensorFlowJS和WebAudioAPI的网页版的中文语音识别玩具项目。
* 纯手打Javascript + html，没有css，没有nodejs，没有前端框架，感受原始气息。
* 零服务器需要：波形绘图，短时傅里叶频谱计算，模型识别工作等完全在本地进行！
* 支持实时录音或上传音频。
* 代码的可扩展性应该不错。

## Usage - 用法
* 用 **最新版Chrome内核** 的浏览器（否则无法正常使用）打开 https://haskely.github.io/WebASR （或者国内访问 https://haskely.gitee.io/webasr ）
* 网页上的按钮都点一点，就会了。

## Installation - 自己部署
* 直接把项目所有文件放到任意可访问的路径上即可，一个静态网页而已。
* (保持项目中文件相对路径不变）
* (因为浏览器的安全措施，需要基于http服务打开index.html,不能直接本地打开。参考run_server.bat 中的命令）

## Develop - 开发

### 一、简单开发

#### 主要参数配置

- 打开本项目根目录下**main.js**文件，找到`//基础配置`注释处，参考相关注释配置参数。

```javascript
//基础配置
const numberOfChannels = 1, bufferSize = 256, total_duration = 10;
const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
const ModelDir = './ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/';
const minPinYinN = 10;
const useWebWorker = true;
...
//配置完毕
```
>  * numberOfChannels 音频声道数。整数，默认为1。支持的值最多为32。
>
>  * bufferSize 以采样帧为单位的缓冲区大小。必须是以下值之一:0、256、512、1024、2048、4096、8192、16384。为0时系统自动选择。这时你的刷新帧率就是sampleRate/bufferSize。
>
>  * total_duration 网页中各种音频绘制的时间总长度。
>
>  ---
>
>  * sampleRate 音频采样率 可取 8000、16000、32000、48000 之一
>
>  * fft_s 一个短时傅里叶变换的窗长，单位为秒
>
>  * hop_s 短时傅里叶变换窗之间间隔长，单位为秒
>
>    注意：以上三个参数应该与下面ModelDir文件夹下feature.json中的参数一致，否则模型将加载失败。
>
>  ---
>
>  * ModelDir TensorflowJS 模型文件夹，该文件夹下应该存在一个model.json,一个feature.json,若干个.bin文件。
>* minPinYinN 正整数，流式模型推断音频最小的长度；如果为4，则一次推断输出4个拼音片段，并保留中间两个；下一次推断与这次推断的覆盖长度为4/2 = 2 。
>  * useWebWorker 是否使用异步进行模型推断：若为false，则模型推断与音频刷新同步进行，大概率导致音频卡顿，但是保证实时率；若为true，则推断异步进行，不会阻塞音频流逝，但推断输出一般会有积压延迟（一开始会很严重，初始积压接近8秒，但后面就很快跟上了，最终稳定到时延0.5-2秒）。

见`//配置完毕`下面两行 **AudioFlow** 实例化地方可进行更详细的配置：

> 比如不希望扬声器进行输出，将`new AudioFlow(..., 'sound');`改为`new AudioFlow(..., null);`即可。

> 配置方法的详细说明见各个类的注释 。

#### 模型部署

- 使用 **DeepASR** 项目（暂未开源）中的Model实例的convert2tfjs方法会自动生成**TensorflowJS Graph Model**格式的模型。这是一个文件夹，其目录结构一般为：

  ```
  TFJSModelDir
  │  feature.json
  │  group1-shard1of4.bin
  │  group1-shard2of4.bin
  │  group1-shard3of4.bin
  │  group1-shard4of4.bin
  │  model.json
  ```

- 将该文件夹中文件复制到本项目任意子文件夹下，并将该子文件夹相对路径复制到**main.js**中`//基础配置`注释处的**ModelDir**变量中即可。

  > 例如我把**TensorflowJS Graph Model**格式的模型文件夹"TFJSModel"复制到了/WebASR/Models/TFJSModel,其中WebASR是本项目根目录。
  >
  > 则将`const ModelDir = 'xxx'` 修改为
  >
  > ```javascript
  > //基础配置
  > ...
  > const ModelDir = './Models/TFJSModel/';
  > ...
  > ```
  >
  > 即可。
  > 
  > 其实直接研究TensorflowJS model的输入输出格式以及本项目源代码，以及TensorflowJS官网的文档，可以自己生成需要的tfjs 模型进行替换。

### 二、深入API

通过阅读 **main.js** 可知，里面除了处理html页面元素的代码外，其他的就是调用了 “**AudioFlow**” 类实例的api。

而“**AudioFlow**” 类的父类是“**AudioProcesser**”类。按顺序介绍：

#### AudioProcesser

这个类的作用是，从一个或多个音频输入源获取原始的音频波形数据数组进行任意代码处理。它就是对[WebAudioAPI](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API)的一层封装，更准确的是，对其[`ScriptProcessorNode`](https://developer.mozilla.org/zh-CN/docs/Web/API/ScriptProcessorNode)的一层封装。

- 通过构造函数**constructor**构造AudioProcesser的实例时就指定好处理音频数据的代码。
- 通过AudioProcesser实例的**open**、**start**、**stop**、**close**方法控制数据处理流程的初始化、开始、暂停、停止并释放内存。
- 通过**addAudioSource**、**delAudioSource**实现动态加载音频源和删除音频源。

以上这些方法的用法和作用在代码中均有详细注释。

样例：

```javascript
import { AudioFlowProcesser } from "../../Audio/AudioFlowProcesser.js";


const audioFlowProcesser = new AudioFlowProcesser(
    null, // audioSource = null, 暂不指定音频源。
    'sound', //audioDestination = 'sound', 音频会输出到扬声器
    8000, //sampleRate = 8000, 指定采样率为8000
    undefined, //latencyHint = undefined, 不指定latencyHint，让系统自动选择
    256, //ScriptNode_bufferSize = 256, 缓冲区大小为256（采样帧），结合上面指定采样率为8000，得到音频刷新帧率为8000/256 = 31.25 FPS。
    1, //ScriptNode_numberOfInputChannels = 1, 声道数为1。
    processAudioData = (audioData) => { 
        const audioClipInfo = {
            "音频采样率":audioData.sampleRate ,
            "音频数据":audioData.channels ,
            "音频末尾时间戳":audioData.audioEndTime ,
    
            "音频声道数":audioData.numberOfChannels ,
            "音频帧数":audioData.sampleLength ,
            "音频时长":audioData.timeLength ,
            "音频开头时间戳":audioData.audioStartTime 
        };
        console.log(`收到音频小片段:${audioClipInfo}`);
    },
);

async function addMicrophone(){
    const recordStream = await navigator.mediaDevices.getUserMedia( {audio: true}); //开启麦克风
    audioFlowProcesser.addAudioSource(recordStream); //audioFlowProcesser加入麦克风音频源
};

audioFlowProcesser.open();
audioFlowProcesser.start();

addMicrophone();
```

> 构造函数注释：
>
> ```javascript
> class AudioFlowProcesser {
>     constructor(
>         audioSource = null,
>         audioDestination = 'sound',
>         sampleRate = undefined,
>         latencyHint = undefined,
>         ScriptNode_bufferSize = 256,
>         ScriptNode_numberOfInputChannels = 1,
>         processAudioData = (audioData) => { },
>     ){...};
>     ...
> };
> ```
>
> **AudioFlowProcesser** 
>
> **@constructor**
>
> - @param {AudioNode|AudioBuffer|Blob|MediaElement|MediaStream|null} audioSource - 音频源对象，具体可为以下五种类型里的一种：
>   1. AudioNode 比如 
>
>   	- a.OscillatorNode接口代表一种随时间变化的波形，比如正弦波形或三角波形。类型是AudioNode，功能是音频处理模块， 可以产生指定频率的波形。
>   	- b.AudioBufferSourceNode表示由内存音频数据组成的音频源，音频数据存储在AudioBuffer中。这是一个作为音频源的AudioNode。注意，需要手动调用AudioBufferSourceNode.start()开始音频处理。
>   	- c.MediaElementAudioSourceNode接口表示由HTML5 <audio>或<video>元素生成的音频源。这是一个作为音频源的AudioNode。注意，需要手动点击MediaElement播放键或者调用播放函数开始音频处理流程。
>   	- d.MediaStreamAudioSourceNode接口表示由 WebRTC MediaStream（如网络摄像头或麦克风）生成的音频源。这是一个作为音频源的AudioNode。
>   	- e.其他各种各样的SourceNode。
>
>   2. AudioBuffer AudioBuffer代表内存中的一段音频数据，可以通过AudioContext.decodeAudioData()方法从音频文件创建，也可以通过AudioContext.createBuffer()方法从原始数据创建。当音频数据被解码成这种格式之后，就可以被放入一个AudioBufferSourceNode 中使用。
>
>   3. Blob Blob 对象表示一个不可变、原始数据的类文件对象(从inputElement选取的音频文件对象就是一种特殊的Blob对象)。它的数据可以按文本或二进制的格式进行读取，也可以转换成 ReadableStream 来用于数据操作。 Blob 表示的不一定是JavaScript原生格式的数据。File 接口基于Blob，继承了 blob 的功能并将其扩展使其支持用户系统上的文件。要从其他非blob对象和数据构造一个 Blob，请使用 Blob() 构造函数。要创建一个 blob 数据的子集 blob，请使用 slice() 方法。要获取用户文件系统上的文件对应的 Blob 对象，请参阅 File 文档。接受 Blob 对象的API也被列在 File 文档中。
>
>   4. MediaElement 例如<audio> <video>的Element对象。注意，需要手动点击MediaElement播放键或者调用播放函数开始音频处理流程。
>
>   5. MediaStream MediaStream为navigator.mediaDevices.getUserMedia()的返回对象，用于调用麦克风。具体参见navigator.mediaDevices文档；具体实现样例可参见下面的MicrophoneAudioProcesser子类。
>
>   6. null 暂不指定音频源。可以在实例化后调用addAudioSource动态指定。
>
> - @param {'sound'|'stream'|'asAudioNode'|AudioNode|null} [audioDestination='sound'] - - 音频目的地，把音频输出到哪里。
>   1. 'sound' 输出到扬声器。
>
>   2. 'stream' 输出到一个stream，调取 this.audioDestination 获取该stream做进一步处理。
>
>   3. 'asAudioNode' 生成一个 AudioNode,可以继续连接其他AudioNode。调用 this.audioDestination 获取该 AudioNode。
>
>   4. AudioNode 传入一个AudioNode，并连接到它上面。
>
>   5. null 不做任何输出。
>
> - @param {float|undefined} sampleRate - - 用于AudioContext的sampleRate(采样量)，以每秒采样数来指定。该值必须是一个浮点值，指示用于配置新上下文的采样率(以每秒采样为单位);此外，该值必须为AudioBuffer.sampleRate所支持的值。如果未指定，则默认使用上下文输出设备的首选样本率。
>
> - @param {float|string|undefined} latencyHint - - AudioContext的首选最大延迟。可以通过两种方式指定此值。 指定首选延迟的最佳方法是使用字符串枚举AudioContextLatencyCategory中的值；实际上，latencyHint的默认值为“交互式”（意味着浏览器应尝试使用可能的最低且可靠的延迟）。 该值也可以指定为双精度浮点值，以秒为单位指定首选的最大延迟；这样可以更精确地控制音频延迟和设备能耗之间的平衡。 要在创建上下文后确定其实际延迟，请检查上下文的baseLatency属性的值。
>
> - @param {int|undefined} [ScriptProcessor_bufferSize = 256] - - 以采样帧为单位的缓冲区大小。如果指定，bufferSize必须是以下值之一:256、512、1024、2048、4096、8192、16384。如果没有传入，或者该值为0，则实现将为给定环境选择最佳缓冲区大小，在节点的整个生命周期中，该缓冲区大小为2的常量幂。 这个值控制了audioprocess事件被分派的频率，以及每次调用需要处理多少个样本帧。较低的缓冲大小值将导致较低(更好)的延迟。较高的值将是必要的，以避免音频分裂和故障。建议作者不指定这个缓冲区大小，而允许实现选择一个好的缓冲区大小来平衡延迟和音频质量。
>
> - @param {int} [ScriptProcessor_numberOfInputChannels = 1] 整数，指定此节点输入的通道数，默认为1。支持的值最多为32。
>
> - @param {Function} processAudioData - - 处理audioData对象的函数。形如 (audioData) => { } 。其中audioData是一个 AudioData 实例。AudioData定义在本文件同目录中的AudioContainer.js中。
>
> - @return {void}

#### AudioFlow

**AudioFlow**是对AudioProcesser类的进一步封装，是在AudioProcesser类的基础上又添加了很多实用功能。比如绘制流式音频波形图、流式计算短时傅里叶变换频谱并画图、调用语音识别模型进行推断等。

其内部逻辑是事件驱动的。每当AudioProcesser中processAudioData函数获取到了一段audioData小片段便触发相应事件，开始执行后续处理流程，比如执行波形绘制并拼接，更新整个波形图；如果开启了频谱计算，则每计算出一段频谱则触发对应的事件，可自定义后续处理流程。

- openAudio 开始收取音频
- keepAudio 保留收取到的最近一段时间的音频
- openWaveDraw 开始绘制音频波形图
- openStft 开始计算短时傅里叶音频频谱
- keepStft 保留一段时间的音频频谱
- openStftDraw 开始绘制音频频谱图
- openASR 开始语音识别
- keepASR 保留一段时长的语音识别推断结果
- openASRDraw 绘制语音识别结果
- openVoiceWakeUp （开发中）开启语音唤醒功能

以上API用法参考代码注释。

样例：样例就是 main.js , 这个项目就是直接基于AudioFlow的框架做的。

> 构造函数注释：
>
> ```javascript
> class AudioFlow extends AudioFlowProcesser {
>     constructor(
>         audioSource = null,
>         sampleRate = 8000,
>         numberOfChannels = 1,
>         ScriptNode_bufferSize = 256,
>         audioDestination = 'sound',
>     ) {...};
>     ...
> };
> ```
>
>  * @param {AudioNode|AudioBuffer|Blob|MediaElement|MediaStream|null} audioSource 音频源对象，具体可为五种类型里的一种,详见 AudioFlowProcesser 的注释。默认为null, 暂不指定音频源。可以在实例化后调用this.addAudioSource动态指定,详见 AudioFlowProcesser 的注释。
>
>  * @param {float|undefined} sampleRate - - 用于AudioContext的sampleRate(采样量)，以每秒采样数来指定。
>
>    - 该值必须是一个浮点值，指示用于配置新上下文的采样率(以每秒采样为单位);
>
>    - 此外，该值必须为AudioBuffer.sampleRate所支持的值。
>
>    - 如果未指定，则默认使用上下文输出设备的首选样本率。
>
>  * @param {int} numberOfChannels - - 整数，指定此节点输入的通道数，默认为1。支持的值最多为32。
>
>  * @param {int|undefined} ScriptNode_bufferSize - - 以采样帧为单位的缓冲区大小。默认256。
>
>    - 如果指定，bufferSize必须是以下值之一:256、512、1024、2048、4096、8192、16384。
>
>    - 如果没有传入，或者该值为0，则实现将为给定环境选择最佳缓冲区大小，在节点的整个生命周期中，该缓冲区大小为2的常量幂。 
>
>    - 这个值控制了audioprocess事件被分派的频率，以及每次调用需要处理多少个样本帧。
>
>    - 较低的缓冲大小值将导致较低(更好)的延迟。较高的值将是必要的，以避免音频分裂和故障。
>
>    - 建议作者不指定这个缓冲区大小，而允许实现选择一个好的缓冲区大小来平衡延迟和音频质量。
>
>  * @param {'sound'|'stream'|'asAudioNode'|AudioNode|null} audioDestination - - 音频目的地，把音频输出到哪里。
>
>    1. 'sound' 输出到扬声器。
>
>    2. 'stream' 输出到一个stream，调取 this.audioDestination 获取该stream做进一步处理。
>
>    3. 'asAudioNode' 生成一个 AudioNode,可以继续连接其他AudioNode。调用 this.audioDestination 获取该 AudioNode。
>
>    4. AudioNode 传入一个AudioNode，并连接到它上面。
>
>    5. null 不做任何输出。
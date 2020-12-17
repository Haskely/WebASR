# WebASR
网页版的语音识别项目

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

### 主要参数配置

- 打开本项目根目录下**main.js**文件，找到`//基础配置`注释处，参考相关注释配置参数。

```
//基础配置
const numberOfChannels = 1, bufferSize = 256, total_duration = 10;
const sampleRate = 8000, fft_s = 0.032, hop_s = 0.008;
const ModelDir = '/ASR/Model/Network/tensorflowjs/tfjsModel/tfjs_mobilev3small_thchs30/';
const minPinYinN = 10;
const useWebWorker = true;
...
//配置完毕
```
>  * numberOfChannels 音频声道数。整数，默认为1。支持的值最多为32。
>  * bufferSize 以采样帧为单位的缓冲区大小。必须是以下值之一:0、256、512、1024、2048、4096、8192、16384。为0时系统自动选择。这时你的刷新帧率就是sampleRate/bufferSize。
>  * total_duration 以下各种音频绘制的时间总长度。
>
>    
>  * sampleRate 音频采样率 可取 8000、16000、32000、48000 之一
>  * fft_s 一个短时傅里叶变换的窗长，单位为秒
>  * hop_s 窗之间间隔长，单位为秒
>
>    注意：以上三个参数应该与下面ModelDir文件夹下feature.json中的参数一致，否则模型将加载失败。
>
>    
>  * ModelDir TensorflowJS 模型文件夹，该文件夹下应该存在一个model.json,一个feature.json,若干个.bin文件。
>  * minPinYinN 正整数，流式模型推断音频最小的长度；如果为4，则一次推断输出4个拼音片段，并保留中间两个；下一次推断与这次推断的覆盖长度为4/2 = 2.
>  * useWebWorker 是否使用异步进行模型推断；若为false，则模型推断与音频刷新同步进行，大概率导致音频卡顿，但是保证实时率。
>  *              若为true，则推断异步进行，不会阻塞音频流逝，但推断输出一般会有积压延迟。

### 模型部署

- 使用**DeepASR**项目中的Model实例的convert2tfjs方法会自动生成**TensorflowJS Graph Model**格式的模型。这是一个文件夹，其目录结构一般为：

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
  > ```
  > //基础配置
  > ...
  > const ModelDir = '/Models/TFJSModel/';
  > ...
  > ```
  >
  > 即可。


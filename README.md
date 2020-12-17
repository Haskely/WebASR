# WebASR
网页版的语音识别项目

* v0.1.0版完成！工程方面的基础功能全部实现，接下来就是研究模型了~
* 查看DEMO：https://haskely.github.io/WebASR 
* （国内访问 https://haskely.gitee.io/webasr ）
* （目前的模型是个菜菜的模型，完全不准~）
![WebASR网页截图](https://gitee.com/Haskely/WebASR/raw/master/screenshot/WebASR.png)
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


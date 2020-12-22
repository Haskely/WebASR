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

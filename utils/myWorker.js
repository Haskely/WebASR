
class MyWorker {
    constructor(WebWorkScriptURL) {
        this.Worker = new Worker(WebWorkScriptURL);
        this.Worker.onmessage = ({ data }) => {
            if (this.reciveDataFunctions[data.type] instanceof Function) {
                this.reciveDataFunctions[data.type](data.content);
            } else {
                console.error(`收到的data.type:${data.type}没有注册处理函数！`);
                console.log(data);
            };
        };
        this.reciveDataFunctions = {};
    };

    sendData = (dataType, dataContent, transferList = []) => {
        this.Worker.postMessage({
            'type': dataType,
            'content': dataContent,
        }, transferList);
    };

    reciveData = (dataType, dealDataContent = (dataContent) => { }) => {
        this.reciveDataFunctions[dataType] = dealDataContent;
    };
};

class MyWorkerScript {
    constructor(postMessageFn) {
        this.reciveDataFunctions = {};
        this.postMessage = postMessageFn;
        this.onmessage = ({ data }) => {
            if (this.reciveDataFunctions[data.type] instanceof Function) {
                this.reciveDataFunctions[data.type](data.content);
            } else {
                console.error(`收到的data.type:${data.type}没有注册处理函数！`);
                console.log(data);
                this.sendData('unknown_datatype', data);
            };
        };
    };

    sendData = (dataType, dataContent, transferList = [], targetOrigin = undefined) => {
        this.postMessage({
            'type': dataType,
            'content': dataContent,
        }, targetOrigin, transferList);
    };

    reciveData = (dataType, dealDataContent = (dataContent) => { }) => {
        this.reciveDataFunctions[dataType] = dealDataContent;
    };
};
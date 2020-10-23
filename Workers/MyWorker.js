
class MyWorker {
    constructor(WebWorkScriptURL) {
        this.WebWorkScriptURL = WebWorkScriptURL;
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
        this.reciveData('UnknownDatatype', (data) => {
            console.error(`[MainThread]发送给${this.WebWorkScriptURL}的data.type为:${data.type}的数据其MyWorkerScript没有注册处理函数！`);
            console.log(data);
        })
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
    constructor(worker_self) {
        this.reciveDataFunctions = {};
        this.worker_self = worker_self;
        worker_self.onmessage = ({ data }) => {
            if (this.reciveDataFunctions[data.type] instanceof Function) {
                this.reciveDataFunctions[data.type](data.content);
            } else {
                console.error(`[WorkerThread]收到的data的data.type:${data.type}没有注册处理函数！`);
                console.log(data);
                this.sendData('UnknownDatatype', data);
            };
        };
    };

    sendData = (dataType, dataContent, transferList = [], targetOrigin = undefined) => {
        this.worker_self.postMessage({
            'type': dataType,
            'content': dataContent,
        }, targetOrigin, transferList);
    };

    reciveData = (dataType, dealDataContent = (dataContent) => { }) => {
        this.reciveDataFunctions[dataType] = dealDataContent;
    };
};

export { MyWorker, MyWorkerScript }
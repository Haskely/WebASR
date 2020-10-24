
class MyWorker {
    constructor(WebWorkScriptURL) {
        this.WebWorkScriptURL = WebWorkScriptURL;
        this.Worker = new Worker(WebWorkScriptURL);
        this.Worker.onmessage = ({ data }) => {
            if (this.reciveDataFunctions[data.type] instanceof Function) {
                this.reciveDataFunctions[data.type](data.content);
            } else {
                console.error(`[MyWorker]收到的data.type:${data.type}没有注册处理函数！`);
                console.log(data);
            };
        };
        this.Worker.onerror = function (err) {
            console.log('[MyWorker]worker is suffering!', err)
        };
        this.reciveDataFunctions = {};
        this.reciveData('Log', (msg) => { console.log(`[MyWorkerScript]${msg}`); });
        this.reciveData('Error', (error_args) => {
            console.error(`[MyWorkerScript]遇到错误！\n${error_args}`);
        });
        this.reciveData('UnknownDatatype', (data) => {
            console.error(`[MyWorker]发送给${this.WebWorkScriptURL}的data.type为:${data.type}的数据其MyWorkerScript没有注册处理函数！`);
            console.log(data);
        });
    };

    sendData = (dataType, dataContent, transferList = []) => {
        this.Worker.postMessage({
            'type': dataType,
            'content': dataContent,
        }, transferList);
    };

    reciveData = (dataType, dealDataContent = (dataContent) => { }) => {
        if (this.reciveDataFunctions[dataType]) console.warn(`警告！dataType:${dataType}的处理函数已经存在,进行覆盖！`)
        this.reciveDataFunctions[dataType] = dealDataContent;
    };

    unreciveData = (dataType) => {
        if (dataType in this.reciveDataFunctions) delete this.reciveDataFunctions[dataType];
    };
};

class MyWorkerScript {
    constructor(worker_self) {
        this.worker_self = worker_self;
        this.reciveDataFunctions = {};

        this.worker_self.onmessage = ({ data }) => {
            if (this.reciveDataFunctions[data.type] instanceof Function) {
                this.reciveDataFunctions[data.type](data.content);
            } else {
                console.error(`[MyWorkerScript]收到的data的data.type:${data.type}没有注册处理函数！`);
                console.log(data);
                this.sendData('UnknownDatatype', data);
            };
        };
        this.worker_self.onerror = (...args) => {
            this.sendData('Error', args);
        };

        this.worker_self.addEventListener('unhandledrejection', (event) => {
            // the event object has two special properties:
            // event.promise - the promise that generated the error
            // event.reason  - the unhandled error object
            this.sendData('Error', event.reason);
        });
    };

    log = (msg) => {
        this.sendData('Log', msg);
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
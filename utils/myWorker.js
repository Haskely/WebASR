
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

    sendData = (data, transferList = []) => {
        this.Worker.postMessage(data, transferList);
    };

    reciveData = (dataType, dealDataContent = (dataContent) => { }) => {
        this.reciveDataFunctions[dataType] = dealDataContent;
    };
};
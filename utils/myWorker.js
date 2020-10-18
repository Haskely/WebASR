
class MyWorker {
    constructor(WebWorkScriptURL, onWebWorkMessageData = (data) => { }) {
        this.Worker = new Worker(WebWorkScriptURL);
        this.reciveData = onWebWorkMessageData;
        this.Worker.onmessage = ({ data }) => { this.reciveData(data) };
    };

    sendData = (data, transferList = []) => {
        this.Worker.postMessage(data, transferList);
    };
};
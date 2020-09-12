class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {
        $('body').append(`<canvas id='${id}' width="${width}" height="${height}"></canvas>`);
        this.canvas = document.querySelector(`#${id}`);
        this.canvas_ctx = this.canvas.getContext('2d');
    };

    draw = () => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);



        window.requestAnimationFrame(this.draw);
    };


    start = () => {
        this.draw();
    };
};

class WaveDrawer extends Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {
        super(id, width, height);
        this.data = null;
        this.data_reseted = false;
    }

    draw = () => {
        if (this.data_reseted) {
            this.data_reseted = false;
            this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.canvas_ctx.beginPath();
            let dx = this.canvas.width / (10 * this.data.sampleRate);
            let end_dy = this.canvas.height / (this.data.channels.length * 2);
            for (let ch_n = 0; ch_n < this.data.channels.length; ch_n += 1) {
                let audio_pcm = this.data.channels[ch_n];
                let end_y = end_dy * (ch_n * 2 + 1);
                this.canvas_ctx.moveTo(this.canvas.width, end_y);
                for (let i = 1; i < audio_pcm.length + 1; i += 1) {
                    let cur_y = end_y - Math.round(audio_pcm[audio_pcm.length - i] * end_dy);
                    this.canvas_ctx.lineTo(this.canvas.width - dx * i, cur_y);
                };
            };
            this.canvas_ctx.stroke();
            this.canvas_ctx.closePath();
        };
        window.requestAnimationFrame(this.draw);
    };

    set_data = (data) => {
        // data = {
        //     timeStamp: this.timeStamp,
        //     sampleRate: this.sampleRate,
        //     channels: channels,
        // };
        this.data = data;
        this.data_reseted = true;
    };
}
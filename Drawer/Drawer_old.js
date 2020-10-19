class Drawer_old {
    constructor(id = 'canvas', width = 600, height = 400) {

        this.canvas = document.querySelector(`#${id}`);
        if (!this.canvas) {
            $('body').append(`<div style="text-align:center;"><canvas id='${id}' width="${width}" height="${height}" style="text-align:center;border: 1px solid black;border-radius: 4px;"></canvas></div>`);
            this.canvas = document.querySelector(`#${id}`);
        };
        this.canvas_ctx = this.canvas.getContext('2d');

        this.data = null;
        this.next_data_ready = false;
        this.next_frame_ready = false;
        window.requestAnimationFrame(this.requestAF);

    };

    draw = async (data) => {
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    _process_draw = () => {
        this.next_data_ready = false;
        this.next_frame_ready = true;
        this.draw(this.data);
        window.requestAnimationFrame(this.requestAF);
    };

    requestAF = () => {
        this.next_frame_ready = true;
        if (this.next_data_ready) {
            this._process_draw();
        };
    };

    set_data = (data) => {
        this.data = data;
        this.next_data_ready = true;
        if (this.next_frame_ready) {
            this._process_draw();
        };
    };

};
class Drawer {
    constructor(id = 'canvas', width = 600, height = 400) {
        $('body').append(`<canvas id='${id}' width="${width}" height="${height}"></canvas>`);
        this.canvas = $(`#${id}`);
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
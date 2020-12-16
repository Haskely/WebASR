import { Drawer } from "../../../Drawer/Drawer.js";
import { CyclicArray } from "../../../utils/CyclicContainer.js";

/**
 * 暂时默认一切都是连续更新的吧。。其实合理的假设是可能不连续的，每个数据都有自己独立的时间
 */

class PinYinDrawer extends Drawer {
    constructor(
        id = 'pinyinDrawer',
        total_duration = 10,
        each_pinyin_time_len,
    ) {
        const max_pinyin_num = Math.ceil(total_duration / each_pinyin_time_len);
        const char_len = 2;
        const cwN = 3;
        super(id, max_pinyin_num * char_len*7, char_len*7*cwN);
        this.cwN = cwN;
        this.total_duration = total_duration;
        this.each_pinyin_time_len = each_pinyin_time_len;

        this.cyclicPinYinArray = new CyclicArray(max_pinyin_num);
        this.pinyinEndTime = null;
        this.audioEndTime = null;

        this.canvas_ctx.textAlign = "start";
        this.canvas_ctx.textBaseline = "bottom";
    };

    _checkPinYinArray = () => {

    };

    updateAudioEndTime = (audioEndTime) => {
        this.audioEndTime = audioEndTime;
        this.setData({
            cyclicPinYinArray: this.cyclicPinYinArray,
            pinyinEndTime:this.pinyinEndTime,
            audioEndTime,
        });
    };

    updatePinYinData = (pinyinArray, pinyinEndTime, audioEndTime = this.audioEndTime) => {
        this.cyclicPinYinArray.update(pinyinArray);
        this.pinyinEndTime = pinyinEndTime;
        this.audioEndTime = audioEndTime;
        this.setData({
            cyclicPinYinArray: this.cyclicPinYinArray,
            pinyinEndTime,
            audioEndTime,
        });
    };

    draw = async (
        { cyclicPinYinArray,pinyinEndTime,audioEndTime }
        ) => {
        // const cyclicPinYinArray = this.cyclicPinYinArray, pinyinEndTime = this.pinyinEndTime, audioEndTime = this.audioEndTime;
        this.canvas_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const pinyin_time_dx = Math.round(this.each_pinyin_time_len * this.canvas.width / this.total_duration);
        const left_shift_x = Math.round((audioEndTime - pinyinEndTime) * this.canvas.width / this.total_duration)
        const pinyinArray = cyclicPinYinArray.toArray();
        this.canvas_ctx.beginPath();

        const shifted_end_x = this.canvas.width - left_shift_x;
        const cwdy = this.canvas.height/this.cwN;
        const textMaxLen = pinyin_time_dx*this.cwN;


        for (let i = 1; i<= pinyinArray.length && pinyin_time_dx * i <= shifted_end_x; i += 1) {
            const cur_x = shifted_end_x - pinyin_time_dx * i;
            const cur_y = ((this.cwN + (cyclicPinYinArray.endPoint - i)%this.cwN)%this.cwN + 1)*cwdy;
            this.canvas_ctx.moveTo(cur_x, 0);
            this.canvas_ctx.lineTo(cur_x, cwdy/10);
            this.canvas_ctx.moveTo(cur_x, cur_y -cwdy);
            this.canvas_ctx.lineTo(cur_x, cur_y);
            this.canvas_ctx.fillText(pinyinArray[pinyinArray.length - i], cur_x + 2, cur_y,textMaxLen-2);
        };
        this.canvas_ctx.stroke();
        this.canvas_ctx.closePath();
    };

};

export {PinYinDrawer};
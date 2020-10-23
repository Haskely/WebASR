


class PinYin {
    constructor(pinyin2num_dict_JsonURL) {
        this.pinyin2num_dict_JsonURL = pinyin2num_dict_JsonURL;
    };

    init = async () => {
        const response = await fetch(this.pinyin2num_dict_JsonURL);
        this.py2num_dict = await response.json();
        this.num2py_dict = {};
        for (let py in this.py2num_dict) {
            this.num2py_dict[this.py2num_dict[py]] = py;
        };
    }

    py2num = py => this.py2num_dict[py];

    num2py = num => this.num2py_dict[num];
};

export { PinYin }

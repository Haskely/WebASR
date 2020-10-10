

class Float32CyclicArray {
    /**
     * 
     * @param {Number} length 数据长度
     */
    constructor(length) {

        this._float32array = new Float32Array(length);
        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Float32Array} data 
     */
    update(data) {
        this.end_point = (this.end_point + data.length) % this._float32array.length;
        this.data_length = Math.min(this.data_length + data.length, this._float32array.length);
        for (let i = 1; i < Math.min(data.length, this._float32array.length) + 1; i += 1) {
            this._float32array[(this._float32array.length + this.end_point - i) % this._float32array.length] = data[data.length - i];
        };
        return true;
    };

    toArray() {
        let array = new Float32Array(this.data_length);
        for (let i = 1; i < array.length + 1; i += 1) {
            array[array.length - i] = this._float32array[(this._float32array.length + this.end_point - i) % this._float32array.length];
        };
        return array;
    };
};

class Float32_2DArray {
    constructor(height, width) {
        this._float32dataArray = new Float32Array(height * width);
        this.height = height;
        this.width = width;
    };

    _check_index = (i, j) => {
        if (!(i < this.height && j < this.width)) {
            throw new Error(`下标越界!数组形状为[${this.height},${this.width}].然而传入下标[${i},${j}]`)
        };
    };

    get = (i, j) => {
        this._check_index(i, j);
        return this._float32dataArray[i * this.width + j];
    };

    set = (i, j, value) => {
        this._check_index(i, j);
        this._float32dataArray[i * this.width + j] = value;
    };

};

class Float32_2DCyclicArray {

    constructor(height, width) {
        this._float32_2darray = new Float32_2DArray(height, width);
        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Float32_2DArray} _2ddata 
     */
    update = (_2ddata) => {
        this.end_point = (this.end_point + _2ddata.height) % this._float32_2darray.height;
        this.data_length = Math.min(this.data_length + _2ddata.height, this._float32_2darray.height);
        for (let i = 1; i < Math.min(_2ddata.height, this._float32_2darray.height) + 1; i += 1) {
            for (let j = 0; j < _2ddata.width; j += 1) {
                this._float32_2darray.set((this._float32_2darray.height + this.end_point - i) % this._float32_2darray.height, j, _2ddata.get(_2ddata.height - i, j));
            };
        };
        return true;
    };

    to2DArray = () => {
        let _2darray = new Float32_2DArray(this.data_length, this._float32_2darray.width);
        for (let i = 1; i < _2darray.height + 1; i += 1) {
            for (let j = 0; j < _2darray.width; j += 1) {
                _2darray.set(_2darray.height - i, j, this._float32_2darray.get((this._float32_2darray.height + this.end_point - i) % this._float32_2darray.height, j));
            };
        };
        return _2darray;
    };
};

class CyclicTensorBuffer {
    /**
     * 
     * @param {Int32Array} shape 形状数组，如[2,3]
     */
    constructor(shape, cyclic_axis = -1, dtype = undefined) {

        this._tfbuffer = tf.buffer(shape, dtype);
        this.cyclic_axis = (shape.length + cyclic_axis) % shape.length;
        this.data_length = 0;
        this.end_point = 0;
    };

    check_shape(shape) {
        if (shape.length !== this._tfbuffer.shape.length) throw `shape ${shape} 与 本CyclicTensorBuffer的shape${this._tfbuffer.shape.length} 维数不一致！`;
        for (let i = 0; i < shape.length; i += 1) {
            if (this._tfbuffer.shape[i] !== shape[i] && i !== this.cyclic_axis) throw `除了${this.cyclic_axis}维之外的维度大小必须相等，然鹅shape ${shape} 与 本CyclicTensorBuffer的shape${this._tfbuffer.shape.length} 不符合要求`;
        };
        return true;
    };

    /**
     * 
     * @param {tf.TensorBuffer} buffer 
     */
    update(buffer) {
        this.check_shape(buffer.shape);
        const buffer_cyclic_length = buffer.shape[this.cyclic_axis];
        const max_buffer_cyclic_length = this._tfbuffer.shape[this.cyclic_axis];
        this.end_point = (this.end_point + buffer_cyclic_length) % max_buffer_cyclic_length;
        this.data_length = Math.min(this.data_length + buffer_cyclic_length, max_buffer_cyclic_length);


        const cur_pos = new Int32Array(buffer.shape.length);
        for (let i = 1; i < Math.min(buffer_cyclic_length, max_buffer_cyclic_length) + 1; i += 1) {
            let dim = 0;
            while (dim < cur_pos.length) {
                // do cur_pos
                cur_pos[this.cyclic_axis] = buffer_cyclic_length - i;
                const _x = buffer.get(...cur_pos);
                cur_pos[this.cyclic_axis] = (max_buffer_cyclic_length + this.end_point - i) % max_buffer_cyclic_length;
                this._tfbuffer.set(_x, ...cur_pos);

                dim = 0;
                while (true) {
                    if (dim == this.cyclic_axis) dim += 1;
                    if (dim >= cur_pos.length) {
                        break;
                    } else if (cur_pos[dim] < buffer.shape[dim] - 1) {
                        cur_pos[dim] += 1;
                        break;
                    } else {
                        cur_pos[dim] = 0;
                        dim += 1;
                    };
                };
            };
        };
        return true;
    };

    toBuffer = () => {
        const shape = this._tfbuffer.shape.slice();
        shape[this.cyclic_axis] = this.data_length;
        const tfbuffer = tf.buffer(shape);
        const buffer_cyclic_length = tfbuffer.shape[this.cyclic_axis];
        const max_buffer_cyclic_length = this._tfbuffer.shape[this.cyclic_axis];

        const cur_pos = new Int32Array(shape.length);
        for (let i = 1; i < Math.min(buffer_cyclic_length, max_buffer_cyclic_length) + 1; i += 1) {
            let dim = 0;
            while (dim < cur_pos.length) {
                // do cur_pos
                cur_pos[this.cyclic_axis] = (max_buffer_cyclic_length + this.end_point - i) % max_buffer_cyclic_length;
                const _x = this._tfbuffer.get(...cur_pos);
                cur_pos[this.cyclic_axis] = buffer_cyclic_length - i;
                tfbuffer.set(_x, ...cur_pos);

                dim = 0;
                while (true) {
                    if (dim == this.cyclic_axis) dim += 1;
                    if (dim >= cur_pos.length) {
                        break;
                    } else if (cur_pos[dim] < shape[dim] - 1) {
                        cur_pos[dim] += 1;
                        break;
                    } else {
                        cur_pos[dim] = 0;
                        dim += 1;
                    };
                };
            };
        };

        return tfbuffer;
    };

};
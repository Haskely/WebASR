

class CyclicFloat32Array {
    /**
     * 
     * @param {Number} length 数据长度
     */
    constructor(length) {

        this._float32Array = new Float32Array(length);
        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Float32Array} data 
     */
    update(data) {
        this.end_point = (this.end_point + data.length) % this._float32Array.length;
        this.data_length = Math.min(this.data_length + data.length, this._float32Array.length);
        for (let i = 1; i < Math.min(data.length, this._float32Array.length) + 1; i += 1) {
            this._float32Array[(this._float32Array.length + this.end_point - i) % this._float32Array.length] = data[data.length - i];
        };
        return true;
    };

    toArray() {
        let array = new Float32Array(this.data_length);
        for (let i = 1; i < array.length + 1; i += 1) {
            array[array.length - i] = this._float32Array[(this._float32Array.length + this.end_point - i) % this._float32Array.length];
        };
        return array;
    };
};

class CyclicFloat32NestedArray {
    constructor(length, f32arrlength) {
        this._float32arrayArray = new Array(length);
        for (let i = 0; i < length; i += 1) {
            this._float32arrayArray[i] = new Float32Array(f32arrlength);
        };
        this.length = length;
        this.f32arrlength = f32arrlength;

        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Array[Float32Array]} f32arrayArray 
     */
    update(f32arrayArray) {
        this.end_point = (this.end_point + f32arrayArray.length) % this.length;
        this.data_length = Math.min(this.data_length + f32arrayArray.length, this.length);
        for (let i = 1; i < Math.min(f32arrayArray.length, this.length) + 1; i += 1) {
            for (let j = 0; j < this.f32arrlength; j += 1) {
                this._float32arrayArray[(this.length + this.end_point - i) % this.length][j] = f32arrayArray[f32arrayArray.length - i][j];
            };
        };
        return true;
    };

    toArray() {
        let array = new Array(this.data_length);
        for (let i = 1; i < this.data_length + 1; i += 1) {
            array[array.length - i] = this._float32arrayArray[(this.length + this.end_point - i) % this.length].slice();
        };
        return array;
    };
};

class Float32Matrix {

    static f32nestedarray2matrix(nestedarray) {
        const height = nestedarray.length;
        const width = nestedarray[0].length;
        const float32Matrix = new Float32Matrix(height, width);
        for (let i = 0; i < height; i += 1) {
            for (let j = 0; j < width; j += 1) {
                float32Matrix.set(i, j, nestedarray[i][j]);
            };
        };
        return float32Matrix;
    };

    constructor(height, width) {
        if (!(height > 0 && width > 0)) throw new Error(`矩阵长宽均不能小于等于零!然而传入长宽：\nheight:${height}\t${width}`);
        this.height = Math.ceil(height);
        this.width = Math.ceil(width);
        this._arrayBuffer = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.height * this.width);
        this._float32ArrayView = new Float32Array(this._arrayBuffer);

    };

    _check_index = (i, j) => {
        if (!(i < this.height && j < this.width)) {
            throw new Error(`下标越界!数组形状为[${this.height},${this.width}].然而传入下标[${i},${j}]`)
        };
    };

    get = (i, j) => {
        // this._check_index(i, j);
        return this._float32ArrayView[i * this.width + j];
    };

    set = (i, j, value) => {
        // this._check_index(i, j);
        this._float32ArrayView[i * this.width + j] = value;
    };

    toList = () => {
        const list = new Array(this.height);
        for (let i = 0; i < this.height; i += 1) {
            list[i] = new Float32Array(this.width);
            for (let j = 0; j < this.width; j += 1) {
                list[i][j] = this.get(i, j);
            };
        };
        return list;
    };
};

class CyclicFloat32Matrix {

    constructor(height, width) {
        this._float32Matrix = new Float32Matrix(height, width);
        this.data_length = 0;
        this.end_point = 0;
    };
    /**
     * 
     * @param {Float32Matrix} _matrix 
     */
    update = (_matrix) => {
        this.end_point = (this.end_point + _matrix.height) % this._float32Matrix.height;
        this.data_length = Math.min(this.data_length + _matrix.height, this._float32Matrix.height);
        for (let i = 1; i < Math.min(_matrix.height, this._float32Matrix.height) + 1; i += 1) {
            for (let j = 0; j < _matrix.width; j += 1) {
                this._float32Matrix.set((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j, _matrix.get(_matrix.height - i, j));
            };
        };
        return true;
    };

    /**
     * 
     * @param {Float32Matrix} _matrix 
     */
    update = (_matrix) => {
        this.end_point = (this.end_point + _matrix.height) % this._float32Matrix.height;
        this.data_length = Math.min(this.data_length + _matrix.height, this._float32Matrix.height);
        for (let i = 1; i < Math.min(_matrix.height, this._float32Matrix.height) + 1; i += 1) {
            for (let j = 0; j < _matrix.width; j += 1) {
                this._float32Matrix.set((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j, _matrix.get(_matrix.height - i, j));
            };
        };
        return true;
    };


    toMatrix = () => {
        let _matrix = new Float32Matrix(this.data_length, this._float32Matrix.width);
        for (let i = 1; i < _matrix.height + 1; i += 1) {
            for (let j = 0; j < _matrix.width; j += 1) {
                _matrix.set(_matrix.height - i, j, this._float32Matrix.get((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j));
            };
        };
        return _matrix;
    };

    toArray = () => {
        let list = new Array(this.data_length);
        for (let i = 1; i < list.length + 1; i += 1) {
            list[list.length - i] = new Float32Array(this._float32Matrix.width);
            for (let j = 0; j < this._float32Matrix.width; j += 1) {
                list[list.length - i][j] = this._float32Matrix.get((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j);
            };
        };
        return list;
    };
};

class CyclicTFTensorBuffer {
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

class CyclicNJArray {

}
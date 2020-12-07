
/**
 * 
 * @param {TypedArray} TypedArrayClass 
 */
function getCyclicTypedArrayClass(TypedArrayClass) {
    class CyclicTypedArray {
        /**
         * 
         * @param {Number} size 数据长度
         */
        constructor(size) {
            this.TypedArrayClass = TypedArrayClass;

            this.size = size;
            this.length = 0;
            this.endPoint = 0;

            this.arrayBuffer = new ArrayBuffer(TypedArrayClass.BYTES_PER_ELEMENT * size);
            this.typedArrayView = new TypedArrayClass(this.arrayBuffer);
        };

        clear = (clearLength = this.length, fromEnd = false) => {
            if (clearLength < this.length) {
                this.length -= clearLength;
                if (fromEnd) {
                    this.endPoint -= clearLength;
                    if (this.endPoint < 0) this.endPoint += this.size;
                };
            } else {
                this.endPoint = 0;
                this.length = 0;
            };
        };

        get = (i) => {
            if (i < -this.length || i >= this.length) throw Error(`Index ${i} OUT of range! [${-this.length},${this.length})`);
            let ri = this.endPoint + i;
            if (i > 0) ri -= this.length;
            if (ri < 0) ri += this.size;
            return this.typedArrayView[ri];
        };

        /**
         * 
         * @param {TypedArrayClass} data 
         */
        update(data) {
            const size = this.size;
            const data_length = data.length;
            const last_end_point = this.endPoint;
            const qusai_length = this.length + data_length;
            this.length = qusai_length < size ? qusai_length : size;
            if (last_end_point + data_length > size) {
                //
                let containerIndex = last_end_point;
                let dataIndex = 0;
                if (data_length > size) {
                    dataIndex = data_length - size;
                };
                while (containerIndex < size) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                containerIndex = 0;
                while (dataIndex < data_length) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                this.endPoint = containerIndex;
            } else {
                let containerIndex = last_end_point;
                let dataIndex = 0;
                while (dataIndex < data_length) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                this.endPoint = containerIndex;
            };
        };

        toArray(s = 0, e = this.length) {
            const size = this.size;
            const quasi_start_point = s < 0 ? this.endPoint + s : this.endPoint - this.length + s;
            const length = e > 0 ? e : (this.length + e);

            const typedArray = new TypedArrayClass(length);

            if (quasi_start_point < 0) {
                let i = quasi_start_point + size;
                let j = 0;
                while (i < size) {
                    typedArray[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
                i = 0;
                while (j < length) {
                    typedArray[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
            } else {
                let i = quasi_start_point;
                let j = 0;
                while (j < length) {
                    typedArray[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
            };
            return typedArray;
        };

        popArray(popLength, fromEnd = false) {
            let typedArray;
            if (fromEnd) {
                typedArray = this.toArray(-popLength);
            } else {
                typedArray = this.toArray(0, popLength);
            };
            this.clear(popLength, fromEnd);

            return typedArray;
        };
    };
    return CyclicTypedArray;
};
/**
 * 
 * @param {TypedArray} TypedArrayClass 
 */
function getTypedArrayMatrixClass(TypedArrayClass) {
    class TypedArrayMatrixClass {
        constructor(rowsN, columnsN, initArrayBuffer = null) {
            this.rowsN = rowsN > 0 ? Math.round(rowsN) : 0; //矩阵行数
            this.columnsN = columnsN > 0 ? Math.round(columnsN) : 0; //矩阵列数
            this.arrayBuffer = initArrayBuffer ? initArrayBuffer : new ArrayBuffer(TypedArrayClass.BYTES_PER_ELEMENT * this.rowsN * this.columnsN);
            this.typedArrayView = new TypedArrayClass(this.arrayBuffer);//储存矩阵数据的一维数组;
        };

        get = (i, j) => {
            // 获取矩阵中位置在(i,j)的数据
            return this.typedArrayView[i * this.columnsN + j];
        };

        set = (i, j, value) => {
            return this.typedArrayView[i * this.columnsN + j] = value;
        };
    };
    return TypedArrayMatrixClass;
};
/**
 * 
 * @param {TypedArray} TypedArrayClass 
 */
function getCyclicTypedArrayMatrixClass(TypedArrayClass) {
    const TypedArrayMatrixClass = getTypedArrayMatrixClass(TypedArrayClass);
    class CyclicTypedArrayMatrixClass {
        constructor(maxRowsN, columnsN) {
            this.TypedArrayClass = TypedArrayClass;
            this.TypedArrayMatrixClass = TypedArrayMatrixClass;
            this.maxRowsN = Math.round(maxRowsN);
            this.columnsN = Math.round(columnsN);

            this.arrayBuffer = new ArrayBuffer(TypedArrayClass.BYTES_PER_ELEMENT * this.maxRowsN * this.columnsN);
            this.typedArrayView = new TypedArrayClass(this.arrayBuffer);

            this.length = 0;
            this.endPoint = 0;
        };

        get curRowsN() {
            return this.length / this.columnsN;
        };

        get endRowPoint() {
            return this.endPoint / this.columnsN;
        }

        clear = (clearLength = this.length, fromEnd = false) => {
            if (clearLength < this.length) {
                this.length -= clearLength;
                if (fromEnd) {
                    this.endPoint -= clearLength;
                    if (this.endPoint < 0) this.endPoint += this.size;
                };
            } else {
                this.endPoint = 0;
                this.length = 0;
            };
        };

        get = (i, j) => {
            if (Math.abs(i) >= this.columnsN || Math.abs(j) >= this.rowsN) throw Error(`Position [${i},${j}] OUT of bound! Shape:[${this.maxRowsN},${this.columnsN}].`)
            const p = i * this.columnsN + j;
            return this.typedArrayView[p];
        };

        update = (typedArrayMatrix) => {
            const data = typedArrayMatrix.typedArrayView;
            const size = this.typedArrayView.length;
            const data_length = data.length;
            const last_end_point = this.endPoint;
            const qusai_length = this.length + data_length;
            this.length = qusai_length < size ? qusai_length : size;
            if (last_end_point + data_length > size) {
                //
                let containerIndex = last_end_point;
                let dataIndex = 0;
                if (data_length > size) {
                    dataIndex = data_length - size;
                };
                while (containerIndex < size) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                containerIndex = 0;
                while (dataIndex < data_length) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                this.endPoint = containerIndex;
            } else {
                let containerIndex = last_end_point;
                let dataIndex = 0;
                while (dataIndex < data_length) {
                    this.typedArrayView[containerIndex] = data[dataIndex];
                    containerIndex += 1;
                    dataIndex += 1;
                };
                this.endPoint = containerIndex;
            };
        };

        toMatrix() {
            const typedArrayMatrix = new TypedArrayMatrixClass(this.curRowsN, this.columnsN);
            const length = this.length;
            const size = this.typedArrayView.length;
            const quasi_start_point = this.endPoint - length;

            if (quasi_start_point < 0) {
                let i = quasi_start_point + size;
                let j = 0;
                while (i < size) {
                    typedArrayMatrix.typedArrayView[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
                i = 0;
                while (j < length) {
                    typedArrayMatrix.typedArrayView[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
            } else {
                let i = quasi_start_point;
                let j = 0;
                while (j < length) {
                    typedArrayMatrix.typedArrayView[j] = this.typedArrayView[i];
                    i += 1;
                    j += 1;
                };
            };
            return typedArrayMatrix;
        };

        toMatrixT() {
            const typedArrayMatrix = new TypedArrayMatrixClass(this.columnsN, this.curRowsN);

            const pixelLength = 1;

            const thisData = this.typedArrayView;
            const newData = typedArrayMatrix.typedArrayView;
            const length = newData.length; // length == this.length
            const perColumnLength = typedArrayMatrix.columnsN * pixelLength;
            const size = thisData.length;
            const quasiStartPoint = this.endPoint - length;

            if (quasiStartPoint < 0) {
                let containerIndex = quasiStartPoint + size;
                const breakColumnPoint = (-quasiStartPoint) / this.width;
                let curColumnI = 0;
                let dataIndex = 0;
                while (curColumnI < breakColumnPoint) {
                    dataIndex = curColumnI;
                    while (dataIndex < length) {
                        newData[dataIndex] = thisData[containerIndex];
                        dataIndex += perColumnLength;
                        containerIndex += pixelLength;
                    };
                    curColumnI += pixelLength;
                };
                containerIndex = 0;
                while (curColumnI < perColumnLength) {
                    dataIndex = curColumnI;
                    while (dataIndex < length) {
                        newData[dataIndex] = thisData[containerIndex];
                        dataIndex += perColumnLength;
                        containerIndex += pixelLength;
                    };
                    curColumnI += pixelLength;
                };
            } else {
                let containerIndex = quasiStartPoint;

                let curColumnI = 0;
                let dataIndex;
                while (curColumnI < perColumnLength) {
                    dataIndex = curColumnI;
                    while (dataIndex < length) {
                        newData[dataIndex] = thisData[containerIndex];
                        dataIndex += perColumnLength;
                        containerIndex += pixelLength;
                    };
                    curColumnI += pixelLength;
                };
            };
            return typedArrayMatrix;
        };


    };
    return CyclicTypedArrayMatrixClass
};

class CyclicImageData {
    constructor(width, maxHeight) {

        this.maxHeight = Math.round(maxHeight);
        this.width = Math.round(width);

        this.arrayBuffer = new ArrayBuffer(Uint8ClampedArray.BYTES_PER_ELEMENT * this.maxHeight * this.width * 4);
        this.data = new Uint8ClampedArray(this.arrayBuffer);

        this.length = 0;
        this.endPoint = 0;
    };

    get curHeight() {
        return this.length / this.width / 4;
    };

    get endHeightPoint() {
        return this.endPoint / this.width / 4;
    }

    clear = () => {
        this.length = 0;
        this.endPoint = 0;
    };

    _checkImageData = (imageData) => {
        if (!(imageData instanceof ImageData)) throw Error(`传入的imageData不是ImageData类型，而是${imageData}`);
        if (imageData.width !== this.width) throw Error(`传入的imageData的width(${imageData.width})与本CyclicImageData的width(${this.width})不相同!`);
    };

    update = (imageData) => {
        this._checkImageData(imageData);
        const this_data = this.data;
        const data = imageData.data;
        const size = this_data.length;
        const data_length = data.length;
        const last_end_point = this.endPoint;
        const qusai_length = this.length + data_length;
        this.length = qusai_length < size ? qusai_length : size;
        if (last_end_point + data_length > size) {
            let containerIndex = last_end_point;
            let dataIndex = 0;
            if (data_length > size) {
                dataIndex = data_length - size;
            };
            while (containerIndex < size) {
                this_data[containerIndex] = data[dataIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
            containerIndex = 0;
            while (dataIndex < data_length) {
                this_data[containerIndex] = data[dataIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
            this.endPoint = containerIndex;
        } else {
            let containerIndex = last_end_point;
            let dataIndex = 0;
            while (dataIndex < data_length) {
                this_data[containerIndex] = data[dataIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
            this.endPoint = containerIndex;
        };
    };

    toImageData() {
        const imageData = new ImageData(this.width, this.curHeight);

        const this_data = this.data;
        const new_data = imageData.data;
        const length = imageData.data.length; // length == this.length
        const size = this_data.length;
        const quasi_start_point = this.endPoint - length;

        if (quasi_start_point < 0) {
            let containerIndex = quasi_start_point + size;
            let dataIndex = 0;
            while (containerIndex < size) {
                new_data[dataIndex] = this_data[containerIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
            containerIndex = 0;
            while (dataIndex < length) {
                new_data[dataIndex] = this_data[containerIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
        } else {
            let containerIndex = quasi_start_point;
            let dataIndex = 0;
            while (dataIndex < length) {
                new_data[dataIndex] = this_data[containerIndex];
                containerIndex += 1;
                dataIndex += 1;
            };
        };
        return imageData;
    };

    toImageDataT() {
        const imageData = new ImageData(this.curHeight, this.width);

        const pixelLength = 4;

        const thisData = this.data;
        const newData = imageData.data;
        const length = imageData.data.length; // length == this.length
        const perColumnLength = imageData.width * pixelLength;
        const size = thisData.length;
        const quasiStartPoint = this.endPoint - length;

        if (quasiStartPoint < 0) {
            let containerIndex = quasiStartPoint + size;
            const breakColumnPoint = (-quasiStartPoint) / this.width;
            let curColumnI = 0;
            let dataIndex = 0;
            while (curColumnI < breakColumnPoint) {
                dataIndex = curColumnI;
                while (dataIndex < length) {
                    newData[dataIndex + 0] = thisData[containerIndex + 0];
                    newData[dataIndex + 1] = thisData[containerIndex + 1];
                    newData[dataIndex + 2] = thisData[containerIndex + 2];
                    newData[dataIndex + 3] = thisData[containerIndex + 3];
                    dataIndex += perColumnLength;
                    containerIndex += pixelLength;
                };
                curColumnI += pixelLength;
            };
            containerIndex = 0;
            while (curColumnI < perColumnLength) {
                dataIndex = curColumnI;
                while (dataIndex < length) {
                    newData[dataIndex + 0] = thisData[containerIndex + 0];
                    newData[dataIndex + 1] = thisData[containerIndex + 1];
                    newData[dataIndex + 2] = thisData[containerIndex + 2];
                    newData[dataIndex + 3] = thisData[containerIndex + 3];
                    dataIndex += perColumnLength;
                    containerIndex += pixelLength;
                };
                curColumnI += pixelLength;
            };
        } else {
            let containerIndex = quasiStartPoint;

            let curColumnI = 0;
            let dataIndex;
            while (curColumnI < perColumnLength) {
                dataIndex = curColumnI;
                while (dataIndex < length) {
                    newData[dataIndex + 0] = thisData[containerIndex + 0];
                    newData[dataIndex + 1] = thisData[containerIndex + 1];
                    newData[dataIndex + 2] = thisData[containerIndex + 2];
                    newData[dataIndex + 3] = thisData[containerIndex + 3];
                    dataIndex += perColumnLength;
                    containerIndex += pixelLength;
                };
                curColumnI += pixelLength;
            };
        };
        return imageData;
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

    clear = () => {
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

// class Float32Matrix {

//     static f32nestedarray2matrix(nestedarray) {
//         const height = nestedarray.length;
//         const width = nestedarray[0].length;
//         const float32Matrix = new Float32Matrix(height, width);
//         for (let i = 0; i < height; i += 1) {
//             for (let j = 0; j < width; j += 1) {
//                 float32Matrix.set(i, j, nestedarray[i][j]);
//             };
//         };
//         return float32Matrix;
//     };

//     constructor(height, width) {
//         if (!(height > 0 && width > 0)) throw new Error(`矩阵长宽均不能小于等于零!然而传入长宽：\nheight:${height}\t${width}`);
//         this.height = Math.ceil(height);
//         this.width = Math.ceil(width);
//         this._arrayBuffer = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.height * this.width);
//         this._float32ArrayView = new Float32Array(this._arrayBuffer);

//     };

//     _check_index = (i, j) => {
//         if (!(i < this.height && j < this.width)) {
//             throw new Error(`下标越界!数组形状为[${this.height},${this.width}].然而传入下标[${i},${j}]`)
//         };
//     };

//     get = (i, j) => {
//         // this._check_index(i, j);
//         return this._float32ArrayView[i * this.width + j];
//     };

//     set = (i, j, value) => {
//         // this._check_index(i, j);
//         this._float32ArrayView[i * this.width + j] = value;
//     };

//     toList = () => {
//         const list = new Array(this.height);
//         for (let i = 0; i < this.height; i += 1) {
//             list[i] = new Float32Array(this.width);
//             for (let j = 0; j < this.width; j += 1) {
//                 list[i][j] = this.get(i, j);
//             };
//         };
//         return list;
//     };
// };

// class CyclicFloat32Matrix {

//     constructor(height, width) {
//         this._float32Matrix = new Float32Matrix(height, width);
//         this.data_length = 0;
//         this.end_point = 0;
//     };

//     clear = () => {
//         this.data_length = 0;
//         this.end_point = 0;
//     };

//     /**
//      * 
//      * @param {Float32Matrix} _matrix 
//      */
//     update = (_matrix) => {
//         this.end_point = (this.end_point + _matrix.height) % this._float32Matrix.height;
//         this.data_length = Math.min(this.data_length + _matrix.height, this._float32Matrix.height);
//         for (let i = 1; i < Math.min(_matrix.height, this._float32Matrix.height) + 1; i += 1) {
//             for (let j = 0; j < _matrix.width; j += 1) {
//                 this._float32Matrix.set((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j, _matrix.get(_matrix.height - i, j));
//             };
//         };
//         return true;
//     };


//     toMatrix = () => {
//         let _matrix = new Float32Matrix(this.data_length, this._float32Matrix.width);
//         for (let i = 1; i < _matrix.height + 1; i += 1) {
//             for (let j = 0; j < _matrix.width; j += 1) {
//                 _matrix.set(_matrix.height - i, j, this._float32Matrix.get((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j));
//             };
//         };
//         return _matrix;
//     };

//     toArray = () => {
//         let list = new Array(this.data_length);
//         for (let i = 1; i < list.length + 1; i += 1) {
//             list[list.length - i] = new Float32Array(this._float32Matrix.width);
//             for (let j = 0; j < this._float32Matrix.width; j += 1) {
//                 list[list.length - i][j] = this._float32Matrix.get((this._float32Matrix.height + this.end_point - i) % this._float32Matrix.height, j);
//             };
//         };
//         return list;
//     };
// };

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

const CyclicFloat32Array = getCyclicTypedArrayClass(Float32Array);
// const CyclicUint8ClampedArray = getCyclicTypedArrayClass(Uint8ClampedArray);

const Float32Matrix = getTypedArrayMatrixClass(Float32Array);
const CyclicFloat32Matrix = getCyclicTypedArrayMatrixClass(Float32Array);

export { CyclicImageData, CyclicFloat32Array, CyclicFloat32Matrix, Float32Matrix }
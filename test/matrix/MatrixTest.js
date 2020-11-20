class Matrix {
    constructor(rowsN, columnsN) {
        this.rowsN = rowsN; //矩阵行数
        this.columnsN = columnsN; //矩阵列数
        this.array = new Array(rowsN * columnsN);//储存矩阵数据的一维数组;
    };

    getValue(i, j) {
        // 获取矩阵中位置在(i,j)的数据
        return array[i * rowsN + j];
    };
};

function doSomething(value) {
    console.log(value);
};

//先行后列
/**
 * 
 * @param {Matrix} matrix Matrix
 * @param {Int32Array} subBorder [beginRow, beginColumn, endRow, endColumn]
 * @param {Function} fn (v) => {...}
 * 
 * Example: Matrix:[ 1, 2, 3,
 *                   4, 5, 6,
 *                   7, 8, 9,
 *                   10, 11, 12]
 *         subBorder:[1,0,2,2]
 *         fn:(v) => {console.log(v)}
 *         
 *          [4, 5,
 *           7, 8,
 *           10, 11]
 */
function traverseSubMatrixRC1(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = subBorder;
    let curRow = beginRow;
    while (curRow < endRow) {
        let curColumn = beginColumn;
        while (curColumn < endColumn) {
            fn(M.array[curRow * M.columnsN + curColumn]);
            curColumn += 1;
        };
        curRow += 1;
    };
};


function traverseSubMatrixRC2(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = subBorder;
    let curRowI = beginRow * M.columnsN;
    let curI;
    while (curRowI < endRow * M.columnsN) {
        curI = curRowI + beginColumn;
        while (curI < curRowI + endColumn) {
            fn(M.array[curI]);
            curI += 1;
        };
        curRowI += M.columnsN;
    };
};

//先列后行
function traverseSubMatrixCR1(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = subBorder;
    let curColumn = beginColumn;
    while (curColumn < endColumn) {
        let curRow = beginRow;
        while (curRow < endRow) {
            fn(M.array[curRow * M.columnsN + curColumn]);
            curRow += 1;
        };
        curColumn += 1;
    };
};

function traverseSubMatrixCR2(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = subBorder;
    let curColumnI = beginColumn;
    let curI;
    while (curColumnI < endColumn) {
        curI = beginRow * M.columnsN + curColumnI;
        while (curI < endRow * M.columnsN + curColumnI) {
            fn(M.array[curI]);
            curI += M.columnsN;
        };
        curColumnI += 1;
    };
};

/**
 * 方案一：设计imagedata循环缓冲区；只允许纵轴拼接，但是最后取出操作支持实时转置。
 * 方案二：设计imagedata循环缓冲区；允许横轴拼接，拼接时实时转置，最后取出操作直接取出。
 */


//按行拼接
//先行后列
function traverseSubMatrix(matrix, submatrix, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = [start_point, 0, end_point, M.columnsN];

    let curI = beginRow * M.columnsN;
    while (curI < endRow * M.columnsN) {
        fn(M.array[curI]);
        curI += 1;
    };

    const subM = submatrix;
    let sub_curI = 0;
    while (sub_curI < subM.array.length) {
        fn(subM.array[sub_curI]);
        sub_curI += 1;
    };
};
//先列后行
function traverseSubMatrix(matrix, submatrix, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = [start_point, 0, end_point, M.columnsN];
    let curColumnI = 0;
    let curI;
    while (curColumnI < M.columnsN) {
        curI = beginRow * M.columnsN + curColumnI;
        while (curI < endRow * M.columnsN + curColumnI) {
            fn(M.array[curI]);
            curI += M.columnsN;
        };
        curColumnI += 1;
    };

    const subM = submatrix;
    let subcurColumnI = 0;
    let subcurI;
    while (subcurColumnI < subM.columnsN) {
        subcurI = subcurColumnI;
        while (subcurI < subM.array.length) {
            fn(subM.array[subcurI]);
            subcurI += subM.columnsN;
        };
        subcurColumnI += 1;
    };
};


//按列拼接
//先行后列
function traverseSubMatrix(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = [0, start_point, M.rowsN, end_point];
    let curRowI = 0;
    let curI;
    while (curRowI < M.array.length) {
        curI = curRowI + beginColumn;
        while (curI < curRowI + endColumn) {
            fn(M.array[curI]);
            curI += 1;
        };
        curRowI += M.columnsN;
    };

    const subM = submatrix;
    const [beginRow, beginColumn, endRow, endColumn] = [0, 0, subM.rowsN, subM.columnsN];
    let subcurI = 0;
    while (subcurI < subM.array.length) {
        fn(subM.array[subcurI]);
        subcurI += 1;
    };
};
//先列后行
function traverseSubMatrix(matrix, subBorder, fn = (value) => { }) {
    const M = matrix;
    const [beginRow, beginColumn, endRow, endColumn] = [0, start_point, M.rowsN, end_point];
    let curColumnI = beginColumn;
    let curI;
    while (curColumnI < endColumn) {
        curI = curColumnI;
        while (curI < M.array.length) {
            fn(M.array[curI]);
            curI += M.columnsN;
        };
        curColumnI += 1;
    };

    const subM = submatrix;
    const [beginRow, beginColumn, endRow, endColumn] = [0, 0, subM.rowsN, subM.columnsN];
    let subcurColumnI = 0;
    let subcurI;
    while (subcurColumnI < subM.columnsN) {
        subcurI = subcurColumnI;
        while (subcurI < subM.array.length) {
            fn(subM.array[curI]);
            subcurI += subM.columnsN;
        };
        subcurColumnI += 1;
    };
};
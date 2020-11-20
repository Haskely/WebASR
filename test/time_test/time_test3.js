import { time_fn } from '../test_utils.js';

const len = 100;
const es = [];
// for (let i = 0; i < 1000; i++) {
//     es.push(Math.round(Math.random() * 200 - 100));
// };
for (let i = 0; i < 200; i++) {
    es.push(i - 100);
};
const N = Math.round(10 ** 8 / es.length);
function test_aa(fn) {
    console.log(`\n测试${fn.name}:`)
    for (let e of [-158, -57, 0, 1, 55, 156]) {
        console.log(`对${e}计算：${fn(e)}`);
    };
    console.log(`测试${N}次：`);
    for (let n = 0; n < N; n += 1) {
        for (let e of es) {
            fn(e);
        };
    };
};

function div_(e) {
    return (len + e) % len;
};

function safe_div_(e) {
    e = e % len;
    return (len + e) % len;
};

function ju_(e) {
    return e < 0 ? len + e : e;
};
function safe_ju_(e) {
    if (e < len && e > -len) {
        return e < 0 ? len + e : e;
    } else {
        return null;
    }
};

function safe_divju_(e) {
    e = e % len;
    return e < 0 ? len + e : e;
};

function test() {
    for (let fn of [div_, ju_, safe_div_, safe_ju_, safe_divju_]) {
        time_fn(test_aa, fn);
    };
};

window.es = es;
window.test = test;

test();


function createElement(tagName, attrs) {
    const el = document.createElement(tagName);
    for (let attrName in attrs) {
        el.setAttribute(attrName, attrs[attrName]);
    };
    return el;
};

function createElementNS(tagName, attrs, namespaceURI) {
    const el = document.createElementNS(namespaceURI, tagName);
    for (let attrName in attrs) {
        el.setAttribute(attrName, attrs[attrName]);
    };
    return el;
};

const curURL = new Error().stack.match(/([^ \n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)[0];
const baseURI = new URL('../', curURL).href;

export { createElement, createElementNS, baseURI };
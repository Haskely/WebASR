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

export { createElement, createElementNS };
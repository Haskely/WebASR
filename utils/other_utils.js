

function body_append(tagName, id = null, attrs = {}, innerHtml = '') {
    const new_element = document.createElement(tagName);
    attrs.id = id;
    for (attrName in attrs) {
        if (attrs[attrName]) new_element.setAttribute(attrName, attrs[attrName]);
    };
    new_element.innerHtml = innerHtml;
    document.body.appendChild(new_element);
    return new_element;
};
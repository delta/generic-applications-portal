"use strict";

let cheerio = require("cheerio");
let fs = require("fs");
let $ = cheerio.load(fs.readFileSync("./sample.html", { encoding: "utf8" }));

class Node {
    constructor(children) {
        this.children = children;
    }
    render() {
        return "<h1>Not implemented</h1>";
    }
}

function error(msg) {
    alert(msg);
    throw new Error(msg);
}

class ApplicationNode extends Node {
    constructor(attributes, children) {
        this.attributes = {};
        this.children = [];

        // parse attributes
        for(let attr of attributes) {
            if (typeof this[attr.name] !== 'function') {
                error(`Unexpected attribute ('${attr.name}' = '${attr.value}') while parsing ApplicationNode`);
            } else {
                // store the function returned by this[attr.name]() as the attribute value.
                this.attributes[attr.name] = this[attr.name](attr.value);
            }
        }

        // parse children
        for(let child of children) {
            if (typeof nodeTypes[child.name] !== 'function') {
                error(`Unexpected child node type '${child.name}' while parsing ApplicationNode`);
            } else {
                let childNode = new nodeTypes[child.name](child);
                this.children.push(childNode);
            }
        }
    }
    render() {
        let childrenHtml = "";
        for(let child of this.children) {
            childrenHtml += child.render();
        }
        return this.wrapper().replace("${children}", childrenHtml);
    }
}

$('input').map((i, el) => console.log(el.attribs));

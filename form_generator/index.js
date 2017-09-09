"use strict";

let indicative = require("indicative");
let cheerio = require("cheerio");
let fs = require("fs");
let html = fs.readFileSync("./sample.html", { encoding: "utf8" });
let layout = fs.readFileSync("./layout.html", { encoding: "utf8" });

let $ = cheerio.load(html, { ignoreWhitespace: true });

function error(msg) {
    console.error(msg);
    throw new Error(msg);
}

// This object is a stub. It will be created in the generated script
// and will always have an up-to-date collection of values in the form.
// Values can be accessed using $f.inputName.
// Haven't fixed what the value will be for file inputs.
let $f = {

};

// This object will be created in the generated script and will contain
// rule strings for each of the input fields.
// Format: { inputName: "required|string" } etc
let rules = {

}

// This object will be created in the generated script and will contain
// for each input element, a list of functions to be called every time
// the element's value changes. CLIENT-SIDE ONLY.
let triggers = {

};

// This object will be created in the generated script and will contain
// for each input element, a list of functions to be called every time
// the element's validate function fires. CLIENT-SIDE ONLY.
let onValidates = {

};

// This is used to store all the misc scripts that get created while generating
// the form. These are then concatenated and put into resulting html form
// as a script tag.
let scripts = [];

function addTrigger(el, func) {
    this.triggers[el] = this.triggers[el] || [];
    this.triggers[el].push(func);
}

function validate(name) {
    let myData = {};
    let myRules = {};

    myData[name] = $f[name];
    myRules[name] = rules[name];

    // same handler will handle both validation success and validation failure
    indicative.validate(myData, myRules, {
        required: '{{field}} is required to complete registeration process',
    })
        .then(onValidates[name])
        .catch(onValidates[name]);
}

class Manager {
    constructor() {
        this.nodeList = {};
    }
    addValidationRule(ruleName, func) {
        rules[ruleName] = func;
    }
    registerNode(nodeName, nodeTransformer) {
        this.nodeList[nodeName] = nodeTransformer;
    }
    transformNode(node) {
        let transformer = this.nodeList[node.name];
        if (!transformer) {
            if (node.type == 'tag') {
                transformer = new NodeTransformer(node);
                let innerHtml = transformer.transformChildren();
                $(node).html(innerHtml);
            }
            return $.html(node); // now return the outer html
        }
        return (new transformer(node)).transform();
    }
}

let manager = new Manager();

class NodeTransformer {
    constructor(node) {
        this.name = node.attribs.name;
        this.node = node;
        this.$node = $(node);
    }
    consumeAttr(attr) {
        let val = this.$node.attr(attr);
        this.$node.attr(attr, null);
        return val;
    }
    transform() {
        return $.html(this.$node)
    }
    transformChildren() {
        let html = "";
        for(let child of this.node.children) {
            html += manager.transformNode(child);
        }
        return html;
    }
}

class ApplicationNodeTransformer extends NodeTransformer {
    transform() {
        let navHtml = `<div class="nav flex-column nav-pills" id="v-pills-tab" role="tablist">`;
        let bodyHtml = `<div class="tab-content" id="v-pills-tabContent">`;

        let isFirst = true;
        let sections = this.$node.children("section");
        for (let i = 0; i < sections.length; i++) {
            let child = sections[i];
            let name = child.attribs.name;
            let dashedName = name.replace(/ /g, "-");
            navHtml += `<a class="nav-link ${isFirst ? 'active' : ''}" id="v-pills-${dashedName}-tab" data-toggle="pill" href="#v-pills-${dashedName}" role="tab" aria-controls="v-pills-${dashedName}" aria-expanded="true">${name}</a>`;
            bodyHtml += `<div class="tab-pane fade ${isFirst ? "show active" : ""}" id="v-pills-${dashedName}" role="tabpanel" aria-labelledby="v-pills-${dashedName}-tab">${manager.transformNode(child)}</div>`;
            
            isFirst = false;
        }
        navHtml += "</div>";
        bodyHtml += "</div>";

        return `<div class="container-fluid" style="margin-top: 10px">
            <div class="row">
                <div class="col-2">${navHtml}</div>
                <div class="col-10">${bodyHtml}</div>
            </div>
        </div>`;
    }
}

class SectionNodeTransformer extends NodeTransformer {
    transform() {
        let showIf = this.consumeAttr("showif");

        return `<form>
            <div class='section'>
                <h2 style="padding-bottom: 10px; border-bottom: 2px solid black">${this.name}</h2>
                ${this.transformChildren()}
                <div class="text-center row"><button type="submit" class="btn btn-primary" style="margin: 15px auto">Save</button></div>
            </div>
        </form>`;
    }
}

class SubsectionNodeTransformer extends NodeTransformer {
    transform() {
        return `<div class='subsection' id="${this.name}">
            <br><h4 style="color: #1bbae1">&gt; ${this.name}</h4><br>
            ${this.transformChildren()}
        </div>`;
    }
}

class FieldsetNodeTransformer extends NodeTransformer {
    transform() {
        let label = this.consumeAttr('name');
        if (label) {
            return `<div class="form-group form-inline row">
                <label class="col-form-label col-md-2">${label}</label>
                <div class="col-md-10 row">${this.transformChildren()}</div></div>`;
        }
        return `<div class="form-group row">
        <div class="col row">${this.transformChildren()}</div></div>`;
    }
}

class InputNodeTransformer extends NodeTransformer {
    processJsValidationRules(validationRules) {
        if (validationRules && /js:/.test(validationRules)) {
            validationRules = validationRules.split("|");
            for (let rule of validationRules) {
                if (/^js:/.test(rule)) { // custom rule. wrap in a function.
                    // first do one-time checking if the rule refers to non-existing elements
                    // js: $f.salary + $f.dadSalary >= $f.maxSalary
                    let matches = rule.match(/\$f.[^ ]+/g);
                    for (let match of matches) {
                        match = match.substr(2); // '$f.something'. Start from index 2
                        if ($(`[name=${match}]`).length == 0) {
                            error(`${this.name} uses a validation rule that refers to non-existing element ${match}`)
                        }
                        addTrigger(match, () => {
                            validate(this.name);
                        });
                    }
                    // The pre-registered 'js' rule in indicative will then
                    // use eval() to evaluate the js expression. 
                }
            }
        }
    }
    createLabelAndRequiredAsterisk(isRequired) {
        let label = this.consumeAttr('label');  
        let cols = this.consumeAttr('cols');
        let inputCols = cols || "";
        let html = "";

        // if label attr doesn't exist and 'cols' indicates we should use a label,
        // then use the name of the element as the label.
        // Useful as it simplifies the markup
        if (inputCols.indexOf(",") != -1 && !label) {
            label = this.name;
        }
        if (!this.node.attribs.placeholder) {
            if (label)
                this.node.attribs.placeholder = label;
            else 
                this.node.attribs.placeholder = this.name;            
        }
        if (label) {
            if (cols.split(",").length != 2) {
                error(`Invalid cols value for ${this.name}. Since 'label' is set, cols must be a pair of values.`);
            }
            cols = cols.split(",");
            inputCols = cols[1];
            if ((isRequired || this.node.attribs.required !== undefined) && !this.node.attribs.hidden) {
                label += "<span style='color:red'>*</span>";
            }
            html += `<label class="col-form-label col-md-${cols[0]}" for="${this.name}">${label}</label>`;
        }
        let star = "";
        let inputElem = "";
        if (cols) {
            inputElem = `<div class="col-md-${inputCols}">${$.html(this.$node) + this.getErrorElement()}</div>`;
        } else {
            inputElem = $.html(this.$node) + this.getErrorElement();
        }
        return html + inputElem;
    }
    getErrorElement() {
        let name = this.node.attribs.name;

        onValidates[name] = `(err) => {
            if (!err) $("#error-${name}").hide();
            else      $("#error-${name}").show().html(err[0].message);
        }`;

        return `<span class="error" id="error-${name}" style="display:none">Error</span>`;
    }
    transform() {
        let attrs = this.node.attribs;
        let name = attrs.name;

        let validationRules = this.consumeAttr('validationrule');
        manager.addValidationRule(name, validationRules);
        this.processJsValidationRules(validationRules);

        this.$node.attr("onblur", `validate('${name}')`);
        this.$node.attr("onchange", `$f["${name}"] = this.value`);
        this.$node.attr("id", name);
        if (attrs.type != 'file') {
            this.$node.addClass("form-control form-control-sm");
        } else {
            this.$node.addClass("form-control-file");            
        }

        if (this.$node.hasClass("form-control-plaintext")) {
            this.$node.removeClass("form-control");
        }

        let html = this.createLabelAndRequiredAsterisk(/required/.test(validationRules));
        return html;
    }
}

class SelectNodeTransformer extends InputNodeTransformer {
    transform() {
        let attrs = this.node.attribs;
        let name = attrs.name;

        let validationRules = this.consumeAttr('validationrule');
        manager.addValidationRule(name, validationRules);
        this.processJsValidationRules(validationRules);
        
        this.$node.attr("onblur", `validate("${name}")`);
        this.$node.attr("id", name);
        this.$node.addClass("custom-select form-control form-control-sm");

        this.$node.prepend(`<option>${attrs.placeholder}</option>`);

        let html = this.createLabelAndRequiredAsterisk(/required/.test(validationRules));
        return html;
    }
}

class TableInputNodeTransformer extends NodeTransformer {
    transform() {
        let minCount = this.node.attribs.mincount || 1;
        let maxCount = this.node.attribs.maxcount || 100; // good enough upper limit

        let compiledElements = [];
        for (let i = 0; i < this.node.children.length; i++) {
            let child = this.node.children[i];
            if (child.type != 'tag') continue;
            if (child.attribs === undefined) {
                error(child);
            }
            child.attribs.name += "[{{count}}]";
            compiledElements.push({
                name: child.attribs.name,
                validationrule: child.attribs.validationrule,
                html: manager.transformNode(child)
            });
        }
        
        let nColumns = this.node.children.length;
        let html = `<table id="${this.name}"><thead><tr>`;

        for (let i = 0; i < this.node.children.length; i++) {
            let child = this.node.children[i];
            if (child.type != 'tag') continue;
            let width = child.attribs.width || "auto";
            let label = child.attribs.label || child.attribs.name; // if label is empty, default to name.
            label = label.replace("[{{count}}]", '');
            html += `<th style="width:${width}">${label}</th>`;
        }

        html += `<th>
            <a role="button" href="#" class="btn btn-outline-success btn-sm" title='Add row' id="rowAdder_${this.name}" onclick="addRow_${this.name}(event)">
                <span class="fa fa-plus-square"></span>
            </a>
            </th></tr></thead></table>`; // rows will be added by the client.

        // Will be run in the context of the browser. Won't have access
        // to server side variables.
        scripts.push(`
        let nRows_${this.name} = 0;
        let nRows_${this.name}_real = 0;
        function delRow_${this.name}(event, rowNumber) {
            let rowId = "${this.name}-" + rowNumber;
            $("#" + rowId).remove();
            nRows_${this.name}_real--;
            if (nRows_${this.name}_real < ${maxCount}) {
                $("#rowAdder_${this.name}").attr('disabled', false);
            }
            event && event.preventDefault();
            event && event.stopPropagation();
            return false;
        }
        function addRow_${this.name}(event) {
            // create every element in the row
            // add each element to the rules array
            // NOT-SUPPORTED: call addTrigger on each element
            // add function to onValidates for each element
            // add each element to the $f object

            let nRows = ++nRows_${this.name};
            let rowId = "${this.name}-" + nRows;
            let elements = ${JSON.stringify(compiledElements)};
            if (nRows > ${minCount}) {
                // while removing we only remove the element in the DOM, 
                // and don't clean up onValidates, $f, rules variables for simplicity.
                elements.push({
                    name: 'delRow',
                    validationrule: '',
                    html: "<a role='button' href='#' title='Delete row' class='btn btn-outline-danger btn-sm' onclick='delRow_${this.name}(event, " + nRows + ")'><span class='fa fa-minus-circle'></span></a>"
                });
            }
            if (nRows_${this.name}_real + 1 >= ${maxCount}) {
                $("#rowAdder_${this.name}").attr('disabled', 'true');
            }
            let rowHtml = "<tr id='" + rowId + "'>";
            for (let i = 0; i < elements.length; i++) {
                let elemName = elements[i].name.replace(/\{\{count\}\}/g, nRows_${this.name});

                let elemHtml = elements[i].html.replace(/\{\{count\}\}/g, nRows_${this.name});
                rowHtml += "<td>" + elemHtml + "</td>";

                rules[elemName] = elements[i].validationrule;
                onValidates[elemName] = (err) => {
                    if (!err) $("#error-" + elemName).hide();
                    else      $("#error-" + elemName).show().html("Error!");
                };

                $f[elemName] = "";
            }
            rowHtml += "</tr>";

            // finally append the row to the table
            $("#${this.name}").append(rowHtml);

            event && event.preventDefault();
            event && event.stopPropagation();

            return false;
        }
        
        for (let i = 0; i < ${minCount}; i++)
            addRow_${this.name}();
        `);
        
        return html;
    }
}

manager.registerNode('application', ApplicationNodeTransformer);
manager.registerNode('section',     SectionNodeTransformer);
manager.registerNode('subsection',  SubsectionNodeTransformer);
manager.registerNode('fieldset',    FieldsetNodeTransformer);
manager.registerNode('input',       InputNodeTransformer);
manager.registerNode('textarea',    InputNodeTransformer);
manager.registerNode('select',      SelectNodeTransformer);
manager.registerNode('tableinput',  TableInputNodeTransformer);


function stringifyObject(obj) {
    if (typeof obj == "function") {
        return String(obj);
    } else if (typeof obj == "string") {
        return obj;
    } else {
        let str = "{";
        for (var key in obj) {
            str += `"${key}": ${stringifyObject(obj[key])},`;
        }
        return str + "}";
    }
}

layout = layout.replace(/\{\{body\}\}/, manager.transformNode($("application")[0]));
layout = layout.replace(/\{\{script\}\}/, `
<script type='text/javascript' src='js/indicative_bundle.js'></script>
<script type='text/javascript'>
let $f = ${JSON.stringify($f)};
let rules = ${JSON.stringify(rules)};
let triggers = ${stringifyObject(triggers)};
let onValidates = ${stringifyObject(onValidates)};
let validate = ${stringifyObject(validate)};

indicative.extend('js', (data, field, message, args) => {
    let code = args.join(","); // in case there was a ',' in code, and indicative thought it 
                               // was indicative of separating an argument instead of part
                               // of js code itself
    if (eval(code)) {
        return Promise.resolve('');
    }
    return Promise.reject('Invalid data');
});

${scripts.join("\n\n")};
</script>`);

console.log(layout);
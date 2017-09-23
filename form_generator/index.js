"use strict";

const indicative = require("indicative");
const cheerio = require("cheerio");
const fs = require("fs");
const inputHtml = fs.readFileSync("./sample.html", { "encoding": "utf8" });

const $ = cheerio.load(inputHtml, { "ignoreWhitespace": true });

const error = (msg) => {
  console.error(msg);
  throw new Error(msg);
};

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

};

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

const addTrigger = (el, func) => {
  triggers[el] = triggers[el] || [];
  triggers[el].push(func);
};

const validate = (name) => {
  let myData = {};
  let myRules = {};

  myData[name] = $f[name];
  myRules[name] = rules[name];

  // same handler will handle both validation success and validation failure
  indicative.validate(myData, myRules, {
    "required": "{{field}} is required to complete registeration process",
  })
    .then(onValidates[name])
    .catch(onValidates[name]);
};

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
    let Transformer = this.nodeList[node.name];

    if (!Transformer) {
      if (node.type === "tag") {
        Transformer = new NodeTransformer(node);
        let innerHtml = Transformer.transformChildren();

        $(node).html(innerHtml);
      }
      return $.html(node); // now return the outer html
    }
    return (new Transformer(node)).transform();
  }
}

let manager = new Manager();

class NodeTransformer {
  constructor(node) {
    this.originalName = node.attribs.name || "";
    this.name = this.originalName.replace(/[^a-zA-Z0-9_]/g, "");
    this.node = node;
    this.$node = $(node);
  }
  consumeAttr(attr) {
    let val = this.$node.attr(attr);

    this.$node.attr(attr, null);
    return val;
  }
  transform() {
    return $.html(this.$node);
  }
  transformChildren() {
    let html = "";

    for (let child of this.node.children) {
      html += manager.transformNode(child);
    }
    return html;
  }
}

class ApplicationNodeTransformer extends NodeTransformer {
  transform() {
    let navHtml = "<div class=\"nav flex-column nav-pills\" id=\"v-pills-tab\" role=\"tablist\">";
    let bodyHtml = "<div class=\"tab-content\" id=\"v-pills-tabContent\">";

    let isFirst = true;
    let sections = this.$node.children("section");

    for (let i = 0; i < sections.length; i++) {
      let child = sections[i];
      let name = child.attribs.name;
      let dashedName = name.replace(/ /g, "-");

      navHtml += `<a class="nav-link ${isFirst ? "active" : ""}" id="v-pills-${dashedName}-tab" data-toggle="pill" href="#v-pills-${dashedName}" role="tab" aria-controls="v-pills-${dashedName}" aria-expanded="true">${name}</a>`;
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
    return `<form>
            <div class='section'>
                <h2 style="padding-bottom: 10px; border-bottom: 2px solid black">${this.originalName}</h2>
                ${this.transformChildren()}
                <div class="text-center row"><button type="submit" class="btn btn-primary" style="margin: 15px auto">Save</button></div>
            </div>
        </form>`;
  }
}

class SubsectionNodeTransformer extends NodeTransformer {
  transform() {
    return `<div class='subsection' id="${this.name}">
            <br><h4 style="color: #1bbae1">&gt; ${this.originalName}</h4><br>
            ${this.transformChildren()}
        </div>`;
  }
}

class FieldsetNodeTransformer extends NodeTransformer {
  transform() {
    let label = this.originalName;

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
  constructor(node) {
    super(node);
    $f[this.name] = "";
  }
  processJsValidationRules(validationRules) {
    if (validationRules && /js:/.test(validationRules)) {
      const splitValidationRules = validationRules.split("|");

      for (let rule of splitValidationRules) {
        if (/^js:/.test(rule)) { // custom rule. wrap in a function.
          // first do one-time checking if the rule refers to non-existing elements
          // js: $f.salary + $f.dadSalary >= $f.maxSalary
          let matches = rule.match(/\$f.[^ ]+/g);

          for (let match of matches) {
            match = match.substr(2); // '$f.something'. Start from index 2
            if ($(`[name=${match}]`).length === 0) {
              error(`${this.name} uses a validation rule that refers to non-existing element ${match}`);
            }
            addTrigger(match, `() => {
              validate(${this.name});
            }`);
          }
          // The pre-registered 'js' rule in indicative will then
          // use eval() to evaluate the js expression.
        }
      }
    }
  }
  createLabelAndRequiredAsterisk(isRequired) {
    let label = this.consumeAttr("label");
    let cols = this.node.attribs.cols || "";
    let html = "";

    // if label attr doesn't exist and 'cols' indicates we should use a label,
    // then use the name of the element as the label.
    // Useful as it simplifies the markup
    if (cols.indexOf(",") !== -1 && !label) {
      label = this.originalName;
    }
    if (!this.node.attribs.placeholder) {
      if (label) {
        this.node.attribs.placeholder = label;
      } else {
        this.node.attribs.placeholder = this.originalName;
      }
    }
    if (label) {
      if (cols.split(",").length !== 2) {
        error(`Invalid cols value for ${this.name}. Since 'label' is set, cols must be a pair of values.`);
      }
      cols = cols.split(",");
      if ((isRequired || this.node.attribs.required !== undefined) && !this.node.attribs.hidden) {
        label += "<span style='color:red'>*</span>";
      }
      html += `<label class="col-form-label col-md-${cols[0]}" for="${this.name}">${label}</label>`;
    }
    return html;
  }
  createInputElement() {
    let cols = this.consumeAttr("cols");
    let inputCols = cols || "";

    // Check if the cols is a pair of values, if it is take the second value for
    // creating the input element
    if (inputCols.indexOf(",") !== -1) {
      inputCols = cols.split(",")[1];
    }

    if (cols) {
      return `<div class="col-md-${inputCols}">${$.html(this.$node) + this.getErrorElement()}</div>`;
    }
    return $.html(this.$node) + this.getErrorElement();
  }
  createLabelAndInput(isRequired) {
    return this.createLabelAndRequiredAsterisk(isRequired) + this.createInputElement();
  }
  getErrorElement() {
    let name = this.node.attribs.name;

    onValidates[name] = `(err) => {
        if (!err) $("#error-${name}").hide();
        else      $("#error-${name}").show().html(err[0].message);
    }`;

    return `<span class="error" id="error-${name}" style="display:none">Error</span>`;
  }
  addEventHandlersAndId() {
    addTrigger(this.name, `function(event) { $f["${this.name}"] = $("#${this.name}").val(); validate('${this.name}'); }`);
    this.$node.attr("onchange", `triggers["${this.name}"].forEach(function(f, i) { f.call(this, event) });`);
    this.$node.attr("id", this.name);
  }
  transform() {
    let attrs = this.node.attribs;
    
    if (attrs.type === "file") {
      return (new FileInputNodeTransformer(this.node)).transform();
    }

    let name = this.name;

    let validationRules = this.consumeAttr("validationrule");

    this.addEventHandlersAndId();
    
    manager.addValidationRule(name, validationRules);
    this.processJsValidationRules(validationRules);

    this.$node.attr("onblur", `validate('${name}')`);
    this.$node.attr("onchange", `$f["${name}"] = this.value`);
    this.$node.attr("id", name);

    this.$node.addClass("form-control form-control-sm");

    if (this.$node.hasClass("form-control-plaintext")) {
      this.$node.removeClass("form-control");
    }

    return this.createLabelAndInput(/required/.test(validationRules));
  }
}

class SelectNodeTransformer extends InputNodeTransformer {
  transform() {
    let attrs = this.node.attribs;
    let name = attrs.name;
    let validationRules = this.consumeAttr("validationrule");

    manager.addValidationRule(name, validationRules);
    this.processJsValidationRules(validationRules);
        
    this.$node.attr("onblur", `validate("${name}")`);
    this.$node.attr("id", name);
    this.$node.addClass("custom-select form-control form-control-sm");

    this.$node.prepend(`<option>${attrs.placeholder}</option>`);

    let html = this.createLabelAndInput(/required/.test(validationRules));

    return html;
  }
}

class FileInputNodeTransformer extends InputNodeTransformer {
  createInputElement() {
    let cols = this.consumeAttr("cols");
    let inputCols = cols || "";
    let previewCols = this.node.attribs.preview || 0;

    if (inputCols.indexOf(",") !== -1) {
      inputCols = cols.split(",")[1];
    }

    let displayPreview = ""; //Stores the commands required for displaying the preview
        
    // Check whether a preview of the input should be displayed
    // If yes, update the displayPreview variable and 
    // add it to the toggleRemoveButtonAndPreview function 
    if (this.node.attribs.preview !== undefined) {
      displayPreview = `
                let file = files[0];
                let reader = new FileReader();
                reader.onload = function(e) {
                    $("#filePreview_${this.name}").html($('<img>', {
                        src: e.target.result,
                        style: "width:100%;"
                    }));
                };
                reader.readAsDataURL(file);
            `;
    }

    scripts.push(`
            function toggleRemoveButtonAndPreview_${this.name}(event) {
              // Display the preview and remove button if a file has been selected
              // Else hide them
              let files = $("#${this.name}")[0].files;
              if( files === undefined || !files.length) {
                  $("#removeUploadButton_${this.name}").hide();
                  $("#filePreview_${this.name}").hide();
              } else {
                  ${displayPreview}
                  $("#removeUploadButton_${this.name}").show();
                  $("#filePreview_${this.name}").show();
              }
              event && event.stopPropagation();
              event && event.preventDefault();
              return false;
            }
            function removeUpload_${this.name}(event) {
              // Reset the file input's value and call the toggleRemoveButtonAndPreview
              // to remove the preview and remove button
              $("#${this.name}")[0].value = "";
              toggleRemoveButtonAndPreview_${this.name}();
              $f["${this.name}"] = null;

              event && event.stopPropagation();
              event && event.preventDefault();
              return false;
            }
            // Call the function to hide both the remove button and preview
            // initially. Will be helpful to automatically display them when
            // we get the uploaded values from server also.
            toggleRemoveButtonAndPreview_${this.name}();
        `);

    let markup = `
            <div class="row">
                <div class="col-md-6">${$.html(this.$node)}</div>
                <div class="col-md-${previewCols}" id="filePreview_${this.name}"></div>
                <div class="col-md-1">
                    <a role='button' href='#' id="removeUploadButton_${this.name}" title='Remove upload' class='btn btn-outline-danger btn-sm' onclick='removeUpload_${this.name}(event)'><span class='fa fa-minus-circle'></span></a>
                </div>
            </div>
            <div> ${this.getErrorElement()} </div>`;

    if (cols) {
      return `<div class="col-md-${inputCols}">${markup}</div>`;
    }
    return markup;
  }

  transform() {
    let name = this.node.attribs.name;

    // Add the necessary validation rules
    let validationRules = this.consumeAttr("validationrule");

    manager.addValidationRule(name, validationRules);
    this.processJsValidationRules(validationRules);

    // Define the event listeners for the input element
    // this.$node.attr("onblur", `validate("${name}")`);
    this.$node.attr("onchange", `$f["${name}"] = (this.files)?this.files[0]:null; toggleRemoveButtonAndPreview_${this.name}(); validate('${name}');`);
        
    // Define the classes and id for the input element
    this.$node.attr("id", name);
    this.$node.addClass("form-control-file");

    return this.createLabelAndInput(/required/.test(validationRules));
  }
}

class TableInputNodeTransformer extends NodeTransformer {
  transform() {
    let minCount = this.node.attribs.mincount || 1;
    let maxCount = this.node.attribs.maxcount || 100; // good enough upper limit

    let compiledElements = [];

    for (let i = 0; i < this.node.children.length; i++) {
      let child = this.node.children[i];

      if (child.type !== "tag") {
        continue;
      }
      if (child.attribs === undefined) {
        error(child);
      }
      child.attribs.name += "[{{count}}]";
      compiledElements.push({
        "name": child.attribs.name.replace(/[^a-zA-Z0-9_]/g, ""),
        "validationrule": child.attribs.validationrule,
        "html": manager.transformNode(child),
      });
    }

    const nColumns = this.node.children.length;
    let html = `<table id="${this.name}"><thead><tr>`;

    for (let i = 0; i < nColumns; i++) {
      let child = this.node.children[i];

      if (child.type !== "tag") continue;
      let width = child.attribs.width || "auto";
      let label = child.attribs.label || child.attribs.name; // if label is empty, default to name.

      label = label.replace("[{{count}}]", "");
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
                let elemName = elements[i].name.replace(/\\{\\{count\\}\\}/g, nRows_${this.name});

                let elemHtml = elements[i].html.replace(/\\{\\{count\\}\\}/g, nRows_${this.name});
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

manager.registerNode("application", ApplicationNodeTransformer);
manager.registerNode("section", SectionNodeTransformer);
manager.registerNode("subsection", SubsectionNodeTransformer);
manager.registerNode("fieldset", FieldsetNodeTransformer);
manager.registerNode("input", InputNodeTransformer);
manager.registerNode("textarea", InputNodeTransformer);
manager.registerNode("select", SelectNodeTransformer);
manager.registerNode("tableinput", TableInputNodeTransformer);


const stringifyObject = (obj) => {
  if (typeof obj == "function") {
    return String(obj);
  }
  if (typeof obj == "string") {
    return obj;
  }
  if (obj.constructor === Array) {
    let str = "[";

    for (let i = 0; i < obj.length; i++) {
      str += stringifyObject(obj[i]) + ",";
    }
    str = str + "]";
    return str;
  }

  let str = "{";
  
  for (let key in obj) {
    str += `"${key}": ${stringifyObject(obj[key])},`;
  }
  return `${str}}`;
};

let layout = fs.readFileSync("./layout.html", { "encoding": "utf8" });

layout = layout.replace(/\{\{body\}\}/, manager.transformNode($("application")[0]));
layout = layout.replace(/\{\{script\}\}/, `
<script type='text/javascript' src='js/indicative_bundle.js'></script>
<script type='text/javascript'>
let $f = ${JSON.stringify($f)};
let rules = ${JSON.stringify(rules)};
let triggers = { ${Object.keys(triggers).map((x) => x + ": [" + triggers[x].join(",") + "]").join(",")} };
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

indicative.extend('requiredFile', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        return resolve('');
    });
});

indicative.extend('fileMimeType', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        
        for(let i in args) {
            if(file.name.endsWith("." + args[i]))
                return resolve("");
        }
        return reject('Not a valid file. Please upload files of type ' + args);
    });
});

indicative.extend('fileSize', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        
        if(file.size/1024 > args[0])
            return reject('File size limit exceeded. Upload a file lesser than ' + args[0] + 'KB');
        return resolve("");
    });
});

indicative.extend('imageMaxHeight', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = $('<img>', {src: e.target.result})[0];
            if(img.height > args[0])
                return reject('File Dimension limit exceeded. Upload a file with height lesser than ' + args[0] + 'px');
            return resolve("");
        };
        reader.readAsDataURL(file);
    });
});

indicative.extend('imageMaxWidth', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = $('<img>', {src: e.target.result})[0];
            if(img.width > args[0])
                return reject('File Dimension limit exceeded. Upload a file with width lesser than ' + args[0] + 'px');
            return resolve("");
        };
        reader.readAsDataURL(file);
    });
});

${scripts.join("\n\n")};
</script>`);

console.log(layout);

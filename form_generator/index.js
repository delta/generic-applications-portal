#!/usr/bin/env node

"use strict";

let args = process.argv;

if (/node(js)?$/.test(args[0])) {
  args = args.slice(2);
} else {
  args = args.slice(1);
}

args = require("minimist")(args);

const indicative = require("indicative");
const cheerio = require("cheerio");
const fs = require("fs");

let inputFile = "";
let layoutFile = "";
let seedFile = "";

if (args._.length === 0) { // args will always have the key '_'
  const usage = `FormGenerator - A tool to generate an application portal from a simple markup.
  
  Usage: ./formgen.js [-l|--layout=layout.html] [-s|--seedfile=formElementSeeder.js] <input_markup.html>
  
  This will create a formElementSeeder.js file that uses Sequelize to seed two tables
  of the database
    1. Forms (inserts name of the <application> tag in the input markup)
    2. FormElements (inserts all the formElements inside it)

    It also generates the output html to stdout using the input markup and the layout file.`;

  process.stderr.write(usage + "\n");
  process.exit();
} else {
  layoutFile = args.l || args.layout || "layout.html";
  inputFile = args._[0];
  seedFile = args.s || args.seedfile || "formElementSeeder.js";
}

const inputHtml = fs.readFileSync(inputFile, { "encoding": "utf8" });
const $ = cheerio.load(inputHtml, { "ignoreWhitespace": true });

// This is used to store all the formElements to be stored in the FormElements
// table on the backend for the given application.
const formElementsGenerator = require("./formElementsGenerator");

formElementsGenerator.init(seedFile);

const error = (msg) => {
  console.error(msg);
  throw new Error(msg);
};

const safeName = (name) => {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
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

const addTrigger = (el, func, is$f) => {
  triggers[el] = triggers[el] || [];
  if (!is$f) {
    triggers[el].push(func);
  } else {
    triggers[el] = [ func ].concat(triggers[el]);
  }
};

const validate = (name) => {
  let myRules = {};

  myRules[name] = rules[name];

  if (!myRules[name]) {
    return onValidates[name]({});
  }

  // same handler will handle both validation success and validation failure
  indicative.validate($f, myRules, {
    "required": "This field is required to complete registeration process",
    "date": "Please make sure you match the format dd/mm/yyy",
    "email": "Please enter a valid email",
    "phone": "Please enter a valid phone number",
    "above": "Value must be greater than {{argument.0}}",
  })
    .then(onValidates[name])
    .catch(onValidates[name]);
};

class Manager {
  constructor() {
    this.nodeList = {};

    // will be used in registerFormElement to determine current input's section.
    // easiest, but maybe not the cleanest solution. To be fixed.
    this.currentSection = "";
  }
  registerFormElement(details) {
    const elemName = details.name;

    if (rules[elemName]) {
      error(`Element with name ${elemName} already defined. Make sure you avoid duplicates.`);
    }

    rules[elemName] = details.validationRules;
    formElementsGenerator.addElement({
      "name": details.name,
      "originalName": details.originalName,
      "section": this.currentSection,
      "validationRules": details.validationRules,
    });
  }
 registerNode(nodeName, nodeTransformer) {
    this.nodeList[nodeName] = this.nodeList[nodeName] || [];
    this.nodeList[nodeName].push(nodeTransformer);
  }
  transformNode(node) {
    if (node.type !== "tag") {
      return $.html(node); // we don't transform non-tag nodes
    }

    if (node.name === "section") {
      this.currentSection = node.attribs.name.replace(/[^a-zA-Z0-9_]/g, "");
    }

    // Check if there are registered transformers
    const transformers = this.nodeList[node.name] || [];

    for (let i = 0; i < transformers.length; i++) {
      if (transformers[i].isOfMyType(node)) {
        return (new transformers[i](node)).transform();
      }
    }

    // Nothing matched?
    const Transformer = new NodeTransformer(node);
    const innerHtml = Transformer.transformChildren();

    $(node).html(innerHtml);
    return $.html(node); // now return the outer html
  }
}

let manager = new Manager();

class NodeTransformer {
  // Returns boolean - whether a given node can be transformed by this node transformer
  // or not. This is used when multiple transformers are there for the same tag name.
  // Basically a conflict resolution mechanism.
  static isOfMyType(node) {
    return true; // default implementation: if the tagname matches, it's mine.
  }
  constructor(node) {
    this.originalName = node.attribs.name || "";
    this.name = safeName(this.originalName);
    this.node = node;
    this.node.attribs && (this.node.attribs.name = this.name);
    this.$node = $(node);
    this.node.attribs.name = this.name;
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

  // FIXME: For some reason, expressions belonging to elements having space in their names
  // can't refer to themselves. Currently, the only solution is to give separate name
  // and label attributes to them.
  processJsExpression(expression, myFunction) {
    let matches = expression.match(/\$f.[a-zA-Z0-9_]+/g);

    for (let match of matches) {
      match = match.substr(3);
      if ($(`[name=${match}]`).length === 0) {
        error(`${this.name} uses a validation rule that refers to non-existing element ${match}`);
      }
      addTrigger(match, myFunction);
    }
  }
}

class ApplicationNodeTransformer extends NodeTransformer {
  transform() {
    let navHtml = "<div class=\"nav flex-column nav-pills\" id=\"v-pills-tab\" role=\"tablist\">";
    let bodyHtml = "<div class=\"tab-content\" id=\"v-pills-tabContent\">";

    let isFirst = true;
    let sections = this.$node.children();

    for (let i = 0; i < sections.length; i++) {
      let child = sections[i];

      if (child.type !== "tag") {
        continue;
      }
      if (child.name !== "section") {
        error(`Application tag cannot contain anything other than section tags. Found ${child.name}`);
      }

      let name = child.attribs.name;
      let dashedName = name.replace(/[^a-zA-Z0-9-_]/g, "-");

      navHtml += `<a class="nav-link ${isFirst ? "active" : ""}" id="v-pills-${dashedName}-tab" data-toggle="pill" href="#v-pills-${dashedName}" role="tab" aria-controls="v-pills-${dashedName}" aria-expanded="true">${i + 1}. ${name}</a>`;
      bodyHtml += `<div class="tab-pane fade ${isFirst ? "show active" : ""}" id="v-pills-${dashedName}" role="tabpanel" aria-labelledby="v-pills-${dashedName}-tab">${manager.transformNode(child)}</div>`;

      isFirst = false;
    }

    navHtml += "</div>";
    bodyHtml += "</div>";

    return `<div class="container-fluid" style="margin-top: 10px; padding-bottom: 75px">
            <div class="row">
                <div class="col-2">${navHtml}</div>
                <div class="col-10">${bodyHtml}</div>
            </div>
        </div>`;
  }
}

class InstructionsNodeTransformer extends NodeTransformer {
  transform() {
    return `<div class="instructions">
    <h7 style="margin-left: -10px">Instructions for this page</h7>
    <p style="color:red">${this.transformChildren()}</p>
  </div>
  <hr>`;
  }
}

class SectionNodeTransformer extends NodeTransformer {
  transform() {
    return `
        <form method='POST' id='frm_${this.name}' enctype='multipart/form-data'>
          <div class='section'>
            <h2 style="padding-bottom: 10px; border-bottom: 2px solid black">${this.originalName}</h2>
            ${this.transformChildren()}
            <div class="text-center row"><button type="submit" id="submit_${this.name}" class="btn btn-primary submit" style="margin: 15px auto">Save</button></div>
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
  // This is called recursively, so passing 'node' as an argument.
  // Also, this does it only for children. Should be done for the node itself
  // separately
  replaceRequiredWithRequiredIfJs(showIf, node) {
    for (let i = 0; i < node.children.length; i++) {
      let child = node.children[i];

      if (child.type !== "tag") continue;
      if (!child.attribs.validationrule) continue;
      let vRules = child.attribs.validationrule.split("|");
      let idx = vRules.indexOf("required");

      if (idx === -1) continue;
      vRules[idx] = `requiredIfJs: (${showIf})`;
      child.attribs.validationrule = vRules.join("|");

      this.replaceRequiredWithRequiredIfJs(showIf, child);
    }
  }
  transform() {
    let label = this.originalName;
    let showIf = this.consumeAttr("showif");
    let id = `fieldset_${this.name}_${Math.random().toString().substr(2, 5)}`;

    if (showIf) {
      this.processJsExpression(showIf,
        `function(){ 
          if(${showIf}) {
            $("#${id}").show();
          } else {
            $("#${id}").hide();
          }}`);
      this.replaceRequiredWithRequiredIfJs(showIf, this.node);
    }

    if (label) {
      return `<div class="form-group form-inline row" id="${id}">
                <label class="col-form-label col-md-2">${label}</label>
                <div class="col-md-10 row">${this.transformChildren()}</div></div>`;
    }
    return `<div class="form-group row" id="${id}">
        <div class="col row">${this.transformChildren()}</div></div>`;
  }
}

class InputNodeTransformer extends NodeTransformer {
  static isOfMyType(node) {
    return node.attribs.type !== "file";
  }
  constructor(node) {
    super(node);
    $f[this.name] = "";
    this.validationRules = this.consumeAttr("validationrule") || "sometimes";
  }
  registerFormElement() {
    manager.registerFormElement({
      "name": this.name,
      "originalName": this.originalName,
      "validationRules": this.validationRules,
    });
  }
  processJsValidationRules() {
    const validationRules = this.validationRules;

    if (validationRules && /js:/.test(validationRules)) {
      const splitValidationRules = validationRules.split("|");

      for (let rule of splitValidationRules) {
        if (/^js:/.test(rule)) { // custom rule. wrap in a function.
          // first do one-time checking if the rule refers to non-existing elements
          // js: $f.salary + $f.dadSalary >= $f.maxSalary
          this.processJsExpression(rule, `() => {
            validate("${this.name}");
          }`);
        }
        // The pre-registered 'js' rule in indicative will then
        // use eval() to evaluate the js expression.
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
        label += `<span id="asterisk-${this.name}" style="color:red">*</span>`;
      }
  
      html += `<label  id="label-${this.name}" class="col-form-label col-md-${cols[0]}" for="${this.name}">${label}</label>`;
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
  createLabelAndInput() {
    const isRequired = /required/.test(this.validationRules);

    return this.createLabelAndRequiredAsterisk(isRequired) + this.createInputElement();
  }
  getErrorElement() {
    let name = this.node.attribs.name;

    onValidates[name] = `(err) => {
        if (err.constructor !== Array) $("#error-${name}").hide();
        else                           $("#error-${name}").show().html(err[0].message);
    }`;

    return `<span class="error" id="error-${name}" style="display:none">Error</span>`;
  }

  addEventHandlersAndId() {
    let valFun = `function(event) { $f["${this.name}"] = $("#${this.name}").val(); validate('${this.name}'); }`;

    if (this.node.attribs.type === "checkbox") {
      valFun = `function(event) { $f["${this.name}"] = $("#${this.name}").is(":checked"); validate('${this.name}'); }`;
    }
    addTrigger(this.name, valFun, true);
    this.$node.attr("onchange", `triggers["${this.name}"].forEach(function(f, i) { f.call(this, event) });`);
    this.$node.attr("id", this.name);
  }

  transform() {
    const name = this.name;
    const showIf = this.consumeAttr("showif");
    const computedValue = this.consumeAttr("computedvalue");

    if (showIf) {
      this.processJsExpression(showIf,
        `function(){ 
          if(${showIf}) {
            $("#${name}").show();
            $("#label-${name}").show();
            $("#asterisk-${name}").show();
          } else {
            $("#${name}").hide();
            $("#label-${name}").hide();
            $("#asterisk-${name}").hide();
          }}`);
      
      // Add showIf to each child (and thus, recursively)
      // Reason to do this is to replace every occurrence of 'required' rules
      // With requiredIfJs rules, so that a required field with a showIf is
      // required only when shown. 
      let vRules = this.validationRules.split("|");
      let idx = vRules.indexOf("required");

      if (idx !== -1) {
        vRules[idx] = `requiredIfJs: (${showIf})`;
        this.validationRules = vRules.join("|");
      }
    }

    if (computedValue) {
      this.processJsExpression(computedValue,
        `function() {
            let val = eval("${computedValue}");
            $("#${name}").val(val);
            $f.${name} = val;
        }`);
      
      // add a validation rule that ensures that the computed value is the value that gets set.
      // This is useless on the client, but on the server it ensures that the correct value
      // gets submitted by the client. This way the server doesn't have to evaluate the expression.
      // It's a lazy thing to do.
      const rule = `js: (${computedValue}) === $f.${name}`;
      const oldRules = this.validationRules.split("|");

      oldRules.push(rule);
      this.validationRules = oldRules.join("|");
    }

    this.registerFormElement();
    this.processJsValidationRules();

    this.addEventHandlersAndId();
    this.$node.addClass("form-control form-control-sm");

    if (this.$node.hasClass("form-control-plaintext")) {
      this.$node.removeClass("form-control");
    }

    return this.createLabelAndInput();
  }
}

class SelectNodeTransformer extends InputNodeTransformer {
  constructor(node) {
    super(node);
    let options = this.$node.children("option");

    // TODO: Check if this comma-replacement works
    options = options.map((i, el) => $(el).html()).get().map((x) => x.replace(/,/g, "\\,"));

    options = "in:" + options.join(",");
    this.validationRules += (this.validationRules.length ? "|" : "") + options;
  }
  transform() {
    const attrs = this.node.attribs;
    const name = attrs.name;
    const showIf = this.consumeAttr("showif");

    if (showIf) {
      this.processJsExpression(showIf,
        `function(){ 
          if(${showIf}) {
            $("#${name}").show();
            $("#label-${name}").show();
            $("#asterisk-${name}").show();
          } else {
            $("#${name}").hide();
            $("#label-${name}").hide();
            $("#asterisk-${name}").hide();
          }}`);
    }

    this.registerFormElement();
    this.processJsValidationRules();
        
    this.addEventHandlersAndId();
    this.$node.addClass("custom-select form-control form-control-sm");

    this.$node.prepend(`<option>${attrs.placeholder}</option>`);

    return this.createLabelAndInput();
  }
}

class ExclusiveSelectNodeTransformer extends NodeTransformer {
  transform() {
    // add triggers for selects. Not yet transforming them.
    let selects = this.$node.find("select");
    let selectNames = [];

    for (let i=0; i<selects.length; i++) {
      const child = selects[i];
      const childName = safeName(child.attribs.name);
      selectNames.push(childName);
    }

    const selectNamesStr = selectNames.join(",");
    let exclusiveFn = `function exclselectbinding(event){
      let y = [];
      let selects = "${selectNamesStr}".split(",");
      for(let i = 0; i < selects.length; i++){
        let utemp = $("#"+selects[i])[0].value;
        if(utemp != $("#"+selects[i]).attr('placeholder')){
          y.push(utemp);
        }
      }
      for(let i = 0; i < selects.length; i++){
        $("#"+selects[i]).children('option').each(function(){
          $(this).prop("disabled", false);
        });
        for(let j = 0;j < y.length; j++){
          const currentOptionString = "#"+selects[i] + " option:contains(\'" + y[j] + "\')";
          $(currentOptionString).prop("disabled",true);
        }        
      }
    }`; 

    for (let i = 0; i < selectNames.length; i++) {
      addTrigger(selectNames[i], exclusiveFn, true);
    }

    return `<div id="${this.name}">
              ${this.transformChildren()}
            </div>`;
  }
}


class FileInputNodeTransformer extends InputNodeTransformer {
  static isOfMyType(node) {
    return node.attribs.type === "file";
  }
  createInputElement() {
    let cols = this.consumeAttr("cols");
    let inputCols = cols || "";
    let previewCols = this.node.attribs.preview || 0;

    if (inputCols.indexOf(",") !== -1) {
      inputCols = cols.split(",")[1];
    }

    let displayPreview = ""; // Stores the commands required for displaying the preview

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
    const name = this.node.attribs.name;

    if (this.validationRules.length === 0) {
      this.validationRules = "file";
    } else {
      this.validationRules += "|file";
    }

    this.registerFormElement();
    this.processJsValidationRules();

    // Define the event listeners for the input element
    // this.$node.attr("onblur", `validate("${name}")`);
    this.$node.attr("onchange", `$f["${name}"] = (this.files)?this.files[0]:null; toggleRemoveButtonAndPreview_${this.name}(); validate('${name}');`);

    // Define the classes and id for the input element
    this.$node.attr("id", name);
    this.$node.addClass("form-control-file");

    return this.createLabelAndInput();
  }
}

class TableInputNodeTransformer extends NodeTransformer {
  transform() {
    let minCount = this.node.attribs.mincount || 1;
    let maxCount = this.node.attribs.maxcount || 100; // good enough upper limit

    let compiledElements = [];

    const nColumns = this.node.children.length;
    let html = `<table id="${this.name}"><thead><tr>`;

    for (let i = 0; i < nColumns; i++) {
      let child = this.node.children[i];

      if (child.type !== "tag") continue;
      let width = child.attribs.width || "auto";
      let label = child.attribs.label || child.attribs.name; // if label is empty, default to name.

      child.attribs.label = "";
      html += `<th style="width:${width}">${label}</th>`;

      // Prefix table name to repeated child. Required for the client to be able
      // to prefill saved data.
      child.attribs.name = `${this.name}__table__${child.attribs.name}__count__`;
      compiledElements.push({
        "name": child.attribs.name.replace(/[^a-zA-Z0-9_]/g, ""),
        "validationrule": child.attribs.validationrule,
        "html": manager.transformNode(child),
      });
    }

    html += `<th>
            <a role="button" href="#" class="btn btn-outline-success btn-sm" title='Add row' id="rowAdder_${this.name}" onclick="addRow_${this.name}(event)">
                <span class="fa fa-plus-square"></span>
            </a>
            </th></tr></thead></table>`; // rows will be added by the client.

    // Will be run in the context of the browser. Won't have access
    // to server side variables.
    scripts.push(`
        var nRows_${this.name} = 0;
        var nRows_${this.name}_real = 0;
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
            nRows_${this.name}_real++;
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
                let elemName = elements[i].name.replace(/__count__/g, nRows_${this.name});

                let elemHtml = elements[i].html.replace(/__count__/g, nRows_${this.name});
                rowHtml += "<td>" + elemHtml + "</td>";

                rules[elemName] = elements[i].validationrule;
                onValidates[elemName] = (err) => {
                  if (err.constructor !== Array) $("#error-" + elemName).hide();
                  else                           $("#error-" + elemName).show().html(err[0].message);
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

// TODO: Fix name of id of elements generated.
class BoxNodeTransformer extends NodeTransformer {
  transform() {
    let minCount = this.node.attribs.mincount || 1;
    let maxCount = this.node.attribs.maxcount || 100; // good enough upper limit

    let compiledHtml = "";
    let compiledElements = [];

    // boxnode will have a bunch of fieldsets.
    // we must loop through each of the fieldsets, not the direct children of boxnode
    for (let i = 0; i < this.node.children.length; i++) {
      let fieldsetChild = this.node.children[i];

      if (fieldsetChild.type !== "tag" && fieldsetChild.name !== "fieldset") {
        continue;
      }

      for (let j = 0; j < fieldsetChild.children.length; j++) {
        const child = fieldsetChild.children[j];
        
        if (child.type !== "tag") continue;

        child.attribs.name = `${this.name}__box__${child.attribs.name}__count__`;
        compiledElements.push({
          "name": child.attribs.name,
          "validationrule": child.attribs.validationrule,
        });
      }
    }

    compiledHtml = this.transformChildren(true);

    // Will be run in the context of the browser. Won't have access
    // to server side variables.
    scripts.push(`
    var nRows_${this.name} = 0;
    var nRows_${this.name}_real = 0;
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
        nRows_${this.name}_real++;
        let rowId = "${this.name}-" + nRows;
        let elements = ${JSON.stringify(compiledElements)};
        let html = ${JSON.stringify(compiledHtml)};

        let delRowButtonHtml = "";
        if (nRows > ${minCount}) {
            // while removing we only remove the element in the DOM, 
            // and don't clean up onValidates, $f, rules variables for simplicity.
            delRowButtonHtml = "<a role='button' href='#' title='Delete row' class='btn btn-danger btn-sm' style='float:right' onclick='delRow_${this.name}(event, " + nRows + ")'><span class='fa fa-minus-circle'></span> Delete row</a><br style='clear:both'>"
        }
        if (nRows_${this.name}_real + 1 >= ${maxCount}) {
            $("#rowAdder_${this.name}").attr('disabled', 'true');
        }
        let rowHtml = "<div class='box-row' id='" + rowId + "'>" + html.replace(/__count__/g, nRows_${this.name}) + delRowButtonHtml + "</div>";
        for (let i = 0; i < elements.length; i++) {
            let elemName = elements[i].name.replace(/__count__/g, nRows_${this.name});

            rules[elemName] = elements[i].validationrule;
            onValidates[elemName] = (err) => {
              if (err.constructor !== Array) $("#error-" + elemName).hide();
              else                           $("#error-" + elemName).show().html(err[0].message);
            };

            $f[elemName] = "";
        }
        //rowHtml += "</div>";

        // finally append the row to the table
        $("#${this.name}").append(rowHtml);

        event && event.preventDefault();
        event && event.stopPropagation();

        return false;
    }
    
    for (let i = 0; i < ${minCount}; i++)
        addRow_${this.name}();
    `);
    
    let html = `
    <div id="${this.name}_wrapper">
      <div id="${this.name}"></div>
      <hr>
      <a role="button" href="#" class="btn btn-success btn-sm" title='Add row' id="rowAdder_${this.name}" onclick="addRow_${this.name}(event)">
        <span class="fa fa-plus-square"></span> Add row
      </a>
    </div>`; // rows will be added by the client.

    return html;
  }
}

manager.registerNode("application", ApplicationNodeTransformer);
manager.registerNode("section", SectionNodeTransformer);
manager.registerNode("subsection", SubsectionNodeTransformer);
manager.registerNode("exclusiveselect", ExclusiveSelectNodeTransformer);
manager.registerNode("fieldset", FieldsetNodeTransformer);
manager.registerNode("input", InputNodeTransformer);
manager.registerNode("input", FileInputNodeTransformer);
manager.registerNode("textarea", InputNodeTransformer);
manager.registerNode("select", SelectNodeTransformer);
manager.registerNode("tableinput", TableInputNodeTransformer);
manager.registerNode("box", BoxNodeTransformer);
manager.registerNode("instructions", InstructionsNodeTransformer);

// TODO: refactor this method
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

const indicativeCustomCommon = fs.readFileSync(__dirname + "/indicative-custom-common.js", { "encoding": "utf8" });
let layout = fs.readFileSync(layoutFile, { "encoding": "utf8" });

layout = layout.replace(/\{\{body\}\}/, manager.transformNode($("application")[0]));
layout = layout.replace(/\{\{script\}\}/, `
<script type='text/javascript' src='/js/indicative_bundle.js'></script>
<script type='text/javascript'>
let $f = ${JSON.stringify($f)};
let rules = ${JSON.stringify(rules)};
let triggers = { ${Object.keys(triggers).map((x) => x + ": [" + triggers[x].join(",") + "]").join(",")} };
let onValidates = ${stringifyObject(onValidates)};
let validate = ${stringifyObject(validate)};

${indicativeCustomCommon}

indicative.extend('file', (data, field, message, args, get) => {
  // reasonable enough test
  data = get(data, field);
  if (data.size && data.type) {
    return Promise.resolve("");
  }
  return Promise.reject("Invalid file");
});

indicative.extend('requiredFile', (data, field, message, args, get) => {
    return new Promise(function(resolve, reject) {
        const file = get(data, field);
        if(!file)
            return reject('Field is required for completing the registration');
        return resolve('');
    });
});

indicative.extend('fileType', (data, field, message, args, get) => {
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

${$("script").html()}
</script>`);

// TODO: Write to a file instead of console. Or generate better tooling.
console.log(layout);

formElementsGenerator.setApplicationName($("application")[0].attribs.name);
formElementsGenerator.writeToFile();

// Generate the indicative-custom-validation-server.js
// Requires only two substitutions:
// 1. {{script-tag-functions}}
// 2. {{indicative-custom-common}}

let indicativeCustomValidationServer = fs.readFileSync(__dirname + "/../server/utils/indicative-custom-validation-server-template.js", { "encoding": "utf8" });

indicativeCustomValidationServer = indicativeCustomValidationServer.replace("{{script-tag-functions}}", $("script").html());
indicativeCustomValidationServer = indicativeCustomValidationServer.replace("{{indicative-custom-common}}", indicativeCustomCommon);

fs.writeFileSync(__dirname + "/../server/utils/indicative-custom-validation-server.js", indicativeCustomValidationServer);

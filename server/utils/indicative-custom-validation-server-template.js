"use strict";

const indicative = require("indicative");

let $f = {};

{{script-tag-functions}}

{{indicative-custom-common}}

module.exports = {
  "set$f": (newVal) => {
    $f = newVal;
  },
  "validateAll": (data, rules, messages) => indicative.validateAll(data, rules, messages),
};

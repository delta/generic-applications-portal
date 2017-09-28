"use strict";

const indicative = require("indicative");

let $f = {};

{{script-tag-functions}}

{{indicative-custom-common}}

indicative.extend("file", (data, field, message, args, get) => {
  // 'file' rule is just a hack that's used to identify if a field is expected to be a file.
  // Ugly. But works, for now.
  return Promise.resolve();
});

indicative.extend("requiredFile", (data, field, message, args, get) => {
  const file = get(data, field);

  if (!file) {
    return Promise.reject("This file is required.");
  }

  return Promise.resolve("");
});

indicative.extend("fileType", (data, field, message, args, get) => {
  const file = get(data, field);

  if (!file) {
    // we don't require a file here. We only check the file type if it exists
    return Promise.resolve("");
  }

  for (let i in args) {
    if (file.name.endsWith("." + args[i])) {
      return Promise.resolve("");
    }
  }

  return Promise.reject("Not a valid file. Please upload files of type " + args);
});

indicative.extend("fileSize", (data, field, message, args, get) => {
  const file = get(data, field);

  if (!file) {
    // we don't require a file here. We only check the file type if it exists
    return Promise.resolve("");
  }

  if (file.size / 1024 > args[0]) {
    return Promise.reject("File size limit exceeded. Upload a file lesser than " + args[0] + "KB");
  }

  return Promise.resolve("");
});

indicative.extend("imageMaxHeight", (data, field, message, args, get) => {
  return Promise.resolve(""); // placeholder for now
});

indicative.extend("imageMaxWidth", (data, field, message, args, get) => {
  return Promise.resolve(""); // placeholder for now
});

module.exports = {
  "set$f": (newVal) => {
    $f = newVal;
  },
  "validateAll": (data, rules, messages) => indicative.validateAll(data, rules, messages),
};

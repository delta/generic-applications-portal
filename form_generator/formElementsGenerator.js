"use strict";

/*
    This module is used to generate the seed file for each 
   application
*/

const fs = require("fs");

let formElements = [];
let seedFile = "";
let applicationName = "";

const writeToFile = () => {
  fs.writeFileSync(seedFile, `"use strict";
  
module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("Forms", [ {
      "name": "${applicationName}",
      "createdAt": new Date(),
      "updatedAt": new Date(),
    } ]).then((results) => {
      // results returns the id of the first row inserted.
      // it's weird, but works. Using it till breaks.
      let formId = results;

      // In case sequelize starts behaving correctly in future, I don't want this
      // code to break.
      if (results.constructor === Array) {
        formId = results[0];
      } else {
        formId = results;
      }

      let formElements = ${JSON.stringify(formElements)};

      formElements = formElements.map(x => {
        x.createdAt = new Date();
        x.updatedAt = new Date();
        x.formId = formId;
        return x;
      });

      return queryInterface.bulkInsert("FormElements", formElements);
    });
  },

  "down": (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("FormElements", null, {});
  },
};
`);
};

module.exports = {
  "init": (sf) => {
    seedFile = sf;
  },
  "addElement": (el) => {
    formElements.push(el);
  },
  "setApplicationName": (name) => {
    applicationName = name;
  },
  "writeToFile": writeToFile,
};

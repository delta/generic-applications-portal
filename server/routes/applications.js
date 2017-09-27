"use strict";

const express = require("express");
const router = express.Router();
const validator = require("../utils/indicative-custom-validation-server.js");

const Application = require("../models").Application;
const FormElement = require("../models/").FormElement;
const FormValue = require("../models").FormValue;

/*
  request parameters:
    - formId
*/
router.post("/create", (req, res) => {
  if (!req.param("formId")) {
    return res.status(400).json({
      "success": false,
      "error": "formid required",
    });
  }

  Application.create({
    "formId": req.param("formId"),
    "userId": req.session.userId,
  }).then((application) => {
    res.redirect("/applications/" + application.id);
  }).catch((err) => {
    console.error(err);
    res.status(500).json("Internal server error. Please retry in some time.");
  });
});

router.post("/save/:id/:section", (req, res) => {
  const appId = req.param("id");
  const section = req.param("section");

  // filtered req.body where elements not found in FormElements query are dropped
  // just to ensure crap doesn't go into the database.
  const valuesToStore = {};

  Application
    .findById(appId, {
      "include": FormValue,
    })
    .then((application) => FormElement.findAll({
      "where": {
        "section": section,
        "formId": application.formId,
      },
    }))
    .then((formElements) => {
      // Both of these are to be passed to indicative
      const validationRules = {};
      const data = {};

      const allKeys = Object.keys(req.body);

      for (let i = 0; i < formElements.length; i++) {
        const name = formElements[i].name;

        if (!/__count__$/.test(name)) {
          validationRules[name] = formElements[i].validationRules || "sometimes";
          data[name] = req.body[name];

          // fill only that data which is a valid formElement
          valuesToStore[name] = {
            "formElementId": formElements[i].id,
            "applicationId": appId,
            "value": req.body[name],
          };
        } else {
          // we're dealing with an array input. Find all fields in req.body
          // that correspond to this field, and collect them in an array
          // and pass them to indicative.

          // For example, if the field name in formElements is exampleField__count__
          // and the validation rule is "required|above:1", and the form
          // supplied has two fields exampleField1 and exampleField3

          // This (1, then 3) could happen since the frontend allows deleting
          // arbitrary rows from tableInput or box nodes, and therefore only names
          // the rows in increasing order.

          // While storing these in database as FormValue, we store them as
          // a JSON array. That is [exampleField1.value, exampleField3.value] etc.

          const actualName = name.replace(/__count__$/, ""); // strip __count__ suffix
          const relevantKeys = []; // keys in allKeys that are like exampleField*
          const values = []; // values corresponding to them, but in order.

          // Collect all the relevant keys.
          for (let j = 0; j < allKeys.length; j++) {
            if (allKeys[j].indexOf(actualName) === 0) {
              relevantKeys.push(allKeys[j]);
            }
          }

          // reorder the keys so that we can collect the values into an array.
          relevantKeys.sort((a, b) => {
            // basically strip "exampleField" from exampleField1 and exampleField3
            // get 1 and 3, convert as integers, and then compare them.
            const aNum = parseInt(a.replace(actualName, ""));
            const bNum = parseInt(b.replace(actualName, ""));

            return aNum - bNum;
          });

          // Collect all the values in an array. These values are in correct order.
          for (let j = 0; j < relevantKeys.length; j++) {
            const key = relevantKeys[j];

            values.push(req.body[key]);
          }

          // To indicative, we'll basically pass the rule as
          // { "exampleField.*": "required|alpha" } or whatever
          // Here "required|alpha" is the rule stored in db for exampleField__count__
          validationRules[actualName + "*"] = formElements[i].validationRules;

          // And the data field that we pass is an array of the values
          // that the user has sent. Basically this:
          // [ exampleField1.value, exampleField3.value ]
          // We ensure that the relative order of the fields supplied in the form is
          // maintained. That's why the above sort exists.
          data[actualName + "*"] = values;

          // fill only that data which is a valid formElement
          valuesToStore[actualName + "*"] = {
            "formElementId": formElements[i].id,
            "applicationId": appId,
            "value": values,
          };
        }
      }

      return validator.validateAll(data, validationRules);
    })
    .then((validationResults) => {
      const promises = [];

      for (let key in valuesToStore) {
        promises.push(FormValue.upsert(valuesToStore[key]));
      }

      return Promise.all(promises);
    })
    .then((data) => {
      res.redirect("/applications/" + appId);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/submit/:id", (req, res) => {

});

// GET handlers
router.get("/:id", (req, res) => {
  Application
    .find({
      "where": {
        "id": req.params.id,
        "userId": req.session.userId,
      },
      "include": {
        "model": FormValue,
        "attributes": [ "value" ],
        "include": {
          "model": FormElement,
          "attributes": [ "name" ],
        },
      },
    })
    .then((application) => {
      if (!application) {
        return res.status(404).send("Application not found");
      }
      res.render("form", {
        "applicationData": application,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json("Internal server error. Please retry in some time.");
    });
});


module.exports = router;

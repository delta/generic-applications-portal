"use strict";

const express = require("express");
const router = express.Router();
const indicative = require("indicative");

const Application = require("../models").Application;
const FormElement = require("../models/").FormElement;
const FormValue = require("../models").FormValue;
// User login+signup handlers

/*
  request parameters:
    - formId
*/
router.get("/create", (req, res) => {
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
    res.status(200).json(application);
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
      const validationRules = {};
      const data = {}; // to be passed to indicative

      for (let i = 0; i < formElements.length; i++) {
        const name = formElements[i].name;

        validationRules[name] = formElements[i].validationRules;

        // fill only that data which is a valid formElement
        valuesToStore[name] = {
          "formElementId": formElements[i].id,
          "applicationId": appId,
          "value": req.body[name],
        };

        data[name] = req.body[name];
      }

      return indicative.validateAll(data, {});// validationRules);
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
      res.status(500).json(err);
    });
});

router.get("/submit/:id", (req, res) => {

});

// GET handlers
router.get("/:id", (req, res) => {
  Application
    .findById(req.params.id, {
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
      res.render("form", {
        "applicationData": application,
      });
    }).catch((err) => {
      console.error(err);
      res.status(500).json("Internal server error. Please retry in some time.");
    });
});


module.exports = router;

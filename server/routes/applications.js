"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const validator = require("../utils/indicative-custom-validation-server.js");
const multer = require("multer");

const Application = require("../models").Application;
const Form= require("../models/").Form;
const FormElement = require("../models/").FormElement;
const FormValue = require("../models").FormValue;
const SectionStatus = require("../models").SectionStatus;

const uploadsDirectory = path.join(__dirname, "../uploads/");
const ensureExists = (myPath, mask) => {
  return new Promise((resolve, reject) => {
    if (!mask) { // allow the `mask` parameter to be optional
      mask = 484; // 0777
    }
    fs.mkdir(myPath, mask, (err) => {
      if (err) {
        if (err.code === "EEXIST") {
          return resolve(); // ignore the error if the folder already exists
        }
        return reject(err); // something else went wrong
      }
      return resolve(); // successfully created folder
    });
  });
};

const storage = multer.diskStorage({
  "destination": (req, file, cb) => {
    if (!req.params.applicationId) {
      cb(new Error("Invalid request. Application id missing."));
    }

    const dest = path.join(uploadsDirectory, `appid_${req.params.applicationId}`);

    ensureExists(dest)
      .then(() => cb(null, dest))
      .catch((err) => cb(err));
  },
  "filename": (req, file, cb) => {
    const extension = file.originalname.match(/\.[^.]+$/);

    if (extension) {
      return cb(null, file.fieldname + extension[0]);
    }
    cb(null, file.fieldname);
  },
});
const upload = multer({
  "storage": storage,
});


router.get('/', (req, res) => {
  const applications = Application.findAll({
    where: { userId: req.session.userId },
    include: {
      model: Form,
      attributes: ["name"],
    }
  });
  applications
    .then(docs => {
      const ret = {
        user: {
          name: req.session.name,
          applications: docs.map(x => x.toJSON())
        }
      };
      res.render('dashboard', ret)
    })
    .catch(err => { res.json(err); });
});
/*
  request parameters:
    - formId
*/
let sectionsCache = { }; // stores [formId] => Array<sectionName>
router.post("/create", (req, res) => {
  const formId = req.query.formId;
  const userId = req.session.userId;

  if (!req.query.formId) {
    return res.status(400).json({
      "success": false,
      "error": "formid required",
    });
  }

  let applicationId;

  const applicationPromise = Application.create({
    "formId": formId,
    "userId": userId,
    "status": "Pending",
  });
  
  const emailFormElementPromise = FormElement.findOne({
    "where": {
      // FIXME: This code is very brittle. In case the markup calls the field anything other than 'Email',
      // this will break.
      "name": "Email",
      "formId": formId,
    }
  });
  
  const sectionsPromise = new Promise((res, rej) => {
    if (sectionsCache[formId]) return res(sectionsCache[formId]);

    FormElement
      .findAll({ where: { formId: formId }, group: "section", attributes: ["section"] })
      .then(sec => res(sectionsCache[formId] = sec.map(x => x.section)))
      .catch(err => rej(err));
  });

  // once application has been created, set the statuses for each section to false
  const sectionsStatusPromise = 
    Promise
      .all([applicationPromise, sectionsPromise])
      .then(results => {
        const application = results[0];
        const sections = results[1];
        applicationId = application.id;

        const statuses = sections.map(sec => { return {
            applicationId: applicationId,
            section: sec,
            isValid: false
          };
        });
        return SectionStatus.bulkCreate(statuses);
      });

  Promise.all([
    sectionsStatusPromise,
    emailFormElementPromise,
  ]).then((results) => {
    const emailElem = results[1];

    return FormValue.create({
      "formElementId": emailElem.id,
      "applicationId": applicationId,
      "value": req.session.userEmail,
    });
  }).then(() => {
    res.redirect("/applications/" + applicationId);
  }).catch((err) => {
    console.error(err);
    res.status(500).json("Internal server error. Please retry in some time.");
  });
});

const groupRepeatedFieldsInArray = (req, repeatedFormElement) => {
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

  const name = repeatedFormElement.name;
  const actualName = name.replace(/__count__$/, ""); // strip __count__ suffix
  const relevantKeys = []; // keys in allKeys that are like exampleField*
  const values = []; // values corresponding to them, but in order.

  // Collect all the relevant keys.
  for (let k in req.body) {
    if (k.indexOf(actualName) === 0) {
      relevantKeys.push(k);
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

  return values;
};

router.post("/save/:applicationId/:section", (req, res) => {
  const applicationId = req.params.applicationId;
  const section = req.params.section;

  // array of FormValues that will go into the database
  // Made by filtering req.body where elements not found in FormElements query are dropped
  // just to ensure crap doesn't go into the database.
  // Also to transform file and array elements - the way they're stored.
  const valuesToConsider = [];

  Application
    .findById(applicationId, {
      "include": FormValue,
    })
    .then((application) => FormElement.findAll({
      "where": {
        "section": section,
        "formId": application.formId,
      },
    }))
    .then((formElements) => {
      // Loop through formElements to find all file related elements.
      // Pass that list to multer, so that only those files get uploaded
      // that are expected.
      // This also transparently appends stuff in req.files in req.body
      const fileFields = [];

      for (let i = 0; i < formElements.length; i++) {
        // reasonable enough test:
        if (/file/.test(formElements[i].validationRules)) {
          fileFields.push({
            "name": formElements[i].name,
            "maxCount": 1, // we don't support array of files currently.
          });
        }
      }

      const uploader = upload.fields(fileFields);

      return new Promise((resolve, reject) => {
        uploader(req, res, (err) => {
          if (err) return reject(err);

          // Popular req.body with things uploaded in req.files
          for (let f in req.files) {
            req.body[f] = req.files[f][0]; // we only allow single files
          }

          resolve(formElements);
        });
      });
    })
    .then((formElements) => {
      // Both of these are to be passed to indicative
      const validationRules = {};
      const dataForIndicative = {};

      for (let i = 0; i < formElements.length; i++) {
        const name = formElements[i].name;

        if (!/__count__$/.test(name)) {
          validationRules[name] = formElements[i].validationRules || "sometimes";
          dataForIndicative[name] = req.body[name];

          let value = req.body[name];

          // it's a file. Store the path.
          if (value && value.filename) {
            value = `/uploads/appid_${applicationId}/${value.filename}`;
          }
          // fill only that data which is a valid formElement
          valuesToConsider.push({
            "formElementId": formElements[i].id,
            "applicationId": applicationId,
            "value": value,
          });
        } else {
          const actualName = name.replace(/__count__$/, ""); // strip __count__ suffix

          // To indicative, we'll basically pass the rule as
          // { "exampleField.*": "required|alpha" } or whatever
          // Here "required|alpha" is the rule stored in db for exampleField__count__
          validationRules[actualName + ".*"] = formElements[i].validationRules;

          // And the data field that we pass is an array of the values
          // that the user has sent. Basically this:
          // { "exampleField": [ exampleField1.value, exampleField3.value ] } (note, no '*')
          // We ensure that the relative order of the fields supplied in the form is
          // maintained. groupRepeatedFieldsInArray() handles that.
          dataForIndicative[actualName] = groupRepeatedFieldsInArray(req, formElements[i]);

          // fill only that data which is a valid formElement
          // note, we use the actual name here. The star is required for passing rule to
          // indicative. The data field doesn't have a star suffix, again because that's
          // how indicative works.
          valuesToConsider.push({
            "formElementId": formElements[i].id,
            "applicationId": applicationId,
            "value": JSON.stringify(dataForIndicative[actualName]), // arrays should be JSONified. Client will unjsonify
          });
        }
      }

      return validator.validateAll(dataForIndicative, validationRules).catch((err) => {
        err.__validationError__ = true;
        throw err;
      });
    })
    .then((validationResults) => {
      const promises = [];

      for (let i = 0; i < valuesToConsider.length; i++) {
        promises.push(FormValue.upsert(valuesToConsider[i]));
      }

      return Promise.all(promises);
    })
    .then(() => SectionStatus.update({ isValid: true }, { where: { applicationId, section } }))
    .then(() => SectionStatus.findOne({
        where: { applicationId, isValid: false },
        rejectOnEmpty: true
      })
    )
    .then(x => {
      if (x)
        Application.update({ status: "Pending" }, { where: { id: applicationId } })
      else
        Application.update({ status: "Completed" }, { where: { id: applicationId } })
    })
    .then(() => {
      res.status(200).json({ "success": true });
    })
    .catch((err) => {
      SectionStatus.update({ isValid: false }, { where: { applicationId, section } });
      Application.update({ status: "Pending" }, { where: { id: applicationId } });
      if (err.__validationError__) {
        delete err.__validationError__;
        res.status(200).json({
          "success": false,
          "validationErrors": err,
        });
      } else {
        console.error(err, err.stack);
        res.status(500).json({
          "success": false,
          "error": "Internal server error. Please retry after some time.",
        });
      }
    });
});

// GET handlers
router.get("/:applicationId", (req, res) => {
  Application
    .find({
      "where": {
        "id": req.params.applicationId,
        "userId": req.session.userId,
      },
      "include": [{
        "model": SectionStatus,
        "attributes": [ "section", "isValid" ],
      }, {
        "model": FormValue,
        "attributes": [ "value" ],
        "include": {
          "model": FormElement,
          "attributes": [ "name" ],
        },
      }],
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

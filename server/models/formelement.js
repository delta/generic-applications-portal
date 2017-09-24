"use strict";

module.exports = (sequelize, DataTypes) => {
  let FormElement = sequelize.define("FormElement", {
    "formId": DataTypes.INTEGER,
    "name": DataTypes.STRING,
    "validationRule": DataTypes.STRING,
  }, {
    "classMethods": {
      "associate": function(models) {
        // associations can be defined here
      },
    },
  });

  return FormElement;
};

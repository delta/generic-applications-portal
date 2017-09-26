"use strict";

module.exports = (sequelize, DataTypes) => {
  let FormElement = sequelize.define("FormElement", {
    "formId": DataTypes.INTEGER,
    "name": DataTypes.STRING,
    "originalName": DataTypes.STRING,
    "section": DataTypes.STRING,
    "validationRules": DataTypes.TEXT,
  });

  return FormElement;
};

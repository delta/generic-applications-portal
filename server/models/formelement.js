"use strict";

module.exports = (sequelize, DataTypes) => {
  let FormElement = sequelize.define("FormElement", {
    "formId": DataTypes.INTEGER,
    "name": DataTypes.STRING,
    "originalName": DataTypes.STRING,
    "section": DataTypes.STRING,
    "validationRules": DataTypes.TEXT,
  });

  FormElement.associate = (models) => {
    FormElement.belongsTo(models.Form, {
      "onUpdate": "CASCADE",
      "onDelete": "RESTRICT",
    });
  };

  return FormElement;
};

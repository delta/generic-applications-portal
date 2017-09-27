"use strict";

module.exports = (sequelize, DataTypes) => {
  let FormValue = sequelize.define("FormValue", {
    "formElementId": {
      "type": DataTypes.INTEGER,
      "primaryKey": true,
    },
    "applicationId": {
      "type": DataTypes.INTEGER,
      "primaryKey": true,
    },
    "value": DataTypes.STRING,
  });

  FormValue.associate = (models) => {
    FormValue.belongsTo(models.Application, {
      "onUpdate": "CASCADE",
      "onDelete": "RESTRICT",
    });
    FormValue.belongsTo(models.FormElement, {
      "onUpdate": "CASCADE",
      "onDelete": "RESTRICT",
    });
  };

  return FormValue;
};

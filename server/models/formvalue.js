"use strict";

module.exports = (sequelize, DataTypes) => {
  let FormValue = sequelize.define("FormValue", {
    "formElementId": DataTypes.INTEGER,
    "applicationId": DataTypes.INTEGER,
    "value": DataTypes.STRING,
  });

  FormValue.associate = (models) => {
    FormValue.belongsTo(models.Application, {
      "onUpdate": "CASCADE",
      "onDelete": "RESTRICT",
    });
  };

  return FormValue;
};

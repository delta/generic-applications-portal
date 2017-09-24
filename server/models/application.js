"use strict";

module.exports = (sequelize, DataTypes) => {
  let Application = sequelize.define("Application", {
    "formId": DataTypes.INTEGER,
    "userId": DataTypes.INTEGER,
    "submittedAt": DataTypes.DATETIME,
  }, {
    "classMethods": {
      "associate": function(models) {
        Application.belongsTo(models.User, {
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT",
        });
        Application.hasMany(models.FormValue, {
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT",
        });
      },
    },
  });

  return Application;
};

"use strict";

module.exports = (sequelize, DataTypes) => {
  let Form = sequelize.define("Form", {
    "name": DataTypes.STRING,
  }, {
    "classMethods": {
      "associate": function(models) {
        // associations can be defined here
      },
    },
  });

  return Form;
};

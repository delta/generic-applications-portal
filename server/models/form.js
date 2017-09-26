"use strict";

module.exports = (sequelize, DataTypes) => {
  let Form = sequelize.define("Form", {
    "name": DataTypes.STRING,
  });

  return Form;
};

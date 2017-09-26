"use strict";

module.exports = (sequelize, DataTypes) => {
  let User = sequelize.define("User", {
    "emailId": DataTypes.STRING,
    "name": DataTypes.STRING,
    "passwordHash": DataTypes.STRING,
    "isActive": DataTypes.BOOLEAN,
    "activationToken": DataTypes.STRING,
    "activationTokenExpiryTime": DataTypes.DATE,
    "passwordResetToken": DataTypes.STRING,
    "passwordResetTokenExpiryTime": DataTypes.DATE,
  });

  User.associate = (models) => {
    User.hasMany(models.Application, {
      "onUpdate": "CASCADE",
      "onDelete": "RESTRICT",
    });
  };

  return User;
};

"use strict";

module.exports = (sequelize, DataTypes) => {
  let User = sequelize.define("User", {
    "emailId": DataTypes.STRING,
    "name": DataTypes.STRING,
    "passwordHash": DataTypes.STRING,
    "isActive": DataTypes.BOOLEAN,
    "activationToken": DataTypes.STRING,
    "activationTokenExpiryTime": DataTypes.DATETIME,
    "passwordResetToken": DataTypes.STRING,
    "passwordResetTokenExpiryTime": DataTypes.DATETIME,
  }, {
    "classMethods": {
      "associate": function(models) {
        User.hasMany(models.Application, {
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT",
        });
      },
    },
  });

  return User;
};

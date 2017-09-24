"use strict";

module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.createTable("Users", {
      "id": {
        "allowNull": false,
        "autoIncrement": true,
        "primaryKey": true,
        "type": Sequelize.INTEGER,
      },
      "emailId": {
        "type": Sequelize.STRING,
      },
      "name": {
        "type": Sequelize.STRING,
      },
      "passwordHash": {
        "type": Sequelize.STRING,
      },
      "isActive": {
        "type": Sequelize.BOOLEAN,
      },
      "activationToken": {
        "type": Sequelize.STRING,
      },
      "activationTokenExpiryTime": {
        "type": Sequelize.DATE,
      },
      "passwordResetToken": {
        "type": Sequelize.STRING,
      },
      "passwordResetTokenExpiryTime": {
        "type": Sequelize.DATE,
      },
      "createdAt": {
        "allowNull": false,
        "type": Sequelize.DATE,
      },
      "updatedAt": {
        "allowNull": false,
        "type": Sequelize.DATE,
      },
    });
  },
  "down": (queryInterface, Sequelize) => {
    return queryInterface.dropTable("Users");
  },
};

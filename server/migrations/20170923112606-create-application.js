"use strict";

module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.createTable("Applications", {
      "id": {
        "allowNull": false,
        "autoIncrement": true,
        "primaryKey": true,
        "type": Sequelize.INTEGER,
      },
      "formId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "Forms",
          "key": "id",
        },
        "onUpdate": "CASCADE",
        "onDelete": "RESTRICT",
      },
      "userId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "Users",
          "key": "id",
        },
        "onUpdate": "CASCADE",
        "onDelete": "RESTRICT",
      },
      "submittedAt": {
        "type": Sequelize.DATE,
        "allowNull": true,
      },
      "status": {
        "type": Sequelize.STRING,
        "allowNull": false,
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
    return queryInterface.dropTable("Applications");
  },
};

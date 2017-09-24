"use strict";

module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.createTable("FormElements", {
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
      "name": {
        "type": Sequelize.STRING,
      },
      "validationRule": {
        "type": Sequelize.STRING,
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
    return queryInterface.dropTable("FormElements");
  },
};

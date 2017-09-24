"use strict";

module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.createTable("FormValues", {
      "id": {
        "allowNull": false,
        "autoIncrement": true,
        "primaryKey": true,
        "type": Sequelize.INTEGER,
      },
      "formElementId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "FormElements",
          "key": "id",
        },
        "onUpdate": "CASCADE",
        "onDelete": "RESTRICT",
      },
      "applicationId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "Applications",
          "key": "id",
        },
        "onUpdate": "CASCADE",
        "onDelete": "RESTRICT",
      },
      "value": {
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
    return queryInterface.dropTable("FormValues");
  },
};

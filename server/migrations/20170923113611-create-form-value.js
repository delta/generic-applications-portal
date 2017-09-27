"use strict";

module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.createTable("FormValues", {
      "formElementId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "FormElements",
          "key": "id",
        },
        "primaryKey": true,
        "onUpdate": "CASCADE",
        "onDelete": "RESTRICT",
      },
      "applicationId": {
        "type": Sequelize.INTEGER,
        "references": {
          "model": "Applications",
          "key": "id",
        },
        "primaryKey": true,
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

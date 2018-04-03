'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SectionStatuses', {
      applicationId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Applications",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      section: Sequelize.STRING,
      isValid: Sequelize.BOOLEAN,
    }, { logging: console.log });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("SectionStatuses");
  }
};

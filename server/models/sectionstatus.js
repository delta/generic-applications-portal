'use strict';

module.exports = (sequelize, DataTypes) => {
  let SectionStatus = sequelize.define("SectionStatus", {
    "applicationId": {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    "section": {
      type: DataTypes.STRING,
      primaryKey: true
    },
    "isValid": DataTypes.BOOLEAN,
  }, {
    timestamps: false,
  });

  return SectionStatus;
};

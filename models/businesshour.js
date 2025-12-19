'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessHour extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  BusinessHour.init({
    effectiveDate: DataTypes.DATE,
    dayOfWeek: DataTypes.STRING,
    isOpen: DataTypes.BOOLEAN,
    openTime: DataTypes.STRING,
    closeTime: DataTypes.STRING,
    breakStart: DataTypes.STRING,
    breakEnd: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BusinessHour',
  });
  return BusinessHour;
};
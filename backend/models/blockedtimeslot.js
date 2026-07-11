'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BlockedTimeSlot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  BlockedTimeSlot.init({
    blockDate: DataTypes.DATE,
    startTime: DataTypes.STRING,
    endTime: DataTypes.STRING,
    reason: DataTypes.STRING,
    isRecurring: DataTypes.BOOLEAN,
    recurringType: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BlockedTimeSlot',
  });
  return BlockedTimeSlot;
};
const User = {
  id:{
    type:sequelize.STRING
  },
  emailId:{
    type:sequelize.STRING
  },
  name:{
    type:sequelize.STRING
  },
  passwordHash:{
    type:sequelize.STRING
  },
  isActive:{
    type:sequelize.BOOLEAN
  },
  activationToken:{
    type:sequelize.STRING
  },
  activationTokenExpiryTime:{
    type:sequelize.DATE
  },
  passwordResetToken:{
    type:sequelize.STRING
  },
  passwordResetTokenExpiryTime:{
    type:sequelize.DATE
  },
  createdDate:{
    type:sequelize.DATE
  },
}

module.exports = User

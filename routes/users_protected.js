var express = require('express');
var router = express.Router();
var md5 = require('md5')
/* Only for logged users*/
router.post('/changePassword', function(req, res) {
  newPassword = req.body.newPassword
  emailId = req.body.emailId
  oldPassword = req.body.oldPassword
  connection.query("SELECT * FROM user WHERE emailId = ?", [emailId], (error, users)=>{
    if(error){
      res.json({status:500,success:false, message: "Internal Server error!"})
    }else{
      user = users[0]
      if(md5(oldPassword) === user.passwordHash){
        connection.query("UPDATE user SET passwordHash=? WHERE emailId = ?",[md5(newPassword), emailId], (error2)=>{
          if(error2){
            res.json({status:500,success:false, message: "Internal Server error!"})
          }else{
            res.json({status:200,success:true, message: "Password updated!"})
          }
        })
      }else{
        res.json({status:200,success:false, message: "Old Password Incorrect"})
      }
    }
  })
});

router.get('/dashboard', function(req, res){
  //render dashboard
  res.json({status:200, success:true, message:'Your dashboard.'})
})
module.exports = router;

const express = require('express');
const router = express.Router();
const md5 = require('md5');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer')
const session = require('express-session')
const senderEmailId = require('../config/gmail.js').emailId //use const here
const senderPassword = require('../config/gmail.js').password
const validate = require('../middlewares/validator').validate
const saltRounds = 10;

//nodemailer config
const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: senderEmailId,
        pass: senderPassword
    }
});

//User login+signup handlers

//signup
router.post('/register', function(req, res) {
  emailId = req.body.emailId
  name = req.body.name
  password = req.body.password
  //validate e-mail
  if(!validate(emailId, 'email'))
    return res.json({status:200, success:false, message:'Invalid e-mail!'})

  connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
    if(error){
      console.log(error)
      res.json({status:'500', success:false,message:'Internal Server Error'})
    }else if(results.length){
      res.json({status:'200', success:false, message:'E-mail already exists'})
    }else{
      //salting
      bcrypt.hash(password+emailId, saltRounds, function(err, passwordHash) {
        date = new Date()
        dateInMs = date.getTime()
        activationToken = md5(emailId + dateInMs)
        activationTokenExpiryTime = dateInMs + 1800000
        sql = "INSERT INTO user (emailId, name, passwordHash, activationToken, activationTokenExpiryTime) VALUE ?"
        values = [[emailId, name, passwordHash,activationToken, activationTokenExpiryTime]]
        connection.query(sql, [values], function(error, results){
          if(error){
            console.log(error)
            res.json({status:'500', success:false,message:'Internal Server Error'})
          }else{
            let emailContent = 'http://localhost:3000/users/register/activate/'+activationToken
            let subject = 'Confirm Registration'
            sendEmail(emailId, emailContent, res, activationToken, subject)
          //res.json({status:200, success:true, message:"Please traverse to "+ emailContent})
          }
        })
      });

    }
  })
});

router.post('/register/activate/:key', function(req, res, next){
  key = req.params.key
  if(!key)
    return res.json({status:200, success:false, message:"Return with parameters!"})
  connection.query("SELECT * FROM user WHERE activationToken=?",[key], (error, results)=>{
    if(error){
      res.json({status:500, success:false, message: 'Internal Server Error'})
    }else{
      if(results.length){
        //process activation
        activationTokenExpiryTime = results[0].activationTokenExpiryTime
        date = new Date()
        if(date.getTime() > activationTokenExpiryTime){
          res.json({status:200,success:false, message:"Token expired, generate new!", redirect:'/login'})
        }else{
          let sql = "UPDATE user SET isActive = ?,createdDate = ?, activationToken = ?, activationTokenExpiryTime = ? WHERE emailId = ?"
          let date = new Date()
          connection.query(sql,[true,date.getTime(), null, null, results[0].emailId], (error2, results2)=>{
            if(error2){
              res.json({status:500,success:false, message:"Internal Server Error", redirect:'/register/resendToken'} )
              console.log(error2)
            }else{
              //generate token here and log him in directly
              //for now redirecting to login
              res.json({success:true, message: 'Registration Successful!', redirect:'/login'})
            }
          })
        }
      }else{
        res.json({status:200, success:false, message: 'Invalid Token'})
      }
    }
  })
})


//handle forgot password
router.post('/forgotPassword', function(req, res, next){
  emailId = req.body.emailId
  if(!emailId)
    return res.json({status:200, success:false, message:"Return with parameters!"})
  connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
    if(error){
      console.log(error)
      res.json({status:'500', success:false,message:'Internal Server Error, retry!'})
    }else if(results.length){
      //send password reset token
      date = new Date()
      dateInMs = date.getTime()
      passwordResetToken = md5(emailId+dateInMs)
      passwordResetTokenExpiryTime = dateInMs + 1800000
      sql = "UPDATE user SET passwordResetToken = ? , passwordResetTokenExpiryTime = ? WHERE emailId = ? "
      values = [ passwordResetToken, passwordResetTokenExpiryTime, emailId]
      connection.query(sql, values, function(error, results){
        if(error){
          console.log(error)
          res.json({status:'500', success:false,message:'Internal Server Error'})
        }else{
          emailContent = 'http://localhost:3000/users/forgotPassword/reset/'+passwordResetToken
          //for now directly sending the link as a response
          //res.json({status:200, success:true, message: emailContent})
          subject = "Reset Password"
          sendEmail(emailId, emailContent, res, passwordResetToken, subject)
        }
      })
    }else{
      res.json({status:200, success:false, message:'Email doesn\'t exist!'})
    }
  })
})

router.post('/forgotPassword/reset/:key', function(req, res, next){

  //check if password is in the body
  password = req.body.password
  verificationToken = req.params.key
  if(!password || !verificationToken)
    return res.json({status:200, success:false, message:"Return with parameters!"})
  connection.query('SELECT emailId, passwordResetTokenExpiryTime FROM user WHERE passwordResetToken=?',[verificationToken], function(error, results){
    if(error){
      res.json({status:500, success:false, message:'Internal Server Error'})
    }else{
      if(results.length){


        //experimenting with bcrypt
        bcrypt.hash(password+results[0].emailId, saltRounds, function(err, passwordHash) {
          passwordResetTokenExpiryTime = results[0].passwordResetTokenExpiryTime
          date = new Date()
          if(date.getTime() >  passwordResetTokenExpiryTime){
            res.json({status:200,success:false, message:"Token expired, generate new!", redirect:'/login'})
          }else{
            sql = "UPDATE user SET passwordHash = ?, passwordResetToken = ?, passwordResetTokenExpiryTime = ? WHERE emailId = ?"
            connection.query(sql,[passwordHash, null, null, emailId], function(error, results){
                if(error){
                  console.log(error)
                  res.json({status:200, message:"Password couldn't be reset try again!"})
                }else{

                  //direct to users/dashboard but for now redirect to login
                  res.json({status:200, message:"Password successfully changed!", redirect:'/login'})
                }
            })
          }
        });
      }else{
        res.json({status:200, success:false, message:'Invalid token!'})
      }
    }
  })

})

router.post('/register/resendToken', function(req, res, next){
  if(session.sessId){
    res.json({status:200, success:false, redirect:'/users/dashboard'})
  }else{
    emailId = req.body.emailId
    if(!emailId)
      return res.json({status:200, success:false, message:"Return with parameters!"})
    connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
      if(error){
        console.log(error)
        res.json({status:500, message:"Internal server error" })
      }else if(results.length){
        date = new Date()
        dateInMs = Number(date.getTime())
        activationTokenExpiryTime = dateInMs + 1800000
        activationToken = md5(emailId+dateInMs)
        connection.query("UPDATE user SET activationToken=?, activationTokenExpiryTime=? WHERE emailId=?",[activationToken, activationTokenExpiryTime, emailId],function(error2, results){
          if(error2){
            console.log(error2)
            res.json({status:500, message:'Try again!'})
          }else{
            //res.json({status:200, success:true, message:"Please check mail", token: activationToken})
            let message = "http://localhost:3000/register/activate/" + activationToken
            let subject = "Confirm Registration!"
            sendEmail(emailId, message,res, activationToken, subject)
          }
        })
      }else{
        res.json({status:200, success:false, message:"Please register!"})
      }
    })
  }
})




//login
router.post('/login', function(req, res) {
  if(req.session.sessId){
    res.json({status:200, success:false, redirect:'/users/dashboard'})
  }else{
    emailId = req.body.emailId
    password = req.body.password
    if(!emailId || !password)
      return res.json({status:200, success:false, message:"Pass with parameters!"})
    passwordHash = md5(password)
    connection.query("SELECT * FROM user WHERE (emailId = ?)", [emailId], function(error, results, details){
      if(error){
        console.log(error);
        return res.json({status:500, message:"Internal Server Error"})
      }
      if(results){
        if(!results[0].isActive)
          return res.json({status:200, success:200, message:"Confirm your acc!"})
        bcrypt.compare(password+results[0].emailId, results[0].passwordHash, function(err, response) {
          if(response){
            user = results[0]
            req.session.isLoggedIn = true ;
            req.session.path = '/'
            res.json({status:200, success:true, message:"Redirect to /dashboard"}) //Give redirection headers
          }else{
            res.json({status:200, success:false, message:"Wrong password"})
          }
        });
      }else{
        res.json({status:200, success:false, message:"User doesn\'t exist!"})
      }
    })
  }
});


module.exports = router;

function sendEmail(email, message,res, activationToken, subject){
  let mailOptions={
     to : email,
     subject : subject,
     text : message
  }
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error)
      //send message from callee
      res.json({status:200, success:true, message: message})
    }else{
      res.json({status:200,success:true, message:'Thanks for registering, please check e-mail inbox to complete registration!'})
      console.log("Message sent: " + response.message);
    }
  });

}

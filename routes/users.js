var express = require('express');
var router = express.Router();
var md5 = require('md5');
//nodemailer config
var nodemailer = require('nodemailer')
var emailId = require('../config/nodemailer.js').emailId
var password = require('../config/nodemailer.js').password
var session = require('express-session')
var smtpTransport = nodemailer.createTransport({
    service: "Mailgun",
    auth: {
        user: emailId,
        pass: password
    }
});

//User login+signup handlers


//signup
router.post('/register', function(req, res) {
  console.log(req.body)
  console.log('came here to register')
  emailId = req.body.emailId
  name = req.body.name
  password = req.body.password
  connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
    if(error){
      console.log(emailId)
      console.log(error)
      res.json({status:'500', success:false,message:'Internal Server Error'})
    }else if(results.length){
      res.json({status:'200', success:false, message:'E-mail already exists'})
    }else{
      console.log(results)
      passwordHash = md5(password)
      console.log(password, passwordHash)
      activationToken = md5(emailId)
      date = new Date()
      dateInMs = date.getTime()
      activationTokenExpiryTime = new Date(dateInMs + 1800000)
      sql = "INSERT INTO user (emailId, name, passwordHash, activationToken, activationTokenExpiryTime) VALUE ?"
      values = [[emailId, name, passwordHash,activationToken, activationTokenExpiryTime]]
      connection.query(sql, [values], function(error, results){
        if(error){
          console.log(error)
          res.json({status:'500', success:false,message:'Internal Server Error'})
        }else{
          emailContent = 'http://localhost:3000/users/activate/'+activationToken
        //  sendEmail(emailId, emailContent, res, activationToken)
        res.json({status:200, success:true, message:"Please traverse to "+ emailContent})
        }
      })
    }
  })
});

router.post('/register/activate/:key', function(req, res, next){
  connection.query("SELECT emailId FROM user", (error, results)=>{
    if(error){
      console.log(error)
      res.json({status:500,success:false, message:"Internal Server Error", redirect:'/register/resendToken'} )
    }else{
      for (result in results){
        emailId = results[result].emailId
        hashedEmail = md5(results[result].emailId)
        if (hashedEmail === req.params.key){
          var sql = "UPDATE user SET isActive = ?,createdDate = ?, activationToken = ?, activationTokenExpiryTime = ? WHERE emailId = ?"
          var date = new Date()
          connection.query(sql,[true,date, null, null, emailId], (error2, results2)=>{
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
      }
    }
  })
})

//handle forgot password
router.post('/forgotPassword', function(req, res, next){
  emailId = req.body.emailId
  connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
    if(error){
      console.log(emailId)
      console.log(error)
      res.json({status:'500', success:false,message:'Internal Server Error, retry!'})
    }else if(results.length){
      //send password reset token
      passwordResetToken = md5(emailId+'step') //step is a random word
      date = new Date()
      dateInMs = date.getTime()
      passwordResetTokenExpiryTime = new Date(dateInMs + 1800000)
      sql = "UPDATE user SET passwordResetToken = ? , passwordResetTokenExpiryTime = ? WHERE emailId = ? "
      values = [ passwordResetToken, passwordResetTokenExpiryTime, emailId]
      connection.query(sql, values, function(error, results){
        if(error){
          console.log(error)
          res.json({status:'500', success:false,message:'Internal Server Error'})
        }else{
          emailContent = 'http://localhost:3000/users/forgotPassword/reset/'+passwordResetToken
          //for now directly sending the link as a response
          res.json({status:200, success:true, message: emailContent})
        //  sendEmail(emailId, emailContent, res, activationToken)
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
  console.log(password)
  passwordHash = md5(password)
  verificationToken = req.params.key
  console.log(verificationToken)
  connection.query('SELECT emailId FROM user', function(error, results){
    for (result in results){
      emailId = results[result].emailId
      freshHashedTokenForVerification = md5(emailId + 'step')
      if(freshHashedTokenForVerification === verificationToken){
        console.log('Yayy@')
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
        break
      }else{
        console.log(freshHashedTokenForVerification, verificationToken)
      }
      if(result == results.length-1){
        res.json({status:200, success:false, message:"Sorry, you don\'t exist!"})
      }
    }
  })
})

router.post('/register/resendToken', function(req, res, next){
  emailId = req.body.emailId
  connection.query("SELECT * FROM user WHERE emailId = ?",[emailId], function(error, results){
    if(error){
      console.log(error)
      res.json({status:500, message:"Internal server error" })
    }else if(results.length){
      activationToken = md5(emailId)
      date = new Date()
      dateInMs = date.getTime()
      activationTokenExpiryTime = new Date(dateInMs + 1800000)
      connection.query("UPDATE user SET(activationToken=?, activationTokenExpiryTime=?) WHERE emailId=?",[activationToken, activationTokenExpiryTime],function(error, results){
        if(error){
          res.json({status:500, message:'Try again!'})
        }else{
          res.json({status:200, success:true, message:"Please check mail"})
          //send email(problem)
        }
      })
    }else{
      res.json({status:200, success:false, message:"Email doesn\'t exist!"})
    }
  })
})




//login
router.post('/login', function(req, res) {
  emailId = req.body.emailId
  password = req.body.password
  passwordHash = md5(password)
  console.log([emailId, passwordHash, password])
  connection.query("SELECT * FROM user WHERE (emailId = ?  AND passwordHash = ?)", [emailId, passwordHash], function(error, results, details){
    if(results){
      user = results[0]
      sessId = md5(user.name+user.emailId)
      session.sessId = sessId
      console.log(session)
      res.json({status:200, success:true, message:"Redirect to /dashboard"}) //Give redirection headers
    }else{
      res.json({status:200, success:false})
    }
  })
});


module.exports = router;

function sendEmail(email, message,res, activationToken){
  var mailOptions={
     to : email,
     subject : 'Confirm registration!',
     text : message
  }
  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error)
      res.json({status:200, success:true, message: "Message sending failed, please visit this link!'\n' http://localhost.com/resend"+activationToken})
    }else{
      res.json({status:200,success:true, message:'Thanks for registering, please check e-mail inbox to complete registration!'})
      console.log("Message sent: " + response.message);
    }
  });

}

"use strict";

const express = require("express");
const router = express.Router();
const md5 = require("md5");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const senderEmailId = require("../config/gmail.js").emailId; // use const here
const senderPassword = require("../config/gmail.js").password;
const validate = require("../middlewares/validator").validate;
const connection = require("../middlewares/db_init").getConnection();
const saltRounds = 10;

// nodemailer config
const smtpTransport = nodemailer.createTransport({
  "service": "Gmail",
  "auth": {
    "user": senderEmailId,
    "pass": senderPassword,
  },
});

const internalError = (res, err) => {
  if (err) {
    console.log(err);
    return res.json({ "status": "500", "success": false, "message": "Internal Server Error. Please retry in some time." });
  }
};

let sendEmail = (email, message, res, activationToken, subject) => {
  return res.json({ "status": 200, "success": true, "message": message });
  const mailOptions = {
    "to": email,
    "subject": subject,
    "text": message,
  };

  smtpTransport.sendMail(mailOptions, (error, response) => {
    if (error) {
      console.log(error);
      // send message from callee
      return res.json({ "status": 200, "success": true, "message": message });
    }

    res.json({ "status": 200, "success": true, "message": "Thank you for registering. Please check your e-mail inbox to complete registration!" });
    console.log(`Message sent: ${response.message}`);
  });
};


// User login+signup handlers

// signup
router.post("/register", (req, res) => {
  const emailId = req.body.emailId;
  const name = req.body.name;
  const password = req.body.password;

  // validate e-mail
  if (!emailId || !name || !password) {
    return res.json({ "status": 200, "success": false, "message": "Please fill all the required details" });
  }
  if (!validate(emailId, "email")) {
    return res.json({ "status": 200, "success": false, "message": "Invalid e-mail id" });
  }

  connection.query("SELECT * FROM Users WHERE emailId = ?", [ emailId ], (error, results) => {
    if (error) {
      return internalError(error);
    }
    
    if (results.length) {
      return res.json({ "status": "200", "success": false, "message": "E-mail already registered" });
    }

    // salting
    bcrypt.hash(password + emailId, saltRounds, (err, passwordHash) => {
      if (err) {
        return internalError(res, err);
      }

      const date = new Date();
      const dateInMs = date.getTime();
      const activationToken = md5(emailId + dateInMs);
      const activationTokenExpiryTime = new Date(dateInMs + 86400000);
      const sql = "INSERT INTO Users (emailId, name, passwordHash, activationToken, activationTokenExpiryTime, createdAt, updatedAt) VALUE ?";
      const values = [ [ emailId, name, passwordHash, activationToken, activationTokenExpiryTime, new Date(), new Date() ] ];

      connection.query(sql, [ values ], (error, results) => {
        if (error) {
          return internalError(res, error);
        }
        const emailContent = `http://localhost:3000/users/register/activate/${activationToken}`;
        const subject = "Confirm Registration";

        sendEmail(emailId, emailContent, res, activationToken, subject);
        // res.json({status:200, success:true, message:"Please traverse to "+ emailContent})
      });
    });
  });
});

router.get("/register/activate/:key", (req, res, next) => {
  const key = req.params.key;

  if (!key) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }
  connection.query("SELECT * FROM Users WHERE activationToken=?", [ key ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      res.render('message',{message:"Invalid token <a href='/login'>login</a>"});
    }

    // process activation
    const activationTokenExpiryTime = results[ 0 ].activationTokenExpiryTime;
    const date = new Date();

    if (date > activationTokenExpiryTime) {
      return res.json({ "status": 200, "success": false, "message": "Token expired, generate new!", "redirect": "/login" });
    }
    // const sql = "UPDATE Users SET isActive = TRUE, createdDate = ?, activationToken = NULL, activationTokenExpiryTime = NULL WHERE emailId = ?";
    // TODO add activationDate field to Users
    const sql = "UPDATE Users SET isActive = TRUE, activationToken = NULL, activationTokenExpiryTime = NULL WHERE emailId = ?";

    connection.query(sql, [ results[ 0 ].emailId ], (error2, results2) => {
      if (error2) {
        return internalError(res, error2);
      }
      // generate token here and log him in directly
      // for now redirecting to login
      res.render('message',{message:"Registration Successful! <a href='/login'>login</a>"});
    });
  });
});


// handle forgot password
router.post("/forgotPassword", (req, res, next) => {
  const emailId = req.body.emailId;

  if (!emailId) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }

  connection.query("SELECT * FROM Users WHERE emailId = ?", [ emailId ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Invalid credentials" });
    }

    // send password reset token
    const date = new Date();
    const dateInMs = date.getTime();
    const passwordResetToken = md5(emailId + dateInMs);
    const passwordResetTokenExpiryTime = new Date(dateInMs + 86400000);
    const sql = "UPDATE Users SET passwordResetToken = ? , passwordResetTokenExpiryTime = ? WHERE emailId = ? ";
    const values = [ passwordResetToken, passwordResetTokenExpiryTime, emailId ];

    connection.query(sql, values, (error, results) => {
      if (error) {
        return internalError(res, error);
      }

      const emailContent = `http://localhost:3000/users/forgotPassword/reset/${passwordResetToken}`;
      const subject = "Reset Password";
      
      // for now directly sending the link as a response
      // res.json({status:200, success:true, message: emailContent})

      sendEmail(emailId, emailContent, res, passwordResetToken, subject);
    });
  });
});

router.post("/forgotPassword/reset/:key", (req, res, next) => {
  // check if password is in the body
  const password = req.body.password;
  const verificationToken = req.params.key;

  if (!password || !verificationToken) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }

  connection.query("SELECT emailId, passwordResetTokenExpiryTime FROM Users WHERE passwordResetToken=?", [ verificationToken ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Invalid token!" });
    }
    
    // experimenting with bcrypt
    const emailId = results[0].emailId;

    bcrypt.hash(password + emailId, saltRounds, (err, passwordHash) => {
      if (err) {
        return internalError(res, err);
      }

      const passwordResetTokenExpiryTime = results[ 0 ].passwordResetTokenExpiryTime;
      const date = new Date();

      if (date > passwordResetTokenExpiryTime) {
        return res.json({ "status": 200, "success": false, "message": "Token expired, generate new!"});
      }
      const sql = "UPDATE Users SET passwordHash = ?, passwordResetToken = null, passwordResetTokenExpiryTime = null WHERE emailId = ?";

      connection.query(sql, [ passwordHash, emailId ], (error, results) => {
        if (error) {
          console.log(error);
          res.json({ "status": 200, "message": "Password couldn't be reset try again!" });
        } else {
          // direct to users/dashboard but for now redirect to login
          res.json({ "status": 200, "message": "Password successfully changed!" });
        }
      });
    });
  });
});

router.post("/register/resendToken", (req, res, next) => {
  if (req.session.isLoggedIn) {
    return res.json({ "status": 200, "success": false });
  }

  const emailId = req.body.emailId;

  if (!emailId) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }

  connection.query("SELECT * FROM Users WHERE emailId = ?", [ emailId ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Please register!" });
    }

    // if there's an existing unexpired token, send it.
    if (results[0].activationToken) {
      const activationToken = results[0].activationToken;
      const message = `http://localhost:3000/register/activate/${activationToken}`;
      const subject = "Confirm Registration!";

      return sendEmail(emailId, message, res, activationToken, subject);
    }

    const date = new Date();
    const dateInMs = date.getTime();
    const activationTokenExpiryTime = new Date(dateInMs + 86400000);
    const activationToken = md5(emailId + dateInMs);

    connection.query("UPDATE Users SET activationToken=?, activationTokenExpiryTime=? WHERE emailId=?", [ activationToken, activationTokenExpiryTime, emailId ], (error2, results) => {
      if (error2) {
        return internalError(res, error2);
      }
      // res.json({status:200, success:true, message:"Please check mail", token: activationToken})
      const message = `http://localhost:3000/register/activate/${activationToken}`;
      const subject = "Confirm Registration!";

      sendEmail(emailId, message, res, activationToken, subject);
    });
  });
});

// login
router.post("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.json({ "status": 200, "success": false});
  }

  const emailId = req.body.emailId;
  const password = req.body.password;

  if (!emailId || !password) {
    return res.json({ "status": 200, "success": false, "message": "Pass appropriate parameters!" });
  }

  connection.query("SELECT * FROM Users WHERE (emailId = ?)", [ emailId ], (error, results, details) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Invalid credentials" });
    }

    const isActive = results[ 0 ].isActive;
    
    bcrypt.compare(password + results[0].emailId, results[0].passwordHash, (err, response) => {
      if (err) {
        return internalError(res, err);
      }
      if (!response) {
        return res.json({ "status": 200, "success": false, "message": "Invalid credentials" });
      }
   
      if (!isActive) {
        return res.json({ "status": 200, "success": 200, "message": "Please check your email and confirm your email id to proceed" });
      }

      // const user = results[ 0 ];
      req.session.isLoggedIn = true;
      req.session.userId = results[0].id;
      req.session.userEmail = emailId;
      req.session.name = results[0].name;
      req.session.path = "/";
      res.json({ "status": 200, "success": true, "message": "Redirect to /users/dashboard" }); // Give redirection headers
    });
  });
});

module.exports = router;

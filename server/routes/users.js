const express = require("express");
const router = express.Router();
const md5 = require("md5");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const session = require("express-session");
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
    return res.json({ "status": "500", "success": false, "message": "Internal Server Error, retry!" });
  }
};

let sendEmail = (email, message, res, activationToken, subject) => {
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

    res.json({ "status": 200, "success": true, "message": "Thanks for registering, please check e-mail inbox to compconste registration!" });
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
    return res.json({ "status": 200, "success": false, "message": "Pass appropriate parameters!" });
  }
  if (!validate(emailId, "email")) {
    return res.json({ "status": 200, "success": false, "message": "Invalid e-mail!" });
  }

  connection.query("SELECT * FROM user WHERE emailId = ?", [ emailId ], (error, results) => {
    if (error) {
      return internalError(error);
    }
    
    if (results.length) {
      return res.json({ "status": "200", "success": false, "message": "E-mail already exists" });
    }

    // salting
    bcrypt.hash(password + emailId, saltRounds, (err, passwordHash) => {
      if (err) {
        return internalError(res, err);
      }

      const date = new Date();
      const dateInMs = date.getTime();
      const activationToken = md5(emailId + dateInMs);
      const activationTokenExpiryTime = dateInMs + 86400000;
      const sql = "INSERT INTO user (emailId, name, passwordHash, activationToken, activationTokenExpiryTime) VALUE ?";
      const values = [ [ emailId, name, passwordHash, activationToken, activationTokenExpiryTime ] ];

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

router.post("/register/activate/:key", (req, res, next) => {
  const key = req.params.key;

  if (!key) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }
  connection.query("SELECT * FROM user WHERE activationToken=?", [ key ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Invalid Token" });
    }

    // process activation
    const activationTokenExpiryTime = results[ 0 ].activationTokenExpiryTime;
    const date = new Date();

    if (date.getTime() > activationTokenExpiryTime) {
      return res.json({ "status": 200, "success": false, "message": "Token expired, generate new!", "redirect": "/login" });
    }
    const sql = "UPDATE user SET isActive = TRUE,createdDate = ?, activationToken = NULL, activationTokenExpiryTime = NULL WHERE emailId = ?";

    connection.query(sql, [ date.getTime(), results[ 0 ].emailId ], (error2, results2) => {
      if (error2) {
        return internalError(res, error2);
      }
      // generate token here and log him in directly
      // for now redirecting to login
      res.json({ "success": true, "message": "Registration Successful!", "redirect": "/login" });
    });
  });
});


// handle forgot password
router.post("/forgotPassword", (req, res, next) => {
  const emailId = req.body.emailId;

  if (!emailId) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }

  connection.query("SELECT * FROM user WHERE emailId = ?", [ emailId ], (error, results) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "Email doesn't exist!" });
    }

    // send password reset token
    const date = new Date();
    const dateInMs = date.getTime();
    const passwordResetToken = md5(emailId + dateInMs);
    const passwordResetTokenExpiryTime = dateInMs + 86400000;
    const sql = "UPDATE user SET passwordResetToken = ? , passwordResetTokenExpiryTime = ? WHERE emailId = ? ";
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

  connection.query("SELECT emailId, passwordResetTokenExpiryTime FROM user WHERE passwordResetToken=?", [ verificationToken ], (error, results) => {
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

      if (date.getTime() > passwordResetTokenExpiryTime) {
        return res.json({ "status": 200, "success": false, "message": "Token expired, generate new!", "redirect": "/login" });
      }
      const sql = "UPDATE user SET passwordHash = ?, passwordResetToken = null, passwordResetTokenExpiryTime = null WHERE emailId = ?";

      connection.query(sql, [ passwordHash, emailId ], (error, results) => {
        if (error) {
          console.log(error);
          res.json({ "status": 200, "message": "Password couldn't be reset try again!" });
        } else {
          // direct to users/dashboard but for now redirect to login
          res.json({ "status": 200, "message": "Password successfully changed!", "redirect": "/login" });
        }
      });
    });
  });
});

router.post("/register/resendToken", (req, res, next) => {
  if (session.sessId) {
    return res.json({ "status": 200, "success": false, "redirect": "/users/dashboard" });
  }

  const emailId = req.body.emailId;

  if (!emailId) {
    return res.json({ "status": 200, "success": false, "message": "Return with parameters!" });
  }

  connection.query("SELECT * FROM user WHERE emailId = ?", [ emailId ], (error, results) => {
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
    const dateInMs = Number(date.getTime());
    const activationTokenExpiryTime = dateInMs + 86400000;
    const activationToken = md5(emailId + dateInMs);

    connection.query("UPDATE user SET activationToken=?, activationTokenExpiryTime=? WHERE emailId=?", [ activationToken, activationTokenExpiryTime, emailId ], (error2, results) => {
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
  if (req.session.sessId) {
    return res.json({ "status": 200, "success": false, "redirect": "/users/dashboard" });
  }

  const emailId = req.body.emailId;
  const password = req.body.password;

  if (!emailId || !password) {
    return res.json({ "status": 200, "success": false, "message": "Pass appropriate parameters!" });
  }

  connection.query("SELECT * FROM user WHERE (emailId = ?)", [ emailId ], (error, results, details) => {
    if (error) {
      return internalError(res, error);
    }
    if (!results.length) {
      return res.json({ "status": 200, "success": false, "message": "User doesn't exist!" });
    }
    
    if (!results[ 0 ].isActive) {
      return res.json({ "status": 200, "success": 200, "message": "Confirm your acc!" });
    }
    
    bcrypt.compare(password + results[0].emailId, results[0].passwordHash, (err, response) => {
      if (err) {
        return internalError(res, err);
      }
      if (!response) {
        return res.json({ "status": 200, "success": false, "message": "Wrong password" });
      }

      // const user = results[ 0 ];
      req.session.isLoggedIn = true;
      req.session.path = "/";
      res.json({ "status": 200, "success": true, "message": "Redirect to /dashboard" }); // Give redirection headers
    });
  });
});

module.exports = router;
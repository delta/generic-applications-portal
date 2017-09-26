const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const connection = require("../middlewares/db_init").getConnection();
/* Only for logged users*/
const saltRounds = 10;

const internalError = (res, err) => {
  if (err) {
    console.log(err);
    return res.json({ "status": "500", "success": false, "message": "Internal Server Error, retry!" });
  }
};

router.post("/changePassword", (req, res) => {
  // Check for required parameters before doing anything
  const newPassword = req.body.newPassword;
  const emailId = req.body.emailId;
  const oldPassword = req.body.oldPassword;

  if (!newPassword || !emailId || !oldPassword) {
    return res.json({ "status": 200, "success": false, "message": "Send proper params!" });
  }

  connection.query("SELECT * FROM user WHERE emailId = ?", [ emailId ], (error, users) => {
    if (error) {
      return internalError(res, error);
    }
    const user = users[ 0 ];

    bcrypt.compare(oldPassword + emailId, user.passwordHash, (err, response) => {
      if (err) {
        return internalError();
      }

      if (!response) {
        return res.json({ "status": 200, "success": false, "message": "Old Password Incorrect" });
      }
      bcrypt.hash(newPassword + emailId, saltRounds, (err, hash2) => {
        if (err) {
          return internalError(res, err);
        }

        connection.query("UPDATE user SET passwordHash=? WHERE emailId = ?", [ hash2, emailId ], (error2) => {
          if (error2) {
            return internalError(error2);
          }
          res.json({ "status": 200, "success": true, "message": "Password updated!" });
        });
      });
    });
  });
});


module.exports = router;

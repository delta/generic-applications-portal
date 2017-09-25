"use strict";

const express = require("express");
const router = express.Router();

// User login+signup handlers

// GET handlers
router.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.redirect("/login.html");
});
router.get("/signup", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.redirect("/signup.html");
});


module.exports = router;

"use strict";

const express = require("express");
const router = express.Router();

// User login+signup handlers

// GET handlers
router.get('/', (req, res)=>{
	if(req.session.isLoggedIn){
		res.redirect('/applications');
	}else{
		res.redirect('/login');
	}
})
router.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.render("login");
});
router.get("/signup", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.render("signup");
});


module.exports = router;

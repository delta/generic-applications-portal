var md5 = require('md5')
module.exports.authenticate = (req, res, next)=>{
  console.log(req.session, "ap")
  if(req.session.isLoggedIn){
    res.json({status:200, success:true})
  }else{
    res.json({status:200, success:false, redirect:'/login'})
  }
}

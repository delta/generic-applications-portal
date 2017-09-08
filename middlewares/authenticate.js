module.exports.authenticate = (req, res, next)=>{
  console.log(req.session)
  if(req.session.sessId){
    connection.query("SELECT * FROM user", function(error, users){
      for (user of users){
        console.log(user.name, user.emailId)
      }
    })
  }else{
    res.json({status:200, success:false, redirect:'/login'})
  }
}

var md5 = require('md5')
module.exports.authenticate = (req, res, next)=>{
  console.log(req.session, "ap")
  if(req.session.sessId){
    connection.query("SELECT * FROM user", function(error, users){
      count=0
      for (user of users){
        count++
        if(md5(user.name + user.emailId) == req.session.sessId){
          console.log('user found!')
          return next()
        }
        if(count == users.length){
          res.json({status:200, success:false, redirect:'/login'})      
        }
      }
    })
  }else{
    res.json({status:200, success:false, redirect:'/login'})
  }
}

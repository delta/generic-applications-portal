module.exports.validate = (req, res, next)=>{
  if(req.emailId){
    //check emailId
  }else if(req.password){
    //check password
  }else if(req.name){
    //check name
  }
  next()
}

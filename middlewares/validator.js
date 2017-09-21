const validator = require('validator')
module.exports.validate = (toBeValidated, type)=>{
	if(type === 'email'){
		return validator.isEmail(toBeValidated);
	}
}

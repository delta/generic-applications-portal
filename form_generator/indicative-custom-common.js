/*
  The below code will have access to indicative.

  This code is common to both client and server. When the form generator
  is invoked, it takes this code, and places it in apt places in both
  client and server.

  Special case: 'js' rule uses eval to evaluate rules, and the rules
  access form values using $f.<someFormElemName> format. They also access
  functions that are defined in <script> tag in the markup. Both of these
  are handled as follows:
    1. Client:
      - $f: it is already available as a global variable.
      - functions: functions defined in <script> tags are global
    2. Node:
      $f, and the functions defined in <script> tags will be taken
      and kept along with the following definitions in a module.
      The module will provide a method called set$f( $f ) which
      can be used to update $f before validation.

  The following doesn't define indicative rules for files, since
  files are handled differently both on client and server. For that
  both client and server write their own implementations.
*/

indicative.extend("phone", (data, field, message, args, get) => {
  if (indicative.is.phone(get(data, field))) {
    return Promise.resolve("");
  }
  return Promise.reject("Please enter a valid phone number");
});

indicative.extend("email", (data, field, message, args, get) => {
  if (indicative.is.email(get(data, field))) {
    return Promise.resolve("");
  }
  return Promise.reject("Please enter a valid email id");
});

indicative.extend("js", ($f, field, message, args) => {
  // naming the first argument $f here is a hacky way to give the 'code' access to the
  // variables in the rest of the form.

  let code = args.join(","); // in case there was a ',' in code, and indicative thought it
  // was indicative of separating an argument instead of part
  // of js code itself

  let pass = true;

  try {
    pass = eval(code); // decide result based on expression
  } catch (err) {
    pass = false; // fail if expression throws error
  }

  if (pass) {
    return Promise.resolve("");
  }
  return Promise.reject("Invalid data");
});

indicative.extend("requiredIfJs", ($f, field, message, args, get) => {
  // naming the first argument $f here is a hacky way to give the 'code' access to the
  // variables in the rest of the form.

  let code = args.join(","); // in case there was a ',' in code, and indicative thought it
  // was indicative of separating an argument instead of part
  // of js code itself

  let pass = true;

  try {
    pass = eval(code); // decide result based on expression
  } catch (err) {
    pass = false; // fail if expression throws error
    console.log(err);
  }

  console.log(code, pass, $f, get($f, field))  
  
  if (!pass) {
    return Promise.resolve("");
  }
  if (pass && get($f, field) !== "") {
    return Promise.resolve("");
  }
  return Promise.reject("Invalid data");
});

indicative.extend("pincode", (data, field, message, args, get) => {
  if (/^[0-9]{6}$/.test(get(data, field))) {
    return Promise.resolve("");
  }
  return Promise.reject("Invalid Pincode");
});

indicative.extend("year", (data, field, message, args, get) => {
  if (/^[0-9]{4}$/.test(get(data, field)) && parseInt(get(data, field)) >= 1950) {
    return Promise.resolve("");
  }
  return Promise.reject("Please enter a valid year greater than 1950");
});

indicative.extend("sometimes", () => Promise.resolve(""));
const catchAsync = require('../utils/catchAsync');

// Gather params and validate params (function 1)
const validateParams = catchAsync(async (req, res, next) => {

  var auth = req.headers['authorization'];
  var jqlParams = req.url.substring(1);

  if (!auth || !jqlParams.includes('project')) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    res.end('Params are missing you should pass username, password and project name');
  }

  else if (auth) {

    var tmp = auth.split(' ');
    var buf = new Buffer(tmp[1], 'base64');
    var plain_auth = buf.toString();
    var creds = plain_auth.split(':');
    var username = creds[0];
    var password = creds[1];

    req.username = username;
    req.password = password;
    req.jql = jqlParams;

    if ((req.username == process.env.user) && (req.password == process.env.token)) {
      res.statusCode = 200;
      next();
    }
    else {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

      res.end('You shall not pass');
    }
  }
});

module.exports = validateParams;
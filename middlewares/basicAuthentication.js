const catchAsync = require('../utils/catchAsync');

const basicAuthenticateUser = catchAsync(async (req, res, next) => {

  var auth = req.headers['authorization'];

  if (!auth) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

    res.end('Need some creds');
  }

  else if (auth) {

    var tmp = auth.split(' ');

    var buf = new Buffer(tmp[1], 'base64');
    var plain_auth = buf.toString();
    var creds = plain_auth.split(':');
    var username = creds[0];
    var password = creds[1];
    console.log('USERR')
    console.log(process.env.user)
    req.username = username;
    req.password = password;
    if ((username == process.env.user) && (password == process.env.token)) {
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

module.exports = basicAuthenticateUser;
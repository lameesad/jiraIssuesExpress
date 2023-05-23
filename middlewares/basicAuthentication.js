const catchAsync = require('../utils/catchAsync');

const validateParams = catchAsync(async (req, res, next) => {
  const { headers, url } = req;
  const auth = headers['authorization'];
  const jqlParams = url.substring(1);

  if (!auth || !jqlParams.includes('project')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    res.status(401).json({ status: 401, message: 'Params are missing. You should pass username, password, and project name' });
  } else {
    const [, base64Credentials] = auth.split(' ');
    const [username, password] = Buffer.from(base64Credentials, 'base64').toString().split(':');

    req.username = username;
    req.password = password;
    req.jql = jqlParams;

    if (req.username === process.env.user && req.password === process.env.token) {
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      res.status(401).json({ status: 401, message: 'You shall not pass' });
    }
  }
});

module.exports = validateParams;

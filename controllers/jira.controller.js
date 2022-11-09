const axios = require('axios');
const fetch = require('node-fetch');
const catchAsync = require('../utils/catchAsync');



const hellojira = catchAsync(async (req, res) => {


  let response = await fetch('https://lamees.atlassian.net/rest/api/2/search?jql=project=lameesProject', {
    method: 'GET',
    headers: { 'Authorization': 'Basic ' + Buffer.from(req.username + ":" + req.password).toString('base64') }
  });
  let data = await response.json();
  res.send(data)

});

const helloAxios = catchAsync(async (req, res) => {

  let token = Buffer.from(`${req.username}:${req.token}`, 'utf8').toString('base64')
  console.log(token)
  axios.get('https://lamees.atlassian.net/rest/api/2/search?jql=project=lameesProject', {}, {
    headers: {
      "Authorization": `Basic lameesaboudarwish@gmail.com:qtGLHTEwB5rIcO9GULh98C04`,
      'Accept': 'application/json'
    }
  }).then(resp => {
    console.log(resp)
    res.send(resp)
  }).catch(err => console.log(err));
});

const hello = catchAsync(async (req, res) => {

  var auth = req.headers['authorization'];

  if (!auth) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

    res.end('Need some creds son');
  }

  else if (auth) {

    var tmp = auth.split(' ');

    var buf = new Buffer(tmp[1], 'base64');
    var plain_auth = buf.toString();
    var creds = plain_auth.split(':');
    var username = creds[0];
    var password = creds[1];
    if ((username == process.env.username) && (password == process.env.token)) {
      res.statusCode = 200;
      res.end('Congratulations!');
    }
    else {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

      res.end('You shall not pass');
    }
  }
});


module.exports = {
  hellojira,
  hello,
  helloAxios
};
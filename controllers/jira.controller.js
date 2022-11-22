const axios = require("axios");
const fetch = require("node-fetch");
const catchAsync = require("../utils/catchAsync");

// Lamis to read about log levels and how to change log level on production for frontend and backend
// SA says rename this function
const hellojira = catchAsync(async (req, res) => {
  // Gather params and validate params (function 1)

  // JQL need to be added as parameter to the function 2
  // Call api and get data filtered by the params (function 2)

  // validate the response of the api call
  // get the response and iterate through the response to fill a local Map with a accountid and object { Custom object} (function 3)

  // manipulate the data and check what to store in the database and what need to be stored in the cache (function 4)

  // create a ui object to return it in the response (function 5)

  //calling API
  let response = await fetch("https://lamees.atlassian.net/rest/api/2/search?jql=project=lameesProject&orderBy=created DECS", {
    method: "GET",
    headers: { Authorization: "Basic " + Buffer.from(req.username + ":" + req.password).toString("base64") },
  });

  //getting response and fill it in an object user?
  let data = await response.json();

  //invalid name
  var user = new Map();

  //null pointer exception check null.issues
  data.issues.forEach((element) => {
    //null pointer check then put element.fields in a variable
    let accountId = element.fields.assignee.accountId;
    let created = element.fields.created;
    let updated = element.fields.updated;
    let issueID = element.id;

    let count = user.get(accountId)?.count;
    let issues = user.get(accountId)?.issues;

    if (count == null) {
      count = 0;
    }

    if (issues == null) {
      issues = [];
    }
    let issue = { id: issueID, created: created, updated: updated };
    issues.push(issue);
    console.log("ISSSUEEE", issues);

    user.set(accountId, { count: count + 1, issues: issues });
    //why stopped here
  });

  //printed the result
  console.log(user);

  //return the result to the UI
  res.send(data);
});

const helloAxios = catchAsync(async (req, res) => {
  let token = Buffer.from(`${req.username}:${req.token}`, "utf8").toString("base64");
  console.log(token);
  axios
    .get(
      "https://lamees.atlassian.net/rest/api/2/search?jql=project=lameesProject",
      {},
      {
        headers: {
          Authorization: `Basic lameesaboudarwish@gmail.com:qtGLHTEwB5rIcO9GULh98C04`,
          Accept: "application/json",
        },
      }
    )
    .then((resp) => {
      console.log(resp);
      res.send(resp);
    })
    .catch((err) => console.log(err));
});

const hello = catchAsync(async (req, res) => {
  var auth = req.headers["authorization"];

  if (!auth) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');

    res.end("Need some creds son");
  } else if (auth) {
    var tmp = auth.split(" ");

    var buf = new Buffer(tmp[1], "base64");
    var plain_auth = buf.toString();
    var creds = plain_auth.split(":");
    var username = creds[0];
    var password = creds[1];
    if (username == process.env.username && password == process.env.token) {
      res.statusCode = 200;
      res.end("Congratulations!");
    } else {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');

      res.end("You shall not pass");
    }
  }
});

module.exports = {
  hellojira,
  hello,
  helloAxios,
};

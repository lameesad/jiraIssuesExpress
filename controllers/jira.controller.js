const axios = require("axios");
const fetch = require("node-fetch");


const setUserIssues = async (req, res) => {
  validateParams(req, res)
};

const validateParams = async (req, res) => {

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
      getJirraIssues(req, res)
    }
    else {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

      res.end('You shall not pass');
    }
  }
};

const getJirraIssues = async (req, res) => {

  let response = await fetch("https://lamees.atlassian.net/rest/api/2/search" + req.jql, {
    method: "GET",
    headers: { Authorization: "Basic " + Buffer.from(req.username + ":" + req.password).toString("base64") },
  });

  let data = await response.json();
  if (response.status === 200) {
    createUsersIssues(req, res, data);
  } else {
    res.send("Incorrect JQL filters")
  }

};


const createUsersIssues = async (req, res, data) => {
  var usersIssues = new Map();

  if (data == null) {
    res.send("ERROR");
  } else {
    data.issues.forEach((element) => {
      const issueElement = element.fields;
      if (issueElement == null) {
        return
      } else {
        let accountId = issueElement.assignee.accountId;
        let issueID = element.id;

        let count = usersIssues.get(accountId)?.count;
        let issues = usersIssues.get(accountId)?.issues;

        if (count == null) {
          count = 0;
        }

        if (issues == null) {
          issues = [];
        }
        let issue = { id: issueID, created: issueElement.created, updated: issueElement.updated };
        issues.push(issue);
        usersIssues.set(accountId, { count: count + 1, issues: issues });
        console.warn("Issues TEST", usersIssues)
        // res.send("TO continue");
      }
    });
    if (usersIssues) {
      console.warn("USSERR ISSUES", usersIssues);
    }

  }

};




module.exports = {
  setUserIssues,
};

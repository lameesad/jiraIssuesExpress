const axios = require("axios");
const fetch = require("node-fetch");
const catchAsync = require("../utils/catchAsync");

// Lamis to read about log levels and how to change log level on production for frontend and backend
// SA says rename this function

const createUsersIssues = async (data) => {

  var usersIssues = new Map();
  if (data == null) {
    return;
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
      }

    });
  }
  return usersIssues
};

const getJirraIssues = catchAsync(async (req, res) => {
  let response = await fetch("https://lamees.atlassian.net/rest/api/2/search" + req.jql, {
    method: "GET",
    headers: { Authorization: "Basic " + Buffer.from(req.username + ":" + req.password).toString("base64") },
  });

  let data = await response.json();

  if (response.status === 200) {
    createUsersIssues(data)
    res.send("Data");
  } else {
    res.send("Incorrect JQL filters")
  }

});

module.exports = {
  getJirraIssues,
};

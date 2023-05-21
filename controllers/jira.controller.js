const axios = require("axios");
const fetch = require("node-fetch");

const setUserIssues = async (req, res) => {
  validateParams(req, res);
};

const validateParams = async (req, res) => {
  var auth = req.headers["authorization"];
  var jqlParams = req.url.substring(1);

  if (!auth || !jqlParams.includes("project")) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
    res.end(
      "Params are missing. You should pass username, password, and project name."
    );
  } else if (auth) {
    var tmp = auth.split(" ");
    var buf = Buffer.from(tmp[1], "base64");
    var plain_auth = buf.toString();
    var creds = plain_auth.split(":");
    var username = creds[0];
    var password = creds[1];

    req.username = username;
    req.password = password;
    req.jql = jqlParams;

    if (
      req.username == process.env.user &&
      req.password == process.env.token
    ) {
      res.statusCode = 200;
      getJiraIssues(req, res);
    } else {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
      res.end("Username or password is incorrect.");
    }
  }
};

const getJiraIssues = async (req, res) => {
  let response = await fetch(
    "https://lamees.atlassian.net/rest/api/2/search" + req.jql,
    {
      method: "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(req.username + ":" + req.password).toString("base64"),
      },
    }
  );

  let data = await response.json();
  if (response.status === 200) {
    getIssuesByUser(req, res, data);
  } else {
    res.send("Incorrect JQL filters");
  }
};

const getIssuesByUser = async (req, res, data) => {
  var usersIssues = new Map();
  if (data == null) {
    res.send("ERROR");
  } else {
    data.issues.forEach((element) => {
      const issueElement = element.fields;
      if (issueElement.reporter == null) {
        return;
      } else {
        let userId = issueElement.reporter.accountId;
        let issueID = element.id;

        let count = usersIssues.get(userId)?.count;
        let issues = usersIssues.get(userId)?.issues;
        if (count == null) {
          count = 0;
        }

        if (issues == null) {
          issues = [];
        }
        let issue = {
          id: issueID,
          created: issueElement.created,
          updated: issueElement.updated,
        };
        issues.push(issue);
        usersIssues.set(userId, { count: count + 1, issues: issues });
      }
    });
    getUsersComments(req, res, usersIssues);
  }
};

const getUsersComments = async (req, res, data) => {
  const usersIssues = new Map();
  console.log("__________Ddddddd", data);

  const promises = [];
  for (let [userId, userIssues] of data.entries()) {
    let count = userIssues.count;
    let issues = userIssues.issues;
    let lastComment = { updated: null };

    for (let issue of issues) {
      promises.push(getComments(req, res, issue.id));
    }
  }

  Promise.all(promises)
    .then((responses) => {
      const allComments = responses.flatMap((response) => response.comments);

      for (let [userId, userIssues] of data.entries()) {
        let count = userIssues.count;
        let issues = userIssues.issues;
        let lastComment = { updated: null };

        const userComments = allComments.filter(
          (comment) =>
            comment.author.accountId === userId ||
            comment.author.accountId === req.username
        );

        if (userComments.length > 0) {
          const lastUserComment = userComments.reduce((prev, current) =>
            new Date(current.updated) > new Date(prev.updated) ? current : prev
          );

          lastComment = {
            id: lastUserComment.id,
            body: lastUserComment.body,
            updated: lastUserComment.updated,
          };
        }

        usersIssues.set(userId, { count: count, lastComment: lastComment });
      }

      let latestComment = { updated: null };
      for (let [, user] of usersIssues) {
        if (new Date(user.lastComment.updated) > new Date(latestComment.updated)) {
          latestComment = user.lastComment;
        }
      }

      const result = Object.fromEntries(usersIssues);
      res.send({ usersIssues: result, latestComment: latestComment });
    })
    .catch((error) => {
      console.error(error);
      res.send("Error occurred while retrieving comments");
    });
};





const getComments = async (req, res, issueId) => {
  let response = await fetch(
    "https://lamees.atlassian.net/rest/api/2/issue/" + issueId + "/comment",
    {
      method: "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(req.username + ":" + req.password).toString("base64"),
      },
    }
  );
  return response.json();
};


module.exports = {
  setUserIssues,
};

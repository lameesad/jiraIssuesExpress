const axios = require("axios");
const fetch = require("node-fetch");
const { connectToDatabase, closeConnection, query } = require('../db');
// const moment = require('moment');
const moment = require('moment-timezone');

let client; // Declare a variable to store the database client

const setUserIssues = async (req, res) => {
  try {
    await connectToDatabase(); // Connect to the database

    const data = await getJiraIssues(req);
    const usersIssues = getIssuesByUser(req, data);
    const result = await getUsersComments(req, usersIssues);

    await saveUserDataToDatabase(result);

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  } finally {
    await closeConnection(); // Close the database connection
  }
};

const saveUserDataToDatabase = async (userData) => {
  try {
    if (!userData || !userData.usersIssues) {
      throw new Error('User data is missing or empty');
    }

    await query('BEGIN');

    const updateParams = [];

    for (const userId in userData.usersIssues) {
      const { count, lastComment, latestIssueDate, displayName } = userData.usersIssues[userId];
      const { id, body, updated } = lastComment;

      const updateUserQuery = `
        INSERT INTO users (id, name, count, commentdate, issueDate, body)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET count = users.count + EXCLUDED.count,
            commentdate = CASE WHEN EXCLUDED.commentdate IS NOT NULL THEN EXCLUDED.commentdate ELSE users.commentdate END,
            issueDate = CASE WHEN EXCLUDED.issueDate IS NOT NULL THEN EXCLUDED.issueDate ELSE users.issueDate END,
            body = CASE WHEN EXCLUDED.body IS NOT NULL THEN EXCLUDED.body ELSE users.body END
      `;

      updateParams.push(userId, displayName, count, updated, latestIssueDate, body);
      await query(updateUserQuery, updateParams);
      updateParams.length = 0; // Clear the array for the next iteration
    }

    await query('COMMIT');
    console.log('User data saved to the database successfully');
  } catch (error) {
    console.error('Error saving user data to the database:', error);
    await query('ROLLBACK');
  }
};


const getMaxIssueDate = async () => {
  if (!client) {
    client = await connectToDatabase(); // Connect to the database if the client is not already connected
  }

  // Assuming your database timezone is '+04:00'
  const result = await query('SELECT MAX(issuedate) AS maxdate, MAX(commentdate) AS maxupdate FROM users;');
  const dbDateTime = result[0].maxdate;
  const dbUpdateTime = result[0].maxupdate;
  // Specify the desired timezone for parsing

  if (!dbDateTime || !dbUpdateTime) {
    // Return default values or handle the case where data is missing
    return null
  }
  const parsedDateTime = moment.tz(dbDateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ', 'Asia/Dubai');
  const parsedUpdateTime = moment.tz(dbUpdateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ', 'Asia/Dubai');

  console.log("Parsed date:", parsedDateTime.format('YYYY-MM-DD HH:mm'));
  console.log("Parsed_______", parsedUpdateTime)
  return {
    maxdate: parsedDateTime,
    maxupdate: parsedUpdateTime,
    maxDateTime: dbDateTime,
    maxUpdateTime: dbUpdateTime
  };
};
const formatJiraDate = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm');
};

const getJiraIssues = async (req) => {
  const { project } = req.query;
  const maxDate = await getMaxIssueDate();


  let jql = '';


  if (maxDate) {
    const formattedDate = formatJiraDate(maxDate.maxdate);
    const formattedUpdate = formatJiraDate(maxDate.maxupdate);
    jql += `project=${project} AND createdDate > "${formattedDate}" AND updatedDate > "${formattedUpdate}" `;
  }
  console.log("JQL__", jql)
  const response = await fetch(
    `https://lamees.atlassian.net/rest/api/2/search?jql=${jql}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${req.username}:${req.password}`).toString('base64')}`,
      },
    }
  );
  if (response.status === 200) {
    const responseBody = await response.text();
    const responseObject = JSON.parse(responseBody);
    if (maxDate) {
      const filteredIssues = responseObject.issues.filter((issue) => {
        const createdDate = moment.tz(issue.fields.created, 'YYYY-MM-DD HH:mm:ss.SSSZ', 'Asia/Dubai');
        const updatedDate = moment.tz(issue.fields.updated, 'YYYY-MM-DD HH:mm:ss.SSSZ', 'Asia/Dubai');
        return createdDate.isAfter(maxDate.maxDateTime) && updatedDate.isAfter(maxDate.maxUpdateTime);
      });
      responseObject.issues = filteredIssues;
    }

    return responseObject;
  } else {
    throw new Error('Incorrect JQL filters');
  }
};




const getIssuesByUser = (req, data) => {
  const usersIssues = new Map();

  if (!data || !data.issues) {
    throw new Error('No data found');
  }
  console.log("data_____________", data.issues)
  data.issues.forEach((element) => {
    const issueElement = element.fields;

    if (issueElement.reporter && issueElement.reporter.accountId) {
      const userId = issueElement.reporter.accountId;
      const issueID = element.id;

      let { count, issues } = usersIssues.get(userId) || { count: 0, issues: [] };

      const issue = {
        id: issueID,
        name: issueElement.reporter.displayName,
        created: issueElement.created,
        updated: issueElement.updated,
      };

      issues.push(issue);
      usersIssues.set(userId, { count: count + 1, issues });
    }
  });

  return usersIssues;
};

const getUsersComments = async (req, usersIssues) => {
  const allComments = await getAllComments(req, usersIssues);

  const result = {};

  for (const [userId, userIssues] of usersIssues.entries()) {
    const { count, issues } = userIssues;
    const userComments = getUserComments(userId, allComments, req.username);
    const lastComment = getLastUserComment(userComments);
    const latestIssueDate = getlatestIssueDate(issues);

    const user = {
      count,
      lastComment,
      latestIssueDate,
      displayName: issues.length > 0 ? issues[0].name : null,
    };

    result[userId] = user;
  }

  const latestComment = getLatestComment(result);

  return { usersIssues: result, latestComment };
};

const getlatestIssueDate = (issues) => {
  let latestIssueDate = null;

  for (const issue of issues) {
    if (!latestIssueDate || new Date(issue.created) > new Date(latestIssueDate)) {
      latestIssueDate = issue.created;
    }
  }

  return latestIssueDate;
};


// Get all comments for user issues
const getAllComments = async (req, usersIssues) => {
  const promises = [];

  for (const [userId, userIssues] of usersIssues.entries()) {
    for (const issue of userIssues.issues) {
      promises.push(getComments(req, issue.id));
    }
  }

  const responses = await Promise.all(promises);
  return responses.flatMap((response) => response.comments);
};

// Get comments for an issue
const getComments = async (req, issueId) => {
  const response = await fetch(
    `https://lamees.atlassian.net/rest/api/2/issue/${issueId}/comment`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${req.username}:${req.password}`).toString('base64')}`,
      },
    }
  );

  return response.json();
};

// Get user comments from all comments
const getUserComments = (userId, allComments, username) => {
  return allComments.filter(
    (comment) =>
      comment.author.accountId === userId ||
      comment.author.accountId === username
  );
};

// Get the last user comment
const getLastUserComment = (userComments) => {
  let lastComment = { updated: null };

  if (userComments.length > 0) {
    lastComment = userComments.reduce((prev, current) =>
      new Date(current.updated) > new Date(prev.updated) ? current : prev
    );
  }

  return {
    id: lastComment.id,
    body: lastComment.body,
    updated: lastComment.updated,
  };
};

// Get the latest comment across all users
const getLatestComment = (usersIssues) => {
  let latestComment = { updated: null };

  for (const [, user] of Object.entries(usersIssues)) {
    if (new Date(user.lastComment.updated) > new Date(latestComment.updated)) {
      latestComment = user.lastComment;
    }
  }

  return latestComment;
};

module.exports = {
  setUserIssues
};


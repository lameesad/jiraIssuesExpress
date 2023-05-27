const axios = require("axios");
const fetch = require("node-fetch");
const { connectToDatabase, closeConnection, query } = require('../db');

const setUserIssues = async (req, res) => {
  try {
    const data = await getJiraIssues(req);
    const usersIssues = getIssuesByUser(req, data);
    const result = await getUsersComments(req, usersIssues);

    await saveUserDataToDatabase(result);

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const saveUserDataToDatabase = async (userData) => {
  try {
    await connectToDatabase();
    if (!userData || !userData.usersIssues) {
      throw new Error('User data is missing or empty');
    }
    for (const userId in userData.usersIssues) {

      const { count, lastComment, mostRecentDate, displayName } = userData.usersIssues[userId];
      const { id, body, updated } = lastComment;

      try {
        await query('BEGIN');

        await query(`
          INSERT INTO users (id, name, count, commentdate, issueDate)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, displayName, count, updated, mostRecentDate]);

        await query('COMMIT');
      } catch (error) {
        console.log("ERRORR_", error);
        await query('ROLLBACK');
        throw error;
      }
    }

    console.log('User data saved to the database successfully');
  } catch (error) {
    console.error('Error saving user data to the database:', error);
  }
};


const getJiraIssues = async (req) => {
  const response = await fetch(
    `https://lamees.atlassian.net/rest/api/2/search${req.jql}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${req.username}:${req.password}`).toString('base64')}`,
      },
    }
  );

  if (response.status === 200) {
    return await response.json();
  } else {
    throw new Error('Incorrect JQL filters');
  }
};

const getIssuesByUser = (req, data) => {
  const usersIssues = new Map();

  if (!data || !data.issues) {
    throw new Error('No data found');
  }

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

// const getUsersComments = async (req, usersIssues) => {
//   const allComments = await getAllComments(req, usersIssues);

//   const result = {};

//   for (const [userId, userIssues] of usersIssues.entries()) {
//     const { count, issues } = userIssues;
//     const userComments = getUserComments(userId, allComments, req.username);
//     const lastComment = getLastUserComment(userComments);
//     const mostRecentDate = getMostRecentDate(issues);

//     result[userId] = { count, lastComment, mostRecentDate };
//   }

//   const latestComment = getLatestComment(result);

//   return { usersIssues: result, latestComment };
// };

// Helper function to get the most recent date from the list of issues

const getUsersComments = async (req, usersIssues) => {
  const allComments = await getAllComments(req, usersIssues);

  const result = {};

  for (const [userId, userIssues] of usersIssues.entries()) {
    const { count, issues } = userIssues;
    const userComments = getUserComments(userId, allComments, req.username);
    const lastComment = getLastUserComment(userComments);
    const mostRecentDate = getMostRecentDate(issues);

    const user = {
      count,
      lastComment,
      mostRecentDate,
      displayName: issues.length > 0 ? issues[0].name : null,
    };

    result[userId] = user;
  }

  const latestComment = getLatestComment(result);

  return { usersIssues: result, latestComment };
};

const getMostRecentDate = (issues) => {
  let mostRecentDate = null;

  for (const issue of issues) {
    if (!mostRecentDate || new Date(issue.created) > new Date(mostRecentDate)) {
      mostRecentDate = issue.created;
    }
  }

  return mostRecentDate;
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


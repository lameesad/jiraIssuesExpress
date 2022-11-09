const express = require('express');
const jiraRoute = require('./jira.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/jira',
    route: jiraRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;

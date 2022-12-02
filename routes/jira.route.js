const express = require('express');
const jiraController = require('../controllers/jira.controller');
const router = express.Router();
const basicAuthenticateUser = require('../middlewares/basicAuthentication');


router.route('/').get(jiraController.setUserIssues);

module.exports = router;

const express = require('express');
const jiraController = require('../controllers/jira.controller');
const router = express.Router();
const basicAuthenticateUser = require('../middlewares/basicAuthentication');
const { validateParams } = require('../middlewares/middleware');


router.get(
    '/',
    basicAuthenticateUser,
    validateParams,
    jiraController.setUserIssues
);
module.exports = router;
const express = require('express');
const jiraController = require('../controllers/jira.controller');
const router = express.Router();
const basicAuthenticateUser = require('../middlewares/basicAuthentication');


router.route('/hello').get(jiraController.hello);
router.route('/').get(basicAuthenticateUser, jiraController.hellojira);

module.exports = router;

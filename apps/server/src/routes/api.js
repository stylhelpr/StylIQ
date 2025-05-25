const express = require('express');
const router = express.Router();
const {handlePost} = require('../controllers/apiController');

router.post('/data', handlePost);

module.exports = router;

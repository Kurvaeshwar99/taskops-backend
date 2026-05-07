const express = require('express');
const { getMe, updateMe } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validate, updateProfileSchema } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);
router.get('/me', getMe);
router.put('/me', validate(updateProfileSchema), updateMe);

module.exports = router;

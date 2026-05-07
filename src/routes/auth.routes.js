const express = require('express');
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { validate, registerSchema, loginSchema, refreshSchema } = require('../middleware/validate');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);

module.exports = router;

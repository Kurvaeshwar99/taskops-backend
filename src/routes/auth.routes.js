const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { validate, registerSchema, loginSchema, refreshSchema } = require('../middleware/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, error: 'Too many requests, please try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);

module.exports = router;

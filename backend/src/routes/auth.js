const express = require('express')
const router = express.Router()
const { register, login, getMe } = require('../controllers/authController')
const { protect } = require('../middleware/auth')
const rateLimit = require('express-rate-limit')

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { message: 'Too many attempts, try again in 15 minutes.' },
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', protect, getMe)

module.exports = router

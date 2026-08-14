// backend/middleware/loginRateLimiter.js
//
// Rate limits login attempts to 20 requests per 5 minutes, per IP.
// Requires: npm install express-rate-limit
//
// Usage (in whichever file defines POST /api/auth/login):
//
//   const loginRateLimiter = require("../middleware/loginRateLimiter");
//   router.post("/login", loginRateLimiter, async (req, res) => { ... });

const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,                 // 20 requests per window per IP
  standardHeaders: true,   // sends RateLimit-* headers
  legacyHeaders: false,    // disables X-RateLimit-* headers
  message: {
    message: "Too many login attempts. Please try again in a few minutes.",
  },
  // Optional: skip counting successful logins, only count failed attempts.
  // Uncomment if you want repeated *correct* logins to never be blocked:
  // skipSuccessfulRequests: true,
});

module.exports = loginRateLimiter;
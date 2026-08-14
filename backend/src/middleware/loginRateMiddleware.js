// backend/src/middleware/loginRateMiddleware.js
//
// Rate limits login attempts to 10 requests per 5 minutes, per IP.
// If exceeded, that IP is blocked for 15 minutes.
//
// Requires: npm install rate-limiter-flexible

const { RateLimiterMemory } = require("rate-limiter-flexible");

const limiter = new RateLimiterMemory({
  points: 10,
  duration: 5 * 60,
  blockDuration: 15 * 60,
});

const loginRateMiddleware = async (req, res, next) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    const retryMins = Math.ceil(retrySecs / 60);

    res.set("Retry-After", String(retrySecs));
    res.status(429).json({
      message: `Too many login attempts. Please try again in ${retryMins} minute(s).`,
    });
  }
};

module.exports = loginRateMiddleware;
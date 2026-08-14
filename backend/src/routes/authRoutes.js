const express = require('express');

const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyDevice,
  pendingApprovals,
} = require('../controllers/authController');

const {
  protect,
  adminOnly,
} = require('../middleware/authMiddleware');

const loginRateLimiter = require('../middleware/loginRateMiddleware.js');

router.post(
  '/register',
  protect,
  adminOnly,
  registerUser
);

router.post(
  '/login',
  loginRateLimiter,
  loginUser
);

router.get(
  '/me',
  protect,
  getMe
);

router.put(
  '/me',
  protect,
  updateProfile
);

router.post(
  '/forgot-password',
  forgotPassword
);

router.post(
  '/reset-password',
  resetPassword
);

router.post(
  '/verify-device',
  verifyDevice
);

router.get(
  '/pending-approvals',
  protect,
  adminOnly,
  pendingApprovals
);

module.exports = router;
const express = require("express");

const {
    signup,
    verifyOTP,
    resendOTP,
    login,
    getMe,
    logout
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

router.post("/login", login);

router.get("/me", protect, getMe);

router.post("/logout", protect, logout);

module.exports = router;
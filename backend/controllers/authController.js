const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const OTP = require("../models/OTP");

const generateOTP = require("../utils/generateOTP");
const sendOTPEmail = require("../utils/sendEmail");


// =========================
// SIGNUP
// =========================

const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser && existingUser.isVerified) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Hash password before storing temporary signup data
        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = generateOTP();

        // Hash OTP before storing it
        const hashedOTP = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        // Remove previous OTP
        await OTP.deleteMany({
            email: normalizedEmail
        });

        await OTP.create({
            email: normalizedEmail,
            name: name.trim(),
            password: hashedPassword,
            otp: hashedOTP,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTPEmail(normalizedEmail, otp);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully. Please verify your email."
        });

    } catch (error) {
        next(error);
    }
};


// =========================
// VERIFY OTP
// =========================

const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const otpRecord = await OTP.findOne({
            email: normalizedEmail
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP expired or not found"
            });
        }

        if (otpRecord.attempts >= 5) {
            await OTP.deleteOne({ _id: otpRecord._id });

            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts"
            });
        }

        const hashedOTP = crypto
            .createHash("sha256")
            .update(otp.toString())
            .digest("hex");

        if (hashedOTP !== otpRecord.otp) {
            otpRecord.attempts += 1;
            await otpRecord.save();

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (user) {
            user.name = otpRecord.name;
            user.password = otpRecord.password;
            user.isVerified = true;

            await user.save();
        } else {
            await User.create({
                name: otpRecord.name,
                email: normalizedEmail,
                password: otpRecord.password,
                isVerified: true
            });
        }

        await OTP.deleteOne({
            _id: otpRecord._id
        });

        res.status(201).json({
            success: true,
            message: "Registration completed successfully"
        });

    } catch (error) {
        next(error);
    }
};


// =========================
// RESEND OTP
// =========================

const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const otpRecord = await OTP.findOne({
            email: normalizedEmail
        });

        if (!otpRecord) {
            return res.status(404).json({
                success: false,
                message: "No pending registration found"
            });
        }

        const otp = generateOTP();

        const hashedOTP = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        otpRecord.otp = hashedOTP;
        otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        otpRecord.attempts = 0;

        await otpRecord.save();

        await sendOTPEmail(normalizedEmail, otp);

        res.json({
            success: true,
            message: "New OTP sent successfully"
        });

    } catch (error) {
        next(error);
    }
};


// =========================
// LOGIN
// =========================

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email first"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        next(error);
    }
};


// =========================
// GET CURRENT USER
// =========================

const getMe = async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
};


// =========================
// LOGOUT
// =========================

const logout = async (req, res) => {
    res.json({
        success: true,
        message: "Logged out successfully"
    });
};


module.exports = {
    signup,
    verifyOTP,
    resendOTP,
    login,
    getMe,
    logout
};
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTPEmail = async (email, otp) => {
    await transporter.sendMail({
        from: `"SecureAuth" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your SecureAuth Verification OTP",
        html: `
            <div style="font-family: Arial; padding: 20px;">
                <h2>Email Verification</h2>
                <p>Your OTP for registration is:</p>

                <h1 style="letter-spacing: 8px;">
                    ${otp}
                </h1>

                <p>This OTP is valid for 5 minutes.</p>
                <p>If you did not request this, ignore this email.</p>
            </div>
        `
    });
};

module.exports = sendOTPEmail;
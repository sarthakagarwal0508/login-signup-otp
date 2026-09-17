const API = "/api/auth";


// ============================
// COMMON HELPERS
// ============================

function showMessage(message, type = "error") {

    const element = document.getElementById("message");

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}


function setLoading(button, loading) {

    if (!button) return;

    button.disabled = loading;

    if (loading) {
        button.style.opacity = "0.6";
        button.style.cursor = "wait";
    } else {
        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }
}


function togglePassword(inputId, button) {

    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "Hide";
    } else {
        input.type = "password";
        button.textContent = "Show";
    }
}


// ============================
// PASSWORD STRENGTH
// ============================

const signupPassword = document.getElementById("signupPassword");

if (signupPassword) {

    signupPassword.addEventListener("input", () => {

        const password = signupPassword.value;

        const fill = document.getElementById("strengthFill");
        const text = document.getElementById("strengthText");

        let score = 0;

        if (password.length >= 6) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const widths = ["0%", "25%", "50%", "75%", "100%"];
        const labels = [
            "Enter a password",
            "Weak password",
            "Fair password",
            "Good password",
            "Strong password"
        ];

        fill.style.width = widths[score];
        text.textContent = labels[score];

        if (score <= 1) {
            fill.style.background = "#ff5f6d";
        } else if (score === 2) {
            fill.style.background = "#f0a84b";
        } else {
            fill.style.background = "#40d18b";
        }
    });
}


// ============================
// SIGNUP
// ============================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = signupForm.querySelector(".primary-btn");

        const name = document
            .getElementById("signupName")
            .value
            .trim();

        const email = document
            .getElementById("signupEmail")
            .value
            .trim();

        const password = document
            .getElementById("signupPassword")
            .value;

        if (password.length < 6) {
            showMessage("Password must be at least 6 characters.");
            return;
        }

        try {

            setLoading(button, true);
            showMessage("");

            const response = await fetch(`${API}/signup`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Signup failed");
            }

            sessionStorage.setItem("pendingEmail", email);

            window.location.href = "otp.html";

        } catch (error) {

            showMessage(error.message);

        } finally {

            setLoading(button, false);
        }
    });
}


// ============================
// OTP PAGE
// ============================

const otpForm = document.getElementById("otpForm");

if (otpForm) {

    const email = sessionStorage.getItem("pendingEmail");

    const emailElement = document.getElementById("otpEmail");

    if (!email) {
        window.location.href = "signup.html";
    }

    if (emailElement) {
        emailElement.textContent = email;
    }


    // OTP input behaviour

    const inputs = document.querySelectorAll(".otp-inputs input");

    inputs.forEach((input, index) => {

        input.addEventListener("input", () => {

            input.value = input.value.replace(/\D/g, "");

            if (input.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (event) => {

            if (
                event.key === "Backspace" &&
                !input.value &&
                index > 0
            ) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", (event) => {

            const pasted = event.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            if (pasted.length === 6) {

                event.preventDefault();

                pasted.split("").forEach((digit, i) => {
                    inputs[i].value = digit;
                });

                inputs[5].focus();
            }
        });
    });


    // Verify OTP

    otpForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = otpForm.querySelector(".primary-btn");

        const otp = Array
            .from(inputs)
            .map(input => input.value)
            .join("");

        if (otp.length !== 6) {
            showMessage("Please enter the complete 6-digit OTP.");
            return;
        }

        try {

            setLoading(button, true);

            const response = await fetch(`${API}/verify-otp`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "OTP verification failed");
            }

            sessionStorage.removeItem("pendingEmail");

            showMessage("Email verified successfully!", "success");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } catch (error) {

            showMessage(error.message);

        } finally {

            setLoading(button, false);
        }
    });


    // Resend OTP

    const resendBtn = document.getElementById("resendBtn");
    const timerElement = document.getElementById("timer");

    let cooldown = 0;

    function startCooldown() {

        cooldown = 30;
        resendBtn.disabled = true;

        const timer = setInterval(() => {

            cooldown--;

            timerElement.textContent =
                `Resend available in ${cooldown}s`;

            if (cooldown <= 0) {

                clearInterval(timer);

                resendBtn.disabled = false;
                timerElement.textContent = "";
            }

        }, 1000);
    }


    if (resendBtn) {

        resendBtn.addEventListener("click", async () => {

            try {

                resendBtn.disabled = true;

                const response = await fetch(`${API}/resend-otp`, {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Could not resend OTP");
                }

                showMessage("New OTP sent successfully.", "success");

                startCooldown();

            } catch (error) {

                resendBtn.disabled = false;
                showMessage(error.message);

            }
        });
    }
}


// ============================
// LOGIN
// ============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = loginForm.querySelector(".primary-btn");

        const email = document
            .getElementById("loginEmail")
            .value
            .trim();

        const password = document
            .getElementById("loginPassword")
            .value;

        try {

            setLoading(button, true);
            showMessage("");

            const response = await fetch(`${API}/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            localStorage.setItem("token", data.token);

            window.location.href = "dashboard.html";

        } catch (error) {

            showMessage(error.message);

        } finally {

            setLoading(button, false);
        }
    });
}


// ============================
// DASHBOARD
// ============================

const userNameElement = document.getElementById("userName");

if (userNameElement) {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
    }


    async function loadProfile() {

        try {

            const response = await fetch(`${API}/me`, {

                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Session expired");
            }

            document.getElementById("userName").textContent =
                data.user.name;

            document.getElementById("profileName").textContent =
                data.user.name;

            document.getElementById("profileEmail").textContent =
                data.user.email;

        } catch (error) {

            localStorage.removeItem("token");
            window.location.href = "index.html";
        }
    }


    loadProfile();
}


// ============================
// LOGOUT
// ============================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        const token = localStorage.getItem("token");

        try {

            await fetch(`${API}/logout`, {

                method: "POST",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

        } catch (error) {
            console.log(error);
        }

        localStorage.removeItem("token");

        window.location.href = "index.html";
    });
}
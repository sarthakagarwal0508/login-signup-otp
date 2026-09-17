const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();


// Middleware
app.use(express.json());


// Database
connectDB();


// Routes
app.use("/api/auth", authRoutes);


// Home
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SecureAuth API is running"
    });
});


// Error Handler
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
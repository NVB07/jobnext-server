require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cron = require("node-cron");
const { deleteUnverifiedUsers } = require("./lib/deleteUser");
const cloudinary = require("cloudinary").v2;

cron.schedule("*/10 * * * *", async () => {
    console.log("🔍 Kiểm tra & xóa user chưa xác minh...");
    await deleteUnverifiedUsers();
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Middleware
app.use(express.json()); // Đọc JSON body
app.use(cors()); // Bật CORS
app.use(morgan("dev")); // Log request

// Import routes
const routes = require("./routes");
app.use(routes);

module.exports = app;

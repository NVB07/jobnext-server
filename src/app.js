require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cron = require("node-cron");
const { deleteUnverifiedUsers } = require("./lib/deleteUser");
const { deleteExpiredJobs } = require("./lib/deleteExpiredJobs ");
const { initializeModel } = require("./lib/matchJobNLP");
const { runCrawlJobs } = require("./admin.controller/admin.crawl.controller");
const cloudinary = require("cloudinary").v2;

cron.schedule("*/10 * * * *", async () => {
    console.log("🔍 Kiểm tra & xóa user chưa xác minh...");
    await deleteUnverifiedUsers();
});

cron.schedule("0 0 * * *", async () => {
    console.log("🕛 00:00 - bắt đầu kiểm tra & xóa job hết hạn...");
    await deleteExpiredJobs();
});

// Cron job chạy crawl job vào 0h hàng ngày
cron.schedule("0 0 * * *", async () => {
    console.log("🕛 00:00 - bắt đầu crawl jobs từ VietnamWorks...");
    try {
        await runCrawlJobs();
        console.log("✅ Crawl jobs hoàn thành!");
    } catch (error) {
        console.error("❌ Lỗi khi crawl jobs:", error.message);
    }
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

app.get("/ping", (req, res) => {
    res.send("pong");
});

// Middleware
app.use(express.json()); // Đọc JSON body
app.use(cors()); // Bật CORS
app.use(morgan("dev")); // Log request

// Import routes
const routes = require("./routes");
const adminRoutes = require("./admin.router");
app.use(routes);
app.use(adminRoutes);
(async () => {
    await initializeModel();

    console.log("Ứng dụng đã sẵn sàng!");
})();
module.exports = app;

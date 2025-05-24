const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const authRoutes = require("./admin.auth.router");
const userRoutes = require("./admin.user.router");
const crawlRoutes = require("./admin.crawl.router");

// Auth routes (public)
router.use("/admin/auth", authRoutes);

// Protected admin routes
router.use("/admin/users", adminAuth, userRoutes);
router.use("/admin/crawl", adminAuth, crawlRoutes);

module.exports = router;

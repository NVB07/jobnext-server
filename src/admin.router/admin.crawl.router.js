const express = require("express");
const router = express.Router();
const crawlController = require("../admin.controller/admin.crawl.controller");
const adminAuth = require("../middleware/adminAuth");

// Get crawl status and statistics
router.get("/status", crawlController.getCrawlStatus);

// Start manual crawl
router.post("/start", crawlController.startManualCrawl);

// Stop running crawl
router.post("/stop", crawlController.stopCrawl);

// Get today's jobs
router.get("/jobs/today", crawlController.getJobsToday);

// Get expired jobs
router.get("/jobs/expired", crawlController.getExpiredJobs);

// Delete expired jobs
router.delete("/jobs/expired", crawlController.deleteExpiredJobs);

// Debug endpoint to check recent jobs (PROTECTED)
router.get("/debug/recent-jobs", adminAuth, async (req, res) => {
    try {
        const { Job } = require("../models/job.model");

        const recentJobs = await Job.find().sort({ updatedAt: -1 }).limit(10).select("jobId title company createdAt updatedAt");

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayJobsCount = await Job.countDocuments({
            $or: [{ createdAt: { $gte: today, $lt: tomorrow } }, { updatedAt: { $gte: today, $lt: tomorrow } }],
        });

        res.json({
            success: true,
            data: {
                dateRange: {
                    today: today.toISOString(),
                    tomorrow: tomorrow.toISOString(),
                },
                todayJobsCount,
                recentJobs,
            },
        });
    } catch (error) {
        console.error("Debug error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

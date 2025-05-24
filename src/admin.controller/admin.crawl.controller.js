const axios = require("axios");
const { Job } = require("../models/job.model");
const diacritics = require("diacritics");

// Remove Vietnamese diacritics
function removeDiacritics(str) {
    return diacritics.remove(str).toLowerCase();
}

// Delay function for rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Crawl status tracking
let crawlStatus = {
    isRunning: false,
    lastRun: null,
    lastSuccess: null,
    currentPage: 0,
    totalPages: 0,
    jobsProcessed: 0,
    errors: [],
    startTime: null,
    endTime: null,
};

// Fetch jobs from a single page
const fetchJobsFromPage = async (page) => {
    try {
        console.log(`🔄 Đang lấy dữ liệu trang ${page}...`);

        const response = await axios.post(
            `https://ms.vietnamworks.com/job-search/v1.0/search`,
            {
                userId: 0,
                query: "",
                filter: [],
                ranges: [],
                order: [],
                hitsPerPage: 100,
                page: page,
                retrieveFields: [
                    "address",
                    "benefits",
                    "jobTitle",
                    "salaryMax",
                    "isSalaryVisible",
                    "jobLevelVI",
                    "isShowLogo",
                    "salaryMin",
                    "companyLogo",
                    "userId",
                    "jobLevel",
                    "jobLevelId",
                    "jobId",
                    "jobUrl",
                    "companyId",
                    "approvedOn",
                    "isAnonymous",
                    "alias",
                    "expiredOn",
                    "industries",
                    "industriesV3",
                    "workingLocations",
                    "services",
                    "companyName",
                    "salary",
                    "onlineOn",
                    "simpleServices",
                    "visibilityDisplay",
                    "isShowLogoInSearch",
                    "priorityOrder",
                    "skills",
                    "profilePublishedSiteMask",
                    "jobDescription",
                    "jobRequirement",
                    "prettySalary",
                    "requiredCoverLetter",
                    "languageSelectedVI",
                    "languageSelected",
                    "languageSelectedId",
                    "typeWorkingId",
                    "createdOn",
                    "isAdrLiteJob",
                ],
                summaryVersion: "",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                timeout: 30000,
            }
        );

        const jobs = response.data.data;
        console.log(`Lấy được ${jobs.length} jobs từ trang ${page}`);

        let savedCount = 0;
        for (const job of jobs) {
            try {
                const currentTime = new Date();
                const jobItem = {
                    jobId: job.jobId,
                    jobSource: "vietnamworks",
                    title: job.jobTitle,
                    alias: job.alias?.replaceAll("-", " ") || "",
                    company: job.companyName,
                    companyAlias: removeDiacritics(job.companyName || ""),
                    companyLogo: job.companyLogo,
                    locationVI: Array.isArray(job.workingLocations) ? job.workingLocations.map((location) => location.cityNameVI).join(", ") : "",
                    location: Array.isArray(job.workingLocations) ? job.workingLocations.map((location) => location.cityName).join(", ") : "",
                    salary: job.prettySalary,
                    jobLevel: job.jobLevel,
                    jobLevelVI: job.jobLevelVI,
                    groupJobFunctionV3Name: job.groupJobFunctionsV3?.groupJobFunctionV3Name || "",
                    groupJobFunctionV3NameVI: job.groupJobFunctionsV3?.groupJobFunctionV3NameVI || "",
                    jobRequirement: job.jobRequirement,
                    description: job.jobDescription,
                    languageSelected: job.languageSelected,
                    url: job.jobUrl,
                    skills: Array.isArray(job.skills) ? job.skills.map((skill) => skill.skillName).join(", ") : "",
                    expiredOn: job.expiredOn ? new Date(job.expiredOn) : null,
                    // Always set updatedAt to current time for crawl tracking
                    updatedAt: currentTime,
                };

                // For new jobs, set createdAt. For existing jobs, keep original createdAt
                const existingJob = await Job.findOne({ jobId: job.jobId });
                if (!existingJob) {
                    jobItem.createdAt = job.createdOn ? new Date(job.createdOn) : currentTime;
                }

                const savedJob = await Job.findOneAndUpdate({ jobId: job.jobId }, jobItem, { upsert: true, new: true });

                if (savedJob) {
                    savedCount++;
                    // Log first few jobs for debugging
                    if (savedCount <= 3) {
                        console.log(`💾 Saved job ${job.jobId}:`, {
                            title: savedJob.title,
                            createdAt: savedJob.createdAt,
                            updatedAt: savedJob.updatedAt,
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Lỗi khi lưu job ${job.jobId}:`, error.message);
                crawlStatus.errors.push(`Job ${job.jobId}: ${error.message}`);
            }
        }

        crawlStatus.jobsProcessed += savedCount;
        console.log(`✅ Đã lưu ${savedCount}/${jobs.length} jobs từ trang ${page}`);

        return {
            totalPages: response.data.meta.nbPages,
            jobsCount: jobs.length,
            savedCount,
        };
    } catch (error) {
        console.error(`❌ Lỗi trang ${page}:`, error.message);
        crawlStatus.errors.push(`Page ${page}: ${error.message}`);
        return { totalPages: 0, jobsCount: 0, savedCount: 0 };
    }
};

// Main crawl function
const runCrawlJobs = async () => {
    if (crawlStatus.isRunning) {
        throw new Error("Crawl đang chạy, vui lòng đợi hoàn thành");
    }

    // Reset status
    crawlStatus = {
        isRunning: true,
        lastRun: new Date(),
        lastSuccess: null, // Will be set on successful completion
        currentPage: 0,
        totalPages: 0,
        jobsProcessed: 0,
        errors: [],
        startTime: new Date(),
        endTime: null,
    };

    try {
        console.log("🚀 Bắt đầu crawl jobs...");

        let totalPages = 200; // Default max pages

        for (let page = 0; page <= totalPages; page++) {
            if (!crawlStatus.isRunning) {
                console.log("🛑 Crawl bị dừng");
                break;
            }

            crawlStatus.currentPage = page;

            const result = await fetchJobsFromPage(page);

            if (result.totalPages > 0) {
                totalPages = Math.min(result.totalPages, 300); // Limit max pages
                crawlStatus.totalPages = totalPages;
            }

            // Rate limiting
            await delay(1000);

            // Break if no jobs found
            if (result.jobsCount === 0) {
                console.log("Không còn jobs, kết thúc crawl");
                break;
            }
        }

        crawlStatus.endTime = new Date();
        crawlStatus.isRunning = false;

        // Only set lastSuccess if we actually processed some jobs
        if (crawlStatus.jobsProcessed > 0) {
            crawlStatus.lastSuccess = new Date();
        }

        console.log(`✅ Crawl hoàn thành! Đã xử lý ${crawlStatus.jobsProcessed} jobs`);

        return {
            success: true,
            message: "Crawl hoàn thành thành công",
            stats: {
                jobsProcessed: crawlStatus.jobsProcessed,
                pagesProcessed: crawlStatus.currentPage + 1,
                totalPages: crawlStatus.totalPages,
                duration: crawlStatus.endTime - crawlStatus.startTime,
                errors: crawlStatus.errors.length,
            },
        };
    } catch (error) {
        crawlStatus.isRunning = false;
        crawlStatus.endTime = new Date();
        crawlStatus.errors.push(error.message);

        console.error("❌ Lỗi crawl:", error);
        throw error;
    }
};

// API Controllers
exports.getCrawlStatus = async (req, res) => {
    try {
        // Get today's jobs count with proper timezone handling
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log("🔍 Querying jobs for date range:", {
            today: today.toISOString(),
            tomorrow: tomorrow.toISOString(),
        });

        const todayJobsCount = await Job.countDocuments({
            $or: [{ createdAt: { $gte: today, $lt: tomorrow } }, { updatedAt: { $gte: today, $lt: tomorrow } }],
        });

        console.log(`📊 Found ${todayJobsCount} jobs for today`);

        // Get expired jobs count
        const expiredJobsCount = await Job.countDocuments({
            expiredOn: { $lt: new Date() },
        });

        // Get recent jobs
        const recentJobs = await Job.find({
            $or: [{ createdAt: { $gte: today, $lt: tomorrow } }, { updatedAt: { $gte: today, $lt: tomorrow } }],
        })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(10)
            .select("title company salary location createdAt updatedAt expiredOn");

        console.log("🎯 Crawl Status Debug:", {
            isRunning: crawlStatus.isRunning,
            lastRun: crawlStatus.lastRun,
            lastSuccess: crawlStatus.lastSuccess,
            jobsProcessed: crawlStatus.jobsProcessed,
        });

        res.status(200).json({
            success: true,
            data: {
                crawlStatus,
                todayJobsCount,
                expiredJobsCount,
                recentJobs,
            },
        });
    } catch (error) {
        console.error("Error getting crawl status:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy trạng thái crawl",
            error: error.message,
        });
    }
};

exports.startManualCrawl = async (req, res) => {
    try {
        const result = await runCrawlJobs();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error starting manual crawl:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.stopCrawl = async (req, res) => {
    try {
        if (!crawlStatus.isRunning) {
            return res.status(400).json({
                success: false,
                message: "Crawl không đang chạy",
            });
        }

        crawlStatus.isRunning = false;

        res.status(200).json({
            success: true,
            message: "Đã dừng crawl",
        });
    } catch (error) {
        console.error("Error stopping crawl:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi dừng crawl",
            error: error.message,
        });
    }
};

exports.getJobsToday = async (req, res) => {
    try {
        const { page = 1, perPage = 20 } = req.query;
        const skip = (page - 1) * perPage;

        // Use same date logic as getCrawlStatus
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log("🔍 getJobsToday - Querying jobs for date range:", {
            today: today.toISOString(),
            tomorrow: tomorrow.toISOString(),
            page,
            perPage,
        });

        const jobs = await Job.find({
            $or: [{ createdAt: { $gte: today, $lt: tomorrow } }, { updatedAt: { $gte: today, $lt: tomorrow } }],
        })
            .sort({ updatedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(perPage));

        const totalJobs = await Job.countDocuments({
            $or: [{ createdAt: { $gte: today, $lt: tomorrow } }, { updatedAt: { $gte: today, $lt: tomorrow } }],
        });

        console.log(`📊 getJobsToday - Found ${totalJobs} total jobs, returning ${jobs.length} jobs for page ${page}`);

        res.status(200).json({
            success: true,
            data: jobs,
            pagination: {
                currentPage: parseInt(page),
                perPage: parseInt(perPage),
                totalPages: Math.ceil(totalJobs / perPage),
                totalJobs,
            },
        });
    } catch (error) {
        console.error("Error getting today's jobs:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách job hôm nay",
            error: error.message,
        });
    }
};

exports.getExpiredJobs = async (req, res) => {
    try {
        const { page = 1, perPage = 20 } = req.query;
        const skip = (page - 1) * perPage;

        const jobs = await Job.find({
            expiredOn: { $lt: new Date() },
        })
            .sort({ expiredOn: -1 })
            .skip(skip)
            .limit(parseInt(perPage));

        const totalJobs = await Job.countDocuments({
            expiredOn: { $lt: new Date() },
        });

        res.status(200).json({
            success: true,
            data: jobs,
            pagination: {
                currentPage: parseInt(page),
                perPage: parseInt(perPage),
                totalPages: Math.ceil(totalJobs / perPage),
                totalJobs,
            },
        });
    } catch (error) {
        console.error("Error getting expired jobs:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách job hết hạn",
            error: error.message,
        });
    }
};

// Export crawl function for cron job
exports.runCrawlJobs = runCrawlJobs;

// Delete expired jobs
exports.deleteExpiredJobs = async (req, res) => {
    try {
        const currentDate = new Date();

        // Count expired jobs before deletion
        const expiredJobsCount = await Job.countDocuments({
            expiredOn: { $lt: currentDate },
        });

        if (expiredJobsCount === 0) {
            return res.status(200).json({
                success: true,
                message: "Không có job hết hạn nào để xóa",
                stats: {
                    deletedCount: 0,
                    totalExpired: 0,
                },
            });
        }

        // Delete expired jobs
        const deleteResult = await Job.deleteMany({
            expiredOn: { $lt: currentDate },
        });

        console.log(`🗑️ Đã xóa ${deleteResult.deletedCount} jobs hết hạn`);

        res.status(200).json({
            success: true,
            message: `Đã xóa thành công ${deleteResult.deletedCount} jobs hết hạn`,
            stats: {
                deletedCount: deleteResult.deletedCount,
                totalExpired: expiredJobsCount,
            },
        });
    } catch (error) {
        console.error("Error deleting expired jobs:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa jobs hết hạn",
            error: error.message,
        });
    }
};

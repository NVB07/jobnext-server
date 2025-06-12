const { Job } = require("../models/job.model");
const User = require("../models/user.model");
const { Worker } = require("worker_threads");
const diacritics = require("diacritics");
const axios = require("axios");
const { HybridMatchingEngine } = require("../lib/hybridMatchingEngine");
const { matchJobsNLP } = require("../lib/matchJobNLP");

// Initialize hybrid engine
const hybridEngine = new HybridMatchingEngine();

function removeDiacritics(str) {
    return diacritics.remove(str).toLowerCase();
}
exports.createJob = async (req, res) => {
    try {
        const newJob = new Job(req.body);
        await newJob.save();
        res.status(201).json(newJob);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        const totalJobs = await Job.countDocuments();
        const jobs = await Job.find()
            .sort({ updatedAt: -1 }) // Job mới nhất trước
            .skip(skip)
            .limit(perPage);

        const totalPages = Math.ceil(totalJobs / perPage);

        res.json({
            success: true,
            data: jobs,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalJobs: totalJobs,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateJob = async (req, res) => {
    try {
        const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedJob) return res.status(404).json({ message: "Job not found" });
        res.json(updatedJob);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        const deletedJob = await Job.findByIdAndDelete(req.params.id);
        if (!deletedJob) return res.status(404).json({ message: "Job not found" });
        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.searchJobsNoMatch = async (req, res) => {
    try {
        const { skill, location, category, jobLevel, jobSource, uid } = req.body;
        let query = {};
        const user = await User.findById(uid);
        const savedJobs = user?.savedJobs || [];
        // Xử lý tìm kiếm nhiều kỹ năng
        if (skill) {
            const skillLastUpdate = removeDiacritics(skill);
            const skillsArray = skillLastUpdate.split(",").map((s) => s.trim());
            const regexPattern = skillsArray.join("|"); // tạo biểu thức "React|Node|Marketing"
            const regex = new RegExp(regexPattern, "i");

            query.$or = [{ skills: { $regex: regex } }, { alias: { $regex: regex } }, { companyAlias: { $regex: regex } }];
        }
        if (location) {
            const locationLastUpdate = removeDiacritics(location);
            query.location = { $regex: locationLastUpdate, $options: "i" };
        }
        if (category) {
            query.groupJobFunctionV3Name = { $regex: category, $options: "i" };
        }
        if (jobLevel) {
            // Use exact match for jobLevel instead of regex pattern
            query.jobLevel = jobLevel;
        }
        if (jobSource) {
            // Use exact match for jobSource
            query.jobSource = jobSource;
        }
        console.log(query);
        // Lấy tham số phân trang từ query, mặc định page = 1, perPage = 10
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        // Tính tổng số jobs phù hợp
        const totalJobs = await Job.countDocuments(query);

        // Truy vấn danh sách jobs có phân trang

        // Tính tổng số trang
        const totalPages = Math.ceil(totalJobs / perPage);

        const allJobs = await Job.find(query)
            .sort({ updatedAt: -1 }) // Mới nhất trước
            .skip(skip) // Bỏ qua các bài của trang trước
            .limit(perPage);

        const jobsWithSavedStatus = allJobs.map((job) => ({
            ...job.toObject(),
            isSaved: savedJobs.includes(job._id.toString()),
        }));

        // Trả về kết quả
        res.json({
            success: true,
            data: jobsWithSavedStatus,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalJobs: totalJobs,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Thêm cache object ở phạm vi module
const jobSearchCache = new Map();
const hybridSearchCache = new Map(); // NEW: Cache for hybrid search

// Cache management configuration
const CACHE_CONFIG = {
    maxSize: 100, // Maximum number of cached searches
    ttl: 30 * 60 * 1000, // 30 minutes TTL
    cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

// Cache cleanup function
function cleanupCache(cache) {
    if (cache.size > CACHE_CONFIG.maxSize) {
        const entries = Array.from(cache.entries());
        // Remove oldest 30% of entries
        const toRemove = Math.floor(CACHE_CONFIG.maxSize * 0.3);
        entries.slice(0, toRemove).forEach(([key]) => cache.delete(key));
        console.log(`🧹 Cache cleanup: Removed ${toRemove} entries`);
    }
}

// Automatic cache cleanup
setInterval(() => {
    const now = Date.now();

    // Cleanup hybrid cache
    for (const [key, data] of hybridSearchCache.entries()) {
        if (now - data.timestamp > CACHE_CONFIG.ttl) {
            hybridSearchCache.delete(key);
        }
    }

    // Cleanup old job search cache
    for (const [key, data] of jobSearchCache.entries()) {
        if (data.timestamp && now - data.timestamp > CACHE_CONFIG.ttl) {
            jobSearchCache.delete(key);
        }
    }

    cleanupCache(hybridSearchCache);
    cleanupCache(jobSearchCache);
}, CACHE_CONFIG.cleanupInterval);

// Generate cache key for hybrid search
function generateHybridCacheKey(params) {
    const { skill, location, groupJobFunctionV3Name, jobLevel, review, method, checkSkills, checkLocation, checkExperience } = params;

    // Create a normalized review (first 200 chars for key generation)
    const normalizedReview = review ? review.substring(0, 200).toLowerCase().trim() : "";

    const keyData = {
        skill: skill || "",
        location: location || "",
        category: groupJobFunctionV3Name || "",
        jobLevel: jobLevel || "",
        review: normalizedReview,
        method: method || "transformer",
        checkSkills,
        checkLocation,
        checkExperience,
    };

    return JSON.stringify(keyData);
}

exports.searchJobs = async (req, res) => {
    try {
        const { skill, location, groupJobFunctionV3Name, jobLevel, review, uid, checkSkills = true, checkLocation = true, checkExperience = true } = req.body;
        const cacheKey = JSON.stringify({ skill, location, groupJobFunctionV3Name, jobLevel, review, checkSkills, checkLocation, checkExperience });

        // Kiểm tra cache trước khi xử lý
        if (jobSearchCache.has(cacheKey)) {
            const cachedData = jobSearchCache.get(cacheKey);

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 10;
            const skip = (page - 1) * perPage;
            const totalJobs = cachedData.length;
            const paginatedJobs = cachedData.slice(skip, skip + perPage);
            const totalPages = Math.ceil(totalJobs / perPage);

            return res.json({
                success: true,
                data: paginatedJobs,
                pagination: { currentPage: page, perPage, totalPages, totalJobs },
            });
        }
        const user = await User.findById(uid);
        const savedJobs = user?.savedJobs || [];
        let query = {};
        if (!review) return res.status(404).json({ message: "Thiếu dữ liệu tổng quan" });

        // Xử lý tìm kiếm nhiều kỹ năng
        if (skill) {
            const skillLastUpdate = removeDiacritics(skill);
            const skillsArray = skillLastUpdate.split(",").map((s) => s.trim());
            query.skills = { $regex: skillsArray.join("|"), $options: "i" };
        }
        if (location) {
            const locationLastUpdate = removeDiacritics(location);
            query.location = { $regex: locationLastUpdate, $options: "i" };
        }
        if (groupJobFunctionV3Name) {
            const groupJobFunctionV3NameLastUpdate = removeDiacritics(groupJobFunctionV3Name);
            query.groupJobFunctionV3Name = { $regex: groupJobFunctionV3NameLastUpdate, $options: "i" };
        }
        if (jobLevel) {
            // Use exact match for jobLevel instead of regex pattern
            query.jobLevel = jobLevel;
        }

        const allJobs = await Job.find(query).sort({ updatedAt: -1 });
        console.log(allJobs.length);

        const jobTexts = allJobs.map((job) => {
            const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
            return ` Require ${cleanRequirement}. Skills: ${job.skills}`;
        });

        // Prepare required skills and options for matching
        const requiredSkills = skill ? skill.split(",").map((s) => s.trim()) : [];
        const performanceOptions = {
            fastMode: allJobs.length > 25,
            // 🚀 ENHANCED: Much higher limits when no filters are applied
            maxJobs: (() => {
                const allFiltersDisabled = !checkSkills && !checkLocation && !checkExperience;
                if (allFiltersDisabled) {
                    // When no filters, process way more jobs
                    return Math.min(allJobs.length, 150); // Up to 150 jobs when no filters
                } else {
                    // Original logic when filters are applied
                    return allJobs.length > 100 ? 80 : allJobs.length > 50 ? 60 : allJobs.length > 25 ? 40 : allJobs.length;
                }
            })(),
            useCache: true,
            geminiLimit: allJobs.length > 50 ? 5 : allJobs.length > 25 ? 8 : 10,
            // 🆕 NEW: Pass checkbox filters to NLP matching
            checkSkills,
            checkLocation,
            checkExperience,
        };

        console.log(`🔧 NLP Options: ${allJobs.length} jobs, maxJobs: ${performanceOptions.maxJobs}, skills: [${requiredSkills.join(", ")}]`);
        console.log(`🔍 Checkbox Filters: Skills=${checkSkills}, Location=${checkLocation}, Experience=${checkExperience}`);

        console.log(`🔧 Sending to worker: ${allJobs.length} jobs, maxJobs: ${performanceOptions.maxJobs}, skills: [${requiredSkills.join(", ")}]`);

        const worker = new Worker("./src/lib/matchJobsWorker.js");
        worker.postMessage({ review, jobTexts, requiredSkills, options: performanceOptions });

        worker.on("message", (matchScore) => {
            if (matchScore.error) {
                return res.status(500).json({ success: false, error: matchScore.error });
            }

            if (!matchScore || !matchScore.jobMatches) {
                return res.status(500).json({ success: false, error: "Không thể tính điểm so khớp từ matchJobsNLP" });
            }

            const jobsWithScore = allJobs.map((job, index) => {
                const match = matchScore.jobMatches.find((m) => m.jobId === `job_${index + 1}`);
                return {
                    ...job._doc,
                    semanticScore: match ? parseFloat(match.matchScore) : 0,
                };
            });

            const filteredJobs = jobsWithScore.filter((job) => job.semanticScore > 0);
            filteredJobs.sort((a, b) => b.semanticScore - a.semanticScore);

            // Lưu vào cache
            jobSearchCache.set(cacheKey, filteredJobs);

            // Set thời gian sống cho cache (ví dụ: 5 phút)
            setTimeout(() => {
                jobSearchCache.delete(cacheKey);
            }, 60 * 60 * 1000);

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 10;
            const skip = (page - 1) * perPage;
            const totalJobs = filteredJobs.length;
            const paginatedJobs = filteredJobs.slice(skip, skip + perPage);
            const totalPages = Math.ceil(totalJobs / perPage);

            const jobsWithSavedStatus = paginatedJobs.map((job) => ({
                ...job,
                isSaved: savedJobs.includes(job._id.toString()),
            }));

            res.json({
                success: true,
                data: jobsWithSavedStatus,
                pagination: { currentPage: page, perPage, totalPages, totalJobs },
            });
        });

        worker.on("error", (error) => {
            res.status(500).json({ success: false, error: error.message });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// New hybrid search endpoint
exports.hybridSearchJobs = async (req, res) => {
    try {
        const {
            skill,
            location,
            groupJobFunctionV3Name,
            jobLevel,
            review,
            uid,
            method = "transformer",
            // 🆕 NEW: Checkbox filter options from client
            checkSkills = true,
            checkLocation = true,
            checkExperience = true,
        } = req.body;

        if (!review) {
            return res.status(400).json({
                success: false,
                error: "Thiếu dữ liệu tổng quan CV",
            });
        }

        // Generate cache key for this search (include checkbox state)
        const cacheKey = generateHybridCacheKey({
            skill,
            location,
            groupJobFunctionV3Name,
            jobLevel,
            review,
            method,
            checkSkills,
            checkLocation,
            checkExperience,
        });

        console.log(`🔍 Hybrid Search Request - Method: ${method} | Checkbox: Skills=${checkSkills}, Location=${checkLocation}, Experience=${checkExperience}`);
        console.log(`📍 Cache Key: ${cacheKey.substring(0, 50)}...`);

        // Check cache first for instant pagination
        if (hybridSearchCache.has(cacheKey)) {
            const cachedData = hybridSearchCache.get(cacheKey);
            console.log(`⚡ Cache HIT! Using cached results with ${cachedData.results.length} jobs`);

            // Get user saved jobs for current request
            const user = await User.findById(uid);
            const savedJobs = user?.savedJobs || [];

            // Pagination from cached results (INSTANT!)
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 10;
            const skip = (page - 1) * perPage;
            const totalJobs = cachedData.results.length;
            const paginatedJobs = cachedData.results.slice(skip, skip + perPage);
            const totalPages = Math.ceil(totalJobs / perPage);

            // Add saved status to current page results
            const jobsWithSavedStatus = paginatedJobs.map((job) => ({
                ...job,
                isSaved: savedJobs.includes(job._id.toString()),
            }));

            // Update cache timestamp (accessed recently)
            cachedData.timestamp = Date.now();
            cachedData.accessCount = (cachedData.accessCount || 0) + 1;

            return res.json({
                success: true,
                data: jobsWithSavedStatus,
                pagination: { currentPage: page, perPage, totalPages, totalJobs },
                searchInfo: {
                    ...cachedData.searchInfo,
                    cached: true,
                    cacheAge: Math.round((Date.now() - cachedData.createdAt) / 1000), // seconds
                    accessCount: cachedData.accessCount,
                },
            });
        }

        // Cache MISS - Need to perform full NLP matching
        console.log(`❌ Cache MISS - Performing full NLP matching...`);

        const user = await User.findById(uid);
        const savedJobs = user?.savedJobs || [];
        let query = {};

        // Build query filters (same as existing logic)
        if (skill) {
            const skillLastUpdate = removeDiacritics(skill);
            const skillsArray = skillLastUpdate.split(",").map((s) => s.trim());
            query.skills = { $regex: skillsArray.join("|"), $options: "i" };
        }
        if (location) {
            const locationLastUpdate = removeDiacritics(location);
            query.location = { $regex: locationLastUpdate, $options: "i" };
        }
        if (groupJobFunctionV3Name) {
            const groupJobFunctionV3NameLastUpdate = removeDiacritics(groupJobFunctionV3Name);
            query.groupJobFunctionV3Name = { $regex: groupJobFunctionV3NameLastUpdate, $options: "i" };
        }
        if (jobLevel) {
            query.jobLevel = jobLevel;
        }

        const startTime = Date.now();
        const allJobs = await Job.find(query).sort({ updatedAt: -1 });
        console.log(`🔍 Found ${allJobs.length} jobs matching filters`);

        const jobTexts = allJobs.map((job) => {
            const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
            return `Require ${cleanRequirement}. Skills: ${job.skills}`;
        });

        let result;
        const requiredSkills = skill ? skill.split(",").map((s) => s.trim()) : [];

        // Choose matching method
        switch (method) {
            case "tfidf":
                console.log("🚀 Using TF-IDF Quick Match");
                result = await hybridEngine.quickMatch(review, jobTexts);
                break;

            case "hybrid":
                console.log("🚀 Using Hybrid Matching Engine");
                const options = {
                    tfIdfWeight: 0.2,
                    semanticWeight: 0.5,
                    skillWeight: 0.3,
                    enableFastMode: allJobs.length > 50,
                };
                result = await hybridEngine.hybridMatch(review, jobTexts, requiredSkills, options);
                break;

            case "transformer":
            default:
                console.log("🚀 Using Optimized Transformer-based Matching");

                // Configure performance options based on dataset size
                const performanceOptions = {
                    fastMode: allJobs.length > 25, // Enable fast mode for datasets larger than 25 jobs
                    // 🚀 ENHANCED: Much higher limits when no filters are applied
                    maxJobs: (() => {
                        const allFiltersDisabled = !checkSkills && !checkLocation && !checkExperience;
                        if (allFiltersDisabled) {
                            // When no filters, process way more jobs
                            return Math.min(allJobs.length, 150); // Up to 150 jobs when no filters
                        } else {
                            // Original logic when filters are applied
                            return allJobs.length > 100 ? 80 : allJobs.length > 50 ? 60 : allJobs.length > 25 ? 40 : allJobs.length;
                        }
                    })(),
                    useCache: true,
                    geminiLimit: allJobs.length > 30 ? 3 : allJobs.length > 15 ? 5 : 8,
                    // 🚀 CRITICAL: Pass checkbox filter parameters to NLP matching
                    checkSkills,
                    checkLocation,
                    checkExperience,
                };

                console.log(
                    `⚡ Performance mode: ${performanceOptions.fastMode ? "FAST" : "STANDARD"} | Max jobs: ${performanceOptions.maxJobs} | Gemini: ${
                        performanceOptions.geminiLimit
                    }`
                );
                console.log(`🔍 Filter Status: Skills=${checkSkills}, Location=${checkLocation}, Experience=${checkExperience}`);
                console.log(`📊 Dataset: ${allJobs.length} total jobs, will process up to ${performanceOptions.maxJobs} jobs`);

                result = await matchJobsNLP(review, jobTexts, requiredSkills, performanceOptions);
                break;
        }

        // Process results for response
        const jobsWithScore = allJobs.map((job, index) => {
            const match = result.jobMatches.find((m) => m.jobId === `job_${index + 1}` || m.jobIndex === index);

            let score = 0;
            let matchData = { method };

            if (match) {
                if (method === "hybrid") {
                    score = parseFloat(match.hybridScore);
                    matchData = {
                        method: "hybrid",
                        hybridScore: match.hybridScore,
                        breakdown: match.scores,
                        detectedSkills: match.detectedSkills,
                    };
                } else {
                    score = parseFloat(match.matchScore);
                    matchData = {
                        method,
                        detectedSkills: match.detectedSkills || [],
                    };
                }
            }

            return {
                ...job._doc,
                semanticScore: score,
                matchData,
            };
        });

        const filteredJobs = jobsWithScore.filter((job) => job.semanticScore > 0);
        filteredJobs.sort((a, b) => b.semanticScore - a.semanticScore);

        const processingTime = Date.now() - startTime;
        const maxScore = filteredJobs.length > 0 ? Math.max(...filteredJobs.map((j) => j.semanticScore)) : 0;

        // Prepare search info
        const searchInfo = {
            method,
            maxScore: maxScore.toFixed(1),
            totalMatched: filteredJobs.length,
            requiredSkills,
            processingTime,
            cached: false,
            ...(result.hybridInfo || {}),
        };

        // Cache the complete sorted results for future pagination requests
        const cacheData = {
            results: filteredJobs, // Complete sorted results
            searchInfo,
            timestamp: Date.now(),
            createdAt: Date.now(),
            accessCount: 1,
            method,
            totalJobs: filteredJobs.length,
        };

        hybridSearchCache.set(cacheKey, cacheData);
        console.log(`💾 Cached ${filteredJobs.length} results for future pagination | Processing time: ${processingTime}ms`);

        // Cleanup cache if needed
        cleanupCache(hybridSearchCache);

        // Pagination for current request
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;
        const totalJobs = filteredJobs.length;
        const paginatedJobs = filteredJobs.slice(skip, skip + perPage);
        const totalPages = Math.ceil(totalJobs / perPage);

        const jobsWithSavedStatus = paginatedJobs.map((job) => ({
            ...job,
            isSaved: savedJobs.includes(job._id.toString()),
        }));

        res.json({
            success: true,
            data: jobsWithSavedStatus,
            pagination: { currentPage: page, perPage, totalPages, totalJobs },
            searchInfo,
        });
    } catch (error) {
        console.error("Hybrid search error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getJobDetail = async (req, res) => {
    try {
        const { url } = req.body;
        const response = await axios.get(url);
        res.json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; // model dùng jobSchema

/**
 * Lấy danh sách công ty có nhiều job nhất với phân trang.
 * GET /api/jobs/stats/top-companies?page=1&perPage=10
 */
exports.getTopCompanies = async (req, res) => {
    try {
        // Lấy tham số phân trang từ query, mặc định page = 1, perPage = 10
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const limit = parseInt(req.query.limit) || perPage;
        const skip = (page - 1) * perPage;

        // Đếm tổng số công ty
        const totalCompaniesCount = await Job.aggregate([
            {
                $group: {
                    _id: "$company", // gom theo tên công ty
                },
            },
            {
                $match: {
                    _id: { $ne: null, $ne: "" }, // loại bỏ công ty trống
                },
            },
            {
                $count: "total",
            },
        ]);

        const totalCompanies = totalCompaniesCount.length > 0 ? totalCompaniesCount[0].total : 0;
        const totalPages = Math.ceil(totalCompanies / perPage);

        // Lấy danh sách công ty có phân trang
        const companies = await Job.aggregate([
            {
                $group: {
                    _id: "$company", // gom theo tên công ty
                    totalJobs: { $sum: 1 }, // đếm job
                    companyLogo: { $first: "$companyLogo" },
                },
            },
            {
                $match: {
                    _id: { $ne: null, $ne: "" }, // loại bỏ công ty trống
                },
            },
            { $sort: { totalJobs: -1 } }, // giảm dần theo số lượng job
            { $skip: skip }, // bỏ qua các công ty của trang trước
            { $limit: perPage }, // giới hạn số công ty trên mỗi trang
            {
                $project: {
                    // đổi _id → company
                    _id: 0,
                    company: "$_id",
                    totalJobs: 1,
                    companyLogo: 1,
                },
            },
        ]);

        res.json({
            success: true,
            data: companies,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalCompanies: totalCompanies,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Lấy danh sách tất cả tên công ty
 * GET /api/jobs/companies
 */
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await Job.distinct("company");

        // Lọc bỏ các giá trị null hoặc undefined
        const filteredCompanies = companies.filter((company) => company);

        // Sắp xếp theo thứ tự A-Z
        filteredCompanies.sort();

        res.json({
            success: true,
            data: filteredCompanies,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Lấy danh sách công việc theo ngành nghề
 * GET /api/jobs/categories
 */
exports.getJobsByCategory = async (req, res) => {
    try {
        // Sử dụng aggregation để nhóm và đếm số lượng công việc theo ngành nghề
        const categories = await Job.aggregate([
            {
                $group: {
                    _id: {
                        category: "$groupJobFunctionV3Name",
                        categoryVI: "$groupJobFunctionV3NameVI",
                    },
                    count: { $sum: 1 }, // Đếm số lượng job trong mỗi ngành
                    // Lấy thêm mẫu một job thuộc ngành nghề đó
                    sampleJob: { $first: { title: "$title", company: "$company" } },
                },
            },
            // Loại bỏ các nhóm không có tên ngành nghề
            {
                $match: {
                    "_id.category": { $ne: null, $ne: "" },
                },
            },
            // Sắp xếp theo số lượng giảm dần
            { $sort: { count: -1 } },
            // Định dạng lại kết quả để dễ sử dụng
            {
                $project: {
                    _id: 0,
                    category: "$_id.category",
                    categoryVI: "$_id.categoryVI",
                    count: 1,
                    sampleJob: 1,
                },
            },
        ]);

        res.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

const { Job } = require("../models/job.model");
const User = require("../models/user.model");
const { Worker } = require("worker_threads");
const diacritics = require("diacritics");
const axios = require("axios");

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
        const { skill, location, category, jobLevel, uid } = req.body;
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
            query.jobLevel = { $regex: jobLevel, $options: "i" };
        }
        console.log("query", query);

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
            .sort({ createdAt: -1 }) // Mới nhất trước
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

exports.searchJobs = async (req, res) => {
    try {
        const { skill, location, groupJobFunctionV3Name, jobLevel, review, uid } = req.body;
        const cacheKey = JSON.stringify({ skill, location, groupJobFunctionV3Name, jobLevel, review });

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
            const jobLevelLastUpdate = removeDiacritics(jobLevel);
            query.jobLevel = { $regex: jobLevelLastUpdate, $options: "i" };
        }

        const allJobs = await Job.find(query).sort({ updatedAt: -1 });
        console.log(allJobs.length);

        const jobTexts = allJobs.map((job) => {
            const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
            return ` Require ${cleanRequirement}. Skills: ${job.skills}`;
        });
        console.log("jobTexts", jobTexts);
        console.log("revirwe", review);

        const worker = new Worker("./src/lib/matchJobsWorker.js");
        worker.postMessage({ review, jobTexts });

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
                    semanticScore: match ? parseFloat(match.semanticScore) : 0,
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

// exports.searchJobs = async (req, res) => {
//     try {
//         const { skill, location, groupJobFunctionV3Name, jobLevel, review } = req.body;

//         let query = {};
//         if (!review) return res.status(404).json({ message: "Thiếu dữ liệu tổng quan" });
//         // Xử lý tìm kiếm nhiều kỹ năng
//         if (skill) {
//             const skillLastUpdate = removeDiacritics(skill);
//             const skillsArray = skillLastUpdate.split(",").map((s) => s.trim()); // Tách chuỗi thành mảng
//             query.skills = { $regex: skillsArray.join("|"), $options: "i" }; // Regex tìm ít nhất một kỹ năng
//         }
//         if (location) {
//             const locationLastUpdate = removeDiacritics(location);
//             query.location = { $regex: locationLastUpdate, $options: "i" };
//         }
//         if (groupJobFunctionV3Name) {
//             const groupJobFunctionV3NameLastUpdate = removeDiacritics(groupJobFunctionV3Name);
//             query.groupJobFunctionV3Name = { $regex: groupJobFunctionV3NameLastUpdate, $options: "i" };
//         }
//         if (jobLevel) {
//             const jobLevelLastUpdate = removeDiacritics(jobLevel);
//             query.jobLevel = { $regex: jobLevelLastUpdate, $options: "i" };
//         }

//         const allJobs = await Job.find(query).sort({ updatedAt: -1 });
//         console.log(allJobs.length);

//         // Tạo mảng jobTexts từ allJobs
//         const jobTexts = allJobs.map((job) => {
//             const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
//             const jobdes = job.description.replace(/<[^>]+>/g, " ").trim();
//             return ` Require ${cleanRequirement}. Skills: ${job.skills}`;
//             // return `Job description ${jobdes} . Require ${cleanRequirement}. Skills: ${job.skills}`;
//         });

//         const worker = new Worker("./src/lib/matchJobsWorker.js");
//         worker.postMessage({ review, jobTexts });

//         worker.on("message", (matchScore) => {
//             if (matchScore.error) {
//                 return res.status(500).json({ success: false, error: matchScore.error });
//             }

//             if (!matchScore || !matchScore.jobMatches) {
//                 return res.status(500).json({ success: false, error: "Không thể tính điểm so khớp từ matchJobsNLP" });
//             }

//             const jobsWithScore = allJobs.map((job, index) => {
//                 const match = matchScore.jobMatches.find((m) => m.jobId === `job_${index + 1}`);
//                 return {
//                     ...job._doc,
//                     semanticScore: match ? parseFloat(match.semanticScore) : 0,
//                 };
//             });

//             const filteredJobs = jobsWithScore.filter((job) => job.semanticScore > 0);
//             filteredJobs.sort((a, b) => b.semanticScore - a.semanticScore);

//             const page = parseInt(req.query.page) || 1;
//             const perPage = parseInt(req.query.perPage) || 10;
//             const skip = (page - 1) * perPage;
//             const totalJobs = filteredJobs.length;
//             const paginatedJobs = filteredJobs.slice(skip, skip + perPage);
//             const totalPages = Math.ceil(totalJobs / perPage);

//             res.json({
//                 success: true,
//                 data: paginatedJobs,
//                 pagination: { currentPage: page, perPage, totalPages, totalJobs },
//             });
//         });

//         worker.on("error", (error) => {
//             res.status(500).json({ success: false, error: error.message });
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// };
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
 * Lấy danh sách công ty có nhiều job nhất.
 * GET /api/jobs/top-companies?limit=20
 */
exports.getTopCompanies = async (req, res) => {
    try {
        // số công ty cần lấy, mặc định 20
        const limit = parseInt(req.query.limit, 10) || 20;

        const companies = await Job.aggregate([
            {
                $group: {
                    _id: "$company", // gom theo tên công ty
                    totalJobs: { $sum: 1 }, // đếm job
                    companyLogo: { $first: "$companyLogo" },
                },
            },
            { $sort: { totalJobs: -1 } }, // giảm dần
            { $limit: limit }, // giới hạn kết quả
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

        res.json({ success: true, data: companies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

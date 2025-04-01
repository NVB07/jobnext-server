const { Job } = require("../models/job.model");

const { matchJobsNLP } = require("../lib/matchJobNLP");
// const diacritics = require("diacritics");
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

exports.searchJobs = async (req, res) => {
    try {
        const { skill, location, category, jobLevel, review } = req.body;
        let query = {};
        if (!review) return res.status(404).json({ message: "Thiếu dữ liệu tổng quan" });
        // Xử lý tìm kiếm nhiều kỹ năng
        if (skill) {
            const skillsArray = skill.split(",").map((s) => s.trim()); // Tách chuỗi thành mảng
            query.skills = { $regex: skillsArray.join("|"), $options: "i" }; // Regex tìm ít nhất một kỹ năng
        }
        if (location) {
            query.location = { $regex: location, $options: "i" };
        }
        if (category) {
            query.category = { $regex: category, $options: "i" };
        }
        if (jobLevel) {
            query.jobLevel = { $regex: jobLevel, $options: "i" };
        }

        // Lấy tham số phân trang từ query, mặc định page = 1, perPage = 10
        // const page = parseInt(req.query.page) || 1;
        // const perPage = parseInt(req.query.perPage) || 10;
        // const skip = (page - 1) * perPage;

        // // Tính tổng số jobs phù hợp
        // const totalJobs = await Job.countDocuments(query);

        // // Truy vấn danh sách jobs có phân trang
        // const jobs = await Job.find(query)
        //     .sort({ updatedAt: -1 }) // Job mới nhất trước
        //     .skip(skip) // Bỏ qua những job ở trang trước
        //     .limit(perPage); // Giới hạn số job trên mỗi trang

        // const jobTexts = jobs.map((job) => {
        //     // Kết hợp description và jobRequirement để có thông tin đầy đủ
        //     // Loại bỏ các thẻ HTML (nếu không cần) bằng cách sử dụng regex đơn giản

        //     const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
        //     return ` ${cleanRequirement} Skills: ${job.skills}`;
        // });

        // // Gọi matchJobsNLP với jobTexts
        // const matchScore = await matchJobsNLP(
        //     "Chau Vu Hoang Phuc, born in 2001 and located in Ho Chi Minh, is a Front-End Dev applicant. He has approximately 2 years of experience. He studied Electronics and Telecommunication at Gia Dinh University. Phuc's skills include HTML5, CSS3, SASS/SCSS, JavaScript, ReactJS, GIT, Tailwind, Bootstrap, Ant design, Mui, Nodejs, ExpressJs, Graphql, Prisma, TypeORM, mysql, Docker, teamwork, time management, problem solving. He was a Front-End Dev at CyberSoftAcademy.",
        //     jobTexts
        // );
        // console.log(matchScore);

        // // Tính tổng số trang
        // const totalPages = Math.ceil(totalJobs / perPage);

        const allJobs = await Job.find(query).sort({ updatedAt: -1 });
        console.log(allJobs.length);

        // Tạo mảng jobTexts từ allJobs
        const jobTexts = allJobs.map((job) => {
            const cleanRequirement = job.jobRequirement.replace(/<[^>]+>/g, " ").trim();
            return `${cleanRequirement} Skills: ${job.skills}`;
        });

        const matchScore = await matchJobsNLP(review, jobTexts);

        // Kiểm tra nếu matchScore không hợp lệ
        if (!matchScore || !matchScore.jobMatches) {
            throw new Error("Không thể tính điểm so khớp từ matchJobsNLP");
        }

        // Gắn semanticScore vào từng job
        const jobsWithScore = allJobs.map((job, index) => {
            const match = matchScore.jobMatches.find((m) => m.jobId === `job_${index + 1}`);
            return {
                ...job._doc, // Lấy toàn bộ dữ liệu gốc của job
                semanticScore: match ? parseFloat(match.semanticScore) : 0, // Gắn semanticScore, mặc định là 0 nếu không có
            };
        });

        // Lọc jobs dựa trên semanticScore (ví dụ: chỉ giữ jobs có semanticScore > 50)
        const filteredJobs = jobsWithScore.filter((job) => job.semanticScore > 0); // Điều chỉnh ngưỡng nếu cần

        // Sắp xếp theo semanticScore giảm dần
        filteredJobs.sort((a, b) => b.semanticScore - a.semanticScore);

        // Áp dụng phân trang
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;
        const totalJobs = filteredJobs.length; // Tổng số jobs sau khi lọc

        const paginatedJobs = filteredJobs.slice(skip, skip + perPage);

        // Tính tổng số trang
        const totalPages = Math.ceil(totalJobs / perPage);

        // Trả về kết quả
        res.json({
            success: true,
            data: paginatedJobs,
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

const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    jobId: String, // ID từ TopCV
    title: String,
    company: String,
    companyLogo: String,
    location: String,
    salary: String,
    jobLevel: String,
    jobLevelVI: String,
    jobRequirement: String,
    description: String,
    languageSelected: String,
    url: String,
    skills: String,
    category: String,
    expiredOn: Date,
    updatedAt: { type: Date, default: Date.now }, // Để kiểm tra cập nhật
});

const Job = mongoose.model("Job", jobSchema);
module.exports = { Job };

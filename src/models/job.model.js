const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    jobId: String,
    jobSource: String,
    contact: String,
    title: String,
    alias: String,
    company: String,
    companyAlias: String,
    companyLogo: String,
    locationVI: String,
    location: String,
    salary: String,
    jobLevel: String,
    jobLevelVI: String,
    groupJobFunctionV3Name: String,
    groupJobFunctionV3NameVI: String,
    jobRequirement: String,
    description: String,
    languageSelected: String,
    url: String,
    skills: String,
    expiredOn: Date,
    updatedAt: { type: Date, default: Date.now }, // Để kiểm tra cập nhật
});

const Job = mongoose.model("Job", jobSchema);
module.exports = { Job };

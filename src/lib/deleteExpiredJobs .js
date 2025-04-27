const { Job } = require("../models/job.model");

const deleteExpiredJobs = async () => {
    try {
        const now = new Date();
        const result = await Job.deleteMany({ expiredOn: { $lt: now } });
        console.log(`Đã xóa ${result.deletedCount} công việc hết hạn.`);
    } catch (err) {
        console.error("Lỗi khi xóa job hết hạn:", err);
    }
};
module.exports = { deleteExpiredJobs };
// deleteExpiredJobs();

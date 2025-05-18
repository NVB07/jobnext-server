const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");

// Định nghĩa các API
router.post("/", jobController.createJob);
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);
router.put("/:id", jobController.updateJob);
router.delete("/:id", jobController.deleteJob);
router.post("/search", jobController.searchJobs);
router.post("/search-no-match", jobController.searchJobsNoMatch);
router.post("/job-detail", jobController.getJobDetail);
router.get("/stats/top-companies", jobController.getTopCompanies);
module.exports = router;

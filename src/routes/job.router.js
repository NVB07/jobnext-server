const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");

// Định nghĩa các API
router.post("/", jobController.createJob);
router.get("/", jobController.getJobs);
router.post("/search", jobController.searchJobs);
router.post("/search-no-match", jobController.searchJobsNoMatch);
router.post("/hybrid-search", jobController.hybridSearchJobs);
router.post("/job-detail", jobController.getJobDetail);
router.get("/stats/top-companies", jobController.getTopCompanies);
router.get("/companies", jobController.getAllCompanies);
router.get("/categories", jobController.getJobsByCategory);
router.get("/:id", jobController.getJobById);
router.put("/:id", jobController.updateJob);
router.delete("/:id", jobController.deleteJob);
module.exports = router;

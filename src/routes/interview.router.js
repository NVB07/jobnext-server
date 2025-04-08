const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interview.controller");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, interviewController.interviewSession);
router.get("/", authMiddleware, interviewController.getInterviewById);
router.get("/getInterviewByJobRequirement", authMiddleware, interviewController.getInterviewByJobRequirement);
router.get("/getInterviewByUid", authMiddleware, interviewController.getInterviewByUid);
router.delete("/deleteInterview/:interviewId", authMiddleware, interviewController.deleteInterview);

module.exports = router;

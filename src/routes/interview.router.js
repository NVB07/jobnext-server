const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interview.controller");

router.post("/", interviewController.interviewContoller);

module.exports = router;

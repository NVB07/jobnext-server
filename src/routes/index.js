const express = require("express");
const router = express.Router();

////////////////////////////////////////////////////////////////
const userRoutes = require("./user.routes");
const blogRouters = require("./blog.router");
const jobRouters = require("./job.router");
const interviews = require("./interview.router");

////////////////////////////////////////////////////////////////
router.use("/users", userRoutes);
router.use("/blogs", blogRouters);
router.use("/jobs", jobRouters);
router.use("/interviews", interviews);

module.exports = router;

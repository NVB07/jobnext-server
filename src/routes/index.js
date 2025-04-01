const express = require("express");
const router = express.Router();

////////////////////////////////////////////////////////////////
const userRoutes = require("./user.routes");
const blogRouters = require("./blog.router");
const jobRouters = require("./job.router");

////////////////////////////////////////////////////////////////
router.use("/users", userRoutes);
router.use("/blogs", blogRouters);
router.use("/jobs", jobRouters);

module.exports = router;

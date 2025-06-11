const express = require("express");
const router = express.Router();

////////////////////////////////////////////////////////////////
const userRoutes = require("./user.routes");
const blogRouters = require("./blog.router");
const jobRouters = require("./job.router");
const interviews = require("./interview.router");
const cvRouters = require("./cv.router");
const userImageRouters = require("./userImage.router");

////////////////////////////////////////////////////////////////
router.use("/users", userRoutes);
router.use("/blogs", blogRouters);
router.use("/jobs", jobRouters);
router.use("/interviews", interviews);
router.use("/cv", cvRouters);
router.use("/user-images", userImageRouters);

module.exports = router;

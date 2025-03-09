const express = require("express");
const router = express.Router();

////////////////////////////////////////////////////////////////
const userRoutes = require("./user.routes");
const blogRouters = require("./blog.router");

////////////////////////////////////////////////////////////////
router.use("/users", userRoutes);
router.use("/blogs", blogRouters);

module.exports = router;

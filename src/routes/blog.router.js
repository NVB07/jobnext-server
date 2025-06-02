const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blog.controller");

// Định nghĩa các API
router.get("/", blogController.getAllBlog);
router.get("/:id", blogController.getBlogById);

module.exports = router;

const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blog.controller");

// Định nghĩa các API
router.get("/", blogController.getAllBlog);
router.get("/:id", blogController.getBlogById);
router.post("/", blogController.createBlog);
router.put("/:id", blogController.updateBlog);
router.delete("/blogs/:id", blogController.deleteBlog);

module.exports = router;

const express = require("express");
const router = express.Router();
const blogController = require("../admin.controller/admin.blog.controller");
const imageUpload = require("../middlewares/imageUpload");

// Get blog statistics (should be before /:id route to avoid conflicts)
router.get("/stats", blogController.getBlogStats);

// Upload image for blog content
router.post("/upload", imageUpload.single("image"), blogController.createImageURL);

// Get all blogs with pagination and search
router.get("/", blogController.getAllBlogs);

// Create new blog
router.post("/", blogController.createBlog);

// Bulk delete blogs
router.delete("/bulk", blogController.bulkDeleteBlogs);

// Get blog detail by ID
router.get("/:id", blogController.getBlogById);

// Update blog by ID
router.put("/:id", blogController.updateBlog);

// Delete blog by ID
router.delete("/:id", blogController.deleteBlog);

module.exports = router;

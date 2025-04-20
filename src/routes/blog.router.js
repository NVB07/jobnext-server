const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blog.controller");
const imageUpload = require("../middlewares/imageUpload");
// Định nghĩa các API
router.get("/", blogController.getAllBlog);
router.get("/:id", blogController.getBlogById);
router.post("/", blogController.createBlog);
router.put("/:id", blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);
router.post("/upload-image", imageUpload.single("image"), blogController.createImageURL);
router.post("/save-blog", blogController.saveBlog);
router.post("/unsave-blog", blogController.unsaveBlog);
router.get("/saved/:userId", blogController.getSavedBlogs);

module.exports = router;

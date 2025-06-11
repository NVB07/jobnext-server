const express = require("express");
const router = express.Router();
const userImageController = require("../controllers/userImage.controller");

// Lấy tất cả ảnh của user theo UID
router.get("/:uid", userImageController.getUserImages);

// Upload ảnh mới
router.post("/upload", userImageController.uploadMiddleware, userImageController.uploadImage);

// Soft delete ảnh
router.delete("/:id", userImageController.deleteImage);

// Hard delete ảnh (xóa vĩnh viễn)
router.delete("/:id/permanent", userImageController.permanentDeleteImage);

module.exports = router;

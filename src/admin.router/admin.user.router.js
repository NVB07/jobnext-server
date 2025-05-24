const express = require("express");
const router = express.Router();
const userController = require("../admin.controller/admin.user.controller");

// Get user statistics (should be before /:id route to avoid conflicts)
router.get("/stats", userController.getUserStats);

// Search users
router.get("/search", userController.searchUsers);

// Get all users with pagination
router.get("/", userController.getUsers);

// Get user detail by ID
router.get("/:id", userController.getUserDetail);

// Delete user completely
router.delete("/:id", userController.deleteUser);

module.exports = router;

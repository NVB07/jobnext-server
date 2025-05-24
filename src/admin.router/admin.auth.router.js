const express = require("express");
const router = express.Router();
const authController = require("../admin.controller/admin.auth.controller");
const adminAuth = require("../middleware/adminAuth");

// Admin login (public route)
router.post("/login", authController.adminLogin);

// Admin logout (protected route)
router.post("/logout", adminAuth, authController.adminLogout);

// Verify admin token (public route - but validates token internally)
router.get("/verify", authController.verifyAdminToken);

module.exports = router;

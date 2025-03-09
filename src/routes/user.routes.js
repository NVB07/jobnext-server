const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// Định nghĩa các API
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);

module.exports = router;

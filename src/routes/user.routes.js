const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middlewares/fileValidation");
// Định nghĩa các API
// router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.patch("/:uid", userController.updateUser);
router.post("/uploadcv", upload.single("cv"), userController.uploadPDF);
router.post("/uploadtext", userController.uploadText);
router.get("/saved-jobs/:userId", userController.getSavedJobs);
router.post("/save-job", userController.saveJob);
router.post("/unsave-job", userController.unsaveJob);

module.exports = router;

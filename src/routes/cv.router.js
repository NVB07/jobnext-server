const express = require("express");
const router = express.Router();
const cvController = require("../controllers/cv.controller");

router.get("/", cvController.getAllCv);
router.get("/:uid", cvController.getCvByUid);
router.post("/", cvController.createCv);
router.patch("/:id", cvController.updateCv);
router.delete("/:id", cvController.deleteCv);

module.exports = router;

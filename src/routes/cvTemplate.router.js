const express = require("express");
const router = express.Router();
const cvController = require("../controllers/cvTemplate.controller");

router.get("/", cvController.getAllTemplates);
router.post("/", cvController.createTemplate);
router.put("/:id", cvController.updateTemplate);
module.exports = router;

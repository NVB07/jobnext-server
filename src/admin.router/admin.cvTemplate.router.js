const express = require("express");
const router = express.Router();
const cvController = require("../admin.controller/admin.cvTemplate.controller");

router.get("/", cvController.getAllTemplates);
router.post("/", cvController.createTemplate);
router.put("/:id", cvController.updateTemplate);
router.delete("/:id", cvController.deleteTemplate);

module.exports = router;

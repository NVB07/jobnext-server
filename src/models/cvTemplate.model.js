const mongoose = require("mongoose");

const cvTemplateSchema = new mongoose.Schema(
    {
        json: String,
        preview: String,
        name: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("CvTemplate", cvTemplateSchema);

const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        authorUid: { type: String, required: true },
        content: { type: String },
        title: { type: String },
        tags: [String],
        savedBy: [String],
    },
    { timestamps: true } // Thêm createdAt, updatedAt tự động
);

module.exports = mongoose.model("Blog", blogSchema);

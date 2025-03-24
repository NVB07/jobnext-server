const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        userData: { textData: { type: String, required: false }, cloudinaryUrl: { type: String, required: false } },
        uid: { type: String, required: true },
    },
    { timestamps: true } // Thêm createdAt, updatedAt tự động
);

module.exports = mongoose.model("User", userSchema);

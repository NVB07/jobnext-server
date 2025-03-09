const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true, unique: true },
        displayName: { type: String, required: true },
        photoURL: { type: String },
        email: { type: String },
        emailVerified: { type: Boolean },
        uid: { type: String, required: true },
    },
    { timestamps: true } // Thêm createdAt, updatedAt tự động
);

module.exports = mongoose.model("User", userSchema);

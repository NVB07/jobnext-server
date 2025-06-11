const mongoose = require("mongoose");

const userImageSchema = new mongoose.Schema(
    {
        uid: {
            type: String,
            required: true,
            index: true, // Index để query nhanh theo UID
        },
        fileName: {
            type: String,
            required: true,
        },
        cloudinaryUrl: {
            type: String,
            required: true,
        },
        cloudinaryPublicId: {
            type: String,
            required: true,
        },
        width: {
            type: Number,
            required: true,
        },
        height: {
            type: Number,
            required: true,
        },
        fileSize: {
            type: Number, // Kích thước file tính bằng bytes
        },
        mimeType: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true, // Cho phép soft delete
        },
    },
    {
        timestamps: true,
    }
);

// Index compound để query hiệu quả
userImageSchema.index({ uid: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("UserImage", userImageSchema);

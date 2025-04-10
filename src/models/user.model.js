const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        userData: {
            textData: { type: String, required: false },
            cloudinaryUrl: { type: String, required: false },
        },
        uid: { type: String, required: true },

        savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
        savedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

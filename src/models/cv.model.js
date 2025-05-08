const mongoose = require("mongoose");

const cvSchema = new mongoose.Schema(
    {
        json: String,
        name: {
            type: String,
            default: function () {
                return `CV - ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")}`;
            },
        },
        uid: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cv", cvSchema);

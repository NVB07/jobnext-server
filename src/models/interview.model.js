const mongoose = require("mongoose");

const partSchema = new mongoose.Schema(
    {
        text: String,
    },
    { _id: false }
);

const chatSchema = new mongoose.Schema(
    {
        role: String,
        parts: [partSchema],
    },
    { _id: false }
);
const interviewSchema = new mongoose.Schema({
    uid: String,
    jobId: String,
    jobTitle: String,
    jobLevelVI: String,
    jobRequirement: String,
    jobRequirementsElement: String,
    candidateDescription: String,
    url: String,
    skills: String,
    category: String,
    chatHistory: [chatSchema],
    createdAt: { type: Date, default: Date.now },
});

const Interview = mongoose.model("Interview", interviewSchema);
module.exports = { Interview };

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

interviewSchema.virtual("job", {
    ref: "Job",
    localField: "jobId", // field ở interview
    foreignField: "jobId", // field ở job
    justOne: true, // lấy 1 record
});
interviewSchema.set("toObject", { virtuals: true });
interviewSchema.set("toJSON", { virtuals: true });

const Interview = mongoose.model("Interview", interviewSchema);
module.exports = { Interview };

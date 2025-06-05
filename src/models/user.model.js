const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        userData: {
            profile: {
                Name: String,
                DOB: String,
                Phone_Number: String,
                Address: String,
                Email: String,
                LinkedInPortfolio: String,
                Career_objective: String,
                University: String,
                Major: String,
                GPA: String,
                Graduated_year: String,
                Achievements_awards: String,
                Extracurricular_activities: String,
                Interests: String,
                Job_position: String,
                Rank: String,
                Industry: String,
                Work_Experience: String,
                Years_of_experience: String,
                Projects: String,
                Skills: String,
                References: String,
            },
            review: String,
            recommend: {
                DanhGia: {
                    UuDiem: String,
                    NhuocDiem: String,
                },
                CanChinhSuaChiTiet: String,
                CanThem: String,
                LuuY: String,
            },
            PDF_CV_URL: String,
        },
        uid: { type: String, required: true },

        savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

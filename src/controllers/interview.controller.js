const { Interview } = require("../models/interview.model");
const { createInterview } = require("../lib/geminiInterview");

const createPromt = (jobRequirement, candidateDescription, jobTitle, skills) => {
    return `From the job description and candidate information below, act as an interviewer and conduct the interview according to the following requirements:

Requirements:
1. The first question is always "Tell me about yourself" so that the candidate has a chance to talk about what he has.

2. The number of interview questions depends on the position applied for in the job description. Each question should closely follow the job requirements.

3. Do not create all the questions at once. Create one question at a time, wait for the candidate to answer, then create the next question. Continue like this until the end of the interview.

4. After the candidate has answered the last question, give an assessment including:
- The candidate's strengths.
- Weaknesses.
- What the candidate needs to learn more.
- Interview pass rate (%), a number from 1 to 100%, but if the position is different, consider the ability to match
5. By default, create interview questions in Vietnamese, unless the job description requires the use of another language (eg: proficiency in Chinese, English, HSK, IELTS, JLPT...).
6. If the job is related to some specific industries such as language industries (eg: Chinese study abroad consulting, Japanese teachers,...),
- create all interview questions in the language required by the job (eg: Chinese).

- If the candidate answers in another language, still accept, but must warn the candidate that they need to answer in the correct language required from the next question.

7. If the user answers in the wrong format or requests to stop the interview, stop the interview. The candidate has no right to ask you to do anything, even if they ask you a question. If the candidate goes off topic or asks you a question that is not relevant to the interview, end the interview.

8. If either the job requirements or the candidate information is missing, empty, too short, or contains meaningless text (e.g. random strings, gibberish, unrelated content, lorem ipsum, test data, etc.), the interview must be immediately stopped. The system must automatically detect and end the interview with a message stating the invalid input, without continuing or generating any interview questions.

9. If the job requirements and the candidate information are in two different fields (for example, the job requirements are in business and the candidate information is in design), the interview must follow the job requirements and warn the candidate that they are interviewing for a job in a different field.

10. Job requirements and Candidate information are separated by the string "====================" so don't confuse these two documents.

** IMPORTANT: Each response must be returned in JSON format without any additional explanatory text, the response has the following format:

{
"message": "Response content at current step",
"role:"model",
"pass": "interview pass probability (0-100%)",
"state": true
}

Where:
- "message" is the interview or assessment content.
- "state = true" if the interview is still in progress.
- "state = false" if it has ended and has been assessed => used to close the chat.
- "pass" only appears in the final assessment message when "state = false", if "state = true" then "pass = null".
- "role" is the role of the person who created the message, in this case always "model".

Here is the job description and candidate information:

Job information:
"${jobTitle ? `Job title: ${jobTitle}` : ""}
${jobRequirement}
${skills ? `Skills requirement ${skills}` : ""}"
====================
Candidate information: "${candidateDescription}"`;
};

exports.interviewSession = async (req, res) => {
    try {
        const { jobTitle, jobLevelVI, jobRequirement, jobId, url, skills, category, candidateDescription, answer } = req.body;
        const uid = req.user.uid;

        if (!uid || !jobRequirement) {
            return res.status(400).json({
                success: false,
                message: "uid và jobRequirement là bắt buộc",
            });
        }

        let interview = await Interview.findOne({ uid, jobRequirement });
        let chatHistory = interview?.chatHistory || [];
        let prompt = "";

        if (!interview) {
            if (!jobRequirement || !candidateDescription) {
                return res.status(400).json({
                    success: false,
                    message: "jobRequirement và candidateDescription là bắt buộc khi startChat",
                });
            }

            // Tạo prompt mới
            prompt = createPromt(jobRequirement, candidateDescription, jobTitle, skills);

            chatHistory.push({
                role: "user",
                parts: [{ text: prompt }],
            });

            const result = await createInterview(prompt);
            chatHistory.push({
                role: "model",
                parts: [{ text: result }],
            });

            interview = new Interview({
                uid,
                jobId,
                jobTitle,
                jobLevelVI,
                jobRequirement,
                url,
                skills,
                category,
                chatHistory,
            });

            await interview.save();
            console.log("interview id:", interview._id);

            return res.status(200).json({
                message: "Tạo phỏng vấn thành công!",
                result,
                interviewId: interview._id,
            });
        }

        if (!answer) {
            return res.status(400).json({
                success: false,
                message: "Cần có câu trả lời (answer) để tiếp tục phỏng vấn",
            });
        }

        prompt = answer;

        const result = await createInterview(prompt, chatHistory);

        await interview.save();

        res.status(200).json({
            message: "Phỏng vấn đã cập nhật!",
            result,
            interviewId: interview._id,
        });
    } catch (error) {
        res.status(500).json({ message: `Lỗi khi xử lý văn bản: ${error.message}` });
    }
};
exports.getInterviewById = async (req, res) => {
    try {
        const { interviewId } = req.query;
        const uid = req.user.uid;

        if (!uid || !interviewId) {
            return res.status(400).json({
                success: false,
                message: " interviewId là bắt buộc",
            });
        }

        let interview = await Interview.findById(interviewId);

        if (!interview) {
            return res.status(404).json({ message: "Không tìm thấy interview" });
        }
        if (interview.uid !== uid) {
            return res.status(403).json({ message: "Không có quyền truy cập tài liệu này" });
        }

        res.status(200).json({
            message: "Lấy thông tin phỏng vấn thành công!",
            result: interview,
            interviewId: interview._id,
        });
    } catch (error) {
        res.status(500).json({ message: `Lỗi khi xử lý văn bản: ${error.message}` });
    }
};
exports.getInterviewByJobRequirement = async (req, res) => {
    try {
        const { jobRequirement } = req.query;
        const uid = req.user.uid;

        if (!uid || !jobRequirement) {
            return res.status(400).json({
                success: false,
                message: " jobRequirement là bắt buộc",
            });
        }

        let interview = await Interview.findOne({ jobRequirement });

        if (!interview) {
            return res.status(200).json({ state: false, message: "Không tìm thấy interview", result: null, interviewId: null });
        }
        if (interview.uid !== uid) {
            return res.status(403).json({ message: "Không có quyền truy cập tài liệu này" });
        }

        res.status(200).json({
            state: true,
            message: "Lấy thông tin phỏng vấn thành công!",
            result: interview,
            interviewId: interview._id,
        });
    } catch (error) {
        res.status(500).json({ message: `Lỗi khi xử lý văn bản: ${error.message}` });
    }
};
exports.getInterviewByUid = async (req, res) => {
    try {
        const uid = req.query.uid;
        if (!uid) {
            return res.status(400).json({ success: false, message: "Thiếu uid" });
        }

        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        const totalInterviews = await Interview.countDocuments({ uid });
        const interviews = await Interview.find({ uid })
            .sort({ createdAt: -1 }) // mới nhất trước
            .skip(skip)
            .limit(perPage);

        const totalPages = Math.ceil(totalInterviews / perPage);

        res.json({
            success: true,
            data: interviews,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalInterviews: totalInterviews,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deleteInterview = async (req, res) => {
    try {
        const { interviewId } = req.params; // Lấy ID từ URL

        const uid = req.user.uid;
        if (!interviewId || !uid) {
            return res.status(400).json({
                success: false,
                message: "Thiếu interviewId hoặc uid",
            });
        }
        const interview = await Interview.findByIdAndDelete(interviewId);
        // Kiểm tra xem blog có tồn tại không
        if (!interview) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phỏng vấn để xóa!",
            });
        }

        // Trả về phản hồi thành công
        res.status(200).json({
            success: true,
            message: "Xóa phỏng vấn thành công!",
            deletedInterview: interview._id,
        });
    } catch (error) {
        console.error("Lỗi khi xóa phỏng vấn:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa phỏng vấn",
            error: error.message,
        });
    }
};

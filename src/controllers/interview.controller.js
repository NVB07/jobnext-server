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

7. If the user answers in the wrong format or requests to stop the interview, stop the interview.

** IMPORTANT: Each response must be returned in JSON format without any additional explanatory text, the response has the following format:

{
"message": "Response content at current step",
"pass": "interview pass probability (0-100%)",
"state": true
}

Where:
- "message" is the interview or assessment content.
- "state = true" if the interview is still in progress.
- "state = false" if it has ended and has been assessed => used to close the chat.
- "pass" only appears in the final assessment message when "state = false", if "state = true" then "pass = null".

Here is the job description and candidate information:

Job information:
"${jobTitle ? `Job title: ${jobTitle}` : ""}
${jobRequirement}
${skills ? `Skills requirement ${skills}` : ""}"

Candidate information: "${candidateDescription}"`;
};

exports.interviewContoller = async (req, res) => {
    try {
        const { jobTitle, jobLevelVI, jobRequirement, jobId, url, skills, category, candidateDescription, uid, answer } = req.body;
        if (!uid || !jobId) {
            return res.status(400).json({
                success: false,
                message: "uid và jobId là bắt buộc",
            });
        }

        let interview = await Interview.findOne({ uid, jobId });
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

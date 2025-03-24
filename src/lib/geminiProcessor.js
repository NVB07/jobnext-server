const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const fs = require("node:fs");
const path = require("path");

// Khởi tạo Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
const prompt = `This is the resume of the job applicant. Please parse and convert to a well-structured JSON format with the following labels, if there is no label data then leave the value as null. Set in the "cvLabel" object:

"Personal_information": A string containing personal information (Full Name, Phone Number, Email, Address, Date of Birth, etc.) combined into a single string.

"Job_position": The position applied for.

"Career_objectives": A short string describing the candidate's career goals.

"Work_experience": A string listing jobs from most recent to most distant, each job includes: Company Name, Job Title, Duration of Employment, Brief Description of Responsibilities and Achievements, combined into a single string.

"Education_qualifications": A string listing educational qualifications, each entry includes: School Name, Major, Degree, Length of Study, GPA (if applicable), combined into a single string.

"Skills": A string listing technical and soft skills, not divided into separate groups.

"Achievements_awards": A string listing notable achievements and awards (if any).

"Extracurricular_activities": A string listing extracurricular activities related to the job (if any).

"References": A string providing reference information.

Additionally, add a "review" field outside of the "cvLabel" containing a short text in English (US) summarizing the candidate's key information such as name, address, position applied for, skills, degrees or certificates, awards so that I can easily match it to the job description (JD).

##Requirements:

- Combine relevant information into a single string for each primary label in "cvLabel".

- Return only JSON results and do not add any explanatory text.

- Absolutely do not create your own data!

Example output format:
{
"cvLabel": {
"Personal_information": "Nguyen Van A, born in 2000, phone number 0123456789, email example@gmail.com, address Hanoi.",
"Career_objectives": "Looking for a challenging role in software development to enhance technical skills.",
"Job_position": programmer
"Work_experience": "XYZ Company, Software Engineer, January 2020 - Present. Web application development using React and Node.js...",
"Education_qualifications": "ABC University, Bachelor of Computer Science, 2016-2020, GPA 3.8...",
"Skills": "JavaScript, React, Node.js, Communication, Teamwork.",
"Achievements_awards": "Outstanding employee Best of 2022 at XYZ Company.",
"Extracurricular_activities": "Volunteer to teach programming to local students.",
"References": null
},
"review": "Candidate Nguyen Van A, born in 2000, applying for programmer position, has 2 years of experience with nodejs, has experience as a Software Engineer at
}`;

// Cấu hình model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

// Tải file lên Gemini
async function uploadToGemini(buffer, mimeType, displayName) {
    const tempFilePath = path.join(__dirname, `temp_${Date.now()}.pdf`);

    // Lưu tạm file từ buffer để upload
    fs.writeFileSync(tempFilePath, buffer);

    const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType,
        displayName,
    });

    // Xóa file tạm sau khi upload
    fs.unlinkSync(tempFilePath);

    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
}

// Chờ file được xử lý
async function waitForFilesActive(files) {
    console.log("Waiting for file processing...");
    for (const name of files.map((file) => file.name)) {
        let file = await fileManager.getFile(name);
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            file = await fileManager.getFile(name);
        }
        if (file.state !== "ACTIVE") {
            throw new Error(`File ${file.name} failed to process`);
        }
    }
    console.log("...all files ready\n");
}

// Xử lý nội dung bằng Gemini
async function processWithGemini(buffer, mimeType, displayName) {
    try {
        // Tải file lên Gemini
        const file = await uploadToGemini(buffer, mimeType, displayName);

        // Chờ file được xử lý
        await waitForFilesActive([file]);

        // Tạo chat session với Gemini
        const chatSession = model.startChat({
            generationConfig,
            history: [
                {
                    role: "user",
                    parts: [
                        {
                            fileData: {
                                mimeType: file.mimeType,
                                fileUri: file.uri,
                            },
                        },
                        { text: prompt },
                    ],
                },
            ],
        });

        const result = await chatSession.sendMessage(
            `please do the above request. if you can't do it give the data as told with the fields as null. Return only JSON results and do not add any explanatory text`
        );
        await fileManager.deleteFile(file.name);
        return result.response.text();
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

module.exports = { processWithGemini };

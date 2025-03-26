const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const fs = require("node:fs");
const path = require("path");

// Khởi tạo Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
const prompt = `This is the resume of the job applicant. Please parse and convert to a well-structured JSON format with the following labels. Put into the "cvLabel" object:

"Address": the address you want to work at (only take the Province unit, usually the address on the CV will be the work address)

"Phone_number": Phone number.

"Email": email.

"Personal_information": Full name, date of birth, place of birth if any (place of birth will not be included in the "Address" field) combined into a single string.

"Job_position": The position you are applying for.

"Career_objectives": A short string describing the candidate's career goals.

"Work_experience": The work duration and the series list jobs from most recent to most distant, each job includes: Company name, Job title, Duration of employment, Brief description of Responsibilities and Achievements, combined into a single series.

"Projects": The series lists projects worked on including project name, company, technology or tools used, and position within the project.

"Education_qualifications": The series lists educational qualifications, each entry includes: School name, Major, Degree, Duration of study, GPA (if applicable), combined into a single series.

"Skills": The series lists technical and soft skills, not divided into separate groups.

"Achievements_awards": The series lists notable achievements and awards (if applicable).

"Extracurricular_activities": String listing extracurricular activities related to the job (if any).

"References": String providing reference information.

Also, add a "review" field outside of "cvLabel" containing a short text in English (US) summarizing the candidate's key information such as name, address, position applied for, skills, degrees or certificates, awards so I can easily match it to the job description (JD).

##Requirements:

- Combine relevant information into a single string for each key label in "cvLabel".

- If there is no label data, leave the value as null

- Only return JSON results and do not add any explanatory text.

- Absolutely do not create your own data, data should only be taken from the CV provided!

- output data keeps the original language of the CV, except "review" is in US English

Output format sample:
{
"cvLabel": {
"Personal_information": "Nguyen Van A, born in 2000",
"Address":"hanoi",
"Phone_number":"0123456789",
"Email": "example@gmail.com",
"Career_objectives": "Seeking a challenging role in software development to enhance technical skills.",
"Job_position": "programmer",
"Work_experience": "3 years of experience working with nodejs. XYZ Company, Software Engineer, January 2020 - Present.",
"Projects": programming a map application at ABC company with a programming interface position using Reactjs.",
"Education_qualifications": "ABC University, Bachelor of Computer Science, 2016-2020, GPA 3.8...",
"Skills": "JavaScript, React, Node.js, Communications, Teamwork.",
"Achievements_awards": "Best Employee of the Year 2022 at XYZ Company.",
"Extracurricular_activities": "Volunteer to teach programming to local students.",
"References": null
},
"review": "Candidate Nguyen Van A, born in 2000, lives in Hanoi, graduated from university with GPA 3.8, applying for programmer position, has 3 years of experience with nodejs, has worked with reactjs, skills in JavaScript, React, Node.js, Communications, Teamwork, has experience as a programmer at ABC company,..."
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
        const jsonString = result.response
            .text()
            .replace(/```json|```/g, "")
            .trim();
        const jsonStringOneLine = jsonString.replace(/\s+/g, " ");
        return jsonStringOneLine;
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

module.exports = { processWithGemini };

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const fs = require("node:fs");
const path = require("path");

// Khởi tạo Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
// const prompt = `This is the resume of the job applicant. Please parse and convert to a well-structured JSON format with the following labels. Include in the "cvLabel" object:

// "Address": the address you want to work at (only take the Province unit, usually the address on the CV will be the work address)

// "Phone_number": Phone number.

// "Email": email.

// "Personal_information": Full name, date of birth, place of birth if any (place of birth will not be included in the "Address" field) combined into a single string.

// "Job_position": The position you are applying for.

// "Career_objective": A short string describing the candidate's career objective.

// "Work_Experience": Work duration and list of jobs from most recent to most distant, each job includes: Company name, Job title, Working duration, Brief description of Responsibilities and Achievements, combined into a single string, number of years of experience (calculate the number of years of work experience yourself, note that the number of years of work experience in a field is the time of starting work at a company or business).

// "Projects": List of projects done including project name, company, technology or tools used and position in the project.

// "Education_qualifications": List of educational qualifications, each item includes: School name, Major, Degree, Study duration, GPA (if any), combined into a single string.

// "Skills": List of technical and soft skills, not divided into separate groups.

// "Achievements_awards": A string listing notable achievements and awards (if any).

// "Extracurricular_activities": A string listing extracurricular activities related to the job (if any).

// "References": A string providing reference information.

// Also, please add a "review" field outside of "cvLabel" that contains a short text in US English summarizing the candidate's key information such as name, address, position applied for, skills, experience, degrees or certifications, awards so I can easily match it to the job description (JD).

// ##Requirements:

// - Combine relevant information into a single string for each key label in "cvLabel".

// - If there is no label data, leave the value as null
// - The "review" field must not be missing any skills.

// - Return only JSON results and do not add any explanatory text.

// - Never create your own data, data should only be taken from the CV provided!

// - output data keeps the original language of the CV, except "review" is in US English

// Output format template:
// {
// "cvLabel": {
// "Personal_information": "Nguyen Van A, born in 2000",
// "Address":"hanoi",
// "Phone_number":"0123456789",
// "Email": "example@gmail.com",
// "Career_objectives": "Seeking a challenging role in software development to enhance technical skills.",
// "Job_position": "programmer",
// "Work_experience": "3 years of experience working with nodejs. XYZ Company, Software Engineer, January 2020 - Present.",
// "Projects": programming a map application at ABC company with a programming interface position using Reactjs.",
// "Education_qualifications": "ABC University, Bachelor of Computer Science, 2016-2020, GPA 3.8...",
// "Skills": "JavaScript, React, Node.js, Communication, Teamwork.",
// "Achievements": "Best Employee of the Year 2022 at XYZ Company.",
// "Extracurricular_activities": "Volunteering to teach programming to local students.",
// "References": null
// },
// "Evaluation": "Candidate Nguyen Van A, born in 2000, lives in Hanoi, graduated from university with a GPA of 3.8, applying for a programmer position, has 3 years of experience with nodejs, has worked with reactjs, has skills in JavaScript, React, Node.js, Communication, Teamwork, has experience as a programmer at ABC company,..."
// }`;

// Cấu hình model

const prompt = `This is the resume of the job applicant. Please parse and convert to a well-structured JSON format with the following labels. Include in the "cvLabel" object:

"Address": The address you want to work at, standardize the address like "Ha Noi" instead of "HaNoi" or "Ho Chi Minh" instead of "HCM" or "HoChiMinh" (only take the Province unit, usually the address on the CV will be the working address)

"Phone_number": Phone number.

"Email": email.

"Personal_information": Full name, date of birth, place of birth if any (place of birth will not be included in the "Address_field") combined into a single string.

"Job_position": The position you are applying for.

"Rank": Rank position.

"Industry": type of industry.

"Career_objective": A short string describing the candidate's career objective.

"Work_Experience": Work history and list of jobs from most recent to most distant, each job includes: Company name, Job title, Duration of employment, Brief description of Responsibilities and Achievements, combined into a single string, years of experience (calculate years of work experience yourself, note that years of work experience in a field is the time of starting work at a company or business).

"Projects": List of completed projects including project name, company, technology or tools used and position in the project.

"Education_qualifications": List of educational qualifications, each item includes: School name, Major, Degree, Duration of study, GPA (if any), combined into a single string.

"Skills": List of technical and soft skills, not divided into separate groups.

"Achievements_awards": A string listing notable achievements and awards (if any).

"Extracurricular_activities": A string listing extracurricular activities related to the job (if any).

"References": A string providing reference information.

Additionally, please include a "review" field outside of the "cvLabel" that contains a short text in American English summarizing key information about the candidate such as name, address, position applied for, skills, experience, degrees or certifications, awards so that I can easily match it to the job description (JD).

##Requirements:

- Combine relevant information into a single string for each key label in the "cvLabel".

- If there is no label data, leave the value null
- The "review" field must not be missing any skills.

- The "Rank" field must contain only one of the following values: "Intern/Student",
"Fresher/Entry level", "Experienced (non-manager)",
"Manager",
"Director and above".
- "Industry" field includes only 1 of the following values: "Academic/Education", "Accounting/Auditing", "Administration/Office Support", "Agriculture/Livestock/Fishery", "Architecture/Construction", "Art, Media & Printing/Publishing", "Banking & Financial Services", "CEO & General Management", "Customer Service", "Design", "Engineering & Sciences", "Food and Beverage", "Government/NGO", "Healthcare/Medical Services", "Hospitality/Tourism", "Human Resources/Recruitment", "Information Technology/Telecommunications", "Insurance", "Legal", "Logistics/Import Export/Warehouse", "Manufacturing", "Marketing, Advertising/Communications", "Pharmacy", "Real Estate", "Retail/Consumer Products", "Sales", "Technician", "Textiles, Garments/Footwear", "Transportation", "Others".
- Only return JSON results and do not add any explanatory text.

- Never create your own data, data should only be taken from the CV provided!

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
"Rank":""Experienced (non-manager)",
"Industry":"Information Technology/Telecommunications",
"Work_experience": "3 years of experience working with nodejs. XYZ Company, Software Engineer, January 2020 - Present.",
"Projects": programming map application at ABC Company with programming interface position using Reactjs.",
"Education_qualifications": "ABC University, Bachelor of Computer Science, 2016-2020, GPA 3.8...",
"Skills": "JavaScript, React, Node.js, Communication, Teamwork.",
"Achievements": "Best Employee of the Year 2022 at XYZ Company.",
"Extracurricular Activities": "Volunteering to teach programming to local students.",
"References": null
},
"review": "Candidate Nguyen Van A, born in 2000, lives in Hanoi, graduated from university with GPA 3.8, applying for programmer position, has 3 years of experience with nodejs, has worked working with reactjs, skilled in JavaScript, React, Node.js, Communication, Teamwork, experienced as a programmer at ABC company,..."
}`;

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

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

"Name" : full name.

"DOB": date of birth.

"Phone_number": Phone number.

"Address": The address you want to work at, standardize the address like "Hanoi" instead of "hanoi" or "Ho Chi Minh" instead of "HCM" or "HoChiMinh" (only take the Province unit, usually the address on the CV will be the work address).

"Email": email.

"LinkedIn/Portfolio": link to the separate profile if any.

"Career_objective": A short string describing the candidate's career goals.

"University": name of the university
"GPA": GPA score.
"Graduated_year": Year of graduation (or expected).
"Achievements_awards": A list of notable achievements and awards (if any).
"Extracurricular_activities": A list of extracurricular activities related to the job (if any).
"Interests": Interests (if any).

"Job_position": The position you are applying for.
"Rank": The position level.
"Industry": The type of industry.

"Work_Experience": Work history and list of jobs from most recent to most distant, each job is briefly described in bullet points including: Company Name, Job Title, Duration of Employment, Responsibilities and Achievements.
"Years_of_experience": years of experience (calculate years of work experience yourself, note that years of work experience in a field is the time you started working at a company or business), if not available then null.

"Projects": List of completed projects including project name, company, technology or tools used and position in the project, if there are many then describe in bullet points.

"Skills": List of technical and soft skills, not divided into separate groups.

"References": A string providing reference information.

**Additionally, please add the "review" and "recomend" fields outside the "cvLabel". The "review" field contains a short paragraph in American English summarizing key information about the candidate such as name, address, position applied for, skills, experience, degrees or certificates, awards so that I can easily compare with the job description (JD). and "recomend" is a suggestion to improve the CV in Vietnamese according to the following format:
**I. Tổng quan:**
- Summary of strengths.
- Summary of weaknesses.

**II. Chi tiết đề xuất chỉnh sửa:**

**1. Nội dung:**

**Những phần nên thêm vào:**
  (specify specific suggestions such as which items need to be revised, titles that need to be revised, errors that need to be improved, inappropriate words, etc.).
**Những phần nên bỏ hoặc rút gọn:**
 (specify specific suggestions such as which items need to be revised, titles that need to be revised, errors that need to be improved, inappropriate words, etc.)

**2. Trình bày:**
- Suggestions for better presentation (structure, font, layout...).

**III. Đề xuất cải thiện thêm:**

- Write a summary comment (3-5 lines) encouraging editing to optimize the CV.

*The article must follow the above layout, be detailed, clear, and easy to read.
Do not change the format arbitrarily.

##Requirements:

- Combine relevant information into a single string for each key label in the "cvLabel".

- If there is no label data, leave the value null
- The "review" field must not be missing any skills.

- The "Rank" field must contain only one of the following values: "Intern/Student", "Fresher/Entry level", "Experienced (non-manager)", "Manager", "Director and above".
- "Industry" field includes only 1 of the following values: "Academic/Education", "Accounting/Auditing", "Administration/Office Support", "Agriculture/Livestock/Fishery", "Architecture/Construction", "Art, Media & Printing/Publishing", "Banking & Financial Services", "CEO & General Management", "Customer Service", "Design", "Engineering & Sciences", "Food and Beverage", "Government/NGO", "Healthcare/Medical Services", "Hospitality/Tourism", "Human Resources/Recruitment", "Information Technology/Telecommunications", "Insurance", "Legal", "Logistics/Import Export/Warehouse", "Manufacturing", "Marketing, Advertising/Communications", "Pharmacy", "Real Estate", "Retail/Consumer Products", "Sales", "Technician", "Textiles, Garments/Footwear", "Transportation", "Others".
- Only return JSON results and do not add any explanatory text.

- Never create your own data, data should only be taken from the CV provided!

- output data keeps the original language of the CV, except "review" is in US English

Output format sample:
{
"cvLabel": {
{
"cvLabel": {
"Name": "Nguyen Van A",
"DOB": "2000".
"Address":"hanoi",
"Phone_number":"0123456789",
"Email":"example@gmail.com",
"LinkedIn/Portfolio":"https://example-link.com"
"Career_objectives": "Looking for a challenging role in software development to enhance technical skills.",
"University": "Bach Khoa University",
"GPA":"3.0",
"Graduated_year": "2025".
"Achievements_awards": "First prize in FPT Security Competition 2023",
"Extracurricular_activities": "Volunteering to teach programming to local students.",
"Interests":"playing soccer, listening to music".
"Job_position": "programmer",
"Rank":"Experienced (non-manager)",
"Industry":"Information Technology/Telecommunications",
"Work_experience": " XYZ Company, Software Engineer, January 2020 - Present.",
"Skills": "JavaScript, React, Node.js, Communication, Teamwork.",
"Projects":"programming map application at ABC Company with programming interface position using Reactjs.",
"References": null
},
"review": "Candidate Nguyen Van A, born in 2000, living in Hanoi, graduated from university with an average score of 3.0, applying for the position of programmer, has 1 year of experience with reactjs, has worked working with reactjs, skilled in JavaScript, React, Node.js, Communication, Teamwork, experienced as a programmer at ABC company,...",
 "recomend": ...(write as required above),
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

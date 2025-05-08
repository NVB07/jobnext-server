const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const fs = require("node:fs");
const path = require("path");

// Khởi tạo Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
const promptTEXT = (profile) => {
    return `Bạn là chuyên gia nhân sự. Nhiệm vụ của bạn là phân tích CV dạng văn bản thuần túy (plain text), và trả về dữ liệu theo yêu cầu sau:
    YÊU CẦU: Phân tích CV và trả về dữ liệu theo định dạng JSON như sau
    "cvLabel" : {
        "review" : chứa một đoạn văn ngắn bằng tiếng Anh Mỹ tóm tắt thông tin chính về ứng viên như tên, địa chỉ, vị trí ứng tuyển, kỹ năng, kinh nghiệm, bằng cấp hoặc chứng chỉ, giải thưởng,... để tôi có thể dễ dàng so sánh với mô tả công việc (JD).
        "recommend": gồm chuỗi có 3 phần được mô tả bằng tiếng Việt, chỉ trả về đúng 3 phần I, II, III như yêu cầu. Không thêm bất kỳ câu giới thiệu nào trước hoặc sau kết quả.
    }
    =====
    Trường "recommend" gồm chuỗi có ba phần sau bắt buộc bằng tiếng Việt:
    
    **ĐÁNH GIÁ CHUNG:**
    Ưu điểm:
    - liệt kê theo gạch đầu dòng.
    Nhược điểm:
    - liệt kê theo gạch đầu dòng, bao gồm cả lỗi sai chính tả, thiếu thông tin,... nếu có.
    **ĐỀ XUẤT CHỈNH SỬA CHI TIẾT:**
    Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,...:
    - Nếu cần chỉnh sửa thì ghi rõ "Cần chỉnh sửa", "Nên sửa thành", "Vì sao nên sửa", kèm ví dụ cụ thể nếu có.
    - Nếu không cần chỉnh sửa thì ghi rõ "Không cần sửa".
    - Nếu thiếu sót trường nào thì ghi rõ "Thiếu trường", "Nên thêm trường", "Vì sao nên thêm", kèm ví dụ cụ thể nếu có.
    - Một số trường được chấp nhận linh hoạt như:
        + Ngày sinh: chỉ cần năm cũng được, miễn có thể đánh giá được độ tuổi.
        + Địa chỉ: có thể chỉ ghi thành phố/tỉnh, không cần quá chi tiết.
        + Người tham chiếu: có thể có hoặc không, tùy theo vị trí ứng tuyển hoặc bối cảnh.
    
    **LƯU Ý:**
    - Liệt kê các gợi ý tổng quan để cải thiện CV.
    
    =====
    *QUAN TRỌNG:
    - Tuyệt đối không thêm bất kỳ đoạn văn mẫu, câu chào, lời chúc, lời khen, hoặc tóm tắt thừa thãi nào trước hoặc sau kết quả. 
    - Dữ Liệu trả về phải là JSON hợp lệ, không có bất kỳ ký tự nào khác ngoài JSON.
    
    Dữ liệu CV dạng text cần phân tích nằm bên dưới:
    
    =====
    Tên : ${profile.Name}
    Ngày sinh : ${profile.DOB},
    ${profile.Phone_Number ? "Số điện thoại : " + profile.Phone_Number + "," : ""}
    Địa chỉ : ${profile.Address},
    Email : ${profile.Email},
    ${profile.LinkedInPortfolio ? "LinkedIn/Portfolio : " + profile.LinkedInPortfolio + "," : ""}
    Mục tiêu nghề nghiệp : ${profile.Career_objective},
    ${profile.University ? "Trường : " + profile.University + "," : ""}
    ${profile.Major ? "Chuyên ngành : " + profile.Major + "," : ""}
    ${profile.GPA ? "Điểm trung bình : " + profile.GPA + "," : ""}
    ${profile.Graduated_year ? "Năm tốt nghiệp : " + profile.Graduated_year + "," : ""}
    ${profile.Achievements_awards ? "Giải thưởng/Thành tích : " + profile.Achievements_awards + "," : ""}
    ${profile.Extracurricular_activities ? "Hoat động ngoại khóa : " + profile.Extracurricular_activities + "," : ""}
    ${profile.Interests ? "Sở thích : " + profile.Interests + "," : ""}
    Vị trí ứng tuyển : ${profile.Job_position},
    ${profile.Work_Experience ? "Kinh nghiệm làm việc : " + profile.Work_Experience + "," : ""}
    ${profile.Years_of_experience ? "Số năm kinh nghiệm : " + profile.Years_of_experience + "," : ""}
    Kỹ năng : ${profile.Skills},
    ${profile.Projects ? "Dự án : " + profile.Projects + "," : ""}
    ${profile.References ? "Người tham chiếu : " + profile.References : ""}
    =====
    `;
};

// Cấu hình model

const promptPDF = `This is the resume of the job applicant. Please parse and convert to a well-structured JSON format with the following labels. Include in the "cvLabel" object:

"Name" : full name.

"DOB": date of birth.

"Phone_number": Phone number.

"Address": The address you want to work at, standardize the address like "Hà Nội" instead of "hanoi" or "TP Hồ Chí Minh" instead of "HCM" or "HoChiMinh" (only take the Province unit, usually the address on the CV will be the work address).

"Email": email.

"LinkedInPortfolio": link to the separate profile if any.

"Career_objective": A short string describing the candidate's career goals.

"University": name of the university.
"Major":university major.
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

**Additionally, it is mandatory to add the "review" and "recommend" fields outside of the "cvLabel". The "review" field contains a short paragraph in American English summarizing key information about the candidate such as name, address, position applied for, skills, experience, degrees or certificates, awards so that I can easily compare with the job description (JD). and "recommend" is a suggestion to improve the Vietnamese CV in the following format:
   **ĐÁNH GIÁ CHUNG:**
    Ưu điểm:
    - liệt kê theo gạch đầu dòng.
    Nhược điểm:
    - liệt kê theo gạch đầu dòng, bao gồm cả lỗi sai chính tả, thiếu thông tin,... nếu có.
    **ĐỀ XUẤT CHỈNH SỬA CHI TIẾT:**
    Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,...:
    - Nếu cần chỉnh sửa thì ghi rõ "Cần chỉnh sửa", "Nên sửa thành", "Vì sao nên sửa", kèm ví dụ cụ thể nếu có.
    - Nếu không cần chỉnh sửa thì ghi rõ "Không cần sửa".
    - Nếu thiếu sót trường nào thì ghi rõ "Thiếu trường", "Nên thêm trường", "Vì sao nên thêm", kèm ví dụ cụ thể nếu có.
    - Một số trường được chấp nhận linh hoạt như:
        + Ngày sinh: chỉ cần năm cũng được, miễn có thể đánh giá được độ tuổi.
        + Địa chỉ: có thể chỉ ghi thành phố/tỉnh, không cần quá chi tiết.
        + Người tham chiếu: có thể có hoặc không, tùy theo vị trí ứng tuyển hoặc bối cảnh.
    
    **LƯU Ý:**
    - Liệt kê các gợi ý tổng quan để cải thiện CV.

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
"Major":"IT"
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
"recommend": ...(write as required above),
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
                        { text: promptPDF },
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
        return jsonString;
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

async function processWithGeminiText(profile) {
    try {
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        const result = await chatSession.sendMessage(promptTEXT(profile));

        const jsonString = result.response
            .text()
            .replace(/```json|```/g, "")
            .trim();

        return jsonString;
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

module.exports = { processWithGemini, processWithGeminiText };

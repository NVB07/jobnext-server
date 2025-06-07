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
        "recommend":  
        { 
            "DanhGia":{
                "UuDiem": " đánh giá ưu điểm của ứng viên, viết kiểu markdown",
                "NhuocDiem": " đánh giá nhược điểm của ứng viên, viết kiểu markdown, bao gồm cả lỗi sai chính tả, thiếu thông tin,... nếu có.",
            }
            "CanChinhSuaChiTiet": "TRƯỜNG NÀY LÀ 1 CHUỖI GỒM CÁC GẠCH ĐẦU DÒNG ĐƯỢC VIẾT BẰNG KIỂU MARKDOWN,
                Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,...:
                - Nếu cần chỉnh sửa thì ghi rõ "Cần chỉnh sửa thành", "Vì sao nên sửa", kèm ví dụ cụ thể nếu có.
                - Nếu không cần chỉnh sửa thì ghi rõ "Không cần sửa".
                - Nếu thiếu sót trường nào thì ghi rõ Thiếu trường, Nên thêm trường, Vì sao nên thêm, kèm ví dụ cụ thể nếu có.",
            "CanThem": "Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,... gợi ý người dùng thêm vào CV. Trong trường này cũng viết kiểu markdown",
            "LuuY":" Liệt kê các gợi ý tổng quan để cải thiện CV. Trong trường này cũng viết kiểu markdown"
        }
    }
#Các nhận xét trong "recommend" càng chi tiết càng tốt, nếu có thể thì ghi rõ cụ thể ví dụ cụ thể nếu có và bắt buộc phải là tiếng Việt.
    **ví dụ dữ liệu trả về:**
    "cvLabel" : {
        "review": "Candidate Nguyen Van A, born in 2000, living in Hanoi, graduated from university with an average score of 3.0, applying for the position of programmer, has 1 year of experience with reactjs, has worked working with reactjs, skilled in JavaScript, React, Node.js, Communication, Teamwork, experienced as a programmer at ABC company,...",
        "recommend":
            { 
            "DanhGia":{
                "UuDiem": "Có kĩ năng về Reactjs, JavaScript, Node.js, Communication, Teamwork.",
                "NhuocDiem": "Thiếu thông tin về kinh nghiệm làm việc, thiếu thông tin về các dự án đã làm.",
                }
            "CanChinhSuaChiTiet": "- Cần chỉnh sửa thông tin về kinh nghiệm làm việc
            - thông tin về các dự án đã làm...",
            "CanThem": "- Cần thêm thông tin về kinh nghiệm làm việc
            - thông tin về các dự án đã làm...",
            "LuuY":" Cần cải thiện CV \n - cần thêm thông tin về kinh nghiệm làm việc, thông tin về các dự án đã làm."
            }
    }
            
    **Bắt buộc phải tuân theo định dạng trên, chi tiết, rõ ràng, dễ đọc, Không được thay đổi định dạng tùy ý.**
    **QUAN TRỌNG:**
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

const promptPDF = `Bạn là chuyên gia nhân sự. Nhiệm vụ của bạn là phân tích CV. Đây là sơ yếu lý lịch của người xin việc. Vui lòng phân tích cú pháp và chuyển đổi sang định dạng JSON có cấu trúc tốt với các nhãn sau. Bao gồm trong đối tượng "cvLabel":

"Name" : tên đầy đủ.

"DOB": ngày sinh.

"Phone_number": số điện thoại.

"Address": địa chỉ làm việc, phải chỉ chứa một trong các giá trị sau : "An Giang","Bà Rịa - Vũng Tàu","Bắc Giang","Bắc Kạn","Bạc Liêu","Bắc Ninh","Bến Tre","Bình Định","Bình Dương","Bình Phước","Bình Thuận","Cà Mau","Cần Thơ","Cao Bằng","Đà Nẵng","Đắk Lắk","Đắk Nông","Điện Biên","Đồng Nai","Đồng Tháp","Gia Lai","Hà Giang","Hà Nam","Hà Nội","Hồ Chí Minh","Hà Tĩnh","Hải Dương","Hải Phòng","Hậu Giang","Hòa Bình","Hưng Yên","Khánh Hòa","Kiên Giang","Kon Tum","Lai Châu","Lâm Đồng","Lạng Sơn","Lào Cai","Long An","Nam Định","Nghệ An","Ninh Bình","Ninh Thuận","Phú Thọ","Phú Yên","Quảng Bình","Quảng Nam","Quảng Ngãi","Quảng Ninh","Quảng Trị","Sóc Trăng","Sơn La","Tây Ninh","Thái Bình","Thái Nguyên","Thanh Hóa","Thừa Thiên Huế","Tiền Giang","Trà Vinh","Tuyên Quang","Vĩnh Long","Vĩnh Phúc","Yên Bái","International","Other".

"Email": email.

"LinkedInPortfolio": link đến hồ sơ riêng nếu có.

"Career_objective": Dữ liệu kiểu String trình bày thành đoạn văn (NGHIÊM CẤM TRÌNH BÀY DẠNG MẢNG HOẶC ĐỐI TƯỢNG) mô tả mục tiêu nghề nghiệp của ứng viên.

"University": tên trường đại học.
"Major": chuyên ngành đại học.
"GPA": điểm trung bình.
"Graduated_year": năm tốt nghiệp (hoặc dự kiến).
"Achievements_awards": các thành tích và giải thưởng nổi bật (nếu có).
"Extracurricular_activities": các hoạt động ngoại khóa liên quan đến công việc (nếu có).
"Interests": sở thích (nếu có).

"Job_position": vị trí ứng tuyển.
"Rank": cấp bậc.
"Industry": loại ngành nghề.

"Work_Experience": Dữ liệu kiểu String trình bày thành đoạn văn về kinh nghiệm làm việc tại các công ty (NGHIÊM CẤM TRÌNH BÀY DẠNG MẢNG HOẶC ĐỐI TƯỢNG) mô tả lịch sử làm việc và các công việc từ gần nhất đến xa nhất, mỗi công việc được mô tả tóm tắt bằng các điểm chính bao gồm: tên công ty, vị trí công việc, thời gian làm việc, trách nhiệm và thành tích , nếu không làm việc cho công ty nào thì để null.
"Years_of_experience": số năm kinh nghiệm (tính toán số năm kinh nghiệm tự mình, lưu ý rằng số năm kinh nghiệm trong một lĩnh vực là thời gian bạn bắt đầu làm việc tại một công ty hoặc doanh nghiệp), nếu không có thì null .

"Projects": Dữ liệu kiểu String trình bày thành đoạn văn (NGHIÊM CẤM TRÌNH BÀY DẠNG MẢNG HOẶC ĐỐI TƯỢNG) mô tả các dự án đã hoàn thành bao gồm tên dự án, công ty, công nghệ hoặc công cụ sử dụng và vị trí trong dự án, nếu có nhiều thì mô tả bằng các điểm chính.

"Skills":Dữ liệu kiểu String trình bày thành đoạn văn (NGHIÊM CẤM TRÌNH BÀY DẠNG MẢNG HOẶC ĐỐI TƯỢNG) mô tả các kỹ năng kỹ thuật và kỹ năng mềm, không chia thành các nhóm riêng biệt mà bắt buộc phải là 1 chuỗi liên tục phân tách bằng dấu phẩy.

"References":Dữ liệu kiểu String trình bày thành đoạn văn (NGHIÊM CẤM TRÌNH BÀY DẠNG MẢNG HOẶC ĐỐI TƯỢNG) là một chuỗi cung cấp thông tin tham chiếu.

**Ngoài ra, bắt buộc phải thêm các trường "review" và "recommend" bên ngoài "cvLabel". Trường "review" chứa một đoạn văn ngắn bằng tiếng Anh Mỹ tóm tắt các thông tin chính về ứng viên như tên, địa chỉ, vị trí ứng tuyển, kỹ năng, kinh nghiệm, bằng cấp hoặc chứng chỉ, giải thưởng để tôi có thể dễ dàng so sánh với mô tả công việc (JD). và "recommend" là một gợi ý để cải thiện CV tiếng Việt theo định dạng sau:**
    { 
    "DanhGia":{
        "UuDiem": " đánh giá ưu điểm về CV (không phải đánh giá ưu điểm của ứng viên), viết kiểu markdown trình bày theo từng ý chính",
        "NhuocDiem": " đánh giá nhược điểm về CV (không phải đánh giá nhược điểm của ứng viên), viết kiểu markdown trình bày theo từng ý chính, bao gồm cả lỗi sai chính tả, thiếu thông tin,... nếu có.",
    }
    "CanChinhSuaChiTiet": "TRƯỜNG NÀY LÀ 1 CHUỖI GỒM CÁC GẠCH ĐẦU DÒNG ĐƯỢC VIẾT BẰNG KIỂU MARKDOWN,
    Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,...:
        - Nếu cần chỉnh sửa thì ghi rõ Cần chỉnh sửa thành, Vì sao nên sửa, kèm ví dụ cụ thể nếu có.
        - Nếu không cần chỉnh sửa thì ghi rõ Không cần sửa.
        - Nếu thiếu sót trường nào thì ghi rõ Thiếu trường, Nên thêm trường, Vì sao nên thêm, kèm ví dụ cụ thể nếu có.",
    "CanThem": "Với mỗi mục trong CV như Họ tên, Ngày sinh, Địa chỉ, Email, Mục tiêu nghề nghiệp, Học vấn, Kỹ năng, Dự án,... gợi ý người dùng thêm vào CV. Trong trường này cũng viết kiểu markdown",
    "LuuY":" Liệt kê các gợi ý tổng quan để cải thiện CV. Trong trường này cũng viết kiểu markdown"
    }

#Các nhận xét trong "recommend" càng chi tiết càng tốt, nếu có thể thì ghi rõ cụ thể ví dụ cụ thể nếu có và bắt buộc phải là tiếng Việt.
**Bắt buộc phải tuân theo định dạng trên, chi tiết, rõ ràng, dễ đọc, Không được thay đổi định dạng tùy ý.**
**Không được nhận xét tên trường nguyên gốc, chỉ nhận xét tên trường đã được chuyển đổi sang tiếng Việt, ví dụ đối với Work_Experience thì nhận xét là Kinh nghiệm làm việc, không nhận xét là Work_Experience.**


##Yêu cầu:

- Kết hợp thông tin liên quan thành một chuỗi duy nhất cho mỗi nhãn trong "cvLabel".
- Phải tuân thủ kiểu dữ liệu của từng nhãn trong "cvLabel". yêu cầu object thì trả về object, yêu cầu string thì trả về string.
- Nếu không có dữ liệu nhãn, hãy để giá trị null
- Trường "review" không được bỏ sót bất kỳ kỹ năng nào.

- Trường "Rank" phải chỉ chứa một trong các giá trị sau: "Intern/Student", "Fresher/Entry level", "Experienced (non-manager)", "Manager", "Director and above".
- Trường "Industry" chỉ chứa 1 trong các giá trị sau: "Academic/Education", "Accounting/Auditing", "Administration/Office Support", "Agriculture/Livestock/Fishery", "Architecture/Construction", "Art, Media & Printing/Publishing", "Banking & Financial Services", "CEO & General Management", "Customer Service", "Design", "Engineering & Sciences", "Food and Beverage", "Government/NGO", "Healthcare/Medical Services", "Hospitality/Tourism", "Human Resources/Recruitment", "Information Technology/Telecommunications", "Insurance", "Legal", "Logistics/Import Export/Warehouse", "Manufacturing", "Marketing, Advertising/Communications", "Pharmacy", "Real Estate", "Retail/Consumer Products", "Sales", "Technician", "Textiles, Garments/Footwear", "Transportation", "Others".
- Chỉ trả về kết quả JSON và không thêm bất kỳ văn bản giải thích nào.

- Không tạo dữ liệu của riêng bạn, dữ liệu chỉ được lấy từ CV được cung cấp!

- dữ liệu đầu ra giữ nguyên ngôn ngữ của CV, trừ "review" là tiếng Anh Mỹ và "recommend" là tiếng Việt.

Định dạng mẫu đầu ra:
{
"cvLabel": {
    "Name": "Nguyen Van A",
    "DOB": "20/01/2000".
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
    "Projects":"programming map application at ABC Company with programming interface position using Reactjs, programming map application at ABCD Company with programming interface position using Nextjs.",
    "References": null
},
"review": "Candidate Nguyen Van A, born in 2000, living in Hanoi, graduated from university with an average score of 3.0, applying for the position of programmer, has 1 year of experience with reactjs, has worked working with reactjs, skilled in JavaScript, React, Node.js, Communication, Teamwork, experienced as a programmer at ABC company,...",
"recommend":
    { 
    "DanhGia":{
        "UuDiem": "Có kĩ năng về Reactjs, JavaScript, Node.js, Communication, Teamwork.",
        "NhuocDiem": "Thiếu thông tin về kinh nghiệm làm việc, thiếu thông tin về các dự án đã làm.",
    }
    "CanChinhSuaChiTiet": "- Cần chỉnh sửa thông tin về kinh nghiệm làm việc
    - thông tin về các dự án đã làm...",
    "CanThem": "- Cần thêm thông tin về kinh nghiệm làm việc
    - thông tin về các dự án đã làm...",
    "LuuY":" Cần cải thiện CV \n - cần thêm thông tin về kinh nghiệm làm việc, thông tin về các dự án đã làm."
    }

}`;

// Danh sách các model theo thứ tự ưu tiên
const modelName = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-8b"];

// Khởi tạo với model đầu tiên
let currentModelIndex = 0;
let model = genAI.getGenerativeModel({ model: modelName[currentModelIndex] });

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

        let attempts = 0;
        let maxAttempts = modelName.length;

        while (attempts < maxAttempts) {
            try {
                console.log(`Attempting with model: ${modelName[currentModelIndex]}`);

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

                console.log(`Success with model: ${modelName[currentModelIndex]}`);
                await fileManager.deleteFile(file.name);
                const jsonString = result.response
                    .text()
                    .replace(/```json|```/g, "")
                    .trim();
                return jsonString;
            } catch (error) {
                console.error(`Error with model ${modelName[currentModelIndex]}: ${error.message}`);
                attempts++;

                // Try next model if available
                if (attempts < maxAttempts) {
                    currentModelIndex = (currentModelIndex + 1) % modelName.length;
                    model = genAI.getGenerativeModel({
                        model: modelName[currentModelIndex],
                    });
                    console.log(`Switching to next model: ${modelName[currentModelIndex]}`);
                } else {
                    await fileManager.deleteFile(file.name);
                    throw new Error(`All models failed to respond. Please try again later.`);
                }
            }
        }
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

async function processWithGeminiText(profile) {
    try {
        let attempts = 0;
        let maxAttempts = modelName.length;

        while (attempts < maxAttempts) {
            try {
                console.log(`Attempting with model: ${modelName[currentModelIndex]}`);

                const chatSession = model.startChat({
                    generationConfig,
                    history: [],
                });

                const result = await chatSession.sendMessage(promptTEXT(profile));

                console.log(`Success with model: ${modelName[currentModelIndex]}`);
                const jsonString = result.response
                    .text()
                    .replace(/```json|```/g, "")
                    .trim();

                return jsonString;
            } catch (error) {
                console.error(`Error with model ${modelName[currentModelIndex]}: ${error.message}`);
                attempts++;

                // Try next model if available
                if (attempts < maxAttempts) {
                    currentModelIndex = (currentModelIndex + 1) % modelName.length;
                    model = genAI.getGenerativeModel({
                        model: modelName[currentModelIndex],
                    });
                    console.log(`Switching to next model: ${modelName[currentModelIndex]}`);
                } else {
                    throw new Error(`All models failed to respond. Please try again later.`);
                }
            }
        }
    } catch (error) {
        throw new Error(`Lỗi khi xử lý với Gemini: ${error.message}`);
    }
}

module.exports = { processWithGemini, processWithGeminiText };

const User = require("../models/user.model");
const { Job } = require("../models/job.model");
const { processWithGemini, processWithGeminiText } = require("../lib/geminiProcessor");
const cloudinary = require("cloudinary").v2;
const { auth } = require("../config/firebase");
const fs = require("node:fs");
const { jsonrepair } = require("jsonrepair");

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params; // Lấy id từ URL
        const isOtherId = req.query.isOtherId === "true"; // Lấy từ query parameter và chuyển thành boolean

        const userRecord = await auth.getUser(id);
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        if (isOtherId) {
            return res.status(200).json({
                success: true,
                user: {
                    profile: {
                        Address: user.userData?.profile?.Address,
                        Years_of_experience: user.userData?.profile?.Years_of_experience,
                        University: user.userData?.profile?.University,
                        Skills: user.userData?.profile?.Skills,
                    },
                },
                userRecord: {
                    uid: userRecord.uid,
                    email: userRecord.email,
                    displayName: userRecord.displayName,
                    photoURL: userRecord.photoURL,
                },
            });
        }
        return res.status(200).json({
            success: true,
            user,
            userRecord,
        });
    } catch (error) {
        console.error("Lỗi khi lấy user:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { _id, userData, uid } = req.body;
        const newUser = new User({ _id, userData, uid: uid });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { uid } = req.params; // Sử dụng uid thay vì userId
        console.log("uid:", uid);

        const updateData = req.body; // Lấy dữ liệu từ request body

        // Kiểm tra nếu user tồn tại
        let user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({ message: `Không tìm thấy User với uid: ${uid}` });
        }
        const processedText = await processWithGeminiText(updateData?.profile);
        const jsonString = jsonrepair(processedText);
        const parseData = JSON.parse(jsonString);

        const existingUserData = user.userData || {};
        const updatedUserData = {
            ...existingUserData,
            ...updateData,
            profile: {
                ...(existingUserData.profile || {}),
                ...(updateData.profile || {}),
            },
            review: parseData.cvLabel.review,
            recommend: parseData.cvLabel.recommend,
        };

        // Cập nhật thông tin user (chỉ cập nhật userData)
        user = await User.findOneAndUpdate({ uid }, { $set: { userData: updatedUserData } }, { new: true });

        res.status(200).json({
            success: true,
            message: "Cập nhật dữ liệu thành công!",
            user,
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật user:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

exports.uploadPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Vui lòng tải lên file PDF!" });
        }

        const { uid } = req.body; // Sử dụng uid thay vì userId
        if (!uid) {
            return res.status(400).json({ message: "Vui lòng cung cấp uid!" });
        }

        // Kiểm tra xem user có tồn tại không
        const existingUser = await User.findOne({ uid });
        if (!existingUser) {
            return res.status(404).json({ message: `Không tìm thấy User với uid: ${uid}` });
        }

        // Tải file lên Cloudinary
        if (existingUser.userData.PDF_CV_URL) {
            // Lấy public_id từ URL
            const urlParts = existingUser.userData.PDF_CV_URL.split("/");
            const fileName = urlParts[urlParts.length - 1];
            const publicId = `cv_uploads/${uid}/${fileName}`; // public_id = folder + fileName
            console.log(publicId);

            await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }, (error, result) => {
                if (error) {
                    console.error("Lỗi khi Delete CV cũ:", error);
                } else {
                    console.log("Delete CV cũ thành công:", result);
                }
            });
        }

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream({ resource_type: "raw", folder: `cv_uploads/${uid}`, format: "pdf" }, (error, result) => {
                    if (error) reject(error);
                    resolve(result);
                })
                .end(req.file.buffer);
        });
        console.log(result);

        // Xử lý Comment PDF bằng Gemini
        const processedText = await processWithGemini(req.file.buffer, "application/pdf", req.file.originalname);
        const jsonString = jsonrepair(processedText);
        const parseData = JSON.parse(jsonString);

        const updateData = {
            profile: {
                Name: parseData.cvLabel.Name,
                DOB: parseData.cvLabel.DOB,
                Phone_Number: parseData.cvLabel.Phone_number,
                Address: parseData.cvLabel.Address,
                Email: parseData.cvLabel.Email,
                LinkedInPortfolio: parseData.cvLabel.LinkedInPortfolio,
                Career_objective: parseData.cvLabel.Career_objective,
                University: parseData.cvLabel.University,
                Major: parseData.cvLabel.Major,
                GPA: parseData.cvLabel.GPA,
                Graduated_year: parseData.cvLabel.Graduated_year,
                Achievements_awards: parseData.cvLabel.Achievements_awards,
                Extracurricular_activities: parseData.cvLabel.Extracurricular_activities,
                Interests: parseData.cvLabel.Interests,
                Job_position: parseData.cvLabel.Job_position,
                Rank: parseData.cvLabel.Rank,
                Industry: parseData.cvLabel.Industry,
                Work_Experience: parseData.cvLabel.Work_Experience,
                Years_of_experience: parseData.cvLabel.Years_of_experience,
                Projects: parseData.cvLabel.Projects,
                Skills: parseData.cvLabel.Skills,
                References: parseData.cvLabel.References,
            },
            review: parseData.review,
            recommend: parseData.recommend,
            PDF_CV_URL: result.secure_url,
        };

        // Gọi hàm updateUser để cập nhật
        req.params = { uid }; // Gán uid vào req.params để updateUser sử dụng
        req.body = updateData; // Gán dữ liệu cần cập nhật vào req.body
        await exports.updateUser(req, res); // Gọi hàm updateUser
    } catch (error) {
        res.status(500).json({ message: `Lỗi khi xử lý PDF: ${error.message}` });
    }
};

// Xử lý văn bản tự nhập
exports.uploadText = async (req, res) => {
    try {
        const { text, uid } = req.body; // Sử dụng uid thay vì userId
        if (!text || !uid) {
            return res.status(400).json({ message: "Vui lòng nhập văn bản và uid!" });
        }

        // Kiểm tra xem user có tồn tại không
        const existingUser = await User.findOne({ uid });
        if (!existingUser) {
            return res.status(404).json({ message: `Không tìm thấy User với uid: ${uid}` });
        }

        // Tạo file tạm từ văn bản để xử lý với Gemini
        const tempFilePath = `temp_${Date.now()}.txt`;
        fs.writeFileSync(tempFilePath, text);

        // Xử lý văn bản bằng Gemini
        const processedText = await processWithGemini(fs.readFileSync(tempFilePath), "text/plain", "user_input.txt");

        // Delete file tạm
        fs.unlinkSync(tempFilePath);

        // Dữ liệu cần cập nhật (chỉ cập nhật userData)
        const updateData = {
            userData: {
                textData: processedText,
                PDF_CV_URL: existingUser.userData.PDF_CV_URL || "", // Giữ nguyên PDF_CV_URL nếu có
            },
        };

        // Gọi hàm updateUser để cập nhật
        req.params = { uid }; // Gán uid vào req.params để updateUser sử dụng
        req.body = updateData; // Gán dữ liệu cần cập nhật vào req.body
        await exports.updateUser(req, res); // Gọi hàm updateUser
    } catch (error) {
        res.status(500).json({ message: `Lỗi khi xử lý văn bản: ${error.message}` });
    }
};

exports.saveJob = async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User không tồn tại" });

        if (user.savedJobs.includes(jobId)) {
            return res.status(400).json({ message: "Đã lưu job này rồi" });
        }

        await User.findByIdAndUpdate(userId, {
            $addToSet: { savedJobs: jobId },
        });

        res.status(200).json({ success: true, message: "Lưu job thành công" });
    } catch (err) {
        console.error("saveJob error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

exports.unsaveJob = async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        const user = await User.findById(userId);
        if (!user || !user.savedJobs.includes(jobId)) {
            return res.status(404).json({ message: "Job chưa được lưu" });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { savedJobs: jobId },
        });

        res.status(200).json({ success: true, message: "Bỏ lưu job thành công" });
    } catch (err) {
        console.error("unsaveJob error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

exports.getSavedJobs = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        const user = await User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User không tồn tại" });
        }

        const totalJobs = user.savedJobs.length;
        const totalPages = Math.ceil(totalJobs / perPage);

        // Lấy danh sách jobId theo thứ tự lưu
        const saved = [...user.savedJobs].reverse();
        const paginatedJobIds = saved.slice(skip, skip + perPage).map((id) => id.toString());

        // Lấy job chi tiết
        const jobsMap = await Job.find({ _id: { $in: paginatedJobIds } }).lean();
        const jobMapById = {};
        jobsMap.forEach((job) => {
            jobMapById[job._id.toString()] = job;
        });

        // Giữ đúng thứ tự ban đầu
        const jobs = paginatedJobIds.map((id) => jobMapById[id]).filter(Boolean);

        res.json({
            success: true,
            data: jobs,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalJobs: totalJobs,
            },
        });
    } catch (error) {
        console.error("getSavedJobs error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

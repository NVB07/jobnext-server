const User = require("../models/user.model");
const { processWithGemini } = require("../lib/geminiProcessor");
const cloudinary = require("cloudinary").v2;
const fs = require("node:fs");
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

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        res.status(200).json(user);
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

// exports.updateUser = async (req, res) => {
//     try {
//         const { userId } = req.params; // Lấy userId từ URL (hoặc có thể từ req.body)
//         const updateData = req.body; // Lấy dữ liệu từ request body

//         // Kiểm tra nếu user tồn tại
//         let user = await User.findOne({ userId });
//         if (!user) {
//             return res.status(404).json({ message: `Không tìm thấy người dùng với userId: ${userId}` });
//         }

//         // Cập nhật thông tin user
//         user = await User.findOneAndUpdate({ userId }, updateData, { new: true });

//         res.status(200).json({
//             message: "Cập nhật user thành công!",
//             user,
//         });
//     } catch (error) {
//         console.error("Lỗi khi cập nhật user:", error);
//         res.status(500).json({ message: "Lỗi server!" });
//     }
// };
exports.updateUser = async (req, res) => {
    try {
        const { uid } = req.params; // Sử dụng uid thay vì userId
        const updateData = req.body; // Lấy dữ liệu từ request body

        // Kiểm tra nếu user tồn tại
        let user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({ message: `Không tìm thấy người dùng với uid: ${uid}` });
        }

        // Cập nhật thông tin user (chỉ cập nhật userData)
        user = await User.findOneAndUpdate(
            { uid },
            { $set: { userData: updateData.userData } }, // Chỉ cập nhật userData
            { new: true }
        );

        res.status(200).json({
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
            return res.status(404).json({ message: `Không tìm thấy người dùng với uid: ${uid}` });
        }

        // Tải file lên Cloudinary
        if (existingUser.userData.cloudinaryUrl) {
            // Lấy public_id từ URL
            const urlParts = existingUser.userData.cloudinaryUrl.split("/");
            const fileName = urlParts[urlParts.length - 1];
            const publicId = `cv_uploads/${uid}/${fileName}`; // public_id = folder + fileName
            console.log(publicId);

            await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }, (error, result) => {
                if (error) {
                    console.error("Lỗi khi xóa CV cũ:", error);
                } else {
                    console.log("Xóa CV cũ thành công:", result);
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

        // Xử lý nội dung PDF bằng Gemini
        const processedText = await processWithGemini(req.file.buffer, "application/pdf", req.file.originalname);

        // Dữ liệu cần cập nhật (chỉ cập nhật userData)
        const updateData = {
            userData: {
                textData: processedText,
                cloudinaryUrl: result.secure_url,
            },
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
            return res.status(404).json({ message: `Không tìm thấy người dùng với uid: ${uid}` });
        }

        // Tạo file tạm từ văn bản để xử lý với Gemini
        const tempFilePath = `temp_${Date.now()}.txt`;
        fs.writeFileSync(tempFilePath, text);

        // Xử lý văn bản bằng Gemini
        const processedText = await processWithGemini(fs.readFileSync(tempFilePath), "text/plain", "user_input.txt");

        // Xóa file tạm
        fs.unlinkSync(tempFilePath);

        // Dữ liệu cần cập nhật (chỉ cập nhật userData)
        const updateData = {
            userData: {
                textData: processedText,
                cloudinaryUrl: existingUser.userData.cloudinaryUrl || "", // Giữ nguyên cloudinaryUrl nếu có
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

const User = require("../models/user.model");

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
        const { _id, displayName, photoURL, email, emailVerified, uid } = req.body;
        const newUser = new User({ _id, displayName, photoURL, email, emailVerified, uid: uid });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID từ URL
        const updateData = req.body; // Lấy dữ liệu từ request body

        // Kiểm tra nếu user tồn tại
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại!" });
        }

        // Cập nhật thông tin user
        user = await User.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({
            message: "Cập nhật user thành công!",
            user,
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật user:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

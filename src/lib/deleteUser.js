const User = require("../models/user.model");
const { auth } = require("../config/firebase"); // Firebase Admin SDK

const deleteUnverifiedUsers = async () => {
    const expiredTime = Date.now() - 15 * 60 * 1000; // 5 phút trước

    // Lấy danh sách user trong MongoDB đã tạo quá 5 phút
    const users = await User.find({ createdAt: { $lte: expiredTime } });

    for (const user of users) {
        try {
            // Lấy trạng thái user từ Firebase Authentication
            const firebaseUser = await auth.getUser(user.uid);

            if (!firebaseUser.emailVerified) {
                // Xóa trên Firebase Auth
                await auth.deleteUser(user.uid);
                console.log(`✅ Đã xóa user Firebase: ${user.uid}`);

                // Xóa trên MongoDB
                await User.deleteOne({ _id: user._id });
                console.log(`✅ Đã xóa user MongoDB: ${user._id}`);
            }
        } catch (error) {
            console.error(`❌ Lỗi khi xử lý user ${user.uid}:`, error);
        }
    }

    console.log(`🔹 Đã xử lý xong user chưa xác minh.`);
};

module.exports = { deleteUnverifiedUsers };

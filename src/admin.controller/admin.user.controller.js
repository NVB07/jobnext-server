const User = require("../models/user.model");
const { Job } = require("../models/job.model");
const Cv = require("../models/cv.model");
const { processWithGemini, processWithGeminiText } = require("../lib/geminiProcessor");
const cloudinary = require("cloudinary").v2;
const { auth } = require("../config/firebase");
const fs = require("node:fs");
const { jsonrepair } = require("jsonrepair");

// Lấy danh sách tất cả users với thông tin đầy đủ
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        // Lấy users từ Firebase Admin
        const listUsersResult = await auth.listUsers();
        const firebaseUsers = listUsersResult.users;

        // Lấy thông tin từ database và kết hợp với Firebase data
        const usersWithData = await Promise.all(
            firebaseUsers.map(async (firebaseUser) => {
                try {
                    const dbUser = await User.findOne({
                        $or: [{ uid: firebaseUser.uid }, { _id: firebaseUser.uid }],
                    }).lean();

                    return {
                        ...dbUser,
                        firebaseData: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            emailVerified: firebaseUser.emailVerified,
                            disabled: firebaseUser.disabled,
                            creationTime: firebaseUser.metadata.creationTime,
                            lastSignInTime: firebaseUser.metadata.lastSignInTime,
                        },
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy thông tin DB cho user ${firebaseUser.uid}:`, error.message);
                    return {
                        firebaseData: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            emailVerified: firebaseUser.emailVerified,
                            disabled: firebaseUser.disabled,
                            creationTime: firebaseUser.metadata.creationTime,
                            lastSignInTime: firebaseUser.metadata.lastSignInTime,
                        },
                    };
                }
            })
        );

        const totalUsers = usersWithData.length;
        const totalPages = Math.ceil(totalUsers / perPage);

        // Apply pagination
        const paginatedUsers = usersWithData.slice(skip, skip + perPage);

        res.status(200).json({
            success: true,
            data: paginatedUsers,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalUsers: totalUsers,
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách users:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Lấy thông tin chi tiết một user
exports.getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user",
            });
        }

        // Lấy thông tin từ Firebase
        let firebaseData = null;
        try {
            const userRecord = await auth.getUser(user.uid || user._id);
            firebaseData = {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled,
                creationTime: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                customClaims: userRecord.customClaims,
                providerData: userRecord.providerData,
            };
        } catch (error) {
            console.error(`Không thể lấy thông tin Firebase cho user ${id}:`, error.message);
        }

        // Lấy thông tin saved jobs nếu có
        let savedJobsDetails = [];
        if (user.savedJobs && user.savedJobs.length > 0) {
            try {
                savedJobsDetails = await Job.find({
                    _id: { $in: user.savedJobs },
                }).lean();
            } catch (error) {
                console.error("Lỗi khi lấy saved jobs:", error.message);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                user,
                firebaseData,
                savedJobsDetails,
                stats: {
                    totalSavedJobs: user.savedJobs ? user.savedJobs.length : 0,
                    hasProfile: !!(user.userData && user.userData.profile),
                    hasPDF: !!(user.userData && user.userData.PDF_CV_URL),
                    hasReview: !!(user.userData && user.userData.review),
                },
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin user:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Lấy thống kê tổng quan về users
exports.getUserStats = async (req, res) => {
    try {
        // Lấy tổng số users từ Firebase Admin
        const listUsersResult = await auth.listUsers();
        const totalUsers = listUsersResult.users.length;

        const usersWithProfile = await User.countDocuments({
            "userData.profile": { $exists: true, $ne: null },
        });
        const usersWithPDF = await User.countDocuments({
            "userData.PDF_CV_URL": { $exists: true, $ne: "" },
        });
        const usersWithSavedJobs = await User.countDocuments({
            savedJobs: { $exists: true, $not: { $size: 0 } },
        });

        // Thống kê theo ngày tạo (30 ngày gần nhất) - từ Firebase
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentUsers = listUsersResult.users.filter((user) => {
            const creationTime = new Date(user.metadata.creationTime);
            return creationTime >= thirtyDaysAgo;
        }).length;

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                usersWithProfile,
                usersWithPDF,
                usersWithSavedJobs,
                recentUsers,
                profileCompletionRate: totalUsers > 0 ? ((usersWithProfile / totalUsers) * 100).toFixed(2) : 0,
                pdfUploadRate: totalUsers > 0 ? ((usersWithPDF / totalUsers) * 100).toFixed(2) : 0,
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy thống kê users:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Tìm kiếm users sử dụng Firebase Admin
exports.searchUsers = async (req, res) => {
    try {
        const { search, page = 1, perPage = 20 } = req.query;

        // Lấy tất cả users từ Firebase Admin
        const listUsersResult = await auth.listUsers();
        const firebaseUsers = listUsersResult.users;

        // Tìm kiếm trong Firebase data trước
        let filteredFirebaseUsers = firebaseUsers;

        if (search) {
            const searchLower = search.toLowerCase();
            filteredFirebaseUsers = firebaseUsers.filter((firebaseUser) => {
                const firebaseName = firebaseUser.displayName || "";
                const firebaseEmail = firebaseUser.email || "";

                return firebaseName.toLowerCase().includes(searchLower) || firebaseEmail.toLowerCase().includes(searchLower);
            });
        }

        // Lấy thông tin từ database cho các users và tìm kiếm thêm trong DB data
        const usersWithData = await Promise.all(
            filteredFirebaseUsers.map(async (firebaseUser) => {
                try {
                    const dbUser = await User.findOne({
                        $or: [{ uid: firebaseUser.uid }, { _id: firebaseUser.uid }],
                    }).lean();

                    return {
                        ...dbUser,
                        firebaseData: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            emailVerified: firebaseUser.emailVerified,
                            disabled: firebaseUser.disabled,
                            creationTime: firebaseUser.metadata.creationTime,
                            lastSignInTime: firebaseUser.metadata.lastSignInTime,
                        },
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy thông tin DB cho user ${firebaseUser.uid}:`, error.message);
                    return {
                        firebaseData: {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            emailVerified: firebaseUser.emailVerified,
                            disabled: firebaseUser.disabled,
                            creationTime: firebaseUser.metadata.creationTime,
                            lastSignInTime: firebaseUser.metadata.lastSignInTime,
                        },
                    };
                }
            })
        );

        // Nếu có search term, tìm kiếm thêm trong database data
        let finalFilteredUsers = usersWithData;
        if (search) {
            const searchLower = search.toLowerCase();

            // Lấy thêm users từ database có thể match search term
            const dbSearchResults = await User.find({
                $or: [{ "userData.profile.Name": { $regex: search, $options: "i" } }, { "userData.profile.Email": { $regex: search, $options: "i" } }],
            }).lean();

            // Kết hợp Firebase search results với DB search results
            const combinedResults = [...usersWithData];

            for (const dbUser of dbSearchResults) {
                // Kiểm tra xem user này đã có trong Firebase results chưa
                const existsInFirebase = combinedResults.some((u) => u.firebaseData?.uid === dbUser.uid || u._id?.toString() === dbUser._id?.toString());

                if (!existsInFirebase) {
                    // Thêm user từ DB, cố gắng lấy Firebase data
                    try {
                        const firebaseUser = await auth.getUser(dbUser.uid || dbUser._id);
                        combinedResults.push({
                            ...dbUser,
                            firebaseData: {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                displayName: firebaseUser.displayName,
                                photoURL: firebaseUser.photoURL,
                                emailVerified: firebaseUser.emailVerified,
                                disabled: firebaseUser.disabled,
                                creationTime: firebaseUser.metadata.creationTime,
                                lastSignInTime: firebaseUser.metadata.lastSignInTime,
                            },
                        });
                    } catch (error) {
                        // Nếu không lấy được Firebase data, vẫn thêm DB data
                        combinedResults.push({
                            ...dbUser,
                            firebaseData: null,
                        });
                    }
                }
            }

            finalFilteredUsers = combinedResults;
        }

        const totalUsers = finalFilteredUsers.length;
        const totalPages = Math.ceil(totalUsers / perPage);
        const skip = (page - 1) * perPage;

        // Apply pagination to filtered results
        const paginatedUsers = finalFilteredUsers.slice(skip, skip + perPage);

        res.status(200).json({
            success: true,
            data: paginatedUsers,
            pagination: {
                currentPage: parseInt(page),
                perPage: parseInt(perPage),
                totalPages: totalPages,
                totalUsers: totalUsers,
            },
            searchQuery: {
                search,
            },
        });
    } catch (error) {
        console.error("Lỗi khi tìm kiếm users:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Xóa người dùng hoàn toàn
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // id có thể là _id hoặc uid

        // Tìm user trong database
        const user = await User.findOne({
            $or: [{ _id: id }, { uid: id }],
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user trong database",
            });
        }

        const uid = user.uid || user._id;

        // 1. Xóa tất cả CV của user
        try {
            const deletedCvs = await Cv.deleteMany({ uid: uid });
            console.log(`Đã xóa ${deletedCvs.deletedCount} CV của user ${uid}`);
        } catch (error) {
            console.error("Lỗi khi xóa CV:", error.message);
            // Không return lỗi, tiếp tục xóa các phần khác
        }

        // 2. Xóa user khỏi database
        try {
            await User.findByIdAndDelete(user._id);
            console.log(`Đã xóa user ${user._id} khỏi database`);
        } catch (error) {
            console.error("Lỗi khi xóa user khỏi database:", error.message);
            return res.status(500).json({
                success: false,
                message: "Lỗi khi xóa user khỏi database",
                error: error.message,
            });
        }

        // 3. Xóa tài khoản Firebase
        try {
            await auth.deleteUser(uid);
            console.log(`Đã xóa tài khoản Firebase ${uid}`);
        } catch (error) {
            console.error("Lỗi khi xóa tài khoản Firebase:", error.message);
            // Nếu user đã bị xóa khỏi DB nhưng Firebase fail, vẫn báo thành công
            // vì dữ liệu chính đã được xóa
            return res.status(200).json({
                success: true,
                message: "Đã xóa user khỏi database và CV, nhưng không thể xóa tài khoản Firebase",
                warning: "Tài khoản Firebase có thể vẫn tồn tại",
            });
        }

        res.status(200).json({
            success: true,
            message: "Đã xóa user hoàn toàn khỏi hệ thống",
            details: {
                deletedFromDatabase: true,
                deletedFromFirebase: true,
                deletedCvs: true,
            },
        });
    } catch (error) {
        console.error("Lỗi khi xóa user:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa user",
            error: error.message,
        });
    }
};

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Admin login
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email và mật khẩu là bắt buộc",
            });
        }

        // Get admin credentials from environment
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@jobnext.com";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
        const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

        // Check credentials
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng",
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                email: ADMIN_EMAIL,
                role: "admin",
                loginTime: new Date(),
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        console.log(`✅ Admin đăng nhập thành công: ${email}`);

        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: {
                token,
                admin: {
                    email: ADMIN_EMAIL,
                    role: "admin",
                },
            },
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Admin logout (optional - mainly for clearing client-side token)
exports.adminLogout = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Đăng xuất thành công",
        });
    } catch (error) {
        console.error("Admin logout error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message,
        });
    }
};

// Verify admin token
exports.verifyAdminToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token không được cung cấp",
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
        const decoded = jwt.verify(token, JWT_SECRET);

        res.status(200).json({
            success: true,
            message: "Token hợp lệ",
            data: {
                admin: {
                    email: decoded.email,
                    role: decoded.role,
                },
            },
        });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({
            success: false,
            message: "Token không hợp lệ",
        });
    }
};

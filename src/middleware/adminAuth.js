const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Token không được cung cấp hoặc không đúng định dạng",
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user is admin
        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập",
            });
        }

        // Add admin info to request object
        req.admin = {
            email: decoded.email,
            role: decoded.role,
            loginTime: decoded.loginTime,
        };

        next();
    } catch (error) {
        console.error("Admin auth middleware error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token đã hết hạn",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Lỗi xác thực",
        });
    }
};

module.exports = adminAuth;

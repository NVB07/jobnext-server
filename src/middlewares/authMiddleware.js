const { auth } = require("../config/firebase"); // ✅ đúng với export của mày

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) return res.status(401).json({ message: "Thiếu token" });

    try {
        const decoded = await auth.verifyIdToken(token);
        req.user = { uid: decoded.uid }; // 🔐 gán uid vào req.user
        next();
    } catch (err) {
        res.status(401).json({ message: "Token không hợp lệ", error: err.message });
    }
};

module.exports = authMiddleware;

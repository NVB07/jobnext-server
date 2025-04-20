const multer = require("multer");

// Cấu hình multer để lưu file vào bộ nhớ (memory storage)
const storage = multer.memoryStorage();

// Giới hạn kích thước file (ví dụ: tối đa 5MB) và lọc loại file
const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận các định dạng ảnh
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)!"), false);
    }
};

// Cấu hình multer
const imageUpload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Giới hạn 5MB
    },
    fileFilter: fileFilter,
});

module.exports = imageUpload;

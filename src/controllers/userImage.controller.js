const UserImage = require("../models/userImage.model");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const sharp = require("sharp");

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer để xử lý file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Chỉ cho phép upload file ảnh!"), false);
        }
    },
});

// Lấy tất cả ảnh của user theo UID
exports.getUserImages = async (req, res) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: "UID là bắt buộc",
            });
        }

        const images = await UserImage.find({
            uid,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: images,
            count: images.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// Upload ảnh lên Cloudinary và lưu thông tin vào DB
exports.uploadImage = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: "UID là bắt buộc",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file ảnh để upload",
            });
        }

        // Resize ảnh để tối ưu dung lượng
        const resizedImageBuffer = await sharp(req.file.buffer)
            .resize(1200, 1200, {
                fit: "inside",
                withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Upload lên Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        resource_type: "image",
                        folder: `cv-images/${uid}`, // Tổ chức theo UID
                        transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                )
                .end(resizedImageBuffer);
        });

        // Lưu thông tin ảnh vào database
        const newImage = new UserImage({
            uid,
            fileName: req.file.originalname,
            cloudinaryUrl: uploadResult.secure_url,
            cloudinaryPublicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
            fileSize: resizedImageBuffer.length,
            mimeType: req.file.mimetype,
        });

        await newImage.save();

        res.status(201).json({
            success: true,
            data: newImage,
            message: "Upload ảnh thành công",
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// Xóa ảnh (soft delete)
exports.deleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: "UID là bắt buộc",
            });
        }

        // Tìm ảnh và kiểm tra quyền sở hữu
        const image = await UserImage.findOne({
            _id: id,
            uid,
            isActive: true,
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy ảnh hoặc bạn không có quyền xóa ảnh này",
            });
        }

        // Soft delete
        image.isActive = false;
        await image.save();

        // Tùy chọn: Xóa khỏi Cloudinary (uncomment nếu muốn xóa hẳn)
        // await cloudinary.uploader.destroy(image.cloudinaryPublicId);

        res.json({
            success: true,
            message: "Xóa ảnh thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// Hard delete ảnh và xóa khỏi Cloudinary
exports.permanentDeleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: "UID là bắt buộc",
            });
        }

        // Tìm ảnh và kiểm tra quyền sở hữu
        const image = await UserImage.findOne({ _id: id, uid });

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy ảnh hoặc bạn không có quyền xóa ảnh này",
            });
        }

        // Xóa khỏi Cloudinary
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);

        // Xóa khỏi database
        await UserImage.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Xóa ảnh vĩnh viễn thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// Middleware export cho multer
exports.uploadMiddleware = upload.single("image");

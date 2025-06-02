const Blog = require("../models/blog.model");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { v4: uuidv4 } = require("uuid");

// Get all blogs with pagination for admin
exports.getAllBlogs = async (req, res) => {
    try {
        // Lấy tham số page và perPage từ query string, mặc định là 1 và 10
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const search = req.query.search || "";

        // Tính số bài cần bỏ qua
        const skip = (page - 1) * perPage;

        // Tạo điều kiện tìm kiếm
        let searchCondition = {};
        if (search) {
            searchCondition = {
                $or: [{ title: { $regex: search, $options: "i" } }, { tags: { $regex: search, $options: "i" } }],
            };
        }

        // Lấy tổng số bài viết
        const totalBlogs = await Blog.countDocuments(searchCondition);

        // Truy vấn blogs với phân trang và sắp xếp theo createdAt giảm dần
        const blogs = await Blog.find(searchCondition)
            .sort({ createdAt: -1 }) // Mới nhất trước
            .skip(skip) // Bỏ qua các bài của trang trước
            .limit(perPage); // Giới hạn số bài mỗi trang

        // Tính tổng số trang
        const totalPages = Math.ceil(totalBlogs / perPage);

        // Trả về response với dữ liệu phân trang
        res.json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                perPage: perPage,
                totalPages: totalPages,
                totalBlogs: totalBlogs,
            },
        });
    } catch (error) {
        console.error("Admin get all blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách blog",
            error: error.message,
        });
    }
};

// Get blog by ID for admin
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy blog, có thể blog này đã bị xóa!",
            });
        }

        res.status(200).json({
            success: true,
            data: blog,
        });
    } catch (error) {
        console.error("Admin get blog by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin blog",
            error: error.message,
        });
    }
};

// Create blog by admin
exports.createBlog = async (req, res) => {
    try {
        const { authorUid, content, title, tags, savedBy } = req.body;

        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề và nội dung không được để trống",
            });
        }

        const newBlog = new Blog({
            authorUid,
            content,
            title,
            tags: tags || [],
            savedBy: savedBy || [],
        });

        await newBlog.save();

        return res.status(201).json({
            success: true,
            message: "Tạo blog thành công",
            data: newBlog,
        });
    } catch (error) {
        console.error("Admin create blog error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi tạo blog",
            error: error.message,
        });
    }
};

// Upload image for blog content
exports.createImageURL = async (req, res) => {
    try {
        const file = req.file; // File được multer xử lý
        if (!file) {
            return res.status(400).json({
                success: false,
                error: "Không có file được gửi!",
            });
        }

        // Tạo mã định danh duy nhất
        const uniqueId = uuidv4().slice(0, 8);
        const originalName = file.originalname.split(".")[0];
        const publicId = `admin_blogs/${originalName}_${uniqueId}`;

        // Hàm stream upload lên Cloudinary
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        public_id: publicId,
                        folder: "admin_blogs",
                        resource_type: "auto",
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(buffer).pipe(stream);
            });
        };

        const result = await streamUpload(file.buffer);

        res.status(200).json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        console.error("Admin upload image error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi tải ảnh lên",
            error: error.message,
        });
    }
};

// Update blog by admin
exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra nếu blog tồn tại
        let blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog không tồn tại!",
            });
        }

        // Validate required fields if they're being updated
        if (updateData.title && updateData.title.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề không được để trống",
            });
        }

        if (updateData.content && updateData.content.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Nội dung không được để trống",
            });
        }

        // Add updatedAt field
        updateData.updatedAt = new Date();

        // Cập nhật thông tin blog
        blog = await Blog.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: "Cập nhật blog thành công!",
            data: blog,
        });
    } catch (error) {
        console.error("Admin update blog error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật blog!",
            error: error.message,
        });
    }
};

// Delete blog by admin
exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm và xóa blog
        const blog = await Blog.findByIdAndDelete(id);

        // Kiểm tra xem blog có tồn tại không
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy blog để xóa!",
            });
        }

        // TODO: Xóa các ảnh liên quan trên Cloudinary nếu cần
        // Có thể parse content để tìm các URL ảnh và xóa chúng

        // Trả về phản hồi thành công
        res.status(200).json({
            success: true,
            message: "Xóa blog thành công!",
            data: blog,
        });
    } catch (error) {
        console.error("Admin delete blog error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa blog",
            error: error.message,
        });
    }
};

// Get blog statistics for admin dashboard
exports.getBlogStats = async (req, res) => {
    try {
        const totalBlogs = await Blog.countDocuments();
        const recentBlogs = await Blog.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        });

        // Thống kê theo tác giả
        const authorStats = await Blog.aggregate([
            {
                $group: {
                    _id: "$authorUid",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        // Thống kê theo tags
        const tagStats = await Blog.aggregate([
            { $unwind: "$tags" },
            {
                $group: {
                    _id: "$tags",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalBlogs,
                recentBlogs,
                authorStats,
                tagStats,
            },
        });
    } catch (error) {
        console.error("Admin get blog stats error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thống kê blog",
            error: error.message,
        });
    }
};

// Bulk delete blogs
exports.bulkDeleteBlogs = async (req, res) => {
    try {
        const { blogIds } = req.body;

        if (!blogIds || !Array.isArray(blogIds) || blogIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Danh sách ID blog không hợp lệ",
            });
        }

        const result = await Blog.deleteMany({
            _id: { $in: blogIds },
        });

        res.status(200).json({
            success: true,
            message: `Đã xóa ${result.deletedCount} blog thành công`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("Admin bulk delete blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa nhiều blog",
            error: error.message,
        });
    }
};

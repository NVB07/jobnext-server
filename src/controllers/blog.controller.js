const Blog = require("../models/blog.model");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { v4: uuidv4 } = require("uuid");

exports.getAllBlog = async (req, res) => {
    try {
        // Lấy tham số page và perPage từ query string, mặc định là 1 và 10
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;

        // Tính số bài cần bỏ qua
        const skip = (page - 1) * perPage;

        // Lấy tổng số bài viết
        const totalBlogs = await Blog.countDocuments();

        // Truy vấn blogs với phân trang và sắp xếp theo createdAt giảm dần
        const blogs = await Blog.find()
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
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params; // Lấy id từ URL

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Không tìm thấy blog, có thể blog này đã bị xóa !" });
        }

        res.status(200).json(blog);
    } catch (error) {
        console.error("Lỗi khi lấy blog:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

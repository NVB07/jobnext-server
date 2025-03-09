const Blog = require("../models/blog.model");

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

exports.createBlog = async (req, res) => {
    try {
        const { authorUid, content, title, tags, savedBy } = req.body;
        const newBlog = new Blog({ authorUid, content, title, tags, savedBy });
        await newBlog.save();
        res.status(201).json(newBlog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID từ URL
        const updateData = req.body; // Lấy dữ liệu từ request body

        // Kiểm tra nếu user tồn tại
        let blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "blog không tồn tại!" });
        }

        // Cập nhật thông tin user
        blog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({
            message: "Cập nhật user thành công!",
            blog,
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật blog:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID từ URL

        // Tìm và xóa blog
        const blog = await Blog.findByIdAndDelete(id);

        // Kiểm tra xem blog có tồn tại không
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy blog để xóa!",
            });
        }

        // Trả về phản hồi thành công
        res.status(200).json({
            success: true,
            message: "Xóa blog thành công!",
            deletedBlog: blog,
        });
    } catch (error) {
        console.error("Lỗi khi xóa blog:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa blog",
            error: error.message,
        });
    }
};

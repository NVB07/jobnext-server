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

exports.createBlog = async (req, res) => {
    try {
        const { authorUid, content, title, tags, savedBy } = req.body;
        const newBlog = new Blog({ authorUid, content, title, tags, savedBy });
        await newBlog.save();
        return res.status(200).json({
            success: true,
            data: newBlog,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createImageURL = async (req, res) => {
    try {
        const file = req.file; // File được multer xử lý
        if (!file) {
            return res.status(400).json({ error: "Không có file được gửi!" });
        }

        // Tạo mã định danh duy nhất
        const uniqueId = uuidv4().slice(0, 8);
        const originalName = file.originalname.split(".")[0];
        const publicId = `blogs/${originalName}_${uniqueId}`;

        // Hàm stream upload lên Cloudinary
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ public_id: publicId, folder: "blogs" }, (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                });
                streamifier.createReadStream(buffer).pipe(stream);
            });
        };

        const result = await streamUpload(file.buffer);
        res.status(200).json({ url: result.secure_url });
    } catch (error) {
        console.error("Lỗi khi tải ảnh:", error);
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
exports.saveBlog = async (req, res) => {
    try {
        const { blogId, userId } = req.body;

        const blog = await Blog.findOne({ _id: blogId });
        if (!blog) {
            return res.status(404).json({ success: false, message: "Không tìm thấy blog" });
        }

        // Nếu đã lưu rồi thì báo lỗi
        if (blog.savedBy.includes(userId)) {
            return res.status(400).json({ success: false, message: "Đã lưu blog này rồi" });
        }

        // Thêm uid vào savedBy
        await Blog.findByIdAndUpdate(blogId, {
            $addToSet: { savedBy: userId },
        });

        res.status(200).json({ success: true, message: "Lưu blog thành công" });
    } catch (error) {
        console.error("saveBlog error:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
exports.unsaveBlog = async (req, res) => {
    try {
        const { blogId, userId } = req.body;

        const blog = await Blog.findOne({ _id: blogId });
        if (!blog) {
            return res.status(404).json({ success: false, message: "Không tìm thấy blog" });
        }

        // Nếu chưa từng lưu thì báo lỗi
        if (!blog.savedBy.includes(userId)) {
            return res.status(400).json({ success: false, message: "Bạn chưa lưu blog này" });
        }

        // Xoá uid khỏi savedBy
        await Blog.findByIdAndUpdate(blogId, {
            $pull: { savedBy: userId },
        });

        res.status(200).json({ success: true, message: "Bỏ lưu blog thành công" });
    } catch (error) {
        console.error("unsaveBlog error:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
exports.getSavedBlogs = async (req, res) => {
    try {
        const { userId } = req.params;

        // Lấy tham số page và perPage từ query string
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const skip = (page - 1) * perPage;

        // Tìm các blog có userId trong savedBy
        const totalBlogs = await Blog.countDocuments({ savedBy: userId });
        const blogs = await Blog.find({ savedBy: userId }).sort({ createdAt: -1 }).skip(skip).limit(perPage);

        const totalPages = Math.ceil(totalBlogs / perPage);

        res.status(200).json({
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
        console.error("getSavedBlogs error:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
exports.getMyBlogs = async (req, res) => {
    try {
        const { uid } = req.body;
        // Lấy tham số page và perPage từ query string, mặc định là 1 và 10
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;

        // Tính số bài cần bỏ qua
        const skip = (page - 1) * perPage;

        // Lấy tổng số bài viết
        const totalBlogs = await Blog.countDocuments({ authorUid: uid });

        // Truy vấn blogs với phân trang và sắp xếp theo createdAt giảm dần
        const blogs = await Blog.find({ authorUid: uid })
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

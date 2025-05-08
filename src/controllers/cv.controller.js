const Cv = require("../models/cv.model");

exports.getAllCv = async (req, res) => {
    try {
        const cvs = await Cv.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            data: cvs,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCvByUid = async (req, res) => {
    try {
        const { uid } = req.params;
        const cvs = await Cv.find({ uid }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: cvs,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createCv = async (req, res) => {
    try {
        const { json, uid } = req.body;
        if (!json || !uid) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin",
            });
        }

        const newCv = new Cv({ json, uid });
        await newCv.save();

        res.status(201).json({
            success: true,
            data: newCv,
            message: "Tạo CV thành công",
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateCv = async (req, res) => {
    try {
        const { id } = req.params;
        const { json } = req.body;

        if (!json) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp ít nhất một trường để cập nhật",
            });
        }

        const updatedCv = await Cv.findByIdAndUpdate(
            id,
            {
                ...(json && { json }),
            },
            { new: true }
        );

        if (!updatedCv) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy CV",
            });
        }

        res.json({
            success: true,
            data: updatedCv,
            message: "Cập nhật CV thành công",
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteCv = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCv = await Cv.findByIdAndDelete(id);

        if (!deletedCv) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy CV",
            });
        }

        res.json({
            success: true,
            message: "Xóa CV thành công",
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

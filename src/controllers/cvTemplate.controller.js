const CvTemplate = require("../models/cvTemplate.model");
// const cloudinary = require("cloudinary").v2;
// const streamifier = require("streamifier");
// const { v4: uuidv4 } = require("uuid");

exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await CvTemplate.find();

        res.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { json, preview, name } = req.body;
        if (!json || !preview || !name) {
            return res.status(400).json({ message: "Vui lòng tải lên data" });
        }
        const newTemplate = new CvTemplate({ json, preview, name });
        await newTemplate.save();
        res.json({
            success: true,
            data: newTemplate,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { json, preview, name } = req.body;

        if (!json && !preview && !name) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp ít nhất một trường để cập nhật",
            });
        }

        const updatedTemplate = await CvTemplate.findByIdAndUpdate(
            id,
            {
                ...(json && { json }),
                ...(preview && { preview }),
                ...(name && { name }),
            },
            { new: true }
        );

        if (!updatedTemplate) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy template",
            });
        }

        res.json({
            success: true,
            data: updatedTemplate,
            message: "Cập nhật template thành công",
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

import express from 'express';
import cloudinary from 'cloudinary';
import { isAuth } from '../middlewares/isAuth.js';

const cloudinaryRouter=express.Router();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const parseImageDataUri = (buffer: unknown) => {
    if (typeof buffer !== "string") {
        return null;
    }

    const match = buffer.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return null;
    }

    const [, mimeType, base64Data] = match;
    if (!mimeType || !base64Data || !ALLOWED_IMAGE_TYPES.has(mimeType)) {
        return null;
    }

    return {
        mimeType,
        size: Buffer.byteLength(base64Data, "base64"),
    };
};

cloudinaryRouter.post('/upload', isAuth, async (req, res) => {
try {
    const {buffer}=req.body;
    const image = parseImageDataUri(buffer);
    if (!image) {
        return res.status(400).json({
            message: "Only jpeg, png, webp and gif image uploads are allowed",
        });
    }

    if (image.size > MAX_IMAGE_BYTES) {
        return res.status(413).json({
            message: "Image size must be 5MB or less",
        });
    }

    const cloud=await cloudinary.v2.uploader.upload(buffer, {
        resource_type:'image'
    });
    res.json({
        url:cloud.secure_url
    })
} catch (error: any) {
    res.status(500).json({
    message:error.message
    })
}
});
export default cloudinaryRouter;

/**
 * @file cloudinary.ts
 * @summary Express route handler for uploading base64 image Data URIs to Cloudinary with 
 * strict MIME type and size validation.
 */

// Express framework for defining API routes
import express from 'express';
// Cloudinary SDK for managing and uploading cloud media
import cloudinary from 'cloudinary';
// Middleware to ensure the user is authenticated before uploading
import { isAuth } from '../middlewares/isAuth.js';

const cloudinaryRouter=express.Router();
// Maximum allowed image size in bytes (5MB)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Set of allowed image MIME types
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

/**
 * Validates and parses a Data URI string to extract its MIME type and byte size.
 * 
 * @param buffer - The raw input expected to be a base64 Data URI string.
 * @returns An object containing the MIME type and size in bytes if valid, or null otherwise.
 */
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

/**
 * POST /upload
 * Authenticated route endpoint that validates incoming image Data URIs and uploads them to Cloudinary storage.
 */
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

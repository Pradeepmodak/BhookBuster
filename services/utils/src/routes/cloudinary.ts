import express from 'express';
import cloudinary from 'cloudinary';

const cloudinaryRouter=express.Router();

cloudinaryRouter.post('/upload', async (req, res) => {
try {
    const {buffer}=req.body;
    const cloud=await cloudinary.v2.uploader.upload(buffer, {
        resource_type:'auto'
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
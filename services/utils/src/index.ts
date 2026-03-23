import express from 'express';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import cors from 'cors';
import cloudinaryRoutes from './routes/cloudinary.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET } = process.env;
if(!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) {
  console.error('Cloudinary configuration is missing. Please check your environment variables.');
 throw new Error('Cloudinary configuration is missing');
}
cloudinary.v2.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret:CLOUD_API_SECRET
});

app.use('/cloudinary', cloudinaryRoutes);
app.listen(PORT, () => {
  console.log(`Utils service is running on port ${PORT}`);
});

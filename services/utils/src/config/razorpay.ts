// Loads environment variables from a .env file into process.env
import dotenv from "dotenv";
// Razorpay SDK client for interacting with the Razorpay API (e.g., creating orders)
import Razorpay from "razorpay";
dotenv.config();
// Exporting an instantiated Razorpay client configured with API keys
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

import User from "../model/User.js";
import jwt from 'jsonwebtoken';
import TryCatch from "../middlewares/trycatch.js";
import { oauth2Client } from "../config/googleConfig.js";
import axios from "axios";
export const loginUser = TryCatch(async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({
            message: "Authorization code is required",
        });
    }
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);
    const userRes = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`);
    const { email, name, picture } = userRes.data;
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({ email, name, image: picture });
    }
    const token = jwt.sign({ user }, process.env.JWT_SECRET_KEY, { expiresIn: '15d' });
    res.status(200).json({
        message: "Login successful",
        token,
        user,
    });
});
const allowedRoles = ["customer", "rider", "seller"];
export const addUserRole = TryCatch(async (req, res) => {
    if (!req.user?._id) {
        return res.status(401).json({ message: "Unauthorized - No user" });
    }
    const { role } = req.body;
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { role }, { new: true });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const token = jwt.sign({ user }, process.env.JWT_SECRET_KEY, { expiresIn: '15d' });
    res.status(200).json({ token, user });
});
export const myProfile = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Refresh the token from the latest DB-backed user state while preserving
    // service-specific JWT fields (for example restaurantId) that may already
    // exist on the incoming token payload.
    const mergedUser = {
        ...(typeof req.user === "object" ? req.user : {}),
        ...(user.toObject ? user.toObject() : user),
    };
    const token = jwt.sign({ user: mergedUser }, process.env.JWT_SECRET_KEY, { expiresIn: '15d' });
    res.status(200).json({ user, token });
});

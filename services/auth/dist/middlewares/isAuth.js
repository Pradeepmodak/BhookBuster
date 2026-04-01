import jwt from "jsonwebtoken";
import TryCatch from "./trycatch.js";
import User from "../model/User.js";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            res.status(401).json({ message: "Please Login - No auth header" });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Please Login - No token" });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({ message: "Please Login - Invalid token" });
            return;
        }
        req.user = decodedValue.user;
        next();
    }
    catch (err) {
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
};
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
    const token = jwt.sign({ user }, process.env.JWT_SECRET_KEY, { expiresIn: "15d" });
    res.status(200).json({ token, user });
});
export const myProfile = TryCatch(async (req, res) => {
    console.log("req.user:", req.user);
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json({ user });
});

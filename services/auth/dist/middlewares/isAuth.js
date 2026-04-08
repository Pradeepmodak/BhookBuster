import jwt from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // ✅ Check header
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized - No auth header" });
            return;
        }
        // ✅ Extract token
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized - No token" });
            return;
        }
        // ✅ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decoded || !decoded.user) {
            res.status(401).json({ message: "Unauthorized - Invalid token" });
            return;
        }
        // ✅ Attach user to request
        req.user = decoded.user;
        next();
    }
    catch (err) {
        res.status(401).json({
            message: err.message || "Unauthorized - Token error",
        });
    }
};

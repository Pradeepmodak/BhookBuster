import jwt from "jsonwebtoken";
;
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                message: "Please Login - No token",
            });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Please Login - Invalid token",
            });
            return;
        }
        req.user = decodedValue.user;
        next();
    }
    catch (err) {
        res.status(500).json({
            message: "Please Login - Jwt error",
        });
    }
};

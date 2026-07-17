import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface IUser {
    _id: string;
    name: string;
    email: string;
    image: string;
    role: string;
    restaurantId: string;
}

// add user property to Request interface
export interface AuthenticatedRequest extends Request {
    user?: IUser;
}

/**
 * Stateless JWT verification middleware.
 * Decodes the JWT and trusts the payload — no database call needed.
 * The auth service is the single source of truth for user identity;
 * this middleware only verifies the token signature.
 */
export const isAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
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

        const decodedValue = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY as string
        ) as JwtPayload;

        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Please Login - Invalid token",
            });
            return;
        }

        // Trust the JWT payload — no DB call needed
        req.user = decodedValue.user;
        next();
    } catch (err: any) {
        res.status(401).json({
            message: "Please Login - Jwt error",
        });
    }
};
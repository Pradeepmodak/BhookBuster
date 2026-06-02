import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const isAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized - No auth header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized - No token" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      res.status(500).json({ message: "JWT secret is not configured" });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded || !decoded.user || !decoded.user._id) {
      res.status(401).json({ message: "Unauthorized - Invalid token" });
      return;
    }

    req.user = decoded.user;
    next();
  } catch (err: any) {
    res.status(401).json({
      message: err.message || "Unauthorized - Token error",
    });
  }
};

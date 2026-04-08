import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IUser } from "../model/User.js";
import User from "../model/User.js";

export interface AuthenticatedRequest extends Request {
  user?: IUser ;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string
    ) as JwtPayload;

    if (!decoded || !decoded.user || !decoded.user._id) {
      res.status(401).json({ message: "Unauthorized - Invalid token" });
      return;
    }

    const user = await User.findById(decoded.user._id);
    if (!user) {
      res.status(401).json({ message: "Unauthorized - User not found" });
      return;
    }

    // ✅ Attach fresh user from DB to request
    req.user = user;

    next();
  } catch (err: any) {
    res.status(401).json({
      message: err.message || "Unauthorized - Token error",
    });
  }
};
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";


export interface IUser {
    _id:string;
    name:string;
    email:string;
    image:string;
    role:string;
    restaurantId:string;
}

export interface AuthenticatedRequest extends Request {
  user: IUser | null ;
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

    if (!decoded || !decoded.user) {
      res.status(401).json({ message: "Unauthorized - Invalid token" });
      return;
    }

    // ✅ Attach user to request
    req.user = decoded.user;

    next();
  } catch (err: any) {
    res.status(401).json({
      message: err.message || "Unauthorized - Token error",
    });
  }
};


export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Please Login",
      });
      return ;
    }
    if(req.user.role!=="admin"){
        res.status(403).json({
            message:"Access denied",
        })
        return ;
    }
    next();
  } catch (error) {
      res.status(401).json({
        message: "Please Login",
      });
  }
};
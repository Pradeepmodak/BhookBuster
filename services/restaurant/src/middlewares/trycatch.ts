import { Request, Response, RequestHandler, NextFunction } from "express";

const TryCatch = (handler: RequestHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next); 
    } catch (err: any) {
      console.error("[API Error]:", err.message || err);
      res.status(500).json({
        message: err.message || "Internal Server Error",
      });
    }
  };
};

export default TryCatch;
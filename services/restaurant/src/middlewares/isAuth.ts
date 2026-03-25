import { Request,Response,NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import TryCatch from "./trycatch.js";
export interface IUser {
    _id:string;
    name:string;
    email:string;
    image:string;
    role:string;
    restaurantId:string;
}
// add user property to Request interface
export interface AuthenticatedRequest extends Request{
    user?:IUser;
};
export const isAuth=async(req:AuthenticatedRequest,res:Response,next:NextFunction):Promise<void>=>{
   try{
      const authHeader=req.headers.authorization;
      if(!authHeader || !authHeader.startsWith("Bearer")){
        res.status(401).json({
            message:"Please Login - No auth header",
        });
        return;
      }
      const token=authHeader.split(" ")[1];
      if(!token){
        res.status(401).json({
            message:"Please Login - No token",
        });
        return;
      }
      const decodedValue=jwt.verify(token,process.env.JWT_SECRET_KEY as string) as JwtPayload;
      if(!decodedValue || !decodedValue.user){
        res.status(401).json({
            message:"Please Login - Invalid token",
        });
        return;
      }
      req.user=decodedValue.user;
      next();
    }catch(err:any){
    res.status(500).json({
        message:"Please Login - Jwt error",
    });
   }
};

const allowedRoles=["customer","rider","seller"] as const;
type Role=(typeof allowedRoles)[number];

export const addUserRole=TryCatch(async(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
if(!req.user?._id){
  return res.status(401).json({
    message:"Unauthorized - No user",
  });
}
const { role }=req.body as {role:Role};
if(!allowedRoles.includes(role)){
  return res.status(400).json({
    message:"Invalid role",
  });
}
const user=await User.findByIdAndUpdate(req.user._id,{role},{new:true});
if(!user){
    return res.status(404).json({
        message:"User not found",
    });
  }

  const token=jwt.sign({user},process.env.JWT_SECRET_KEY as string,{expiresIn:'15d'});
  res.status(200).json({
    token,
    user,
  });
});

export const myProfile=TryCatch(async(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
   const user=req.user;
   res.json({user});
});

export const isSeller=async(
    req:AuthenticatedRequest,
    res:Response,
    next:NextFunction
):Promise<void>=>{
  const user=req.user;
  if(user?.role!=="seller"){
    res.status(403).json({
        message:"Forbidden - Not a seller",
    });
    return;
  }
  next();
}
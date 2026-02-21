import User from "../model/User.js";
import jwt from 'jsonwebtoken';
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
export const loginUser=TryCatch(async(req,res)=>{
        const { email, name, picture } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, name, image: picture });
        }
        const token=jwt.sign({user},process.env.JWT_SECRET_KEY as string,{expiresIn:'15d'});
        res.status(200).json({
        message:"Login successful",
        token,
        user,
       })
});
const allowedRoles=["customer","rider","seller"] as const;
type Role=(typeof allowedRoles)[number];

export const addUserRole=TryCatch(async(req:AuthenticatedRequest,res)=>{
if(!req.user?._id){
  return res.status(401).json({
    message:"Unauthorized - No user",
  })
}
const { role }=req.body as {role:Role};
if(!allowedRoles.includes(role)){
  return res.status(400).json({
    message:"Invalid role",
  })
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
})
});

export const myProfile=TryCatch(async(req:AuthenticatedRequest,res)=>{
   const user=req.user;
   if(!user){
    return res.status(401).json({
        message:"Unauthorized - No user",
    })
   }
    res.status(200).json({user}); 
});

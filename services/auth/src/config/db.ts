import mongoose from "mongoose";

const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI as string,{
            dbName:"BhookBuster",
            serverSelectionTimeoutMS: 5000,
        });
        console.log("connect to mongodb");
    }catch(error){
        console.error("MongoDB connection failed: ", error);
        process.exit(1);
    }
};

export default connectDB;

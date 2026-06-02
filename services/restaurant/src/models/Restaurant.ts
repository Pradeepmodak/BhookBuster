import mongoose,{Schema,Document} from "mongoose";

export interface IRestaurant extends Document{
    name:string;
    description?:string;
    image:string;
    ownerId:string;
    phone:number;
    isVerified:boolean;
    cuisineTypes:string[];
    tags:string[];
    embedding:number[];
    embeddingHash?:string;
    embeddedAt?:Date;

    autoLocation:{
        type:"Point",
        coordinates:[number,number]; // [longitude,latitude]
        formattedAddress:string;
    };
    isOpen:boolean;
    createdAt:Date;
}

const schema=new Schema<IRestaurant>({
    name:{
        type:String,
        required:true,
        trim:true, //auto remove whitespace from start and end of string
    },
    description:String,
    image:{
        type:String,
        required:true,
    },
    ownerId:{
        type:String,
        required:true,
    },
    phone:{
        type:Number,
        required:true,
    },
    isVerified:{
        type:Boolean,
        required:true, 
    },
    cuisineTypes:{
        type:[String],
        default:[],
    },
    tags:{
        type:[String],
        default:[],
    },
    embedding:{
        type:[Number],
        default:[],
    },
    embeddingHash:String,
    embeddedAt:Date,
    autoLocation:{
        type:{
            type:String,
            enum:["Point"],
            required:true,
        },
        coordinates:{
            type:[Number],
            required:true,
        },
        formattedAddress:String,
    },
    isOpen:{
        type:Boolean,
        default:false,
    },
    createdAt:{
        type:Date,
        default:Date.now,
    },
},
{timestamps:true,}
);

schema.index({autoLocation:"2dsphere"});

export default mongoose.model<IRestaurant>("Restaurant",schema);

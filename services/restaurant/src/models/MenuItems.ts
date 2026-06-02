import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
    restaurantId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    image?: string;
    price: number;
    cuisine?: string;
    tags: string[];
    dietaryFlags: string[];
    spiceLevel?: "mild" | "medium" | "hot" | "extra-hot";
    embedding: number[];
    embeddingHash?: string;
    embeddedAt?: Date;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IMenuItem>({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
        description: {
        type: String,
        trim: true,
    },
        image:{
        type:String,
        required:true,
    },
        price: {
        type: Number,
        required: true,
    },
        cuisine: {
        type: String,
        trim: true,
    },
        tags: {
        type: [String],
        default: [],
    },
        dietaryFlags: {
        type: [String],
        default: [],
    },
        spiceLevel: {
        type: String,
        enum: ["mild", "medium", "hot", "extra-hot"],
    },
        embedding: {
        type: [Number],
        default: [],
    },
        embeddingHash: {
        type: String,
    },
        embeddedAt: {
        type: Date,
    },
        isAvailable:{
        type: Boolean,
        default: true,
    },

},{
    timestamps:true
});
export default mongoose.model<IMenuItem>("MenuItem",schema);

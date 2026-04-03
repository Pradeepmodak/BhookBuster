import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    image: string;
    role: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    role: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model<IUser>("User", schema);
export default User;
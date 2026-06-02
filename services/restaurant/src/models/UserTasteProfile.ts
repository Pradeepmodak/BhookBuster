import mongoose, { Schema, Document } from "mongoose";

export interface IUserTasteProfile extends Document {
  userId: mongoose.Types.ObjectId;
  cuisineWeights: Map<string, number>;
  priceBand: {
    min: number;
    max: number;
  };
  dietaryFlags: string[];
  embeddingCentroid: number[];
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IUserTasteProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    cuisineWeights: {
      type: Map,
      of: Number,
      default: {},
    },
    priceBand: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    dietaryFlags: {
      type: [String],
      default: [],
    },
    embeddingCentroid: {
      type: [Number],
      default: [],
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUserTasteProfile>("UserTasteProfile", schema);


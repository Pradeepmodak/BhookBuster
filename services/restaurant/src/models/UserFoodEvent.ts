import mongoose, { Schema, Document } from "mongoose";

export const USER_FOOD_EVENT_TYPES = [
  "search",
  "impression",
  "click",
  "addToCart",
  "favourite",
  "rating",
  "orderPaid",
] as const;

export type UserFoodEventType = (typeof USER_FOOD_EVENT_TYPES)[number];

export interface IUserFoodEvent extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: UserFoodEventType;
  itemId?: mongoose.Types.ObjectId;
  restaurantId?: mongoose.Types.ObjectId;
  query?: string;
  ratingValue?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<IUserFoodEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: USER_FOOD_EVENT_TYPES,
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },
    query: String,
    ratingValue: Number,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

schema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IUserFoodEvent>("UserFoodEvent", schema);


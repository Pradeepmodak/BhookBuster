import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import UserFoodEvent, {
  USER_FOOD_EVENT_TYPES,
  UserFoodEventType,
} from "../models/UserFoodEvent.js";
import { publishUserFoodEvent } from "../config/userEvents.publisher.js";

const EVENT_LIMIT = 60;
const WINDOW_MS = 60 * 1000;
const eventCounters = new Map<string, { count: number; windowStart: number }>();

const isAllowedEventType = (eventType: unknown): eventType is UserFoodEventType =>
  typeof eventType === "string" &&
  USER_FOOD_EVENT_TYPES.includes(eventType as UserFoodEventType);

const checkRateLimit = (userId: string) => {
  const now = Date.now();
  const current = eventCounters.get(userId);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    eventCounters.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= EVENT_LIMIT) {
    return false;
  }

  current.count += 1;
  return true;
};

const toObjectId = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

export const captureUserFoodEvent = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!checkRateLimit(user._id)) {
      return res.status(429).json({
        message: "Too many events",
      });
    }

    const { eventType, itemId, restaurantId, query, ratingValue, metadata } =
      req.body as {
        eventType?: unknown;
        itemId?: unknown;
        restaurantId?: unknown;
        query?: unknown;
        ratingValue?: unknown;
        metadata?: unknown;
      };

    if (!isAllowedEventType(eventType)) {
      return res.status(400).json({
        message: "Invalid event type",
      });
    }

    const itemObjectId = toObjectId(itemId);
    const restaurantObjectId = toObjectId(restaurantId);

    if (itemObjectId === null || restaurantObjectId === null) {
      return res.status(400).json({
        message: "Invalid itemId or restaurantId",
      });
    }

    const eventPayload: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(user._id),
      eventType,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    };

    if (itemObjectId) eventPayload.itemId = itemObjectId;
    if (restaurantObjectId) eventPayload.restaurantId = restaurantObjectId;
    if (typeof query === "string") eventPayload.query = query;
    if (typeof ratingValue === "number") eventPayload.ratingValue = ratingValue;

    const event = await UserFoodEvent.create(eventPayload as any);

    const publishPayload: {
      userId: string;
      eventType: UserFoodEventType;
      itemId?: string;
      restaurantId?: string;
      query?: string;
      ratingValue?: number;
      metadata?: Record<string, unknown>;
    } = {
      userId: user._id,
      eventType,
      metadata: metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {},
    };

    if (typeof itemId === "string") publishPayload.itemId = itemId;
    if (typeof restaurantId === "string") publishPayload.restaurantId = restaurantId;
    if (typeof query === "string") publishPayload.query = query;
    if (typeof ratingValue === "number") publishPayload.ratingValue = ratingValue;

    await publishUserFoodEvent(publishPayload);

    return res.status(201).json({
      success: true,
      eventId: event._id,
    });
  }
);

export const resetEventRateLimitsForTests = () => {
  eventCounters.clear();
};

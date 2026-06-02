import mongoose from "mongoose";
import { getChannel } from "../config/rabbitmq.js";
import MenuItems, { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import UserTasteProfile from "../models/UserTasteProfile.js";

type RecommendationEvent = {
  userId?: string;
  eventType?: string;
  itemId?: string;
  ratingValue?: number;
  query?: string;
  metadata?: {
    orderId?: string;
  };
};

const averageVectors = (
  vectors: Array<{ values: number[]; weight: number }>
): number[] => {
  const firstVector = vectors.find((vector) => vector.values.length > 0);
  if (!firstVector) {
    return [];
  }

  const dimensions = firstVector.values.length;
  const totals = new Array(dimensions).fill(0);
  let totalWeight = 0;

  for (const vector of vectors) {
    if (vector.values.length !== dimensions) continue;

    for (let index = 0; index < dimensions; index += 1) {
      totals[index] += (vector.values[index] ?? 0) * vector.weight;
    }
    totalWeight += vector.weight;
  }

  if (totalWeight === 0) {
    return [];
  }

  return totals.map((value) => value / totalWeight);
};

const blendCentroid = (oldCentroid: number[], newCentroid: number[]) => {
  if (oldCentroid.length !== newCentroid.length || oldCentroid.length === 0) {
    return newCentroid;
  }

  return oldCentroid.map((value, index) => value * 0.8 + (newCentroid[index] ?? 0) * 0.2);
};

const toCuisineWeightMap = (value: unknown) => {
  const weights = new Map<string, number>();

  if (value instanceof Map) {
    value.forEach((weight, cuisine) => {
      weights.set(cuisine, Number(weight) || 0);
    });
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([cuisine, weight]) => {
      weights.set(cuisine, Number(weight) || 0);
    });
  }

  return weights;
};

export const updateTasteProfileFromOrder = async (orderId: string) => {
  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus !== "paid") {
    return null;
  }

  const itemQuantityById = new Map(
    order.items.map((item) => [item.itemId.toString(), item.quantity])
  );
  const itemIds = [...itemQuantityById.keys()];
  const menuItems = await MenuItems.find({ _id: { $in: itemIds } });

  const embeddingCentroid = averageVectors(
    menuItems.map((item) => ({
      values: item.embedding || [],
      weight: itemQuantityById.get(item._id.toString()) || 1,
    }))
  );

  const orderPrices = order.items.map((item) => item.price);
  const orderMinPrice = Math.min(...orderPrices);
  const orderMaxPrice = Math.max(...orderPrices);

  let profile = await UserTasteProfile.findOne({ userId: order.userId });
  if (!profile) {
    profile = await UserTasteProfile.create({
      userId: new mongoose.Types.ObjectId(order.userId),
      cuisineWeights: {},
      priceBand: {
        min: orderMinPrice,
        max: orderMaxPrice,
      },
      dietaryFlags: [],
      embeddingCentroid: [],
      lastUpdatedAt: new Date(),
    });
  }

  if (embeddingCentroid.length > 0) {
    profile.embeddingCentroid = blendCentroid(
      profile.embeddingCentroid || [],
      embeddingCentroid
    );
  }

  const cuisineWeights = toCuisineWeightMap(profile.cuisineWeights);
  const dietaryFlags = new Set(profile.dietaryFlags || []);

  for (const item of menuItems as IMenuItem[]) {
    const quantity = itemQuantityById.get(item._id.toString()) || 1;
    if (item.cuisine) {
      cuisineWeights.set(item.cuisine, (cuisineWeights.get(item.cuisine) || 0) + quantity);
    }

    for (const flag of item.dietaryFlags || []) {
      dietaryFlags.add(flag);
    }
  }

  profile.cuisineWeights = cuisineWeights as any;
  profile.dietaryFlags = [...dietaryFlags];
  profile.priceBand = {
    min:
      profile.priceBand?.min && profile.priceBand.min > 0
        ? Math.min(profile.priceBand.min, orderMinPrice)
        : orderMinPrice,
    max: Math.max(profile.priceBand?.max || 0, orderMaxPrice),
  };
  profile.lastUpdatedAt = new Date();

  await profile.save();
  return profile;
};

export const updateTasteProfileFromInteraction = async (
  userId: string,
  eventType: string,
  itemId?: string,
  ratingValue?: number,
  query?: string
) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

  let profile = await UserTasteProfile.findOne({ userId });

  // Get event specific weight
  let weight = 1.0;
  if (eventType === "rating") {
    weight = (ratingValue || 4) / 2; // Range 0.5 to 2.5
  } else if (eventType === "favourite") {
    weight = 2.0;
  } else if (eventType === "addToCart") {
    weight = 1.5;
  } else if (eventType === "click" || eventType === "impression") {
    weight = 0.5;
  } else if (eventType === "search") {
    weight = 0.2;
  }

  // Define learning rate (alpha) based on weight
  const alpha = Math.min(0.05 * weight, 0.5);

  if (!profile) {
    profile = await UserTasteProfile.create({
      userId: new mongoose.Types.ObjectId(userId),
      cuisineWeights: {},
      priceBand: { min: 0, max: 0 },
      dietaryFlags: [],
      embeddingCentroid: [],
      lastUpdatedAt: new Date(),
    });
  }

  const cuisineWeights = toCuisineWeightMap(profile.cuisineWeights);
  const dietaryFlags = new Set(profile.dietaryFlags || []);

  // 1. If we have an itemId, blend item preferences
  if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
    const item = await MenuItems.findById(itemId);
    if (item) {
      // Blend embedding
      if (item.embedding && item.embedding.length > 0) {
        if (!profile.embeddingCentroid || profile.embeddingCentroid.length === 0) {
          profile.embeddingCentroid = item.embedding;
        } else {
          profile.embeddingCentroid = profile.embeddingCentroid.map(
            (val, idx) => val * (1 - alpha) + (item.embedding[idx] ?? 0) * alpha
          );
        }
      }

      // Cuisine preference
      if (item.cuisine) {
        cuisineWeights.set(item.cuisine, (cuisineWeights.get(item.cuisine) || 0) + weight);
      }

      // Dietary flags
      for (const flag of item.dietaryFlags || []) {
        dietaryFlags.add(flag);
      }

      // Price band
      if (item.price > 0) {
        if (!profile.priceBand?.min || profile.priceBand.min === 0) {
          profile.priceBand = { min: item.price, max: item.price };
        } else {
          profile.priceBand = {
            min: Math.min(profile.priceBand.min, item.price),
            max: Math.max(profile.priceBand.max, item.price),
          };
        }
      }
    }
  }

  // 2. If search query, extract and blend query embedding
  if (eventType === "search" && query && query.trim()) {
    try {
      const { requestEmbedding } = await import("../lib/embeddings.js");
      const searchEmbedding = await requestEmbedding(query, "RETRIEVAL_QUERY");
      if (searchEmbedding && searchEmbedding.length > 0) {
        if (!profile.embeddingCentroid || profile.embeddingCentroid.length === 0) {
          profile.embeddingCentroid = searchEmbedding;
        } else {
          profile.embeddingCentroid = profile.embeddingCentroid.map(
            (val, idx) => val * (1 - alpha) + (searchEmbedding[idx] ?? 0) * alpha
          );
        }
      }
    } catch (error) {
      console.error("Failed to blend search embedding into taste profile:", error);
    }
  }

  profile.cuisineWeights = cuisineWeights as any;
  profile.dietaryFlags = [...dietaryFlags];
  profile.lastUpdatedAt = new Date();

  await profile.save();
  return profile;
};

export const handleRecommendationEvent = async (event: RecommendationEvent) => {
  if (!event.eventType) return null;

  if (event.eventType === "orderPaid" && event.metadata?.orderId) {
    return updateTasteProfileFromOrder(event.metadata.orderId);
  }

  return updateTasteProfileFromInteraction(
    event.userId || "",
    event.eventType,
    event.itemId,
    event.ratingValue,
    event.query
  );
};

export const startRecommendationsConsumer = async () => {
  const channel = getChannel();
  const queue = process.env.USER_EVENT_QUEUE;

  if (!queue || !channel) {
    console.log("USER_EVENT_QUEUE is not configured; recommendations consumer skipped");
    return;
  }

  await channel.assertQueue(queue, { durable: true });
  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as RecommendationEvent;
      await handleRecommendationEvent(event);
      channel.ack(msg);
    } catch (error) {
      console.log("Recommendations consumer error:", error);
      channel.ack(msg);
    }
  });
};

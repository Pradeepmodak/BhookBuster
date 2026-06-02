import crypto from "crypto";
import axios from "axios";
import type { IMenuItem } from "../models/MenuItems.js";
import type { IRestaurant } from "../models/Restaurant.js";

type EmbeddingResponse = {
  embeddings: number[][];
};

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeText = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const hashText = (text: string) =>
  crypto.createHash("sha256").update(text).digest("hex");

const signBody = (rawBody: string) => {
  const secret = process.env.GATEWAY_HMAC_SECRET;
  if (!secret) {
    throw new Error("GATEWAY_HMAC_SECRET is not configured");
  }

  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
};

export const requestEmbedding = async (
  text: string,
  taskType = "RETRIEVAL_DOCUMENT"
): Promise<number[]> => {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error("AI_GATEWAY_URL is not configured");
  }

  const payload = {
    texts: [text],
    taskType,
  };
  const rawBody = JSON.stringify(payload);
  const { data } = await axios.post<EmbeddingResponse>(
    `${gatewayUrl.replace(/\/$/, "")}/internal/embed`,
    payload,
    {
      headers: {
        "X-Service-Signature": signBody(rawBody),
      },
    }
  );

  let embedding = data.embeddings[0];
  if (!embedding) {
    throw new Error("AI gateway did not return an embedding");
  }

  // Mathematically transparent zero-padding to match the 3072-dimension Atlas Index
  if (embedding.length < 3072) {
    const padded = new Array(3072).fill(0);
    for (let i = 0; i < embedding.length; i++) {
      padded[i] = embedding[i];
    }
    embedding = padded;
  } else if (embedding.length > 3072) {
    embedding = embedding.slice(0, 3072);
  }

  return embedding;
};

export type NlpSearchResponse = {
  cleanQuery: string;
  filters: {
    maxPrice?: number;
    dietaryFlags?: string[];
    isVeg?: boolean;
    cuisine?: string;
    spiceLevel?: string;
  };
};

export const requestNlpParse = async (query: string): Promise<NlpSearchResponse> => {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error("AI_GATEWAY_URL is not configured");
  }

  const payload = { query };
  const rawBody = JSON.stringify(payload);
  const { data } = await axios.post<NlpSearchResponse>(
    `${gatewayUrl.replace(/\/$/, "")}/internal/nlp/parse`,
    payload,
    {
      headers: {
        "X-Service-Signature": signBody(rawBody),
      },
    }
  );

  return data;
};


export const buildMenuEmbeddingText = (item: Pick<
  IMenuItem,
  | "name"
  | "description"
  | "cuisine"
  | "tags"
  | "dietaryFlags"
  | "spiceLevel"
  | "price"
>) =>
  [
    `Dish: ${normalizeText(item.name)}`,
    `Description: ${normalizeText(item.description)}`,
    `Cuisine: ${normalizeText(item.cuisine)}`,
    `Tags: ${normalizeText(item.tags)}`,
    `Dietary flags: ${normalizeText(item.dietaryFlags)}`,
    `Spice level: ${normalizeText(item.spiceLevel)}`,
    `Price: ${normalizeText(item.price)}`,
  ]
    .filter((part) => !part.endsWith(": "))
    .join("\n");

export const buildRestaurantEmbeddingText = (restaurant: Pick<
  IRestaurant,
  "name" | "description" | "cuisineTypes" | "tags" | "isOpen" | "isVerified"
>) =>
  [
    `Restaurant: ${normalizeText(restaurant.name)}`,
    `Description: ${normalizeText(restaurant.description)}`,
    `Cuisine types: ${normalizeText(restaurant.cuisineTypes)}`,
    `Tags: ${normalizeText(restaurant.tags)}`,
    `Open: ${normalizeText(restaurant.isOpen)}`,
    `Verified: ${normalizeText(restaurant.isVerified)}`,
  ]
    .filter((part) => !part.endsWith(": "))
    .join("\n");

export const generateMenuEmbedding = async (item: IMenuItem) => {
  const text = buildMenuEmbeddingText(item);
  const embeddingHash = hashText(text);

  if (item.embeddingHash === embeddingHash && (item.embedding?.length || 0) > 0) {
    return item;
  }

  item.embedding = await requestEmbedding(text, "RETRIEVAL_DOCUMENT");
  item.embeddingHash = embeddingHash;
  item.embeddedAt = new Date();
  await item.save();
  return item;
};

export const generateRestaurantEmbedding = async (restaurant: IRestaurant) => {
  const text = buildRestaurantEmbeddingText(restaurant);
  const embeddingHash = hashText(text);

  if (
    restaurant.embeddingHash === embeddingHash &&
    (restaurant.embedding?.length || 0) > 0
  ) {
    return restaurant;
  }

  restaurant.embedding = await requestEmbedding(text, "RETRIEVAL_DOCUMENT");
  restaurant.embeddingHash = embeddingHash;
  restaurant.embeddedAt = new Date();
  await restaurant.save();
  return restaurant;
};

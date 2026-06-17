/**
 * @fileoverview Utility functions for generating and managing AI text embeddings.
 * Embeddings convert textual data (like menu descriptions) into high-dimensional numerical vectors.
 * This allows our database to perform "Semantic Search" (understanding context/meaning) rather than simple keyword matching.
 */

import crypto from "crypto";
import axios from "axios";
import type { IMenuItem } from "../models/MenuItems.js";
import type { IRestaurant } from "../models/Restaurant.js";

type EmbeddingResponse = {
  embeddings: number[][];
};

/**
 * Normalizes mixed inputs into a consistent array of strings.
 */
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

/**
 * Flattens array inputs or normalizes strings for the embedding payload.
 */
const normalizeText = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

/**
 * Computes a SHA-256 hash of the input string.
 * INTERVIEW NOTE: We use this hash as a cheap caching mechanism to detect if text has changed.
 * If the hash hasn't changed, we don't need to waste money/time generating a new embedding.
 */
const hashText = (text: string) =>
  crypto.createHash("sha256").update(text).digest("hex");

/**
 * Generates an HMAC-SHA256 signature for outgoing API requests.
 * INTERVIEW NOTE: This represents a "Zero-Trust Architecture". Even though the AI Gateway 
 * is an internal microservice, we digitally sign every request so the gateway knows it 
 * actually came from our authenticated Restaurant service and not a bad actor on the network.
 */
const signBody = (rawBody: string) => {
  const secret = process.env.GATEWAY_HMAC_SECRET;
  if (!secret) {
    throw new Error("GATEWAY_HMAC_SECRET is not configured");
  }

  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
};

/**
 * Communicates with the internal AI Gateway microservice to convert a string of text into a vector.
 */
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
  
  // Send HTTP request to our internal AI microservice, attaching the security signature
  const { data } = await axios.post<EmbeddingResponse>(
    `${gatewayUrl.replace(/\/$/, "")}/internal/embed`,
    payload,
    {
      headers: {
        "X-Service-Signature": signBody(rawBody), // Zero-trust auth header
      },
    }
  );

  let embedding = data.embeddings[0];
  if (!embedding) {
    throw new Error("AI gateway did not return an embedding");
  }

  // Mathematically transparent zero-padding.
  // INTERVIEW NOTE: Some Vector Databases (like MongoDB Atlas Vector Search) require vectors 
  // to be an exact specific length (e.g., exactly 3072 dimensions). 
  // We pad missing dimensions with 0s so the database accepts it without altering the underlying math.
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
    minPrice?: number;
    dietaryFlags?: string[];
    isVeg?: boolean;
    cuisine?: string;
    spiceLevel?: string;
  };
};

/**
 * Uses the AI Gateway to perform Natural Language Processing (NLP) on user search queries.
 * Example: Converts the human string "Cheap spicy vegan Indian food" into structured JSON filters:
 * { cuisine: "Indian", maxPrice: 10, dietaryFlags: ["vegan"], spiceLevel: "high" }
 */
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

/**
 * Flattens all relevant details of a menu item into a single, cohesive paragraph of text.
 * This paragraph is what the AI will read to generate the vector embedding.
 */
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
    .filter((part) => !part.endsWith(": ")) // Strip empty fields
    .join("\n");

/**
 * Flattens all relevant details of a restaurant into a single cohesive paragraph.
 */
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

/**
 * Orchestrator function to intelligently generate and save embeddings for a menu item.
 */
export const generateMenuEmbedding = async (item: IMenuItem) => {
  const text = buildMenuEmbeddingText(item);
  
  // Hash the newly compiled text paragraph
  const embeddingHash = hashText(text);

  // INTERVIEW NOTE (Cost Optimization Strategy): 
  // We check if the hashed text is identical to what is already stored in the DB.
  // If the hash hasn't changed, the menu item text hasn't changed.
  // We immediately return to skip the expensive AI API call and save cloud costs!
  if (item.embeddingHash === embeddingHash && (item.embedding?.length || 0) > 0) {
    return item;
  }

  // Text changed (or is new), so we generate a fresh embedding vector
  item.embedding = await requestEmbedding(text, "RETRIEVAL_DOCUMENT");
  item.embeddingHash = embeddingHash;
  item.embeddedAt = new Date();
  
  await item.save();
  return item;
};

/**
 * Orchestrator function to intelligently generate and save embeddings for a restaurant.
 */
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

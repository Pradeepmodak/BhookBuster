import crypto from "crypto";
import axios from "axios";

export type InsightResponse = {
  summary: string;
  anomalies: string[];
  recommendations: string[];
};

const PII_KEYS = new Set(["mobile", "phone", "email", "deliveryaddress"]);

export const stripAnalyticsPii = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripAnalyticsPii);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PII_KEYS.has(key.toLowerCase()))
      .map(([key, nestedValue]) => [key, stripAnalyticsPii(nestedValue)])
  );
};

const signBody = (rawBody: string) => {
  const secret = process.env.GATEWAY_HMAC_SECRET;
  if (!secret) {
    throw new Error("GATEWAY_HMAC_SECRET is not configured");
  }

  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
};

const requestInsights = async (
  prompt: string,
  context: object
): Promise<InsightResponse> => {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error("AI_GATEWAY_URL is not configured");
  }

  const payload = {
    prompt,
    context,
  };
  const rawBody = JSON.stringify(payload);
  try {
    const { data } = await axios.post<InsightResponse>(
      `${gatewayUrl.replace(/\/$/, "")}/internal/insights`,
      payload,
      {
        headers: {
          "X-Service-Signature": signBody(rawBody),
        },
      }
    );
    return data;
  } catch (error: any) {
    console.error("[requestInsights Error]:", error.response?.data || error.message || error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const generateInsights = async (
  analyticsData: object,
  scope: string,
  customPrompt?: string
): Promise<InsightResponse> => {
  const sanitizedData = stripAnalyticsPii(analyticsData) as object;
  const prompt = customPrompt || [
    "You are an elite AI business analyst for a food delivery platform.",
    `Context: You are analyzing ${scope}.`,
    "Provide a highly engaging, detailed, and attractive summary of the metrics. Emphasize key data points with formatting.",
    "Flag any anomalies clearly and recommend practical, interactive actions.",
    "Use the Indian Rupee symbol (₹) or 'Rs.' for all currency values, never use the Dollar ($) sign.",
    "CRITICAL: If the context includes 'platformContext', you MUST analyze and highlight the global platform data (total registered restaurants, total customers, total riders) in your insights.",
    "Do not request or include raw PII.",
  ].join(" ");

  return requestInsights(prompt, sanitizedData);
};

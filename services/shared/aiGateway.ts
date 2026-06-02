import crypto from "crypto";

export type EmbedRequest = {
  texts: string[];
  taskType?: string;
};

export type EmbedResponse = {
  embeddings: number[][];
};

export type InsightsRequest = {
  prompt: string;
  context: object;
};

export type InsightsResponse = {
  summary: string;
  anomalies: string[];
  recommendations: string[];
};

export type RerankRequest = {
  query: string;
  candidates: Array<{
    id: string;
    text: string;
  }>;
};

export type RerankResponse = {
  ranked: Array<{
    id: string;
    score: number;
  }>;
};

const getGatewayBaseUrl = () => {
  const baseUrl = process.env.AI_GATEWAY_URL;
  if (!baseUrl) {
    throw new Error("AI_GATEWAY_URL is not configured");
  }

  return baseUrl.replace(/\/$/, "");
};

const signBody = (body: string) => {
  const secret = process.env.GATEWAY_HMAC_SECRET;
  if (!secret) {
    throw new Error("GATEWAY_HMAC_SECRET is not configured");
  }

  return crypto.createHmac("sha256", secret).update(body).digest("hex");
};

export const postToAiGateway = async <TResponse>(
  path: string,
  payload: unknown
): Promise<TResponse> => {
  const rawBody = JSON.stringify(payload);
  const response = await fetch(`${getGatewayBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Signature": signBody(rawBody),
    },
    body: rawBody,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI gateway request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as TResponse;
};

export const requestEmbeddings = (payload: EmbedRequest) =>
  postToAiGateway<EmbedResponse>("/internal/embed", payload);

export const requestInsights = (payload: InsightsRequest) =>
  postToAiGateway<InsightsResponse>("/internal/insights", payload);

export const requestRerank = (payload: RerankRequest) =>
  postToAiGateway<RerankResponse>("/internal/rerank", payload);


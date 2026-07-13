import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// ═══════════════════════════════════════════════════════════════
//  Chat Completions (OpenRouter/OpenAI-compatible)
// ═══════════════════════════════════════════════════════════════

const requestChatCompletion = async (
  systemPrompt: string | undefined,
  userPrompt: string,
  jsonMode = true
): Promise<string> => {
  const apiKey = 
    process.env.OPENAI_API_KEY || 
    process.env.OPENROUTER_API_KEY || 
    process.env.GROQ_API_KEY || 
    process.env.GEMINI_API_KEY;
    
  const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1/chat/completions";

  if (!apiKey) {
    throw new Error("Chat completion API Key is not configured (set OPENROUTER_API_KEY or OPENAI_API_KEY)");
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const body: any = {
    model: "openai/gpt-oss-120b",
    messages,
    temperature: 0.2,
  };

  if (jsonMode) {
    // OpenRouter and many OSS models support json_object, but if they don't, 
    // the system prompt still enforces it.
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bhookbuster.com",
      "X-Title": "BhookBuster",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat API returned status ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Chat API returned an empty response");
  }

  return content;
};

// ═══════════════════════════════════════════════════════════════
//  Gemini Client (Strictly for Embeddings)
// ═══════════════════════════════════════════════════════════════

const getGeminiClient = () => {
  const apiKey =
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
};

const getEmbeddingModel = (): GenerativeModel =>
  getGeminiClient().getGenerativeModel({ model: "gemini-embedding-2" });

// ═══════════════════════════════════════════════════════════════
//  Shared Helpers
// ═══════════════════════════════════════════════════════════════

const parseJson = <T>(value: string): T => {
  let cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
    
  // Attempt to find the first { or [ to avoid pre-text or post-text hallucinations
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf("}");
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf("]");
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return JSON.parse(cleaned) as T;
};

const PII_KEYS = new Set([
  "mobile",
  "phone",
  "email",
  "address",
  "deliveryaddress",
  "formattedaddress",
]);

export const stripPii = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripPii);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PII_KEYS.has(key.toLowerCase()))
      .map(([key, v]) => [key, stripPii(v)])
  );
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      const msg = error?.message || "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests") || msg.includes("rate")) {
        const waitTime = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[API] Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Retry failed");
};

// ═══════════════════════════════════════════════════════════════
//  Embeddings (Gemini)
// ═══════════════════════════════════════════════════════════════

export const embedTexts = async (
  texts: string[],
  taskType = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> => {
  const model = getEmbeddingModel();
  try {
    const requests = texts.map((text) => ({
      content: { role: "user", parts: [{ text }] },
      taskType,
    }));
    const batchResult = await withRetry(async () => {
      return await model.batchEmbedContents({ requests } as any);
    });
    return batchResult.embeddings.map((e: any) => e.values);
  } catch (err: any) {
    console.error("Embedding generation failed:", err.message || err);
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════
//  AI Business Insights 
// ═══════════════════════════════════════════════════════════════

export interface InsightResponse {
  summary: string;
  anomalies: string[];
  recommendations: string[];
}

const INSIGHTS_SYSTEM_PROMPT = `You are an elite AI business analyst for a food delivery platform.
Analyze the provided restaurant analytics data and generate actionable, highly engaging insights.
Make your response attractive and interactive. Use clear formatting, emphasize key metrics, and provide deep context explaining *why* the data matters, distinguishing between platform-wide or single-restaurant data.
IMPORTANT: Use the Indian Rupee symbol (₹) or 'Rs.' for all currency values. Never use the Dollar ($) sign.
Return ONLY valid JSON in this exact format:
{
  "summary": "Overall performance summary...",
  "anomalies": ["Anomaly 1", "Anomaly 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

export const generateInsights = async (
  prompt: string,
  context: object
): Promise<InsightResponse> => {
  const sanitizedContext = stripPii(context);
  const userMessage = JSON.stringify({ prompt, context: sanitizedContext });

  const rawText = await withRetry(() =>
    requestChatCompletion(INSIGHTS_SYSTEM_PROMPT, userMessage, true)
  );
  return parseJson<InsightResponse>(rawText);
};

// ═══════════════════════════════════════════════════════════════
//  Reranking
// ═══════════════════════════════════════════════════════════════

export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankResponse {
  ranked: { id: string; score: number }[];
}

const RERANK_SYSTEM_PROMPT = 'Rank candidates by relevance to query. Return only JSON: {"ranked":[{"id":"candidate-id","score":0.0}]} with scores from 0 to 1.';

export const rerankCandidates = async (
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankResponse> => {
  const userMessage = JSON.stringify({ query, candidates });

  const rawText = await withRetry(() =>
    requestChatCompletion(RERANK_SYSTEM_PROMPT, userMessage, true)
  );
  return parseJson<RerankResponse>(rawText);
};

// ═══════════════════════════════════════════════════════════════
//  NLP Search Query Parser
// ═══════════════════════════════════════════════════════════════

export type QueryFilters = {
  maxPrice?: number;
  minPrice?: number;
  dietaryFlags?: string[];
  isVeg?: boolean;
  cuisine?: string;
  spiceLevel?: string;
};

export type NlpSearchResponse = {
  cleanQuery: string;
  filters: QueryFilters;
};

const NLP_SYSTEM_PROMPT = `Analyze the user's food search query and extract structured filter parameters.
Allowed spice levels are: "none", "mild", "medium", "hot", "extra-hot".
Identify if the user is asking for vegetarian food (isVeg).
Extract a maximum price limit if mentioned (maxPrice) as a number (e.g., "under 200" or "below 300").
Extract a minimum price limit if mentioned (minPrice) as a number (e.g., "above 200" or "greater than 150").
Extract any cuisine requested (cuisine).
Extract any dietary restriction/preference flags if mentioned (dietaryFlags) as a lowercase string array (e.g. "vegan", "gluten-free", "dairy-free", "nut-free", "halal", "kosher", etc.). Do not include "veg" in dietaryFlags since it's already captured by isVeg.
Also return a "cleanQuery" which is the search terms without the price and vegetarian phrases.

Return ONLY JSON in this format:
{
  "cleanQuery": "spicy chicken",
  "filters": {
    "maxPrice": 300,
    "minPrice": 100,
    "isVeg": false,
    "spiceLevel": "hot",
    "cuisine": "Chinese",
    "dietaryFlags": ["gluten-free"]
  }
}`;

export const parseSearchQuery = async (query: string): Promise<NlpSearchResponse> => {
  const userMessage = `User Query: "${query}"`;

  const rawText = await withRetry(() =>
    requestChatCompletion(NLP_SYSTEM_PROMPT, userMessage, true)
  );
  return parseJson<NlpSearchResponse>(rawText);
};

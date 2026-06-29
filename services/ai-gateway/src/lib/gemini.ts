import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// ═══════════════════════════════════════════════════════════════
//  Groq Client (Primary for Insights / NLP / Reranking)
// ═══════════════════════════════════════════════════════════════

const getGroqKey = (): string | undefined => {
  return (
    process.env.GROQ_API_KEY ||
    (process.env.GEMINI_API_KEY?.startsWith("gsk_") ? process.env.GEMINI_API_KEY : undefined) ||
    (process.env.GOOGLE_API_KEY?.startsWith("gsk_") ? process.env.GOOGLE_API_KEY : undefined)
  );
};

const requestGroq = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error("Groq API Key is not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return content;
};

// ═══════════════════════════════════════════════════════════════
//  Gemini Client
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

const getChatModel = (systemInstruction?: string, jsonMode = true, maxTokens = 600): GenerativeModel => {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemInstruction ? { systemInstruction: { role: "system", parts: [{ text: systemInstruction }] } as any } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    }
  });
};

const geminiChat = async (
  systemInstruction: string | undefined,
  userPrompt: string,
  maxTokens = 600,
  jsonMode = true
): Promise<string> => {
  const model = getChatModel(systemInstruction, jsonMode, maxTokens);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }]
  });
  return result.response.text();
};

// ═══════════════════════════════════════════════════════════════
//  Shared Helpers
// ═══════════════════════════════════════════════════════════════

const parseJson = <T>(value: string): T => {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
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
//  AI Business Insights (Groq primary → Gemini fallback)
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

  // Try Groq first (faster, higher free tier limits)
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const responseText = await requestGroq(INSIGHTS_SYSTEM_PROMPT, userMessage);
      return parseJson<InsightResponse>(responseText);
    } catch (err: any) {
      console.warn("⚠️ Groq insights generation failed, falling back to Gemini:", err.message || err);
    }
  }

  // Fallback to Gemini
  const rawText = await withRetry(() =>
    geminiChat(INSIGHTS_SYSTEM_PROMPT, userMessage, 8192, true)
  );
  return parseJson<InsightResponse>(rawText);
};

// ═══════════════════════════════════════════════════════════════
//  Reranking (Groq primary → Gemini fallback)
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

  // Try Groq first
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const responseText = await requestGroq(RERANK_SYSTEM_PROMPT, userMessage);
      return parseJson<RerankResponse>(responseText);
    } catch (err: any) {
      console.warn("⚠️ Groq reranking failed, falling back to Gemini:", err.message || err);
    }
  }

  // Fallback to Gemini
  const rawText = await withRetry(() =>
    geminiChat(undefined, JSON.stringify({ instruction: RERANK_SYSTEM_PROMPT, query, candidates }), 8192, true)
  );
  return parseJson<RerankResponse>(rawText);
};

// ═══════════════════════════════════════════════════════════════
//  NLP Search Query Parser (Groq primary → Gemini fallback)
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

  // Try Groq first
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const responseText = await requestGroq(NLP_SYSTEM_PROMPT, userMessage);
      return parseJson<NlpSearchResponse>(responseText);
    } catch (err: any) {
      console.warn("⚠️ Groq query parsing failed, falling back to Gemini:", err.message || err);
    }
  }

  // Fallback to Gemini
  const rawText = await withRetry(() =>
    geminiChat(NLP_SYSTEM_PROMPT, userMessage, 8192, true)
  );
  return parseJson<NlpSearchResponse>(rawText);
};

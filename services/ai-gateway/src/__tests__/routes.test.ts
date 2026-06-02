import crypto from "crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.GATEWAY_HMAC_SECRET = "test-secret";
process.env.GOOGLE_AI_API_KEY = "test-api-key";

const mockBatchEmbedContents = jest.fn();
const mockGenerateContent = jest.fn();

const mockGetGenerativeModel = jest.fn(({ model }) => {
  return {
    batchEmbedContents: mockBatchEmbedContents,
    generateContent: mockGenerateContent,
  };
});

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const { app } = require("../index.js");

const sign = (body: string) =>
  crypto
    .createHmac("sha256", process.env.GATEWAY_HMAC_SECRET as string)
    .update(body)
    .digest("hex");

const postSigned = (path: string, body: unknown) => {
  const rawBody = JSON.stringify(body);

  return request(app)
    .post(path)
    .set("Content-Type", "application/json")
    .set("X-Service-Signature", sign(rawBody))
    .send(rawBody);
};

describe("ai-gateway routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("embeds text with gemini-embedding-2", async () => {
    mockBatchEmbedContents.mockResolvedValueOnce({
      embeddings: [
        { values: [0.1, 0.2] },
        { values: [0.3, 0.4] },
      ],
    } as any);

    const res = await postSigned("/internal/embed", {
      texts: ["hello", "world"],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });

    expect(mockBatchEmbedContents).toHaveBeenCalledWith({
      requests: [
        { content: { role: "user", parts: [{ text: "hello" }] }, taskType: "RETRIEVAL_DOCUMENT" },
        { content: { role: "user", parts: [{ text: "world" }] }, taskType: "RETRIEVAL_DOCUMENT" },
      ],
    });
  });

  it("generates insights after stripping PII from context", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          summary: "test summary",
          anomalies: [],
          recommendations: [],
        }),
      },
    } as any);

    const res = await postSigned("/internal/insights", {
      prompt: "analyze this",
      context: {
        phone: "1234567890",
        revenue: 100,
        nested: { email: "test@test.com", items: 5 },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      summary: "test summary",
      anomalies: [],
      recommendations: [],
    });

    expect(mockGenerateContent).toHaveBeenCalled();
    const callArgs = mockGenerateContent.mock.calls[0][0] as any;
    const userPrompt = callArgs.contents[0].parts[0].text;
    expect(userPrompt).toContain("analyze this");
    // Should not contain PII
    expect(userPrompt).not.toContain("1234567890");
    expect(userPrompt).not.toContain("test@test.com");
    // Should contain non-PII data
    expect(userPrompt).toContain("100");
    expect(userPrompt).toContain("5");
  });

  it("reranks candidates", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          ranked: [
            { id: "2", score: 0.9 },
            { id: "1", score: 0.4 },
          ],
        }),
      },
    } as any);

    const res = await postSigned("/internal/rerank", {
      query: "spicy chicken",
      candidates: [
        { id: "1", text: "bland chicken" },
        { id: "2", text: "extra spicy chicken tikka" },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ranked: [
        { id: "2", score: 0.9 },
        { id: "1", score: 0.4 },
      ],
    });

    expect(mockGenerateContent).toHaveBeenCalled();
    const callArgs = mockGenerateContent.mock.calls[0][0] as any;
    const userPrompt = callArgs.contents[0].parts[0].text;
    expect(userPrompt).toContain("spicy chicken");
  });

  it("parses search query", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          cleanQuery: "chicken",
          filters: { isVeg: false, maxPrice: 300, spiceLevel: "hot" },
        }),
      },
    } as any);

    const res = await postSigned("/internal/nlp/parse", {
      query: "spicy chicken under 300",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      cleanQuery: "chicken",
      filters: { isVeg: false, maxPrice: 300, spiceLevel: "hot" },
    });

    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("rejects unsigned requests", async () => {
    const res = await request(app)
      .post("/internal/embed")
      .set("Content-Type", "application/json")
      .send({ texts: ["test"] });

    expect(res.status).toBe(401);
  });
});

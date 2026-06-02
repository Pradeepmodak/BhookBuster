import crypto from "crypto";
import axios from "axios";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  generateMenuEmbedding,
  generateRestaurantEmbedding,
} from "../lib/embeddings.js";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const sign = (body: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

describe("embedding pipeline", () => {
  beforeEach(() => {
    process.env.AI_GATEWAY_URL = "http://ai-gateway.test";
    process.env.GATEWAY_HMAC_SECRET = "gateway-secret";
    jest.clearAllMocks();
  });

  it("generates and saves menu item embeddings", async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        embeddings: [[0.1, 0.2, 0.3]],
      },
    });

    const item = {
      name: "Spicy chicken bowl",
      description: "High protein dinner",
      cuisine: "Indian",
      tags: ["healthy", "dinner"],
      dietaryFlags: ["high-protein"],
      spiceLevel: "hot",
      price: 299,
      embedding: [],
      save: jest.fn(),
    } as any;

    await generateMenuEmbedding(item);

    expect(item.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(item.embeddingHash).toEqual(expect.any(String));
    expect(item.embeddedAt).toBeInstanceOf(Date);
    expect(item.save).toHaveBeenCalled();

    const [url, payload, config] = mockedAxios.post.mock.calls[0];
    expect(url).toBe("http://ai-gateway.test/internal/embed");
    expect(payload).toEqual({
      texts: [expect.stringContaining("Spicy chicken bowl")],
      taskType: "RETRIEVAL_DOCUMENT",
    });
    expect(config?.headers?.["X-Service-Signature"]).toBe(
      sign(JSON.stringify(payload), "gateway-secret")
    );
  });

  it("generates and saves restaurant embeddings", async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        embeddings: [[0.4, 0.5, 0.6]],
      },
    });

    const restaurant = {
      name: "Protein Kitchen",
      description: "Bowls and salads",
      cuisineTypes: ["Indian", "Continental"],
      tags: ["healthy"],
      isOpen: true,
      isVerified: true,
      embedding: [],
      save: jest.fn(),
    } as any;

    await generateRestaurantEmbedding(restaurant);

    expect(restaurant.embedding).toEqual([0.4, 0.5, 0.6]);
    expect(restaurant.embeddingHash).toEqual(expect.any(String));
    expect(restaurant.embeddedAt).toBeInstanceOf(Date);
    expect(restaurant.save).toHaveBeenCalled();
    expect(mockedAxios.post.mock.calls[0][1]).toEqual({
      texts: [expect.stringContaining("Protein Kitchen")],
      taskType: "RETRIEVAL_DOCUMENT",
    });
  });
});


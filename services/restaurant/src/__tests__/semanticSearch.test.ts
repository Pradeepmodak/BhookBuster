import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import { requestEmbedding } from "../lib/embeddings.js";
import searchRoutes from "../routes/search.js";

jest.mock("../models/MenuItems.js", () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock("../models/Restaurant.js", () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock("../lib/embeddings.js", () => ({
  requestEmbedding: jest.fn(),
  requestNlpParse: jest.fn().mockResolvedValue({
    cleanQuery: "spicy chicken under 300",
    filters: {
      maxPrice: 300,
      dietaryFlags: ["high-protein"],
      isVeg: false,
      cuisine: "Indian",
    },
  }),
  toStringArray: (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(",").map((entry) => entry.trim());
    return [];
  },
}));

const mockedMenuItems = MenuItems as jest.Mocked<typeof MenuItems>;
const mockedRestaurant = Restaurant as jest.Mocked<typeof Restaurant>;
const mockedRequestEmbedding = requestEmbedding as jest.Mock;

describe("POST /api/search/semantic", () => {
  const jwtSecret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/search", searchRoutes);
    return app;
  };

  const token = jwt.sign(
    { user: { _id: "customer-1", role: "customer" } },
    jwtSecret
  );

  it("runs vector search and groups dishes by restaurant", async () => {
    mockedRequestEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockedRestaurant.aggregate.mockResolvedValue([{ _id: "restaurant-1" }] as any);
    mockedMenuItems.aggregate.mockResolvedValue([
      {
        _id: "dish-1",
        restaurantId: "restaurant-1",
        name: "Spicy chicken bowl",
        price: 299,
        dietaryFlags: ["high-protein"],
        vectorScore: 0.92,
        popularityScore: 0.4,
        distanceScore: 0.8,
        blendedScore: 0.79,
        distanceKm: 2.1,
        restaurant: {
          _id: "restaurant-1",
          name: "Protein Kitchen",
          image: "https://cdn.test/restaurant.jpg",
          isOpen: true,
          isVerified: true,
          autoLocation: {
            coordinates: [85.3, 23.1],
          },
        },
      },
    ] as any);

    const res = await request(buildApp())
      .post("/api/search/semantic")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: "spicy chicken under 300",
        latitude: 23.1,
        longitude: 85.3,
        radiusKm: 8,
        limit: 10,
        filters: {
          maxPrice: 300,
          dietaryFlags: ["high-protein"],
          isVeg: false,
          cuisine: "Indian",
        },
      })
      .expect(200);

    expect(mockedRequestEmbedding).toHaveBeenCalledWith(
      "spicy chicken under 300",
      "RETRIEVAL_QUERY"
    );

    const pipeline = mockedMenuItems.aggregate.mock.calls[0][0] as any[];
    expect(pipeline[0].$vectorSearch).toMatchObject({
      index: "menu_embedding_vector_index",
      path: "embedding",
      queryVector: [0.1, 0.2, 0.3],
      filter: {
        isAvailable: true,
        price: { $lte: 300 },
        dietaryFlags: { $in: ["high-protein"] },
        cuisine: "Indian",
        restaurantId: { $in: ["restaurant-1"] },
      },
    });
    expect(mockedRestaurant.aggregate).toHaveBeenCalledWith([
      expect.objectContaining({
        $geoNear: expect.objectContaining({
          maxDistance: 8000,
          query: {
            isVerified: true,
            isOpen: true,
          },
        }),
      }),
    ]);
    expect(pipeline).toEqual(
      expect.arrayContaining([
        {
          $lookup: {
            from: "restaurants",
            localField: "restaurantId",
            foreignField: "_id",
            as: "restaurant",
          },
        },
        {
          $match: {
            "restaurant.isVerified": true,
            "restaurant.isOpen": true,
          },
        },
      ])
    );

    expect(res.body).toEqual({
      success: true,
      count: 1,
      results: [
        {
          restaurant: expect.objectContaining({
            _id: "restaurant-1",
            name: "Protein Kitchen",
            distanceKm: 2.1,
          }),
          dishes: [
            expect.objectContaining({
              _id: "dish-1",
              name: "Spicy chicken bowl",
              blendedScore: 0.79,
            }),
          ],
        },
      ],
    });
  });

  it("rejects unauthenticated semantic search", async () => {
    await request(buildApp())
      .post("/api/search/semantic")
      .send({
        query: "healthy dinner",
        latitude: 23.1,
        longitude: 85.3,
      })
      .expect(401);

    expect(mockedMenuItems.aggregate).not.toHaveBeenCalled();
  });
});

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import UserTasteProfile from "../models/UserTasteProfile.js";
import recommendationRoutes from "../routes/recommendations.js";

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

jest.mock("../models/UserTasteProfile.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

const mockedMenuItems = MenuItems as jest.Mocked<typeof MenuItems>;
const mockedRestaurant = Restaurant as jest.Mocked<typeof Restaurant>;
const mockedTasteProfile = UserTasteProfile as jest.Mocked<typeof UserTasteProfile>;

describe("GET /api/recommendations/home", () => {
  const jwtSecret = "test-secret";
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/recommendations", recommendationRoutes);
    return app;
  };

  const token = jwt.sign({ user: { _id: userId, role: "customer" } }, jwtSecret);

  it("uses taste profile centroid for personalized recommendations", async () => {
    mockedRestaurant.aggregate.mockResolvedValue([
      {
        _id: "restaurant-1",
        name: "Protein Kitchen",
        isOpen: true,
        distanceKm: 1.4,
      },
    ] as any);
    mockedTasteProfile.findOne.mockResolvedValue({
      embeddingCentroid: [0.1, 0.2, 0.3],
    } as any);
    mockedMenuItems.aggregate.mockResolvedValue([
      {
        _id: "dish-1",
        name: "Paneer salad",
        restaurant: { _id: "restaurant-1", name: "Protein Kitchen" },
      },
    ] as any);

    const res = await request(buildApp())
      .get("/api/recommendations/home")
      .query({ latitude: 23.1, longitude: 85.3, radiusKm: 10, limit: 8 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(mockedTasteProfile.findOne).toHaveBeenCalledWith({ userId });
    const pipeline = mockedMenuItems.aggregate.mock.calls[0][0] as any[];
    expect(pipeline[0].$vectorSearch).toMatchObject({
      index: "menu_embedding_vector_index",
      path: "embedding",
      queryVector: [0.1, 0.2, 0.3],
      filter: {
        isAvailable: true,
        restaurantId: { $in: ["restaurant-1"] },
      },
    });
    expect(res.body.forYou).toEqual([
      expect.objectContaining({ _id: "dish-1", name: "Paneer salad" }),
    ]);
    expect(res.body.popularNearby).toHaveLength(1);
  });

  it("returns cold-start popular nearby restaurants without a profile", async () => {
    mockedRestaurant.aggregate.mockResolvedValue([
      {
        _id: "restaurant-1",
        name: "Protein Kitchen",
        isOpen: true,
        distanceKm: 1.4,
      },
    ] as any);
    mockedTasteProfile.findOne.mockResolvedValue(null);

    const res = await request(buildApp())
      .get("/api/recommendations/home")
      .query({ latitude: 23.1, longitude: 85.3 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      forYou: [],
      popularNearby: [
        expect.objectContaining({
          _id: "restaurant-1",
          name: "Protein Kitchen",
        }),
      ],
    });
    expect(mockedMenuItems.aggregate).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated recommendations", async () => {
    await request(buildApp())
      .get("/api/recommendations/home")
      .query({ latitude: 23.1, longitude: 85.3 })
      .expect(401);
  });
});


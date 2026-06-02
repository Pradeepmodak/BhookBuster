import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import analyticsRoutes from "../routes/analytics.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { generateInsights } from "../lib/insights.js";
import { extractAskTemplate } from "../controllers/analytics.js";

jest.mock("../models/Order.js", () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock("../models/Restaurant.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../lib/insights.js", () => ({
  generateInsights: jest.fn(),
}));

const mockedOrder = Order as jest.Mocked<typeof Order>;
const mockedRestaurant = Restaurant as jest.Mocked<typeof Restaurant>;
const mockedGenerateInsights = generateInsights as jest.Mock;

describe("analytics routes", () => {
  const jwtSecret = "test-secret";
  const restaurantId = "507f1f77bcf86cd799439013";
  const sellerId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/analytics", analyticsRoutes);
    return app;
  };

  const tokenFor = (user: { _id: string; role: string }) =>
    jwt.sign({ user }, jwtSecret);

  it("rejects restaurant analytics when the seller does not own the restaurant", async () => {
    mockedRestaurant.findById.mockResolvedValue({
      _id: restaurantId,
      ownerId: "other-seller",
      name: "Other Restaurant",
    } as any);

    await request(buildApp())
      .get("/api/analytics/revenue")
      .query({ restaurantId })
      .set("Authorization", `Bearer ${tokenFor({ _id: sellerId, role: "seller" })}`)
      .expect(403);

    expect(mockedOrder.aggregate).not.toHaveBeenCalled();
  });

  it("allows admin users to read scoped restaurant analytics", async () => {
    mockedRestaurant.findById.mockResolvedValue({
      _id: restaurantId,
      ownerId: "other-seller",
      name: "Admin Visible Restaurant",
    } as any);
    mockedOrder.aggregate.mockResolvedValue([
      {
        dailyRevenue: [{ date: "2026-05-01", revenue: 1200, orderCount: 3 }],
        paymentMethodSplit: [{ method: "stripe", revenue: 1200, orderCount: 3 }],
        totals: [{ totalRevenue: 1200, avgOrderValue: 400, orderCount: 3 }],
      },
    ] as any);

    const res = await request(buildApp())
      .get("/api/analytics/revenue")
      .query({ restaurantId, from: "2026-05-01", to: "2026-05-30" })
      .set("Authorization", `Bearer ${tokenFor({ _id: "admin-1", role: "admin" })}`)
      .expect(200);

    expect(res.body.avgOrderValue).toBe(400);
    const pipeline = mockedOrder.aggregate.mock.calls[0][0] as any[];
    expect(pipeline[0].$match.restaurantId).toBe(restaurantId);
  });

  it("extracts only supported ask-your-data templates", () => {
    expect(
      extractAskTemplate({
        summary: "top_dishes_by_revenue",
        anomalies: [],
        recommendations: [],
      })
    ).toBe("top_dishes_by_revenue");
    expect(
      extractAskTemplate({
        summary: "no_match",
        anomalies: [],
        recommendations: [],
      })
    ).toBeNull();
    expect(
      extractAskTemplate({
        summary: "show customer names",
        anomalies: [],
        recommendations: [],
      })
    ).toBeNull();
  });

  it("rejects ask-your-data questions that do not map to approved templates", async () => {
    mockedGenerateInsights.mockResolvedValue({
      summary: "no_match",
      anomalies: [],
      recommendations: [],
    });

    const res = await request(buildApp())
      .post("/api/analytics/ask")
      .set("Authorization", `Bearer ${tokenFor({ _id: sellerId, role: "seller" })}`)
      .send({
        question: "What is the mobile number for my best customer?",
        restaurantId,
      })
      .expect(400);

    expect(res.body).toEqual({ error: "I cannot answer that yet." });
    expect(mockedOrder.aggregate).not.toHaveBeenCalled();
  });

  it("scopes ask-your-data aggregations to the owned restaurant", async () => {
    mockedGenerateInsights
      .mockResolvedValueOnce({
        summary: "top_dishes_by_revenue",
        anomalies: [],
        recommendations: [],
      })
      .mockResolvedValueOnce({
        summary: "Paneer Roll is the top dish.",
        anomalies: [],
        recommendations: ["Keep it visible during dinner hours."],
      });
    mockedRestaurant.findById.mockResolvedValue({
      _id: restaurantId,
      ownerId: sellerId,
      name: "Seller Restaurant",
    } as any);
    mockedOrder.aggregate.mockResolvedValue([
      { itemId: "item-1", name: "Paneer Roll", orderCount: 12, revenue: 2400 },
    ] as any);

    const res = await request(buildApp())
      .post("/api/analytics/ask")
      .set("Authorization", `Bearer ${tokenFor({ _id: sellerId, role: "seller" })}`)
      .send({
        question: "Which dishes made the most revenue?",
        restaurantId,
      })
      .expect(200);

    expect(res.body.template).toBe("top_dishes_by_revenue");
    const pipeline = mockedOrder.aggregate.mock.calls[0][0] as any[];
    expect(pipeline[0].$match.restaurantId).toBe(restaurantId);
  });
});


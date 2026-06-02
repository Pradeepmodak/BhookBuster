import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("redis", () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    isOpen: false,
  }),
}));

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import orderRoutes from "../routes/order.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";

jest.mock("../models/Restaurant.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));
jest.mock("../models/Order.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

const mockedRestaurant = Restaurant as jest.Mocked<typeof Restaurant>;
const mockedOrder = Order as jest.Mocked<typeof Order>;

describe("GET /api/order/restaurant/:restaurantId", () => {
  const jwtSecret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/order", orderRoutes);
    return app;
  };

  const sellerToken = jwt.sign(
    { user: { _id: "seller-1", role: "seller" } },
    jwtSecret
  );

  it("returns restaurant orders for the owning seller", async () => {
    mockedRestaurant.findOne.mockResolvedValue({
      _id: "restaurant-1",
      ownerId: "seller-1",
    } as any);

    const limit = jest.fn().mockResolvedValue([{ _id: "order-1" }]);
    const sort = jest.fn().mockReturnValue({ limit });
    mockedOrder.find.mockReturnValue({ sort } as any);

    const res = await request(buildApp())
      .get("/api/order/restaurant/restaurant-1")
      .set("Authorization", `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.orders).toEqual([{ _id: "order-1" }]);
    expect(mockedRestaurant.findOne).toHaveBeenCalledWith({
      _id: "restaurant-1",
      ownerId: "seller-1",
    });
    expect(mockedOrder.find).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      paymentStatus: "paid",
    });
  });

  it("rejects sellers that do not own the restaurant", async () => {
    mockedRestaurant.findOne.mockResolvedValue(null);

    await request(buildApp())
      .get("/api/order/restaurant/restaurant-1")
      .set("Authorization", `Bearer ${sellerToken}`)
      .expect(403);

    expect(mockedOrder.find).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated restaurant order reads", async () => {
    await request(buildApp())
      .get("/api/order/restaurant/restaurant-1")
      .expect(401);

    expect(mockedOrder.find).not.toHaveBeenCalled();
  });
});

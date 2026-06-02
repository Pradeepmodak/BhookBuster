import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import eventRoutes from "../routes/events.js";
import UserFoodEvent from "../models/UserFoodEvent.js";
import { publishUserFoodEvent } from "../config/userEvents.publisher.js";
import { resetEventRateLimitsForTests } from "../controllers/events.js";

jest.mock("../models/UserFoodEvent.js", () => ({
  __esModule: true,
  USER_FOOD_EVENT_TYPES: [
    "search",
    "impression",
    "click",
    "addToCart",
    "favourite",
    "rating",
    "orderPaid",
  ],
  default: {
    create: jest.fn(),
  },
}));

jest.mock("../config/userEvents.publisher.js", () => ({
  publishUserFoodEvent: jest.fn(),
}));

const mockedUserFoodEvent = UserFoodEvent as jest.Mocked<typeof UserFoodEvent>;
const mockedPublishUserFoodEvent = publishUserFoodEvent as jest.Mock;

describe("POST /api/events", () => {
  const jwtSecret = "test-secret";
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    resetEventRateLimitsForTests();
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/events", eventRoutes);
    return app;
  };

  const token = jwt.sign({ user: { _id: userId, role: "customer" } }, jwtSecret);

  it("stores and publishes authenticated food events", async () => {
    mockedUserFoodEvent.create.mockResolvedValue({
      _id: "event-1",
    } as any);

    const res = await request(buildApp())
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventType: "click",
        itemId: "507f1f77bcf86cd799439012",
        restaurantId: "507f1f77bcf86cd799439013",
      })
      .expect(201);

    expect(res.body).toEqual({ success: true, eventId: "event-1" });
    expect(mockedUserFoodEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "click",
      })
    );
    expect(mockedPublishUserFoodEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        eventType: "click",
        itemId: "507f1f77bcf86cd799439012",
      })
    );
  });

  it("rejects invalid event types", async () => {
    await request(buildApp())
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "invalid" })
      .expect(400);
  });

  it("rejects unauthenticated events", async () => {
    await request(buildApp())
      .post("/api/events")
      .send({ eventType: "click" })
      .expect(401);
  });

  it("rate-limits users to 60 events per minute", async () => {
    mockedUserFoodEvent.create.mockResolvedValue({
      _id: "event-1",
    } as any);

    const app = buildApp();

    for (let index = 0; index < 60; index += 1) {
      await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${token}`)
        .send({ eventType: "impression" })
        .expect(201);
    }

    await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "impression" })
      .expect(429);
  });
});

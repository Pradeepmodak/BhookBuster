import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import axios from "axios";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import riderRoutes from "../routes/rider.js";
import { Rider } from "../models/Rider.js";

jest.mock("axios");
jest.mock("../models/Rider.js", () => ({
  Rider: {
    findOne: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRider = Rider as jest.Mocked<typeof Rider>;

describe("POST /api/rider/location", () => {
  const jwtSecret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    process.env.RESTAURANT_SERVICE = "http://restaurant.test";
    process.env.REALTIME_SERVICE = "http://realtime.test";
    process.env.INTERNAL_SERVICE_KEY = "internal-key";
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/rider", riderRoutes);
    return app;
  };

  const token = jwt.sign(
    { user: { _id: "user-rider-1", role: "rider", name: "Rider" } },
    jwtSecret
  );

  it("proxies authenticated rider location updates to realtime", async () => {
    mockedRider.findOne.mockResolvedValue({
      _id: { toString: () => "rider-profile-1" },
    } as any);
    mockedAxios.get.mockResolvedValue({
      data: {
        _id: "order-1",
        userId: "customer-1",
      },
    });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    await request(buildApp())
      .post("/api/rider/location")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: "order-1", latitude: 23.1, longitude: 85.3 })
      .expect(200);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://realtime.test/api/v1/internal/emit",
      {
        event: "rider:location",
        room: "user:customer-1",
        payload: { latitude: 23.1, longitude: 85.3 },
      },
      {
        headers: {
          "x-internal-key": "internal-key",
        },
      }
    );
  });

  it("rejects unauthenticated location updates", async () => {
    await request(buildApp())
      .post("/api/rider/location")
      .send({ orderId: "order-1", latitude: 23.1, longitude: 85.3 })
      .expect(401);

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

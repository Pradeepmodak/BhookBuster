import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import axios from "axios";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockStripeRetrieve = jest.fn();
const mockStripeCreate = jest.fn();

jest.mock("axios");
jest.mock("../config/payment.producer.js", () => ({
  publishPaymentSuccess: jest.fn(),
}));
jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
        retrieve: mockStripeRetrieve,
      },
    },
  })),
}));

const paymentRoutes = require("../routes/payments.js").default;
const { publishPaymentSuccess } = require("../config/payment.producer.js");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedPublishPaymentSuccess = publishPaymentSuccess as jest.Mock;

describe("payment routes", () => {
  const jwtSecret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    process.env.RESTAURANT_SERVICE = "http://restaurant.test";
    process.env.INTERNAL_SERVICE_KEY = "internal-key";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.FRONTEND_URL = "http://localhost:5173";
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/payment", paymentRoutes);
    return app;
  };

  const token = jwt.sign(
    { user: { _id: "customer-1", role: "customer" } },
    jwtSecret
  );

  it("verifies paid Stripe sessions before publishing payment success", async () => {
    mockStripeRetrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: { orderId: "order-1" },
      amount_total: 19900,
      currency: "inr",
    });
    mockedAxios.get.mockResolvedValue({
      data: {
        orderId: "order-1",
        amount: 199,
        currency: "INR",
        userId: "customer-1",
      },
    });

    await request(buildApp())
      .post("/api/payment/stripe/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId: "cs_test_1" })
      .expect(200);

    expect(mockedPublishPaymentSuccess).toHaveBeenCalledWith({
      orderId: "order-1",
      paymentId: "cs_test_1",
      provider: "stripe",
    });
  });

  it.each([
    ["/api/payment/create", { orderId: "order-1" }],
    ["/api/payment/verify", { orderId: "order-1" }],
    ["/api/payment/stripe/create", { orderId: "order-1" }],
    ["/api/payment/stripe/verify", { sessionId: "cs_test_1" }],
  ])("rejects unauthenticated payment calls to %s", async (path, body) => {
    await request(buildApp()).post(path).send(body).expect(401);
    expect(mockedPublishPaymentSuccess).not.toHaveBeenCalled();
  });

  it("rejects Stripe sessions with amount mismatches", async () => {
    mockStripeRetrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: { orderId: "order-1" },
      amount_total: 10000,
      currency: "inr",
    });
    mockedAxios.get.mockResolvedValue({
      data: {
        orderId: "order-1",
        amount: 199,
        currency: "INR",
        userId: "customer-1",
      },
    });

    await request(buildApp())
      .post("/api/payment/stripe/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId: "cs_test_1" })
      .expect(400);

    expect(mockedPublishPaymentSuccess).not.toHaveBeenCalled();
  });
});

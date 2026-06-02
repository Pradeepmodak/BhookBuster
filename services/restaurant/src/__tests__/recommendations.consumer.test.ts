import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { startRecommendationsConsumer } from "../consumers/recommendations.consumer.js";
import Order from "../models/Order.js";
import MenuItems from "../models/MenuItems.js";
import UserTasteProfile from "../models/UserTasteProfile.js";

const fakeChannel = {
  assertQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
};

jest.mock("../config/rabbitmq.js", () => ({
  getChannel: () => fakeChannel,
}));

jest.mock("../models/Order.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../models/MenuItems.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("../models/UserTasteProfile.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const mockedOrder = Order as jest.Mocked<typeof Order>;
const mockedMenuItems = MenuItems as jest.Mocked<typeof MenuItems>;
const mockedTasteProfile = UserTasteProfile as jest.Mocked<typeof UserTasteProfile>;

describe("recommendations consumer", () => {
  beforeEach(() => {
    process.env.USER_EVENT_QUEUE = "user-events";
    jest.clearAllMocks();
  });

  it("updates a user's taste profile when an orderPaid event is consumed", async () => {
    const profile = {
      embeddingCentroid: [0.5, 0.5],
      cuisineWeights: new Map([["Indian", 2]]),
      priceBand: { min: 100, max: 250 },
      dietaryFlags: ["veg"],
      save: jest.fn(),
    };

    mockedOrder.findById.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      paymentStatus: "paid",
      items: [
        { itemId: "507f1f77bcf86cd799439012", price: 200, quantity: 2 },
        { itemId: "507f1f77bcf86cd799439013", price: 400, quantity: 1 },
      ],
    } as any);
    mockedMenuItems.find.mockResolvedValue([
      {
        _id: { toString: () => "507f1f77bcf86cd799439012" },
        embedding: [1, 0],
        cuisine: "Indian",
        dietaryFlags: ["high-protein"],
      },
      {
        _id: { toString: () => "507f1f77bcf86cd799439013" },
        embedding: [0, 1],
        cuisine: "Mexican",
        dietaryFlags: ["gluten-free"],
      },
    ] as any);
    mockedTasteProfile.findOne.mockResolvedValue(profile as any);

    await startRecommendationsConsumer();
    const consumeHandler = fakeChannel.consume.mock.calls[0][1] as Function;

    await consumeHandler({
      content: Buffer.from(
        JSON.stringify({
          eventType: "orderPaid",
          metadata: { orderId: "order-1" },
        })
      ),
    });

    expect(fakeChannel.assertQueue).toHaveBeenCalledWith("user-events", {
      durable: true,
    });
    expect(profile.embeddingCentroid[0]).toBeCloseTo(0.5333, 3);
    expect(profile.embeddingCentroid[1]).toBeCloseTo(0.4666, 3);
    expect(profile.cuisineWeights.get("Indian")).toBe(4);
    expect(profile.cuisineWeights.get("Mexican")).toBe(1);
    expect(profile.priceBand).toEqual({ min: 100, max: 400 });
    expect(profile.dietaryFlags).toEqual(
      expect.arrayContaining(["veg", "high-protein", "gluten-free"])
    );
    expect(profile.save).toHaveBeenCalled();
    expect(fakeChannel.ack).toHaveBeenCalled();
  });
});


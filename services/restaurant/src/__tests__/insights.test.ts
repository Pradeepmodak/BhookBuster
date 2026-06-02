import { describe, expect, it } from "@jest/globals";
import { stripAnalyticsPii } from "../lib/insights.js";

describe("stripAnalyticsPii", () => {
  it("removes mobile, phone, email and deliveryAddress fields recursively", () => {
    const sanitized = stripAnalyticsPii({
      revenue: 1500,
      owner: {
        email: "owner@example.com",
        phone: "9999999999",
        name: "Owner",
      },
      orders: [
        {
          id: "order-1",
          mobile: "8888888888",
          deliveryAddress: {
            formattedAddress: "Hidden Street",
          },
          totalAmount: 500,
        },
      ],
    });

    expect(sanitized).toEqual({
      revenue: 1500,
      owner: {
        name: "Owner",
      },
      orders: [
        {
          id: "order-1",
          totalAmount: 500,
        },
      ],
    });
  });
});


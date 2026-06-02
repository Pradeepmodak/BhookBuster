import axios from "axios";
import { restaurantService } from "../config";

type FoodEventPayload = {
  eventType:
    | "search"
    | "impression"
    | "click"
    | "addToCart"
    | "favourite"
    | "rating"
    | "orderPaid";
  itemId?: string;
  restaurantId?: string;
  query?: string;
  ratingValue?: number;
  metadata?: Record<string, unknown>;
};

export const captureFoodEvent = async (payload: FoodEventPayload) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    await axios.post(`${restaurantService}/api/events`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.log("Food event capture failed", error);
  }
};



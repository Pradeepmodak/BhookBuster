import TryCatch from "../middlewares/trycatch.js";
import { AppError } from "../middlewares/errorHandler.js";
import { ObjectId } from "mongodb";
import {
  fetchAdminStats,
  fetchOrdersTrend,
  fetchPendingRestaurants,
  fetchPendingRiders,
  fetchTopItems,
  markRestaurantVerified,
  markRiderVerified,
} from "../services/admin.js";

export const getPendingRestaurant = TryCatch(async (req, res) => {
  res.json(await fetchPendingRestaurants());
});
export const getPendingRiders = TryCatch(async (req, res) => {
  res.json(await fetchPendingRiders());
});

export const verifyRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    throw new AppError("Invalid restaurant id", 400);
  }

  res.json(await markRestaurantVerified(id));
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    throw new AppError("Invalid rider id", 400);
  }

  res.json(await markRiderVerified(id));
});

export const getAdminStats = TryCatch(async (_req, res) => {
  res.json(await fetchAdminStats());
});

export const getTopItems = TryCatch(async (_req, res) => {
  res.json(await fetchTopItems());
});

export const getOrdersTrend = TryCatch(async (req, res) => {
  const days = Number(req.query.days || 7);
  res.json(await fetchOrdersTrend(days));
});

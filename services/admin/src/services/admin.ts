import { ObjectId, type Document } from "mongodb";
import { AppError } from "../middlewares/errorHandler.js";
import { getCache, setCache } from "../cache/redis.js";
import {
  getMenuItemCollection,
  getOrderCollection,
  getRestaurantCollection,
  getRiderCollection,
  getUserCollection,
} from "../utils/collection.js";

const ADMIN_STATS_TTL = 120;
const ADMIN_TREND_TTL = 180;
const ADMIN_TOP_ITEMS_TTL = 180;

const buildTrendRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

const calculateGrowth = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const fetchPendingRestaurants = async () => {
  const restaurants = await (await getRestaurantCollection())
    .find({ isVerified: false })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    count: restaurants.length,
    restaurants,
  };
};

export const fetchPendingRiders = async () => {
  const riders = await (await getRiderCollection())
    .find({ isVerified: false })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    count: riders.length,
    riders,
  };
};

export const markRestaurantVerified = async (id: string) => {
  const result = await (await getRestaurantCollection()).updateOne(
    { _id: { $eq: new ObjectId(id) } },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new AppError("Restaurant not found", 404);
  }

  return { message: "Restaurant verified successfully" };
};

export const markRiderVerified = async (id: string) => {
  const result = await (await getRiderCollection()).updateOne(
    { _id: { $eq: new ObjectId(id) } },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new AppError("Rider not found", 404);
  }

  return { message: "Rider verified successfully" };
};

export const fetchAdminStats = async () => {
  const cacheKey = "admin:stats";
  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const ordersCollection = await getOrderCollection();
  const userCollection = await getUserCollection();
  const restaurantCollection = await getRestaurantCollection();
  const riderCollection = await getRiderCollection();

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 29);
  currentStart.setHours(0, 0, 0, 0);

  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousEnd.getDate() - 29);
  previousStart.setHours(0, 0, 0, 0);

  const [paidOrders, totalUsers, pendingRestaurants, pendingRiders] = await Promise.all([
    ordersCollection
      .find({ paymentStatus: "paid" })
      .project({ totalAmount: 1, createdAt: 1, status: 1 })
      .toArray(),
    userCollection.countDocuments(),
    restaurantCollection.countDocuments({ isVerified: false }),
    riderCollection.countDocuments({ isVerified: false }),
  ]);

  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0,
  );

  const ordersCount = paidOrders.length;

  const currentRevenue = paidOrders
    .filter((order) => order.createdAt && new Date(order.createdAt) >= currentStart)
    .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const previousRevenue = paidOrders
    .filter((order) => {
      if (!order.createdAt) {
        return false;
      }
      const createdAt = new Date(order.createdAt);
      return createdAt >= previousStart && createdAt <= previousEnd;
    })
    .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const currentOrders = paidOrders.filter(
    (order) => order.createdAt && new Date(order.createdAt) >= currentStart,
  ).length;

  const previousOrders = paidOrders.filter((order) => {
    if (!order.createdAt) {
      return false;
    }
    const createdAt = new Date(order.createdAt);
    return createdAt >= previousStart && createdAt <= previousEnd;
  }).length;

  const peakOrderBuckets = new Map<number, number>();

  paidOrders.forEach((order) => {
    if (!order.createdAt) {
      return;
    }
    const hour = new Date(order.createdAt).getHours();
    peakOrderBuckets.set(hour, (peakOrderBuckets.get(hour) || 0) + 1);
  });

  const peakOrderHour = [...peakOrderBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakOrderTime =
    typeof peakOrderHour === "number"
      ? `${String(peakOrderHour).padStart(2, "0")}:00 - ${String((peakOrderHour + 1) % 24).padStart(2, "0")}:00`
      : "No data";

  const stats = {
    totalRevenue,
    ordersCount,
    usersCount: totalUsers,
    growthPercent: calculateGrowth(currentRevenue, previousRevenue),
    orderGrowthPercent: calculateGrowth(currentOrders, previousOrders),
    peakOrderTime,
    pendingRestaurants,
    pendingRiders,
  };

  await setCache(cacheKey, stats, ADMIN_STATS_TTL);

  return {
    ...stats,
    cached: false,
  };
};

export const fetchTopItems = async () => {
  const cacheKey = "admin:top-items";
  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const orderCollection = await getOrderCollection();
  const menuItemCollection = await getMenuItemCollection();

  const menuItems = await menuItemCollection
    .find({})
    .project({ _id: 1, image: 1, description: 1, price: 1 })
    .toArray();

  const itemMap = new Map(
    menuItems.map((item) => [String(item._id), item]),
  );

  const topItems = await orderCollection
    .aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.itemId",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: {
            $sum: {
              $multiply: ["$items.price", "$items.quantity"],
            },
          },
        },
      },
      { $sort: { quantitySold: -1, revenue: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  const payload = {
    items: topItems.map((item) => {
      const metadata = itemMap.get(item._id);
      return {
        id: item._id,
        name: item.name,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
        image: metadata?.image || "",
        description: metadata?.description || "",
      };
    }),
  };

  await setCache(cacheKey, payload, ADMIN_TOP_ITEMS_TTL);

  return {
    ...payload,
    cached: false,
  };
};

export const fetchOrdersTrend = async (days = 7) => {
  const normalizedDays = Math.max(7, Math.min(days, 30));
  const cacheKey = `admin:orders-trend:${normalizedDays}`;
  const cached = await getCache<Record<string, unknown>>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const { start } = buildTrendRange(normalizedDays);
  const orderCollection = await getOrderCollection();

  const trendDocs = await orderCollection
    .aggregate<Document>([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ])
    .toArray();

  const trendMap = new Map(
    trendDocs.map((doc) => [
      `${doc._id.year}-${doc._id.month}-${doc._id.day}`,
      doc,
    ]),
  );

  const trend = Array.from({ length: normalizedDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const entry = trendMap.get(key);

    return {
      label: formatDayLabel(date),
      revenue: Number(entry?.revenue || 0),
      orders: Number(entry?.orders || 0),
    };
  });

  const payload = {
    days: normalizedDays,
    trend,
  };

  await setCache(cacheKey, payload, ADMIN_TREND_TTL);

  return {
    ...payload,
    cached: false,
  };
};

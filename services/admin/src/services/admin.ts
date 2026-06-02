import { ObjectId, type Document } from "mongodb";
import { AppError } from "../middlewares/errorHandler.js";
import { CACHE_TTL, deleteCache, withCache } from "../cache/redis.js";
import {
  getMenuItemCollection,
  getOrderCollection,
  getRestaurantCollection,
  getRiderCollection,
  getUserCollection,
} from "../utils/collection.js";

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
    cached: false,
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
    cached: false,
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

  await deleteCache("admin:verification:restaurants");
  await deleteCache("admin:stats");

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

  await deleteCache("admin:verification:riders");
  await deleteCache("admin:stats");

  return { message: "Rider verified successfully" };
};

export const fetchAdminStats = async () => {
  const { data, cached } = await withCache({
    key: "admin:stats",
    ttl: CACHE_TTL.stats,
    fetcher: async () => {
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

      const [
        paidOrders,
        totalUsers,
        totalCustomers,
        totalRestaurants,
        totalRiders,
        pendingRestaurants,
        pendingRiders,
      ] = await Promise.all([
        ordersCollection
          .find({ paymentStatus: "paid" })
          .project({
            totalAmount: 1,
            createdAt: 1,
            riderAmount: 1,
            customerDeliveryFee: 1,
            deliveryFee: 1,
            platformFee: 1,
            platformSubsidy: 1,
            estimatedPlatformRevenue: 1,
          })
          .toArray(),
        userCollection.countDocuments({ role: { $ne: "admin" } }),
        userCollection.countDocuments({ role: "customer" }),
        userCollection.countDocuments({ role: "seller" }),
        userCollection.countDocuments({ role: "rider" }),
        restaurantCollection.countDocuments({ isVerified: false }),
        riderCollection.countDocuments({ isVerified: false }),
      ]);

      const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);
      const totalRiderPayout = paidOrders.reduce((sum: number, order: any) => sum + Number(order.riderAmount || 0), 0);
      const totalPlatformSubsidy = paidOrders.reduce(
        (sum: number, order: any) =>
          sum +
          Number(
            order.platformSubsidy ??
              Math.max(0, Number(order.riderAmount || 0) - Number(order.customerDeliveryFee ?? order.deliveryFee ?? 0)),
          ),
        0,
      );
      const netPlatformRevenue = paidOrders.reduce(
        (sum: number, order: any) =>
          sum +
          Number(
            order.estimatedPlatformRevenue ??
              (Number(order.platformFee || 0) +
                Number(order.customerDeliveryFee ?? order.deliveryFee ?? 0) -
                Number(order.riderAmount || 0)),
          ),
        0,
      );
      const ordersCount = paidOrders.length;

      const currentRevenue = paidOrders
        .filter((order: any) => order.createdAt && new Date(order.createdAt) >= currentStart)
        .reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);

      const previousRevenue = paidOrders
        .filter((order: any) => {
          if (!order.createdAt) return false;
          const createdAt = new Date(order.createdAt);
          return createdAt >= previousStart && createdAt <= previousEnd;
        })
        .reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);

      const currentOrders = paidOrders.filter(
        (order: any) => order.createdAt && new Date(order.createdAt) >= currentStart,
      ).length;

      const previousOrders = paidOrders.filter((order: any) => {
        if (!order.createdAt) return false;
        const createdAt = new Date(order.createdAt);
        return createdAt >= previousStart && createdAt <= previousEnd;
      }).length;

      const peakOrderBuckets = new Map<number, number>();
      paidOrders.forEach((order: any) => {
        if (!order.createdAt) return;
        const hour = new Date(order.createdAt).getHours();
        peakOrderBuckets.set(hour, (peakOrderBuckets.get(hour) || 0) + 1);
      });

      const peakOrderHour = [...peakOrderBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const peakOrderTime =
        typeof peakOrderHour === "number"
          ? `${String(peakOrderHour).padStart(2, "0")}:00 - ${String((peakOrderHour + 1) % 24).padStart(2, "0")}:00`
          : "No data";

      return {
        totalRevenue,
        totalRiderPayout,
        totalPlatformSubsidy,
        netPlatformRevenue,
        ordersCount,
        usersCount: totalUsers,
        totalCustomers,
        totalRestaurants,
        totalRiders,
        growthPercent: calculateGrowth(currentRevenue, previousRevenue),
        orderGrowthPercent: calculateGrowth(currentOrders, previousOrders),
        peakOrderTime,
        pendingRestaurants,
        pendingRiders,
      };
    },
  });

  return { ...data, cached };
};

export const fetchTopItems = async () => {
  const { data, cached } = await withCache({
    key: "admin:top-items",
    ttl: CACHE_TTL.trends,
    fetcher: async () => {
      const orderCollection = await getOrderCollection();
      const menuItemCollection = await getMenuItemCollection();

      const menuItems = await menuItemCollection
        .find({})
        .project({ _id: 1, image: 1, description: 1, price: 1 })
        .toArray();

      const itemMap = new Map(menuItems.map((item: any) => [String(item._id), item]));

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

      return {
        items: topItems.map((item: any) => {
          const metadata: any = itemMap.get(item._id);
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
    },
  });

  return { ...data, cached };
};

export const fetchOrdersTrend = async (days = 7) => {
  const normalizedDays = Math.max(7, Math.min(days, 30));
  const { data, cached } = await withCache({
    key: `admin:orders-trend:${normalizedDays}`,
    ttl: CACHE_TTL.trends,
    fetcher: async () => {
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
                year: { $year: { date: "$createdAt", timezone: "Asia/Kolkata" } },
                month: { $month: { date: "$createdAt", timezone: "Asia/Kolkata" } },
                day: { $dayOfMonth: { date: "$createdAt", timezone: "Asia/Kolkata" } },
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

      const trendMap = new Map(trendDocs.map((doc: any) => [`${doc._id.year}-${doc._id.month}-${doc._id.day}`, doc]));

      const trend = Array.from({ length: normalizedDays }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const entry: any = trendMap.get(key);

        return {
          label: formatDayLabel(date),
          revenue: Number(entry?.revenue || 0),
          orders: Number(entry?.orders || 0),
        };
      });

      return {
        days: normalizedDays,
        trend,
      };
    },
  });

  return { ...data, cached };
};

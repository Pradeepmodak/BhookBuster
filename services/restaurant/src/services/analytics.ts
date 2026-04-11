import Order from "../models/Order.js";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import { AppError } from "../middlewares/errorHandler.js";
import { CACHE_TTL, withCache } from "../cache/redis.js";

const formatHourRange = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00 - ${String((hour + 1) % 24).padStart(2, "0")}:00`;

const formatGrowth = (current: number, previous: number) => {
  if (!previous) {
    return current ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const getRestaurantDashboardAnalytics = async ({
  restaurantId,
  ownerId,
}: {
  restaurantId: string;
  ownerId: string;
}) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  const { data, cached } = await withCache({
    key: `restaurant:dashboard:${restaurantId}`,
    ttl: CACHE_TTL.stats,
    fetcher: async () => {
      // We aggregate once here so the frontend receives interview-ready BI metrics
      // without triggering multiple redundant DB reads per dashboard visit.
      const paidOrders = await Order.find({
        restaurantId,
        paymentStatus: "paid",
      }).sort({ createdAt: 1 });

      const menuItems = await MenuItems.find({ restaurantId }).select("_id name");
      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const customerDeliveryFees = paidOrders.reduce(
        (sum, order) => sum + Number(order.customerDeliveryFee ?? order.deliveryFee ?? 0),
        0,
      );
      const riderPayout = paidOrders.reduce((sum, order) => sum + Number(order.riderAmount || 0), 0);
      const platformSubsidy = paidOrders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.platformSubsidy ??
              Math.max(0, Number(order.riderAmount || 0) - Number(order.customerDeliveryFee ?? order.deliveryFee ?? 0)),
          ),
        0,
      );
      const netPlatformRevenue = paidOrders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.estimatedPlatformRevenue ??
              (Number(order.platformFee || 0) +
                Number(order.customerDeliveryFee ?? order.deliveryFee ?? 0) -
                Number(order.riderAmount || 0)),
          ),
        0,
      );
      const delivered = paidOrders.filter((order) => order.status === "delivered").length;
      const averageOrderValue = paidOrders.length ? Number((totalRevenue / paidOrders.length).toFixed(2)) : 0;

      const itemRevenue = new Map<string, { itemId: string; name: string; quantitySold: number; revenue: number }>();
      const hourlyBuckets = new Map<number, { orders: number; revenue: number }>();
      const customerOrderCount = new Map<string, number>();
      const dailyMap = new Map<string, { label: string; revenue: number; orders: number; averageOrderValue: number }>();
      const weeklyMap = new Map<string, { label: string; revenue: number; orders: number; averageOrderValue: number }>();
      const monthlyMap = new Map<string, { label: string; revenue: number; orders: number; averageOrderValue: number }>();

      paidOrders.forEach((order) => {
        customerOrderCount.set(order.userId, (customerOrderCount.get(order.userId) || 0) + 1);

        order.items.forEach((item) => {
          const entry = itemRevenue.get(item.itemId) || {
            itemId: item.itemId,
            name: item.name,
            quantitySold: 0,
            revenue: 0,
          };
          entry.quantitySold += item.quantity;
          entry.revenue += item.quantity * item.price;
          itemRevenue.set(item.itemId, entry);
        });

        const createdAt = new Date(order.createdAt);
        const hour = createdAt.getHours();
        const hourEntry = hourlyBuckets.get(hour) || { orders: 0, revenue: 0 };
        hourEntry.orders += 1;
        hourEntry.revenue += order.totalAmount;
        hourlyBuckets.set(hour, hourEntry);

        const dailyLabel = createdAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const weekLabel = `W${Math.ceil(createdAt.getDate() / 7)} ${createdAt.toLocaleDateString("en-IN", { month: "short" })}`;
        const monthLabel = createdAt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

        const pushSeries = (map: Map<string, { label: string; revenue: number; orders: number; averageOrderValue: number }>, key: string, label: string) => {
          const entry = map.get(key) || { label, revenue: 0, orders: 0, averageOrderValue: 0 };
          entry.revenue += order.totalAmount;
          entry.orders += 1;
          entry.averageOrderValue = Number((entry.revenue / entry.orders).toFixed(2));
          map.set(key, entry);
        };

        pushSeries(dailyMap, dailyLabel, dailyLabel);
        pushSeries(weeklyMap, `${createdAt.getFullYear()}-${createdAt.getMonth()}-${weekLabel}`, weekLabel);
        pushSeries(monthlyMap, monthLabel, monthLabel);
      });

      const sortedItems = Array.from(itemRevenue.values()).sort((a, b) => b.revenue - a.revenue);
      const topItems = sortedItems.slice(0, 5).map((item) => ({
        ...item,
        revenueShare: totalRevenue ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }));

      const menuItemNames = new Map(menuItems.map((item) => [item._id.toString(), item.name]));
      const lowPerformingItems = menuItems
        .map((item) => itemRevenue.get(item._id.toString()) || { itemId: item._id.toString(), name: item.name, quantitySold: 0, revenue: 0 })
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          revenueShare: totalRevenue ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
          name: menuItemNames.get(item.itemId) || item.name,
        }));

      const hourlyPerformance = Array.from(hourlyBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, value]) => ({
          hour: formatHourRange(hour),
          orders: value.orders,
          revenue: value.revenue,
        }));

      const peakHour = [...hourlyBuckets.entries()].sort((a, b) => b[1].orders - a[1].orders)[0];
      const peakOrderTime = peakHour ? formatHourRange(peakHour[0]) : "No data";

      const newCustomers = [...customerOrderCount.values()].filter((count) => count === 1).length;
      const returningCustomers = [...customerOrderCount.values()].filter((count) => count > 1).length;

      const currentWeekRevenue = paidOrders
        .filter((order) => new Date(order.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .reduce((sum, order) => sum + order.totalAmount, 0);
      const previousWeekRevenue = paidOrders
        .filter((order) => {
          const createdAt = new Date(order.createdAt).getTime();
          const now = Date.now();
          return createdAt < now - 7 * 24 * 60 * 60 * 1000 && createdAt >= now - 14 * 24 * 60 * 60 * 1000;
        })
        .reduce((sum, order) => sum + order.totalAmount, 0);

      const weekOverWeekGrowth = formatGrowth(currentWeekRevenue, previousWeekRevenue);
      const biggestContributor = topItems[0];
      const weakestItem = lowPerformingItems[0];

      const insights = [
        `Peak order time is ${peakOrderTime} based on completed paid orders.`,
        biggestContributor
          ? `${biggestContributor.name} contributes ${biggestContributor.revenueShare}% of revenue so far.`
          : "No top-selling item insight yet.",
        weakestItem
          ? `${weakestItem.name} is showing low demand with Rs ${weakestItem.revenue} in revenue.`
          : "No low-demand item detected yet.",
        `${weekOverWeekGrowth >= 0 ? "Up" : "Down"} ${Math.abs(weekOverWeekGrowth)}% week over week in revenue.`,
        platformSubsidy > 0
          ? `Platform subsidy is Rs ${platformSubsidy} so far to keep delivery attractive.`
          : "No platform subsidy has been needed so far.",
      ];

      return {
        revenue: totalRevenue,
        orders: paidOrders.length,
        delivered,
        averageOrderValue,
        customerDeliveryFees,
        riderPayout,
        platformSubsidy,
        netPlatformRevenue,
        newCustomers,
        returningCustomers,
        peakOrderTime,
        weekOverWeekGrowth,
        insights,
        topItems,
        lowPerformingItems,
        hourlyPerformance,
        revenueSeries: {
          daily: Array.from(dailyMap.values()).slice(-7),
          weekly: Array.from(weeklyMap.values()).slice(-8),
          monthly: Array.from(monthlyMap.values()).slice(-6),
        },
      };
    },
  });

  return { ...data, cached };
};

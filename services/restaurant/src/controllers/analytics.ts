import mongoose from "mongoose";
import type { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";
import { generateInsights, type InsightResponse } from "../lib/insights.js";
import { generateLocalInsights, type AnalyticsPayload } from "../lib/localInsights.js";

type DateRange = {
  from: Date;
  to: Date;
};

type AnalyticsScope = DateRange & {
  restaurantId?: string;
};

type RestaurantScope = AnalyticsScope & {
  restaurantName?: string;
};

type AskTemplate =
  | "top_dishes_by_revenue"
  | "revenue_trend"
  | "peak_hours"
  | "repeat_customer_rate"
  | "cancellation_rate"
  | "payment_method_split"
  | "rider_delivery_time"
  | "top_restaurants";

const ASK_TEMPLATES: Array<{ id: AskTemplate; adminOnly?: boolean }> = [
  { id: "top_dishes_by_revenue" },
  { id: "revenue_trend" },
  { id: "peak_hours" },
  { id: "repeat_customer_rate" },
  { id: "cancellation_rate" },
  { id: "payment_method_split" },
  { id: "rider_delivery_time", adminOnly: true },
  { id: "top_restaurants", adminOnly: true },
];

const ASK_TEMPLATE_IDS = ASK_TEMPLATES.map((template) => template.id);
const DEFAULT_LOOKBACK_DAYS = 30;
const INSIGHTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — preserve free-tier quota
const insightsCache = new Map<
  string,
  {
    expiresAt: number;
    value: unknown;
  }
>();

class AnalyticsHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const parseDateValue = (value: unknown) => {
  const rawValue = firstValue(value);
  if (!rawValue) {
    return undefined;
  }

  const date = new Date(String(rawValue));
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateRange = (source: Record<string, unknown>): DateRange => {
  const parsedTo = parseDateValue(source.to);
  const parsedFrom = parseDateValue(source.from);

  if (parsedTo === null || parsedFrom === null) {
    throw new AnalyticsHttpError(400, "Invalid from or to date");
  }

  const to = parsedTo || new Date();
  const from =
    parsedFrom ||
    new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  if (from.getTime() > to.getTime()) {
    throw new AnalyticsHttpError(400, "from must be before to");
  }

  return { from, to };
};

const parseLimit = (value: unknown, fallback = 10, max = 1000) => {
  const parsed = Number(firstValue(value) || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
};

const ensureUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new AnalyticsHttpError(401, "Unauthorized");
  }

  return req.user;
};

const ensureRestaurantAccess = async (
  req: AuthenticatedRequest,
  restaurantId: unknown
) => {
  const user = ensureUser(req);
  const id = String(firstValue(restaurantId) || "");

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AnalyticsHttpError(400, "Valid restaurantId is required");
  }

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw new AnalyticsHttpError(404, "Restaurant not found");
  }

  if (
    user.role !== "admin" &&
    restaurant.ownerId.toString() !== user._id.toString()
  ) {
    throw new AnalyticsHttpError(403, "Forbidden");
  }

  return restaurant;
};

const getRestaurantScope = async (
  req: AuthenticatedRequest,
  source: Record<string, unknown>
): Promise<RestaurantScope> => {
  const restaurant = await ensureRestaurantAccess(req, source.restaurantId);
  const range = parseDateRange(source);

  return {
    ...range,
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
  };
};

const buildOrderMatch = (scope: AnalyticsScope, paidOnly = true) => {
  const match: Record<string, unknown> = {
    createdAt: {
      $gte: scope.from,
      $lte: scope.to,
    },
  };

  if (scope.restaurantId) {
    match.restaurantId = scope.restaurantId;
  }

  if (paidOnly) {
    match.paymentStatus = "paid";
  }

  return match;
};

export const getRevenueAnalytics = async (scope: AnalyticsScope) => {
  const [result] = await Order.aggregate([
    { $match: buildOrderMatch(scope) },
    {
      $facet: {
        dailyRevenue: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              revenue: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 1000 },
          {
            $project: {
              _id: 0,
              date: "$_id",
              revenue: { $round: ["$revenue", 2] },
              orderCount: 1,
            },
          },
        ],
        paymentMethodSplit: [
          {
            $group: {
              _id: "$paymentMethod",
              revenue: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              method: "$_id",
              revenue: { $round: ["$revenue", 2] },
              orderCount: 1,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
              avgOrderValue: { $avg: "$totalAmount" },
            },
          },
          {
            $project: {
              _id: 0,
              totalRevenue: { $round: ["$totalRevenue", 2] },
              orderCount: 1,
              avgOrderValue: { $round: ["$avgOrderValue", 2] },
            },
          },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0] || {
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
  };

  return {
    dailyRevenue: result?.dailyRevenue || [],
    paymentMethodSplit: result?.paymentMethodSplit || [],
    avgOrderValue: totals.avgOrderValue || 0,
    totalRevenue: totals.totalRevenue || 0,
    orderCount: totals.orderCount || 0,
  };
};

export const getDishAnalytics = async (
  scope: AnalyticsScope,
  limit = 10
) =>
  Order.aggregate([
    { $match: buildOrderMatch(scope) },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          itemId: "$items.itemId",
          name: "$items.name",
        },
        orderCount: { $sum: "$items.quantity" },
        revenue: {
          $sum: {
            $multiply: ["$items.price", "$items.quantity"],
          },
        },
      },
    },
    { $sort: { revenue: -1, orderCount: -1 } },
    { $limit: Math.min(limit, 1000) },
    {
      $project: {
        _id: 0,
        itemId: "$_id.itemId",
        name: "$_id.name",
        orderCount: 1,
        revenue: { $round: ["$revenue", 2] },
      },
    },
  ]);

export const getPeakHoursAnalytics = async (scope: AnalyticsScope) =>
  Order.aggregate([
    { $match: buildOrderMatch(scope) },
    {
      $group: {
        _id: {
          hour: { $hour: "$createdAt" },
          dayOfWeek: { $dayOfWeek: "$createdAt" },
        },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
    { $limit: 1000 },
    {
      $project: {
        _id: 0,
        hour: "$_id.hour",
        dayOfWeek: "$_id.dayOfWeek",
        orderCount: 1,
      },
    },
  ]);

export const getCustomerAnalytics = async (scope: AnalyticsScope) => {
  const [result] = await Order.aggregate([
    {
      $match: {
        ...buildOrderMatch(scope),
        createdAt: { $lte: scope.to },
      },
    },
    {
      $group: {
        _id: "$userId",
        firstOrderDate: { $min: "$createdAt" },
        ordersInRange: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", scope.from] },
                  { $lte: ["$createdAt", scope.to] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $match: { ordersInRange: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        repeatCustomers: {
          $sum: {
            $cond: [{ $gt: ["$ordersInRange", 1] }, 1, 0],
          },
        },
        newCustomers: {
          $sum: {
            $cond: [{ $gte: ["$firstOrderDate", scope.from] }, 1, 0],
          },
        },
        returningCustomers: {
          $sum: {
            $cond: [{ $lt: ["$firstOrderDate", scope.from] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCustomers: 1,
        repeatCustomers: 1,
        newCustomers: 1,
        returningCustomers: 1,
        repeatCustomerRate: {
          $cond: [
            { $eq: ["$totalCustomers", 0] },
            0,
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$repeatCustomers", "$totalCustomers"] },
                    100,
                  ],
                },
                2,
              ],
            },
          ],
        },
      },
    },
  ]);

  return (
    result || {
      totalCustomers: 0,
      repeatCustomers: 0,
      repeatCustomerRate: 0,
      newCustomers: 0,
      returningCustomers: 0,
    }
  );
};

export const getCancellationAnalytics = async (scope: AnalyticsScope) => {
  const [result] = await Order.aggregate([
    { $match: buildOrderMatch(scope, false) },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        cancelledOrders: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        cancelledOrders: 1,
        cancellationRate: {
          $cond: [
            { $eq: ["$totalOrders", 0] },
            0,
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$cancelledOrders", "$totalOrders"] },
                    100,
                  ],
                },
                2,
              ],
            },
          ],
        },
      },
    },
  ]);

  return (
    result || {
      totalOrders: 0,
      cancelledOrders: 0,
      cancellationRate: 0,
    }
  );
};

export const getRiderDeliveryTimeAnalytics = async (
  scope: AnalyticsScope,
  limit = 1000
) =>
  Order.aggregate([
    {
      $match: {
        ...buildOrderMatch(scope),
        status: "delivered",
        riderId: { $nin: [null, ""] },
      },
    },
    {
      $project: {
        riderId: 1,
        riderName: 1,
        deliveryMinutes: {
          $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 60000],
        },
      },
    },
    {
      $group: {
        _id: {
          riderId: "$riderId",
          riderName: "$riderName",
        },
        deliveries: { $sum: 1 },
        avgDeliveryMinutes: { $avg: "$deliveryMinutes" },
      },
    },
    { $sort: { avgDeliveryMinutes: 1 } },
    { $limit: Math.min(limit, 1000) },
    {
      $project: {
        _id: 0,
        riderId: "$_id.riderId",
        riderName: "$_id.riderName",
        deliveries: 1,
        avgDeliveryMinutes: { $round: ["$avgDeliveryMinutes", 2] },
      },
    },
  ]);

export const getTopRestaurantsAnalytics = async (
  scope: AnalyticsScope,
  limit = 10
) =>
  Order.aggregate([
    { $match: buildOrderMatch(scope) },
    {
      $group: {
        _id: {
          restaurantId: "$restaurantId",
          restaurantName: "$restaurantName",
        },
        revenue: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1, orderCount: -1 } },
    { $limit: Math.min(limit, 1000) },
    {
      $project: {
        _id: 0,
        restaurantId: "$_id.restaurantId",
        restaurantName: "$_id.restaurantName",
        revenue: { $round: ["$revenue", 2] },
        orderCount: 1,
      },
    },
  ]);

const runCoreAnalytics = async (scope: AnalyticsScope, dishLimit = 10) => {
  const [revenue, topDishes, peakHours, customers] = await Promise.all([
    getRevenueAnalytics(scope),
    getDishAnalytics(scope, dishLimit),
    getPeakHoursAnalytics(scope),
    getCustomerAnalytics(scope),
  ]);

  return {
    revenue,
    topDishes,
    peakHours,
    customers,
  };
};

const buildAnomalyAlerts = (data: {
  cancellationRate: { cancellationRate?: number };
  revenue: { orderCount?: number };
}) => {
  const alerts: string[] = [];

  if ((data.cancellationRate.cancellationRate || 0) >= 10) {
    alerts.push(
      `Cancellation rate is ${data.cancellationRate.cancellationRate}%, which needs review.`
    );
  }

  if ((data.revenue.orderCount || 0) === 0) {
    alerts.push("No paid orders were found for this period.");
  }

  return alerts;
};

const sendAnalyticsError = (res: Response, error: unknown) => {
  if (error instanceof AnalyticsHttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  throw error;
};

const restaurantEndpoint = (
  handler: (scope: RestaurantScope, req: AuthenticatedRequest) => Promise<unknown>
) =>
  TryCatch(async (req: AuthenticatedRequest, res) => {
    try {
      const scope = await getRestaurantScope(req, req.query);
      const payload = await handler(scope, req);
      return res.json(payload);
    } catch (error) {
      return sendAnalyticsError(res, error);
    }
  });

export const revenueAnalytics = restaurantEndpoint((scope) =>
  getRevenueAnalytics(scope)
);

export const dishesAnalytics = restaurantEndpoint((scope, req) =>
  getDishAnalytics(scope, parseLimit(req.query.limit))
);

export const peakHoursAnalytics = restaurantEndpoint((scope) =>
  getPeakHoursAnalytics(scope)
);

export const customersAnalytics = restaurantEndpoint((scope) =>
  getCustomerAnalytics(scope)
);

export const platformAnalytics = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = ensureUser(req);
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin role required" });
      }

      const scope = parseDateRange(req.query);
      const [core, cancellationRate, topRestaurants, allRestaurants, totalUsers, totalRiders] = await Promise.all([
        runCoreAnalytics(scope, parseLimit(req.query.limit)),
        getCancellationAnalytics(scope),
        getTopRestaurantsAnalytics(scope, 10),
        Restaurant.find({}, 'name').lean(),
        User.countDocuments({ role: { $in: [null, "customer"] } }),
        User.countDocuments({ role: "rider" })
      ]);

      const analyticsData = {
        revenue: core.revenue,
        topDishes: core.topDishes,
        peakHours: core.peakHours,
        customers: core.customers,
        cancellationRate,
        topRestaurants,
        platformContext: {
          totalRegisteredRestaurants: allRestaurants.length,
          allRestaurantNames: allRestaurants.map(r => r.name),
          totalRegisteredCustomers: totalUsers,
          totalRegisteredRiders: totalRiders,
        }
      };

      const anomalyAlerts = buildAnomalyAlerts({
        cancellationRate,
        revenue: core.revenue,
      });

      let insights: any;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI Gateway timeout (15s)")), 15000)
        );
        insights = await Promise.race([
          generateInsights(analyticsData, "platform"),
          timeoutPromise,
        ]);
        console.log("✅ Platform AI Insights generated via Groq");
      } catch (err: any) {
        console.warn("⚠️ Platform AI Insights fallback:", err.message?.substring(0, 120));
        insights = generateLocalInsights({
          restaurantName: "Platform (All Restaurants)",
          revenue: core.revenue,
          topDishes: core.topDishes,
          peakHours: core.peakHours,
          customers: core.customers,
          cancellationRate,
        } as AnalyticsPayload);
      }

      return res.json({
        revenue: core.revenue,
        topRestaurants,
        anomalyAlerts,
        insights,
      });
    } catch (error) {
      return sendAnalyticsError(res, error);
    }
  }
);

const buildInsightsCacheKey = (scope: RestaurantScope) =>
  [
    scope.restaurantId,
    scope.from.toISOString(),
    scope.to.toISOString(),
  ].join(":");

export const clearAnalyticsInsightCacheForTests = () => {
  insightsCache.clear();
};

export const insightsAnalytics = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    try {
      const scope = await getRestaurantScope(req, req.query);
      const cacheKey = buildInsightsCacheKey(scope);
      const cached = insightsCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.value);
      }

      const [metrics, cancellationRate] = await Promise.all([
        runCoreAnalytics(scope),
        getCancellationAnalytics(scope),
      ]);
      const analyticsData = {
        restaurantId: scope.restaurantId,
        restaurantName: scope.restaurantName,
        range: {
          from: scope.from,
          to: scope.to,
        },
        ...metrics,
        cancellationRate,
      };

      let insights: any;
      let source: "gemini" | "local" = "local";

      // Try Gemini first, with a race against a 15-second timeout
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI Gateway timeout (15s)")), 15000)
        );
        insights = await Promise.race([
          generateInsights(analyticsData, `restaurant:${scope.restaurantId}`),
          timeoutPromise,
        ]);
        source = "gemini";
        console.log("✅ AI Business Insights generated via Gemini");
      } catch (err: any) {
        console.warn("⚠️ Gemini insights unavailable, using local generator:", err.message?.substring(0, 120));
        // Generate insights locally from the actual analytics data
        insights = generateLocalInsights(analyticsData as AnalyticsPayload);
        console.log("✅ AI Business Insights generated locally from analytics data");
      }

      const payload = {
        insights,
        metrics: analyticsData,
      };

      // Cache AI-generated insights for 6 hours, local insights for 10 minutes
      const cacheTtl = source === "gemini" ? INSIGHTS_CACHE_TTL_MS : 10 * 60 * 1000;
      insightsCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtl,
        value: payload,
      });

      return res.json(payload);
    } catch (error) {
      return sendAnalyticsError(res, error);
    }
  }
);

export const extractAskTemplate = (
  insight: InsightResponse
): AskTemplate | null => {
  const haystack = [
    insight.summary,
    ...(insight.anomalies || []),
    ...(insight.recommendations || []),
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("no_match") || haystack.includes("no match")) {
    return null;
  }

  return (
    ASK_TEMPLATE_IDS.find((template) => haystack.includes(template)) || null
  );
};

const getTemplateConfig = (template: AskTemplate) =>
  ASK_TEMPLATES.find((candidate) => candidate.id === template);

const classifyAskTemplate = async (question: string) => {
  const classification = await generateInsights(
    {
      question,
      available_templates: ASK_TEMPLATE_IDS,
      descriptions: {
        top_dishes_by_revenue: "Most sold items, top dishes, best sellers, top foods",
        revenue_trend: "Revenue trend, sales over time, daily sales",
        peak_hours: "Busiest times, peak hours, most active time",
        repeat_customer_rate: "Customer retention, repeat customers",
        cancellation_rate: "Cancelled orders, cancellation rate",
        payment_method_split: "Payment methods, COD vs online",
        rider_delivery_time: "Rider speed, delivery times",
        top_restaurants: "Top restaurants, best performing restaurant, highest revenue restaurant"
      }
    },
    "analytics-template-classification",
    "You must classify the user's question into EXACTLY ONE of the provided available_templates. Output the exact template id string in the 'summary' field. Do not explain."
  );

  return extractAskTemplate(classification);
};

const executeAskTemplate = async (
  template: AskTemplate,
  scope: AnalyticsScope
) => {
  switch (template) {
    case "top_dishes_by_revenue":
      return { topDishes: await getDishAnalytics(scope, 1000) };
    case "top_restaurants":
      return { topRestaurants: await getTopRestaurantsAnalytics(scope, 100) };
    case "revenue_trend": {
      const revenue = await getRevenueAnalytics(scope);
      return { dailyRevenue: revenue.dailyRevenue };
    }
    case "peak_hours":
      return { peakHours: await getPeakHoursAnalytics(scope) };
    case "repeat_customer_rate":
      return { customers: await getCustomerAnalytics(scope) };
    case "cancellation_rate":
      return { cancellationRate: await getCancellationAnalytics(scope) };
    case "payment_method_split": {
      const revenue = await getRevenueAnalytics(scope);
      return { paymentMethodSplit: revenue.paymentMethodSplit };
    }
    case "rider_delivery_time":
      return {
        riderDeliveryTime: await getRiderDeliveryTimeAnalytics(scope, 1000),
      };
  }
};

export const askAnalytics = TryCatch(async (req: AuthenticatedRequest, res) => {
  try {
    const user = ensureUser(req);
    const {
      question,
      restaurantId,
      from,
      to,
    }: {
      question?: unknown;
      restaurantId?: unknown;
      from?: unknown;
      to?: unknown;
    } = req.body || {};

    if (typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({ message: "question is required" });
    }

    const template = await classifyAskTemplate(question);
    if (!template) {
      return res.status(400).json({ error: "I cannot answer that yet." });
    }

    const templateConfig = getTemplateConfig(template);
    if (templateConfig?.adminOnly && user.role !== "admin") {
      return res.status(403).json({ message: "Admin role required" });
    }

    const range = parseDateRange({ from, to });
    let scope: AnalyticsScope = range;
    let scopeLabel = "platform";

    if (restaurantId) {
      const restaurant = await ensureRestaurantAccess(req, restaurantId);
      scope = {
        ...range,
        restaurantId: restaurant._id.toString(),
      };
      scopeLabel = `restaurant:${restaurant._id.toString()}`;
    } else if (user.role !== "admin") {
      return res.status(400).json({ message: "restaurantId is required" });
    }

    const results = await executeAskTemplate(template, scope);
    
    let platformData = null;
    if (!restaurantId) {
      const [allRestaurants, totalUsers, totalRiders] = await Promise.all([
        Restaurant.find({}, 'name').lean(),
        User.countDocuments({ role: { $in: [null, "customer"] } }),
        User.countDocuments({ role: "rider" })
      ]);
      platformData = {
        totalRegisteredRestaurants: allRestaurants.length,
        allRestaurantNames: allRestaurants.map(r => r.name),
        totalRegisteredCustomers: totalUsers,
        totalRegisteredRiders: totalRiders,
      };
    }

    const narrative = await generateInsights(
      {
        context: scopeLabel === "platform" ? "Admin Platform (All Restaurants)" : `Single Restaurant Dashboard (ID: ${restaurantId})`,
        question,
        template,
        results,
        platformData,
      },
      `ask:${scopeLabel}:${template}`,
      "You are a world-class AI business analyst assisting a restaurant owner or platform admin. Provide an attractive, engaging, and highly informative answer to their question using the provided results. Emphasize key metrics with formatting. Maintain the context of whether this is for the entire platform or a single restaurant. Use the Indian Rupee symbol (₹) or 'Rs.' for all currency values, never use the Dollar ($) sign. Put your conversational, styled answer in the 'summary' field. If there are anomalies, put them in 'anomalies'. Give actionable 'recommendations' based on the answer."
    );

    return res.json({
      template,
      results,
      summary: narrative.summary,
      anomalies: narrative.anomalies,
      recommendations: narrative.recommendations,
    });
  } catch (error) {
    return sendAnalyticsError(res, error);
  }
});


/**
 * Local Analytics-Based Insight Generator
 * 
 * Produces meaningful, data-driven insights purely from the restaurant's 
 * analytics data. Zero external API calls required.
 * 
 * This is used as a smart fallback when the Gemini API is rate-limited
 * or unavailable, so users always see valuable business insights.
 */

export type InsightResponse = {
  summary: string;
  anomalies: string[];
  recommendations: string[];
};

type RevenueData = {
  dailyRevenue?: Array<{ date: string; revenue: number; orderCount: number }>;
  paymentMethodSplit?: Array<{ method: string; revenue: number; orderCount: number }>;
  avgOrderValue?: number;
  totalRevenue?: number;
  orderCount?: number;
};

type DishData = {
  itemId?: string;
  name: string;
  orderCount: number;
  revenue: number;
};

type PeakHourData = {
  hour: number;
  dayOfWeek: number;
  orderCount: number;
};

type CustomerData = {
  totalCustomers?: number;
  repeatCustomers?: number;
  newCustomers?: number;
  returningCustomers?: number;
  repeatCustomerRate?: number;
};

type CancellationData = {
  totalOrders?: number;
  cancelledOrders?: number;
  cancellationRate?: number;
};

export type AnalyticsPayload = {
  restaurantName?: string | undefined;
  revenue?: RevenueData;
  topDishes?: DishData[];
  peakHours?: PeakHourData[];
  customers?: CustomerData;
  cancellationRate?: CancellationData;
  [key: string]: unknown;
};

const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatHour = (h: number): string => {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

const formatMoney = (v: number): string => `₹${Math.round(v).toLocaleString("en-IN")}`;

export const generateLocalInsights = (data: AnalyticsPayload): InsightResponse => {
  const summaryParts: string[] = [];
  const anomalies: string[] = [];
  const recommendations: string[] = [];

  const revenue = data.revenue;
  const dishes = data.topDishes || [];
  const peaks = data.peakHours || [];
  const customers = data.customers;
  const cancellation = data.cancellationRate;
  const name = data.restaurantName || "Your restaurant";

  // ─── Revenue Analysis ───────────────────────────────────────
  if (revenue) {
    const totalRev = revenue.totalRevenue || 0;
    const orderCount = revenue.orderCount || 0;
    const avgOV = revenue.avgOrderValue || 0;

    if (orderCount > 0) {
      summaryParts.push(
        `${name} generated ${formatMoney(totalRev)} in total revenue across ${orderCount} orders, with an average order value of ${formatMoney(avgOV)}.`
      );
    } else {
      summaryParts.push(`${name} has no paid orders in the selected period.`);
      anomalies.push("No paid orders found. The restaurant may be new or inactive.");
      recommendations.push("Focus on marketing and visibility to attract first customers. Consider running a launch promotion.");
    }

    // Daily trend analysis
    const daily = revenue.dailyRevenue || [];
    if (daily.length >= 3) {
      const revenues = daily.map(d => d.revenue);
      const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      
      // Find best and worst days
      let bestDay = daily[0]!;
      let worstDay = daily[0]!;
      for (const d of daily) {
        if (d.revenue > bestDay.revenue) bestDay = d;
        if (d.revenue < worstDay.revenue) worstDay = d;
      }

      if (bestDay.revenue > avg * 1.5) {
        summaryParts.push(`Best performing day was ${bestDay.date} with ${formatMoney(bestDay.revenue)} revenue.`);
      }

      if (worstDay.revenue < avg * 0.5 && worstDay.revenue > 0) {
        anomalies.push(`Unusually low revenue on ${worstDay.date} (${formatMoney(worstDay.revenue)}) — significantly below the daily average of ${formatMoney(avg)}.`);
      }

      // Recent trend (last 3 days vs earlier)
      if (daily.length >= 6) {
        const recentAvg = daily.slice(-3).reduce((s, d) => s + d.revenue, 0) / 3;
        const earlierAvg = daily.slice(0, -3).reduce((s, d) => s + d.revenue, 0) / (daily.length - 3);
        if (earlierAvg > 0) {
          const trendPct = ((recentAvg - earlierAvg) / earlierAvg * 100).toFixed(1);
          if (recentAvg > earlierAvg * 1.1) {
            summaryParts.push(`Revenue is trending upward — recent daily average is ${trendPct}% higher than earlier days.`);
          } else if (recentAvg < earlierAvg * 0.9) {
            anomalies.push(`Revenue is declining — recent daily average is ${Math.abs(Number(trendPct))}% lower than earlier days.`);
            recommendations.push("Consider running a limited-time discount or combo deal to boost orders.");
          }
        }
      }
    }

    // Payment method insights
    const payments = revenue.paymentMethodSplit || [];
    if (payments.length > 1) {
      const sorted = [...payments].sort((a, b) => b.revenue - a.revenue);
      const topMethod = sorted[0];
      if (topMethod && totalRev > 0) {
        const methodLabel = topMethod.method === "online" ? "Online payments" : topMethod.method === "cod" ? "Cash on Delivery" : (topMethod.method || "Unknown");
        summaryParts.push(`${methodLabel} is the most popular payment method, accounting for ${formatMoney(topMethod.revenue)} (${((topMethod.revenue / totalRev) * 100).toFixed(0)}% of revenue).`);
      }
      
      const codEntry = payments.find(p => p.method?.toLowerCase() === "cod");
      if (codEntry && totalRev > 0 && (codEntry.revenue / totalRev) > 0.6) {
        recommendations.push("Over 60% of revenue comes from COD. Incentivize online payments with small discounts to reduce cash handling overhead.");
      }
    }
  }

  // ─── Top Dishes Analysis ────────────────────────────────────
  if (dishes.length > 0) {
    const topDish = dishes[0];
    if (topDish) {
      summaryParts.push(`Top selling item is "${topDish.name}" with ${topDish.orderCount} orders generating ${formatMoney(topDish.revenue)} in revenue.`);
    }

    if (dishes.length >= 3) {
      const topThreeRev = dishes.slice(0, 3).reduce((s, d) => s + d.revenue, 0);
      const totalDishRev = dishes.reduce((s, d) => s + d.revenue, 0);
      if (totalDishRev > 0) {
        const concentration = (topThreeRev / totalDishRev * 100).toFixed(0);
        if (Number(concentration) > 80) {
          anomalies.push(`Top 3 items account for ${concentration}% of total dish revenue — high menu concentration risk.`);
          recommendations.push("Diversify your menu by promoting underperforming items through combos or featured sections.");
        }
      }
    }

    // Find underperformers
    if (dishes.length >= 5) {
      const bottomItems = dishes.slice(-2);
      const bottomNames = bottomItems.map(d => `"${d.name}"`).join(" and ");
      recommendations.push(`Items like ${bottomNames} have low order volumes. Consider updating their descriptions, photos, or pricing.`);
    }
  }

  // ─── Peak Hours Analysis ────────────────────────────────────
  if (peaks.length > 0) {
    const sortedPeaks = [...peaks].sort((a, b) => b.orderCount - a.orderCount);
    const busiest = sortedPeaks[0];
    const slowest = sortedPeaks[sortedPeaks.length - 1];

    if (busiest) {
      summaryParts.push(
        `Peak ordering time is ${formatHour(busiest.hour)} on ${dayNames[busiest.dayOfWeek] || "day " + busiest.dayOfWeek} with ${busiest.orderCount} orders.`
      );

      if (slowest && slowest.orderCount < busiest.orderCount * 0.3 && slowest.orderCount > 0) {
        recommendations.push(
          `${formatHour(slowest.hour)} on ${dayNames[slowest.dayOfWeek] || "day " + slowest.dayOfWeek} is your slowest slot (${slowest.orderCount} orders). A happy-hour promotion could boost traffic during this period.`
        );
      }
    }

    // Weekend vs weekday
    const weekdayOrders = peaks.filter(p => p.dayOfWeek >= 2 && p.dayOfWeek <= 6).reduce((s, p) => s + p.orderCount, 0);
    const weekendOrders = peaks.filter(p => p.dayOfWeek === 1 || p.dayOfWeek === 7).reduce((s, p) => s + p.orderCount, 0);
    if (weekendOrders > weekdayOrders * 1.5 && weekendOrders > 0) {
      summaryParts.push("Weekend orders are significantly higher than weekdays.");
    } else if (weekdayOrders > weekendOrders * 1.5 && weekdayOrders > 0) {
      summaryParts.push("Weekday orders dominate. Consider weekend promotions to balance demand.");
    }
  }

  // ─── Customer Analysis ──────────────────────────────────────
  if (customers) {
    const total = customers.totalCustomers || 0;
    const repeat = customers.repeatCustomers || 0;
    const repeatRate = customers.repeatCustomerRate || 0;

    if (total > 0) {
      summaryParts.push(
        `${total} unique customers ordered, with a ${repeatRate.toFixed(1)}% repeat rate (${repeat} returning customers).`
      );

      if (repeatRate < 15) {
        anomalies.push(`Repeat customer rate is very low at ${repeatRate.toFixed(1)}%. Most customers are not coming back.`);
        recommendations.push("Implement a loyalty or rewards program. Send personalized offers to first-time customers to encourage repeat orders.");
      } else if (repeatRate > 40) {
        summaryParts.push("Strong customer loyalty with a high repeat rate.");
      }
    }
  }

  // ─── Cancellation Analysis ──────────────────────────────────
  if (cancellation) {
    const rate = cancellation.cancellationRate || 0;
    const cancelled = cancellation.cancelledOrders || 0;

    if (rate > 15) {
      anomalies.push(`Cancellation rate is critically high at ${rate.toFixed(1)}% (${cancelled} cancellations). This requires immediate attention.`);
      recommendations.push("Investigate cancellation reasons. Common fixes: accurate item descriptions, realistic delivery estimates, and order confirmation calls.");
    } else if (rate > 8) {
      anomalies.push(`Cancellation rate of ${rate.toFixed(1)}% is above the industry benchmark of 5-8%.`);
      recommendations.push("Review cancellation patterns to identify common causes and reduce the rate.");
    } else if (rate > 0) {
      summaryParts.push(`Cancellation rate is healthy at ${rate.toFixed(1)}%.`);
    }
  }

  // ─── Build Final Output ─────────────────────────────────────
  const summary = summaryParts.length > 0
    ? summaryParts.join(" ")
    : `${name} analytics data is limited for the selected period. Add more orders to generate deeper insights.`;

  // Ensure we always have at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring your metrics. Consistency in food quality and delivery speed drives long-term growth.");
  }

  return { summary, anomalies, recommendations };
};

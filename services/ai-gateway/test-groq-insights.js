import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is not set in .env");
  process.exit(1);
}

console.log("=== Groq AI Insights Test ===");
console.log("API Key prefix:", GROQ_API_KEY.substring(0, 8) + "...");
console.log("Model: llama-3.3-70b-versatile\n");

// Mock restaurant analytics data (same structure your dashboard sends)
const mockAnalyticsData = {
  prompt: "You are a business analyst for a food delivery platform. Scope: restaurant:demo. Summarize the metrics, flag anomalies, and recommend practical actions.",
  context: {
    restaurantId: "demo-restaurant-123",
    restaurantName: "Spice Garden",
    range: { from: "2026-05-01", to: "2026-05-31" },
    revenue: {
      totalRevenue: 145000,
      orderCount: 312,
      avgOrderValue: 464.74,
      dailyRevenue: [
        { date: "2026-05-01", revenue: 4200, orderCount: 9 },
        { date: "2026-05-02", revenue: 5100, orderCount: 11 },
        { date: "2026-05-15", revenue: 1200, orderCount: 3 },
        { date: "2026-05-16", revenue: 800, orderCount: 2 },
        { date: "2026-05-30", revenue: 6300, orderCount: 14 },
      ],
    },
    topDishes: [
      { name: "Butter Chicken", orderCount: 89, revenue: 35600 },
      { name: "Paneer Tikka", orderCount: 67, revenue: 20100 },
      { name: "Garlic Naan", orderCount: 45, revenue: 4500 },
    ],
    peakHours: [
      { hour: 12, dayOfWeek: 1, orderCount: 18 },
      { hour: 19, dayOfWeek: 6, orderCount: 32 },
      { hour: 20, dayOfWeek: 7, orderCount: 28 },
    ],
    customers: {
      totalCustomers: 198,
      repeatCustomers: 45,
      repeatCustomerRate: 22.73,
      newCustomers: 153,
    },
    cancellationRate: {
      totalOrders: 340,
      cancelledOrders: 28,
      cancellationRate: 8.24,
    },
  },
};

async function testGroqInsights() {
  console.log("Sending mock analytics data to Groq...\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert AI business analyst for a food delivery platform.
Analyze the provided restaurant analytics data and generate actionable insights.
Return ONLY valid JSON in this exact format:
{
  "summary": "Overall performance summary...",
  "anomalies": ["Anomaly 1", "Anomaly 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`,
          },
          {
            role: "user",
            content: JSON.stringify(mockAnalyticsData),
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Groq API returned status ${response.status}:`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ Groq returned an empty response");
      process.exit(1);
    }

    const insights = JSON.parse(content);

    console.log("✅ Groq AI Insights generated successfully!\n");
    console.log("━━━ Summary ━━━");
    console.log(insights.summary);
    console.log("\n━━━ Anomalies ━━━");
    insights.anomalies.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log("\n━━━ Recommendations ━━━");
    insights.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log("\n🎉 Test PASSED! Groq-powered AI Insights are working perfectly.");
  } catch (error) {
    console.error("❌ Test FAILED:", error.message || error);
    process.exit(1);
  }
}

testGroqInsights();

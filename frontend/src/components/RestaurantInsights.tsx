import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { restaurantService } from "../config";

type RevenuePoint = {
  date: string;
  revenue: number;
  orderCount: number;
};

type RevenueAnalytics = {
  dailyRevenue: RevenuePoint[];
  paymentMethodSplit: Array<{
    method: string;
    revenue: number;
    orderCount: number;
  }>;
  avgOrderValue: number;
  totalRevenue: number;
  orderCount: number;
};

type DishAnalytics = {
  itemId: string;
  name: string;
  orderCount: number;
  revenue: number;
};

type PeakHour = {
  hour: number;
  dayOfWeek: number;
  orderCount: number;
};

type InsightPayload = {
  insights: {
    summary: string;
    anomalies: string[];
    recommendations: string[];
  };
};

type AskAnswer = {
  question: string;
  summary: string;
  template?: string;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const formatMoney = (value: number) => `₹${Math.round(value || 0).toLocaleString()}`;
const formatRevenueTooltip = (value: unknown) =>
  [formatMoney(Number(value || 0)), "Revenue"] as [string, string];

const RestaurantInsights = ({ restaurantId }: { restaurantId: string }) => {
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [topDishes, setTopDishes] = useState<DishAnalytics[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [insights, setInsights] = useState<InsightPayload["insights"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<AskAnswer[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ restaurantId });
        const [revenueRes, dishesRes, peakHoursRes] = await Promise.all([
          axios.get(`${restaurantService}/api/analytics/revenue?${params.toString()}`, {
            headers: authHeaders(),
          }),
          axios.get(
            `${restaurantService}/api/analytics/dishes?${params.toString()}&limit=8`,
            { headers: authHeaders() }
          ),
          axios.get(`${restaurantService}/api/analytics/peakhours?${params.toString()}`, {
            headers: authHeaders(),
          }),
        ]);

        setRevenue(revenueRes.data);
        setTopDishes(dishesRes.data || []);
        setPeakHours(peakHoursRes.data || []);
        
        // Turn off main loading spinner so the UI becomes usable immediately
        setLoading(false);

        // Fetch AI insights in the background so it doesn't block the page if rate limited
        axios.get(`${restaurantService}/api/analytics/insights?${params.toString()}`, {
          headers: authHeaders(),
        }).then(insightsRes => {
          setInsights(insightsRes.data?.insights || null);
        }).catch(err => {
          console.error("AI Insights fetch failed:", err);
          setInsights({ summary: "AI Insights are currently unavailable due to high traffic or rate limits.", anomalies: [], recommendations: [] });
        });
      } catch (error) {
        console.error("Failed to fetch restaurant analytics", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [restaurantId]);

  const peakHourMap = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(peakHours)) {
      peakHours.forEach((entry) => {
        map.set(`${entry.dayOfWeek}-${entry.hour}`, entry.orderCount);
      });
    }
    return map;
  }, [peakHours]);

  const maxPeakOrders = Math.max(
    ...(Array.isArray(peakHours) ? peakHours.map((entry) => entry.orderCount) : []),
    1
  );

  const askQuestion = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    try {
      setAsking(true);
      const { data } = await axios.post(
        `${restaurantService}/api/analytics/ask`,
        {
          question: trimmedQuestion,
          restaurantId,
        },
        { headers: authHeaders() }
      );
      setAnswers((current) => [
        {
          question: trimmedQuestion,
          summary: data.summary || data.error || "No answer available.",
          template: data.template,
        },
        ...current,
      ]);
      setQuestion("");
    } catch (error: any) {
      setAnswers((current) => [
        {
          question: trimmedQuestion,
          summary:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            "I cannot answer that yet.",
        },
        ...current,
      ]);
    } finally {
      setAsking(false);
    }
  };

  const formatText = (text: string) => {
    if (typeof text !== "string") return text;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 hover:from-orange-400 hover:to-yellow-300 transition-all duration-300 cursor-default drop-shadow-[0_2px_8px_rgba(250,204,21,0.5)] transform hover:scale-[1.02] inline-block">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderSummary = () => {
    if (!insights?.summary) return "No insight summary yet.";
    if (typeof insights.summary === "string") return formatText(insights.summary);
    if (typeof insights.summary === "object") {
      const obj = insights.summary as Record<string, any>;
      if (typeof obj.text === "string") return formatText(obj.text);
      if (typeof obj.summary === "string") return formatText(obj.summary);
      if (typeof obj.message === "string") return formatText(obj.message);
      return JSON.stringify(obj);
    }
    return formatText(String(insights.summary));
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#facc15]" />
          <p className="text-sm text-neutral-400">Loading sales data & AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border-l-4 border-l-[#facc15] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#facc15]">Revenue</p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {formatMoney(revenue?.totalRevenue || 0)}
          </p>
        </div>
        <div className="rounded-[22px] border-l-4 border-l-[#facc15] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#facc15]">Paid orders</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{revenue?.orderCount || 0}</p>
        </div>
        <div className="rounded-[22px] border-l-4 border-l-[#facc15] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#facc15]">Avg order value</p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {formatMoney(revenue?.avgOrderValue || 0)}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Revenue trend</h3>
            <p className="text-xs text-neutral-400">Daily paid order revenue</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue?.dailyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#737373' }} dy={10} />
                <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 10, fill: '#737373' }} dx={-5} width={45} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#171717", borderColor: "rgba(255,255,255,0.1)", borderRadius: "16px" }} 
                  labelStyle={{ color: "#ffffff" }} 
                  itemStyle={{ color: "#facc15" }}
                  formatter={formatRevenueTooltip} 
                />
                <Line type="monotone" dataKey="revenue" stroke="#facc15" strokeWidth={3} dot={{ r: 3, fill: "#facc15", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#facc15", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Payment split</h3>
            <p className="text-xs text-neutral-400">Revenue by method</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue?.paymentMethodSplit || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="method" tick={{ fontSize: 10, fill: '#737373' }} dy={10} />
                <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 10, fill: '#737373' }} dx={-5} width={45} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#171717", borderColor: "rgba(255,255,255,0.1)", borderRadius: "16px" }} 
                  labelStyle={{ color: "#ffffff" }} 
                  itemStyle={{ color: "#facc15" }}
                  formatter={formatRevenueTooltip} 
                />
                <Bar dataKey="revenue" fill="#facc15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top Dishes & Heatmap Section */}
      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <h3 className="font-semibold text-white mb-3">Top dishes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <tr className="border-b border-white/5">
                  <th className="py-2">Dish</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.isArray(topDishes) && topDishes.map((dish) => (
                  <tr key={dish.itemId || dish.name} className="hover:bg-white/5">
                    <td className="py-3 font-semibold text-white">{dish.name}</td>
                    <td className="py-3 text-right text-neutral-400">{dish.orderCount}</td>
                    <td className="py-3 text-right font-bold text-[#facc15]">{formatMoney(dish.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Peak hours</h3>
            <p className="text-xs text-neutral-400">Order density heatmap (hover cells for counts)</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-1">
              {dayLabels.map((day, dayIndex) => (
                <div key={day} className="grid grid-cols-[42px_repeat(24,minmax(20px,1fr))] gap-1">
                  <div className="text-xs font-bold text-neutral-400 flex items-center">{day}</div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const orderCount = peakHourMap.get(`${dayIndex + 1}-${hour}`) || 0;
                    const intensity = orderCount / maxPeakOrders;
                    return (
                      <div
                        key={hour}
                        title={`${day} ${hour}:00 - ${orderCount} orders`}
                        className="h-6 rounded-md hover:scale-125 hover:shadow-[0_0_12px_rgba(250,204,21,0.3)] transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: `rgba(250, 204, 21, ${0.08 + intensity * 0.82})`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="grid grid-cols-[42px_repeat(6,1fr)] gap-1 pt-2.5 text-[10px] font-bold text-neutral-400">
                <span />
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* AI Insights Section */}
      <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
        <h3 className="font-semibold text-white mb-2">AI Business insights</h3>
        <p className="text-sm text-neutral-300 leading-relaxed">{renderSummary()}</p>
        
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-red-900/30 bg-red-500/5 p-4 border-l-4 border-l-red-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">AI Anomalies</p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-300 leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {(Array.isArray(insights?.anomalies) ? insights.anomalies : []).map((item) => (
                <li key={typeof item === "string" ? item : JSON.stringify(item)} className="flex gap-2">
                  <span className="shrink-0 text-red-500">&bull;</span>
                  <span>{typeof item === "string" ? formatText(item) : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[#facc15]/30 bg-[#facc15]/5 p-4 border-l-4 border-l-[#facc15]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#facc15]">AI Recommendations</p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-300 leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {(Array.isArray(insights?.recommendations) ? insights.recommendations : []).map((item) => (
                <li key={typeof item === "string" ? item : JSON.stringify(item)} className="flex gap-2">
                  <span className="shrink-0 text-[#facc15]">&bull;</span>
                  <span>{typeof item === "string" ? formatText(item) : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Ask Your Data Section */}
      <section className="rounded-[24px] border border-white/10 bg-[#171717] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-white/20">
        <div className="mb-4">
          <h3 className="font-semibold text-white">Ask your data assistant</h3>
          <p className="text-xs text-neutral-400">Ask conversational questions about your metrics, orders, or peak times</p>
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") askQuestion();
            }}
            placeholder="e.g., What are my peak hours? or Which dishes sell best?"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all duration-300 focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15]"
          />
          <button
            onClick={askQuestion}
            disabled={asking}
            className="rounded-xl bg-[#facc15] px-5 py-2.5 text-sm font-semibold text-[#0f0f0f] shadow-sm transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {asking ? "Asking..." : "Ask AI"}
          </button>
        </div>
        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {answers.map((answer, index) => (
            <div key={`${answer.question}-${index}`} className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs transition-all duration-300 hover:bg-white/10">
              <p className="font-bold text-white">Q: {answer.question}</p>
              <p className="mt-2 text-[#facc15] leading-relaxed font-medium">AI: {formatText(answer.summary)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default RestaurantInsights;


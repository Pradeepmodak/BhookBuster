import { useEffect, useState } from "react";
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

type PlatformAnalytics = {
  revenue: {
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      orderCount: number;
    }>;
    paymentMethodSplit: Array<{
      method: string;
      revenue: number;
      orderCount: number;
    }>;
    totalRevenue: number;
    avgOrderValue: number;
    orderCount: number;
  };
  topRestaurants: Array<{
    restaurantId: string;
    restaurantName: string;
    revenue: number;
    orderCount: number;
  }>;
  anomalyAlerts: string[];
  insights?: {
    summary: string;
    anomalies: string[];
    recommendations: string[];
  };
};

type AskAnswer = {
  question: string;
  summary: string;
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const formatMoney = (value: number) => `₹${Math.round(value || 0).toLocaleString()}`;
const formatRevenueTooltip = (value: unknown) =>
  [formatMoney(Number(value || 0)), "Revenue"] as [string, string];

const PlatformInsights = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<AskAnswer[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${restaurantService}/api/analytics/platform`, {
          headers: authHeaders(),
        });
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch platform analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const askQuestion = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    try {
      setAsking(true);
      const { data } = await axios.post(
        `${restaurantService}/api/analytics/ask`,
        { question: trimmedQuestion },
        { headers: authHeaders() }
      );
      setAnswers((current) => [
        {
          question: trimmedQuestion,
          summary: data.summary || data.error || "No answer available.",
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

  if (loading) {
    return (
      <aside className="rounded-lg border border-gray-100 bg-white p-4 text-sm text-gray-500">
        Loading platform insights...
      </aside>
    );
  }

  return (
    <aside className="space-y-5 rounded-[28px] border border-white/10 bg-[#171717] p-5">
      <div>
        <h2 className="text-lg font-bold text-white">Platform insights</h2>
        <p className="text-sm text-neutral-400">Paid orders across all restaurants</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-[#facc15]">
            {formatMoney(analytics?.revenue.totalRevenue || 0)}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Platform Orders</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{analytics?.revenue.orderCount || 0}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Avg Order Value</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatMoney(analytics?.revenue.avgOrderValue || 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Platform Revenue Trend</h3>
            <p className="text-xs text-neutral-400">Daily paid order revenue</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.revenue.dailyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#737373", fontSize: 10 }} dy={10} />
                <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fill: "#737373", fontSize: 10 }} dx={-5} width={45} />
                <Tooltip contentStyle={{ background: "#111111", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: 16 }} formatter={formatRevenueTooltip} />
                <Line type="monotone" dataKey="revenue" stroke="#facc15" strokeWidth={3} dot={{ r: 3, fill: "#facc15", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#facc15", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Top Restaurants</h3>
            <p className="text-xs text-neutral-400">Revenue per restaurant</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.topRestaurants || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="restaurantName" tick={{ fill: "#737373", fontSize: 10 }} dy={10} tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value} />
                <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fill: "#737373", fontSize: 10 }} dx={-5} width={45} />
                <Tooltip contentStyle={{ background: "#111111", border: "1px solid rgba(52, 211, 153, 0.2)", borderRadius: 16 }} formatter={formatRevenueTooltip} />
                <Bar dataKey="revenue" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">Anomaly alerts</h3>
        <div className="mt-3 space-y-2">
          {(analytics?.anomalyAlerts || []).length === 0 ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              No major anomalies detected.
            </p>
          ) : (
            analytics?.anomalyAlerts.map((alert) => (
              <p key={alert} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {alert}
              </p>
            ))
          )}
        </div>
      </div>

      {analytics?.insights && (
        <div className="space-y-3 rounded-xl border border-[#facc15]/20 bg-[#facc15]/10 p-4">
          <h3 className="text-sm font-semibold text-[#facc15]">AI business insights</h3>
          <p className="text-sm text-[#f5dea0] leading-relaxed">{formatText(analytics.insights.summary)}</p>
          
          {Array.isArray(analytics.insights.anomalies) && analytics.insights.anomalies.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-red-300">AI anomalies</p>
              <ul className="mt-1 space-y-1 text-xs text-red-200 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {analytics.insights.anomalies.map((item, idx) => (
                  <li key={idx} className="rounded-lg bg-red-500/10 px-2 py-1.5 border border-red-500/20">
                    • {formatText(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(analytics.insights.recommendations) && analytics.insights.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-300">AI recommendations</p>
              <ul className="mt-1 space-y-1 text-xs text-emerald-200 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {analytics.insights.recommendations.map((item, idx) => (
                  <li key={idx} className="rounded-lg bg-emerald-500/10 px-2 py-1.5 border border-emerald-500/20">
                    • {formatText(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white">Ask platform data</h3>
        <div className="mt-3 flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") askQuestion();
            }}
            placeholder="Revenue trend, peak hours..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#facc15]/50 transition-colors placeholder:text-neutral-500"
          />
          <button
            onClick={askQuestion}
            disabled={asking}
            className="rounded-xl bg-[#facc15] px-5 py-2.5 text-sm font-semibold text-[#0f0f0f] disabled:opacity-60 transition-transform hover:scale-105 active:scale-95"
          >
            {asking ? "..." : "Ask"}
          </button>
        </div>
        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {answers.map((answer, index) => (
            <div key={`${answer.question}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="font-medium text-white">{answer.question}</p>
              <p className="mt-2 text-neutral-400 leading-relaxed">{formatText(answer.summary)}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default PlatformInsights;

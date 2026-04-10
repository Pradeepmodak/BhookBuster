import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { BiRupee, BiMapPin, BiPackage } from "react-icons/bi";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

interface MonthlyData {
  name: string;
  earnings: number;
  deliveries: number;
}

interface Analytics {
  monthlyData: MonthlyData[];
  totalEarnings: number;
  totalDeliveries: number;
  uniqueLocationsCount: number;
}

interface IRider {
  _id: string;
  isVerified: boolean;
}

const RiderEarnings = ({ profile }: { profile: IRider | null }) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!profile || !profile.isVerified) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/order/analytics/rider/${profile._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              // Note: Secure architecture normally proxies this through rider service or api gateway,
              // but for this direct microservice pattern, we use the token.
            },
          }
        );
        // Cast data to Analytics to ensure type safety with the response
        setAnalytics(data as Analytics);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500"></div>
      </div>
    );
  }

  if (!profile || !profile.isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <BiRupee className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Verify your profile first</h3>
        <p className="mt-1 text-sm text-gray-500">Once an admin verifies you, your earnings will appear here.</p>
      </div>
    );
  }

  if (!analytics || analytics.totalDeliveries === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <img
          src="https://illustrations.popsy.co/amber/surreal-hourglass.svg"
          alt="No earnings yet"
          className="h-48 w-48 opacity-80"
        />
        <h3 className="mt-6 text-lg font-bold text-gray-800">No Earnings Yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Complete your first delivery to see your analytics dashboard come alive!
        </p>
      </div>
    );
  }

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-lg space-y-6 px-4"
    >
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-800">Performance Dashboard</h2>
        <p className="text-sm text-gray-500">Lifetime analytics for {new Date().getFullYear()}</p>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Earnings */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <BiRupee className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 tracking-tight">
            ₹{analytics.totalEarnings.toLocaleString()}
          </p>
        </motion.div>

        {/* Deliveries */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <BiPackage className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Deliveries</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 tracking-tight">
            {analytics.totalDeliveries}
          </p>
        </motion.div>
      </div>

      {/* Unique Locations */}
      <motion.div variants={itemVariants} className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
            <BiMapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Areas Covered</p>
            <p className="text-xs text-gray-500">Unique delivery locations</p>
          </div>
        </div>
        <span className="text-xl font-bold text-orange-600">{analytics.uniqueLocationsCount}</span>
      </motion.div>

      {/* Recharts Monthly Graph */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-500">
          Monthly Earnings
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" } as any}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" } as any}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                formatter={(value: any) => [`₹${value}`, "Earned"] as [string, string]}
                labelStyle={{ fontWeight: "bold", color: "#1F2937", marginBottom: "4px" }}
              />
              <Bar dataKey="earnings" radius={6}>
                {analytics.monthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.earnings > 0 ? "#10B981" : "#D1D5DB"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RiderEarnings;

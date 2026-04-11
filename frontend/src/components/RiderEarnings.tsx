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
  Cell,
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
            },
          }
        );
        setAnalytics(data as Analytics);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [profile]);

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#333] border-t-[#d4a017]" />
      </div>
    );
  }

  // Not verified
  if (!profile || !profile.isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#222] border border-[#333]">
          <BiRupee className="h-8 w-8 text-[#d4a017]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-100">Verify your profile first</h3>
        <p className="mt-1 text-sm text-gray-500">
          Once an admin verifies you, your earnings will appear here.
        </p>
      </div>
    );
  }

  // No deliveries yet
  if (!analytics || analytics.totalDeliveries === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <img
          src="https://illustrations.popsy.co/amber/surreal-hourglass.svg"
          alt="No earnings yet"
          className="h-48 w-48 opacity-60"
        />
        <h3 className="mt-6 text-lg font-bold text-gray-100">No Earnings Yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Complete your first delivery to see your analytics dashboard come alive!
        </p>
      </div>
    );
  }

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
      {/* Header */}
      <div className="pt-2">
        <h2 className="text-xl font-bold text-[#f0c040]">Performance Dashboard</h2>
        <p className="text-sm text-gray-500">
          Lifetime analytics for {new Date().getFullYear()}
        </p>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Earnings */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-[#333] bg-[#222] p-5"
        >
          <div className="flex items-center gap-2 text-[#d4a017]">
            <BiRupee className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#f0c040] tracking-tight">
            ₹{analytics.totalEarnings.toLocaleString()}
          </p>
        </motion.div>

        {/* Deliveries */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-[#333] bg-[#222] p-5"
        >
          <div className="flex items-center gap-2 text-gray-400">
            <BiPackage className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Deliveries</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-100 tracking-tight">
            {analytics.totalDeliveries}
          </p>
        </motion.div>
      </div>

      {/* Unique Locations */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between rounded-xl border border-[#333] bg-[#222] p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#333]">
            <BiMapPin className="h-5 w-5 text-[#d4a017]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">Areas Covered</p>
            <p className="text-xs text-gray-500">Unique delivery locations</p>
          </div>
        </div>
        <span className="text-xl font-bold text-[#f0c040]">
          {analytics.uniqueLocationsCount}
        </span>
      </motion.div>

      {/* Monthly Bar Chart */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-[#333] bg-[#222] p-5"
      >
        <h3 className="mb-6 text-xs font-bold uppercase tracking-wider text-gray-500">
          Monthly Earnings
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics.monthlyData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2a2a2a"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(212,160,23,0.06)" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "0.5px solid #333",
                  background: "#1a1a1a",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.4)",
                }}
                formatter={(value) => [`₹${value ?? 0}`, "Earned"] as [string, string]}
                labelStyle={{ fontWeight: "bold", color: "#f0c040", marginBottom: "4px" }}
                itemStyle={{ color: "#d4a017" }}
              />
              <Bar dataKey="earnings" radius={6}>
                {analytics.monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.earnings > 0 ? "#d4a017" : "#2a2a2a"}
                  />
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

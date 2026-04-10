import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiHome,
  FiLogOut,
  FiPackage,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import AdminRiderCard from "../components/AdminRiderCard";
import { adminService } from "../main";
import type { AdminStats, OrdersTrendPoint, TopSellingItem } from "../types";
import { useAppData } from "../context/AppContext";

type PendingRestaurant = Record<string, any>;
type PendingRider = {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
};
type AdminTab = "overview" | "restaurant" | "rider";

const buildStatCards = (stats: AdminStats) => [
  {
    label: "Revenue",
    value: `Rs ${stats.totalRevenue.toLocaleString()}`,
    change: `${stats.growthPercent >= 0 ? "+" : ""}${stats.growthPercent}%`,
    icon: FiTrendingUp,
  },
  {
    label: "Orders",
    value: stats.ordersCount.toLocaleString(),
    change: `${stats.orderGrowthPercent >= 0 ? "+" : ""}${stats.orderGrowthPercent}%`,
    icon: FiPackage,
  },
  {
    label: "Users",
    value: stats.usersCount.toLocaleString(),
    change: `${stats.pendingRestaurants} restaurants pending`,
    icon: FiUsers,
  },
  {
    label: "Peak Time",
    value: stats.peakOrderTime,
    change: `${stats.pendingRiders} riders pending`,
    icon: FiClock,
  },
];

const Admin = () => {
  const { user, setIsAuth, setUser } = useAppData();
  const [restaurants, setRestaurants] = useState<PendingRestaurant[]>([]);
  const [riders, setRiders] = useState<PendingRider[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ordersTrend, setOrdersTrend] = useState<OrdersTrendPoint[]>([]);
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }),
    [],
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      const [pendingRestaurants, pendingRiders, statsResponse, trendResponse, topItemsResponse] =
        await Promise.all([
          axios.get(`${adminService}/v1/api/admin/restaurant/pending`, { headers: authHeaders }),
          axios.get(`${adminService}/v1/api/admin/rider/pending`, { headers: authHeaders }),
          axios.get(`${adminService}/v1/api/admin/stats`, { headers: authHeaders }),
          axios.get(`${adminService}/v1/api/admin/orders-trend?days=7`, { headers: authHeaders }),
          axios.get(`${adminService}/v1/api/admin/top-items`, { headers: authHeaders }),
        ]);

      setRestaurants(pendingRestaurants.data.restaurants || []);
      setRiders(pendingRiders.data.riders || []);
      setStats(statsResponse.data);
      setOrdersTrend(trendResponse.data.trend || []);
      setTopItems(topItemsResponse.data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    window.location.href = "/login";
  };

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#2a2a2a] border-t-[#facc15]" />
          <p className="text-sm text-neutral-400">Preparing admin analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-white/10 bg-[#111111] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15] text-lg font-bold text-[#0f0f0f]">
              B
            </div>
            <div>
              <div className="font-semibold">BhookBuster Admin</div>
              <div className="text-sm text-neutral-400">Control tower</div>
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-neutral-400">Signed in as</div>
            <div className="mt-2 font-medium">{user?.name || "Admin"}</div>
            <div className="text-sm text-[#facc15]">{user?.email}</div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              { id: "overview", label: "Overview", icon: FiHome },
              { id: "restaurant", label: "Restaurant approvals", icon: FiActivity },
              { id: "rider", label: "Rider approvals", icon: FiTruck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as AdminTab)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  tab === item.id
                    ? "bg-[#facc15] text-[#0f0f0f]"
                    : "bg-white/5 text-neutral-300 hover:bg-white/10"
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-neutral-300 transition hover:border-[#facc15]/40 hover:text-[#facc15]"
          >
            <FiLogOut />
            Logout
          </button>
        </aside>

        <main className="px-4 py-4 md:px-6 md:py-6">
          <div className="rounded-[28px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-[#facc15]">
                  <FiBarChart2 />
                  Admin dashboard
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">Premium operations center</h1>
                <p className="mt-2 text-neutral-400">
                  Revenue, order trends, and approval queues in one production-style control panel.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-sm text-neutral-400">Queue health</div>
                  <div className="mt-2 text-xl font-semibold">{restaurants.length + riders.length}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-sm text-neutral-400">Cache status</div>
                  <div className="mt-2 text-xl font-semibold text-[#facc15]">{stats.cached ? "Warm" : "Fresh"}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {buildStatCards(stats).map((card) => (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-[#facc15]/10 p-3 text-[#facc15]">
                      <card.icon className="text-xl" />
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {card.change}
                    </span>
                  </div>
                  <div className="mt-6 text-3xl font-semibold">{card.value}</div>
                  <div className="mt-2 text-sm text-neutral-400">{card.label}</div>
                </motion.div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]"
                >
                  <div className="grid gap-6">
                    <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5">
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold">Revenue trend</h2>
                        <p className="text-sm text-neutral-400">Last 7 days performance</p>
                      </div>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ordersTrend}>
                            <defs>
                              <linearGradient id="adminRevenue" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#facc15" stopOpacity={0.85} />
                                <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#262626" vertical={false} />
                            <XAxis dataKey="label" stroke="#737373" />
                            <YAxis stroke="#737373" />
                            <Tooltip
                              contentStyle={{
                                background: "#111111",
                                border: "1px solid rgba(250, 204, 21, 0.2)",
                                borderRadius: 16,
                              }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#facc15" fill="url(#adminRevenue)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5">
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold">Orders trend</h2>
                        <p className="text-sm text-neutral-400">Daily order volume snapshot</p>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ordersTrend}>
                            <CartesianGrid stroke="#262626" vertical={false} />
                            <XAxis dataKey="label" stroke="#737373" />
                            <YAxis stroke="#737373" />
                            <Tooltip
                              contentStyle={{
                                background: "#111111",
                                border: "1px solid rgba(250, 204, 21, 0.2)",
                                borderRadius: 16,
                              }}
                            />
                            <Bar dataKey="orders" fill="#facc15" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5">
                      <h2 className="text-lg font-semibold">Top selling foods</h2>
                      <div className="mt-5 space-y-4">
                        {topItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-neutral-400">
                            No completed order data yet
                          </div>
                        ) : (
                          topItems.map((item, index) => (
                            <div key={item.id} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#facc15] font-semibold text-[#0f0f0f]">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{item.name}</div>
                                <div className="truncate text-sm text-neutral-400">
                                  {item.quantitySold} sold
                                  {item.description ? ` • ${item.description}` : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-[#facc15]">Rs {item.revenue}</div>
                                <div className="text-xs text-neutral-500">revenue</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5">
                      <h2 className="text-lg font-semibold">Platform pulse</h2>
                      <div className="mt-5 grid gap-3">
                        {[
                          {
                            label: "Pending restaurants",
                            value: restaurants.length,
                            accent: "text-[#facc15]",
                          },
                          {
                            label: "Pending riders",
                            value: riders.length,
                            accent: "text-emerald-300",
                          },
                          {
                            label: "Peak order time",
                            value: stats.peakOrderTime,
                            accent: "text-white",
                          },
                        ].map((item) => (
                          <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                            <div className="text-sm text-neutral-400">{item.label}</div>
                            <div className={`mt-2 text-2xl font-semibold ${item.accent}`}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "restaurant" && (
                <motion.div
                  key="restaurant"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  className="mt-6"
                >
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">Restaurant verification queue</h2>
                    <p className="text-sm text-neutral-400">Approve new sellers and keep the marketplace curated.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {restaurants.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-white/10 bg-[#171717] px-6 py-16 text-center text-neutral-400">
                        No pending restaurants
                      </div>
                    ) : (
                      restaurants.map((restaurant) => (
                        <AdminRestaurantCard key={restaurant._id} restaurant={restaurant} onVerify={fetchData} />
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {tab === "rider" && (
                <motion.div
                  key="rider"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  className="mt-6"
                >
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">Rider verification queue</h2>
                    <p className="text-sm text-neutral-400">Validate delivery partners before they go live.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {riders.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-white/10 bg-[#171717] px-6 py-16 text-center text-neutral-400">
                        No pending riders
                      </div>
                    ) : (
                      riders.map((rider) => (
                        <AdminRiderCard key={rider._id} rider={rider} onVerify={fetchData} />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;

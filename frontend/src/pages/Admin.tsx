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
  FiAlertCircle,
  FiHome,
  FiLogOut,
  FiPackage,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import AdminRiderCard from "../components/AdminRiderCard";
import PlatformInsights from "../components/PlatformInsights";
import { adminService } from "../config";
import type { AdminStats, OrdersTrendPoint, PendingRestaurant, PendingRider, TopSellingItem } from "../types";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import Button from "../components/ui/Button";
type AdminTab = "overview" | "restaurant" | "rider" | "insights";

const emptyAdminStats: AdminStats = {
  totalRevenue: 0,
  totalRiderPayout: 0,
  totalPlatformSubsidy: 0,
  netPlatformRevenue: 0,
  ordersCount: 0,
  usersCount: 0,
  totalCustomers: 0,
  totalRestaurants: 0,
  totalRiders: 0,
  growthPercent: 0,
  orderGrowthPercent: 0,
  peakOrderTime: "No data",
  pendingRestaurants: 0,
  pendingRiders: 0,
  cached: false,
};

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
    label: "Platform Net",
    value: `Rs ${stats.netPlatformRevenue.toLocaleString()}`,
    change: `Rs ${stats.totalPlatformSubsidy.toLocaleString()} subsidy`,
    icon: FiUsers,
  },
  {
    label: "Rider Payout",
    value: `Rs ${stats.totalRiderPayout.toLocaleString()}`,
    change: `${stats.pendingRiders} riders pending`,
    icon: FiClock,
  },
];

const buildFootprintCards = (stats: AdminStats) => [
  {
    label: "Customers",
    value: stats.totalCustomers.toLocaleString(),
    helper: "People ordering across BhookBuster",
    icon: FiUsers,
    accent: "from-[#facc15]/18 via-[#facc15]/8 to-transparent",
    iconClassName: "text-[#facc15]",
    valueClassName: "text-white",
  },
  {
    label: "Restaurants",
    value: stats.totalRestaurants.toLocaleString(),
    helper: "Seller partners on the network",
    icon: FiHome,
    accent: "from-emerald-400/18 via-emerald-400/8 to-transparent",
    iconClassName: "text-emerald-300",
    valueClassName: "text-emerald-200",
  },
  {
    label: "Riders",
    value: stats.totalRiders.toLocaleString(),
    helper: "Delivery fleet available to dispatch",
    icon: FiTruck,
    accent: "from-sky-400/18 via-sky-400/8 to-transparent",
    iconClassName: "text-sky-300",
    valueClassName: "text-sky-200",
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
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);

      const requests = await Promise.allSettled([
        axios.get(`${adminService}/v1/api/admin/restaurant/pending`, {
          headers: authHeaders,
          timeout: 10000,
        }),
        axios.get(`${adminService}/v1/api/admin/rider/pending`, {
          headers: authHeaders,
          timeout: 10000,
        }),
        axios.get(`${adminService}/v1/api/admin/stats`, {
          headers: authHeaders,
          timeout: 10000,
        }),
        axios.get(`${adminService}/v1/api/admin/orders-trend?days=7`, {
          headers: authHeaders,
          timeout: 10000,
        }),
        axios.get(`${adminService}/v1/api/admin/top-items`, {
          headers: authHeaders,
          timeout: 10000,
        }),
      ]);

      const [pendingRestaurants, pendingRiders, statsResponse, trendResponse, topItemsResponse] = requests;

      setRestaurants(
        pendingRestaurants.status === "fulfilled" ? pendingRestaurants.value.data.restaurants || [] : [],
      );
      setRiders(
        pendingRiders.status === "fulfilled" ? pendingRiders.value.data.riders || [] : [],
      );
      setStats(
        statsResponse.status === "fulfilled" ? statsResponse.value.data : emptyAdminStats,
      );
      setOrdersTrend(
        trendResponse.status === "fulfilled" ? trendResponse.value.data.trend || [] : [],
      );
      setTopItems(
        topItemsResponse.status === "fulfilled" ? topItemsResponse.value.data.items || [] : [],
      );

      if (requests.some((result) => result.status === "rejected")) {
        setLoadError("Some admin analytics requests failed, so partial fallback data is being shown.");
      }
    } catch (error) {
      console.error(error);
      setStats(emptyAdminStats);
      setRestaurants([]);
      setRiders([]);
      setOrdersTrend([]);
      setTopItems([]);
      setLoadError("Admin analytics could not be loaded fully. Retry after checking the admin service.");
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onAdminUpdate = () => {
      fetchData();
    };

    socket.on("admin:update", onAdminUpdate);
    return () => {
      socket.off("admin:update", onAdminUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#2a2a2a] border-t-[#facc15]" />
          <p className="text-sm text-neutral-400">Preparing admin analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] px-4 text-white">
        <div className="max-w-md rounded-[28px] border border-white/10 bg-[#171717] p-6 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-[#facc15]" />
          <h2 className="mt-4 text-xl font-semibold">Admin dashboard could not load</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            The admin service did not return usable analytics data.
          </p>
          <Button className="mt-5" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
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
              { id: "insights", label: "AI Insights", icon: FiBarChart2 },
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

        <main className="px-4 py-4 md:px-6 md:py-6 min-w-0">
          <div className="rounded-[28px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#facc15]">
                  <FiBarChart2 />
                  Operations Center
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
              </div>

              <div className="flex gap-3">
                <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 flex items-center gap-3">
                  <div className="text-xs text-neutral-400">Queue</div>
                  <div className="text-lg font-bold">{restaurants.length + riders.length}</div>
                </div>
                <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 flex items-center gap-3">
                  <div className="text-xs text-neutral-400">Cache</div>
                  <div className="text-lg font-bold text-[#facc15]">{stats.cached ? "Warm" : "Fresh"}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
              {buildStatCards(stats).map((card) => (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -2 }}
                  className="min-w-0 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="shrink-0 rounded-xl bg-[#facc15]/10 p-2 text-[#facc15]">
                      <card.icon className="text-lg" />
                    </div>
                    <span className="truncate rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {card.change}
                    </span>
                  </div>
                  <div className="mt-4 truncate text-2xl font-bold">{card.value}</div>
                  <div className="mt-1 truncate text-xs text-neutral-400">{card.label}</div>
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
                  className="mt-5 grid gap-5 lg:grid-cols-3"
                >
                  <div className="lg:col-span-2 grid gap-5 min-w-0">
                    <div className="min-w-0 rounded-[20px] border border-white/10 bg-[#171717] p-4">
                      <div className="mb-3 flex justify-between items-center">
                        <h2 className="text-sm font-semibold">Revenue Trend</h2>
                      </div>
                      <div className="h-[200px] w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ordersTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="adminRevenue" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#facc15" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#facc15" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#262626" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#111111", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: 8, fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#facc15" fill="url(#adminRevenue)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[20px] border border-white/10 bg-[#171717] p-4">
                      <div className="mb-3 flex justify-between items-center">
                        <h2 className="text-sm font-semibold">Orders Trend</h2>
                      </div>
                      <div className="h-[180px] w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ordersTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="#262626" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#111111", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: 8, fontSize: 12 }}
                            />
                            <Bar dataKey="orders" fill="#facc15" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1 grid gap-5 min-w-0">
                    <div className="min-w-0 rounded-[20px] border border-white/10 bg-[#171717] p-4">
                      <h2 className="text-sm font-semibold mb-4">Platform Status</h2>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[14px] bg-black/20 p-3">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Restaurants</div>
                          <div className="mt-1 text-xl font-semibold text-emerald-300">{stats.totalRestaurants}</div>
                        </div>
                        <div className="rounded-[14px] bg-black/20 p-3">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Riders</div>
                          <div className="mt-1 text-xl font-semibold text-sky-300">{stats.totalRiders}</div>
                        </div>
                        <div className="rounded-[14px] bg-black/20 p-3">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Customers</div>
                          <div className="mt-1 text-xl font-semibold text-white">{stats.totalCustomers}</div>
                        </div>
                        <div className="rounded-[14px] bg-black/20 p-3">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Peak Time</div>
                          <div className="mt-1 text-sm font-semibold text-white truncate">{stats.peakOrderTime}</div>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 rounded-[20px] border border-white/10 bg-[#171717] p-4 flex flex-col flex-1">
                      <h2 className="text-sm font-semibold mb-4 shrink-0">Top Selling Foods</h2>
                      <div className="space-y-3">
                        {topItems.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-neutral-400">
                            No order data
                          </div>
                        ) : (
                          topItems.map((item, index) => (
                            <div key={item.id} className="flex gap-3 rounded-[14px] border border-white/5 bg-black/20 p-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#facc15]/10 text-xs font-bold text-[#facc15]">
                                #{index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white line-clamp-2 leading-tight">{item.name}</div>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="text-xs text-neutral-400">{item.quantitySold} sold</div>
                                  <div className="text-sm font-bold text-[#facc15]">Rs {item.revenue}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
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

              {tab === "insights" && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  className="mt-6 text-gray-900"
                >
                  <PlatformInsights />
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


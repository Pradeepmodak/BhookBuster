import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import type { IMenuItem, IRestaurant, RestaurantDashboardStats } from "../types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuGrid from "../components/MenuGrid";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrdersPanel from "../components/RestaurantOrdersPanel";
import { useAppData } from "../context/AppContext";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FiActivity, FiBarChart2, FiDollarSign, FiPackage, FiTrendingUp, FiUsers } from "react-icons/fi";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SellerTab = "menu" | "add-item" | "sales";

const emptyAnalytics: RestaurantDashboardStats = {
  revenue: 0,
  orders: 0,
  delivered: 0,
  averageOrderValue: 0,
  customerDeliveryFees: 0,
  riderPayout: 0,
  platformSubsidy: 0,
  netPlatformRevenue: 0,
  newCustomers: 0,
  returningCustomers: 0,
  peakOrderTime: "No data",
  weekOverWeekGrowth: 0,
  insights: [],
  topItems: [],
  lowPerformingItems: [],
  hourlyPerformance: [],
  revenueSeries: {
    daily: [],
    weekly: [],
    monthly: [],
  },
  cached: false,
};

const Restaurant = () => {
  const { fetchUser } = useAppData();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [analytics, setAnalytics] = useState<RestaurantDashboardStats | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
        headers: authHeaders,
      });
      setRestaurant(data.restaurant || null);
      if (data.token) {
        localStorage.setItem("token", data.token);
        fetchUser();
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
        headers: authHeaders,
      });
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      setMenuItems([]);
    }
  };

  const fetchAnalytics = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/analytics/${restaurantId}`, {
        headers: authHeaders,
      });
      setAnalytics(data || emptyAnalytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(emptyAnalytics);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  useEffect(() => {
    if (restaurant?._id) {
      fetchMenuItems(restaurant._id);
      fetchAnalytics(restaurant._id);
    }
  }, [restaurant]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <p className="text-neutral-400">Loading your restaurant...</p>
      </div>
    );
  }

  if (!restaurant) {
    return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;
  }

  const salesStats = analytics || emptyAnalytics;

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden bg-[url('/premium-orbit.svg'),linear-gradient(135deg,#171717,#111111)] bg-cover bg-center p-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#facc15] text-[#0f0f0f] shadow-[0_0_24px_rgba(250,204,21,0.18)]">
                  B
                </span>
                <span>
                  BhookBuster
                  <span className="ml-2 text-xs uppercase tracking-[0.28em] text-[#facc15]">Seller</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#facc15]">
                <FiBarChart2 />
                Restaurant command center
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Operate the business like a BI-first restaurant stack.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                Revenue, fulfillment, order flow, and menu decisions now live in one consistent dashboard surface.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Revenue" value={`Rs ${salesStats.revenue}`} helper="Gross paid order value" icon={<FiDollarSign />} />
              <StatCard label="Orders" value={salesStats.orders} helper={`${salesStats.delivered} delivered`} icon={<FiPackage />} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Revenue" value={`Rs ${salesStats.revenue}`} helper="All paid orders" icon={<FiDollarSign />} />
          <StatCard label="Orders" value={salesStats.orders} helper="Live + completed" icon={<FiActivity />} />
          <StatCard label="Delivered" value={salesStats.delivered} helper="Fulfilled successfully" icon={<FiPackage />} />
          <StatCard label="Avg order value" value={`Rs ${salesStats.averageOrderValue}`} helper={`${menuItems.length} menu items`} icon={<FiBarChart2 />} />
        </div>

        <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={true} />
        <RestaurantOrdersPanel restaurantId={restaurant._id} />

        <Card className="overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              { key: "menu", label: "Menu Items" },
              { key: "add-item", label: "Add Item" },
              { key: "sales", label: "Sales" },
            ].map((item) => (
              <Button
                key={item.key}
                onClick={() => setTab(item.key as SellerTab)}
                variant={tab === item.key ? "primary" : "ghost"}
                className="flex-1 rounded-none px-4 py-4 text-sm font-medium"
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="p-5">
            {tab === "menu" ? (
              <MenuGrid items={menuItems} onItemDeleted={() => fetchMenuItems(restaurant._id)} isSeller={true} />
            ) : null}

            {tab === "add-item" ? (
              <AddMenuItem
                onItemAdded={() => {
                  fetchMenuItems(restaurant._id);
                  fetchAnalytics(restaurant._id);
                  setTab("menu");
                }}
              />
            ) : null}

            {tab === "sales" ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Revenue trend</h3>
                      <p className="text-sm text-gray-400">Recent daily order flow</p>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesStats.revenueSeries.daily}>
                          <defs>
                            <linearGradient id="restaurantRevenue" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#facc15" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#262626" vertical={false} />
                          <XAxis dataKey="label" stroke="#737373" />
                          <YAxis stroke="#737373" />
                          <Tooltip contentStyle={{ background: "#111111", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: 16 }} />
                          <Area type="monotone" dataKey="revenue" stroke="#facc15" fill="url(#restaurantRevenue)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="grid gap-4 p-5">
                    <StatCard label="Gross Revenue" value={`Rs ${salesStats.revenue}`} helper="Paid order throughput" />
                    <StatCard
                      label="Net Platform Revenue"
                      value={`Rs ${salesStats.netPlatformRevenue}`}
                      helper="Platform fee plus delivery after rider payout"
                    />
                    <StatCard label="Live Orders" value={salesStats.orders - salesStats.delivered} helper="Still in fulfillment" />
                    <StatCard
                      label="Delivery Completion"
                      value={`${salesStats.orders ? Math.round((salesStats.delivered / salesStats.orders) * 100) : 0}%`}
                      helper="Delivered versus total orders"
                    />
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Hourly performance</h3>
                        <p className="text-sm text-gray-400">When your kitchen is busiest</p>
                      </div>
                      <span className="text-sm text-[var(--color-accent)]">{salesStats.peakOrderTime}</span>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesStats.hourlyPerformance}>
                          <CartesianGrid stroke="#262626" vertical={false} />
                          <XAxis dataKey="hour" stroke="#737373" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis stroke="#737373" />
                          <Tooltip contentStyle={{ background: "#111111", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: 16 }} />
                          <Bar dataKey="orders" fill="#facc15" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="grid gap-4 p-5">
                    <StatCard
                      label="Customer Delivery Fees"
                      value={`Rs ${salesStats.customerDeliveryFees}`}
                      helper="Collected from customers"
                      icon={<FiDollarSign />}
                    />
                    <StatCard
                      label="Rider Payout"
                      value={`Rs ${salesStats.riderPayout}`}
                      helper="Total delivery partner earnings"
                      icon={<FiActivity />}
                    />
                    <StatCard
                      label="Platform Subsidy"
                      value={`Rs ${salesStats.platformSubsidy}`}
                      helper="Free-delivery support absorbed by the platform"
                      icon={<FiTrendingUp />}
                    />
                    <StatCard label="New Customers" value={salesStats.newCustomers} helper="Ordered once so far" icon={<FiUsers />} />
                    <StatCard label="Returning Customers" value={salesStats.returningCustomers} helper="Repeat buyers" icon={<FiUsers />} />
                    <StatCard
                      label="Week-over-week"
                      value={`${salesStats.weekOverWeekGrowth >= 0 ? "+" : ""}${salesStats.weekOverWeekGrowth}%`}
                      helper={salesStats.cached ? "Served from cache" : "Freshly calculated"}
                      icon={<FiTrendingUp />}
                    />
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="p-5">
                    <h3 className="text-lg font-semibold">Actionable insights</h3>
                    <div className="mt-4 grid gap-3">
                      {salesStats.insights.length === 0 ? (
                        <Card className="border-dashed px-4 py-10 text-center text-sm text-gray-400">
                          No analytics insights yet.
                        </Card>
                      ) : (
                        salesStats.insights.map((insight) => (
                          <Card key={insight} className="border-white/10 bg-black/20 p-4">
                            <p className="text-sm text-gray-300">{insight}</p>
                          </Card>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="text-lg font-semibold">Top items</h3>
                    <div className="mt-4 grid gap-3">
                      {salesStats.topItems.length === 0 ? (
                        <Card className="border-dashed px-4 py-10 text-center text-sm text-gray-400">
                          No sales data yet.
                        </Card>
                      ) : (
                        salesStats.topItems.map((item) => (
                          <Card key={item.itemId} className="border-white/10 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-white">{item.name}</p>
                                <p className="text-sm text-gray-400">{item.quantitySold} sold</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-[var(--color-accent)]">Rs {item.revenue}</p>
                                <p className="text-xs text-gray-500">{item.revenueShare}% share</p>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Restaurant;

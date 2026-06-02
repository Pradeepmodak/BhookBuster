import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import type { IMenuItem, IRestaurant, RestaurantDashboardStats } from "../types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuGrid from "../components/MenuGrid";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrdersPanel from "../components/RestaurantOrdersPanel";
import RestaurantInsights from "../components/RestaurantInsights";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
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
      const { data } = await axios.get(`${restaurantService}/api/analytics/revenue?restaurantId=${restaurantId}`, {
        headers: authHeaders,
      });
      setAnalytics({
        ...emptyAnalytics,
        revenue: data.totalRevenue || 0,
        orders: data.orderCount || 0,
        delivered: data.orderCount || 0,
        averageOrderValue: data.avgOrderValue || 0,
      });
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

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !restaurant?._id) return;
    
    const onUpdate = () => {
      fetchAnalytics(restaurant._id);
    };

    socket.on("order:new", onUpdate);
    socket.on("order:rider_assigned", onUpdate);

    return () => {
      socket.off("order:new", onUpdate);
      socket.off("order:rider_assigned", onUpdate);
    };
  }, [socket, restaurant]);

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
              <div className="text-gray-900">
                <RestaurantInsights restaurantId={restaurant._id} />
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Restaurant;


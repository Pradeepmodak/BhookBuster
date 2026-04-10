import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import type { IMenuItem, IRestaurant, IOrder } from "../types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import { useAppData } from "../context/AppContext";

type SellerTab = "menu" | "add-item" | "sales";

const Restaurant = () => {
  const { fetchUser } = useAppData();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setMenuItems(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchOrders = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setOrders(data.orders || []);
    } catch (_error) {
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  useEffect(() => {
    if (restaurant?._id) {
      fetchMenuItems(restaurant._id);
      fetchOrders(restaurant._id);
    }
  }, [restaurant]);

  const salesStats = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const delivered = orders.filter((order) => order.status === "delivered").length;
    return {
      revenue,
      orders: orders.length,
      delivered,
      menuCount: menuItems.length,
    };
  }, [orders, menuItems]);

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

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Revenue", value: `Rs ${salesStats.revenue}` },
            { label: "Orders", value: salesStats.orders },
            { label: "Delivered", value: salesStats.delivered },
            { label: "Menu Items", value: salesStats.menuCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[26px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              <div className="text-sm text-neutral-400">{stat.label}</div>
              <div className="mt-3 text-3xl font-semibold text-[#facc15]">{stat.value}</div>
            </div>
          ))}
        </div>

        <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={true} />
        <RestaurantOrders restaurantId={restaurant._id} />

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#121212] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <div className="flex border-b border-white/10">
            {[
              { key: "menu", label: "Menu Items" },
              { key: "add-item", label: "Add Item" },
              { key: "sales", label: "Sales" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as SellerTab)}
                className={`flex-1 px-4 py-4 text-sm font-medium transition ${
                  tab === item.key ? "border-b-2 border-[#facc15] text-[#facc15]" : "text-neutral-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "menu" && (
              <MenuItems items={menuItems} onItemDeleted={() => fetchMenuItems(restaurant._id)} isSeller={true} />
            )}
            {tab === "add-item" && (
              <AddMenuItem
                onItemAdded={() => {
                  fetchMenuItems(restaurant._id);
                  setTab("menu");
                }}
              />
            )}
            {tab === "sales" && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-[#171717] p-5">
                  <div className="text-sm text-neutral-400">Gross Revenue</div>
                  <div className="mt-2 text-2xl font-semibold text-[#facc15]">Rs {salesStats.revenue}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#171717] p-5">
                  <div className="text-sm text-neutral-400">Live Orders</div>
                  <div className="mt-2 text-2xl font-semibold">{salesStats.orders - salesStats.delivered}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#171717] p-5">
                  <div className="text-sm text-neutral-400">Delivery Completion</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {salesStats.orders ? Math.round((salesStats.delivered / salesStats.orders) * 100) : 0}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Restaurant;

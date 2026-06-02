import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FiMapPin, FiPackage } from "react-icons/fi";
import type { IMenuItem, IRestaurant } from "../types";
import { restaurantService } from "../config";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuGrid from "../components/MenuGrid";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";

const RestaurantPage = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/${id}`, {
        headers: authHeaders,
      });
      setRestaurant(data || null);
    } catch (error) {
      console.error("Failed to fetch restaurant", error);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/item/all/${id}`, {
        headers: authHeaders,
      });
      setMenuItems(data || []);
    } catch (error) {
      console.error("Failed to fetch menu items", error);
      setMenuItems([]);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[var(--color-accent)]" />
              <div>
                <p className="font-semibold">Loading restaurant</p>
                <p className="text-sm text-gray-400">Pulling menu and profile details...</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
        <div className="mx-auto max-w-3xl">
          <Card className="px-6 py-16 text-center">
            <p className="text-xl font-semibold">Restaurant not found</p>
            <p className="mt-2 text-sm text-gray-400">No restaurant exists for this link or it is no longer available.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Menu Items" value={menuItems.length} helper="Available for ordering" icon={<FiPackage />} />
          <StatCard
            label="Operating Status"
            value={restaurant.isOpen ? "Open" : "Closed"}
            helper={restaurant.isOpen ? "Accepting orders now" : "Currently unavailable"}
          />
          <StatCard
            label="Location"
            value={restaurant.autoLocation?.formattedAddress ? "Mapped" : "Pending"}
            helper={restaurant.autoLocation?.formattedAddress || "Address unavailable"}
            icon={<FiMapPin />}
          />
        </div>

        <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={false} />

        <Card className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <p className="mt-1 text-sm text-gray-400">
              {menuItems.length} item{menuItems.length === 1 ? "" : "s"} ready for discovery.
            </p>
          </div>

          <div className="p-5">
            {menuItems.length === 0 ? (
              <Card className="border-dashed px-6 py-14 text-center">
                <p className="font-semibold text-white">No menu items yet</p>
                <p className="mt-2 text-sm text-gray-400">This restaurant has not published any dishes yet. Check back soon.</p>
              </Card>
            ) : (
              <MenuGrid isSeller={false} items={menuItems} onItemDeleted={() => {}} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantPage;


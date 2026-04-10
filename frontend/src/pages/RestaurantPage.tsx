import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";

const RestaurantPage = () => {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setRestaurant(data || null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setMenuItems(data);
    } catch (error) {
      console.log(error);
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
      <div className="flex h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#333] border-t-[#d4a017]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-300">Restaurant not found</p>
          <p className="text-sm text-gray-600">No restaurant exists with this ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 space-y-6">

      {/* Restaurant Profile */}
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={false}
      />

      {/* Menu Section */}
      <div className="rounded-[28px] border border-[#333] bg-[#121212] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
        <div className="border-b border-[#2a2a2a] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#f0c040] uppercase tracking-wider">
            Menu
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {menuItems.length} item{menuItems.length !== 1 ? "s" : ""} available
          </p>
        </div>

        <div className="p-5">
          {menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#333]">
                <span className="text-2xl">🍽️</span>
              </div>
              <p className="text-sm font-medium text-gray-400">No items on the menu yet</p>
              <p className="text-xs text-gray-600 mt-1">Check back soon!</p>
            </div>
          ) : (
            <MenuItems
              isSeller={false}
              items={menuItems}
              onItemDeleted={() => {}}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default RestaurantPage;
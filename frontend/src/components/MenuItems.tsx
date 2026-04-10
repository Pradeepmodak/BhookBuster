import { useState } from "react";
import type { IMenuItem } from "../types";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { FiEyeOff } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import axios from "axios";
import { useAppData } from "../context/AppContext";
import { motion } from "framer-motion";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const { fetchCart } = useAppData();

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Item deleted");
      onItemDeleted();
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleAvailability = async (itemId: string) => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(data.message);
      onItemDeleted();
    } catch {
      toast.error("Status update failed");
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      fetchCart();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add");
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        const isLoading = loadingItemId === item._id;

        return (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border 
            border-[#2A2A35] bg-[#111118] shadow-lg transition-all duration-300 
            hover:-translate-y-1 hover:border-yellow-500/40
            ${!item.isAvailable ? "opacity-60" : ""}`}
          >
            {/* 🔥 Image */}
            <div className="relative">
              <img
                src={item.image}
                alt={item.name}
                className={`h-36 w-full object-cover transition ${
                  !item.isAvailable ? "grayscale brightness-50" : "group-hover:scale-105"
                }`}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {!item.isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-300 tracking-widest uppercase">
                  Not Available
                </div>
              )}
            </div>

            {/* 🔹 Content */}
            <div className="flex flex-col flex-1 p-4">
              <h3 className="text-sm font-semibold text-white truncate mb-1">
                {item.name}
              </h3>

              {item.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* 🔥 Footer */}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[15px] font-semibold text-yellow-400">
                  ₹{item.price}
                </span>

                <div className="flex gap-2">

                  {/* SELLER CONTROLS */}
                  {isSeller && (
                    <>
                      <button
                        onClick={() => toggleAvailability(item._id)}
                        className="p-2 rounded-lg border border-[#2A2A35] text-gray-400 
                        hover:border-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition"
                      >
                        {item.isAvailable ? <BsEye size={16} /> : <FiEyeOff size={16} />}
                      </button>

                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-lg border border-[#2A2A35] text-gray-400 
                        hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <BiTrash size={16} />
                      </button>
                    </>
                  )}

                  {/* USER CART BUTTON */}
                  {!isSeller && (
                    <button
                      disabled={!item.isAvailable || isLoading}
                      onClick={() => addToCart(item.restaurantId, item._id)}
                      className={`p-2 rounded-lg border transition ${
                        !item.isAvailable || isLoading
                          ? "cursor-not-allowed text-gray-600 border-[#2A2A35]"
                          : "text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                      }`}
                    >
                      {isLoading ? (
                        <VscLoading className="animate-spin" size={16} />
                      ) : (
                        <BsCartPlus size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 🔄 Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <VscLoading className="animate-spin text-yellow-400" size={20} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default MenuItems;
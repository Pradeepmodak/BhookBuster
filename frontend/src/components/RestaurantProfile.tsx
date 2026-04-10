import { useState } from "react";
import type { IRestaurant } from "../types.ts";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave } from "react-icons/bi";
import { useAppData } from "../context/AppContext.tsx";
import VerificationBadge from "./VerificationBadge";

interface props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description || "");
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [loading, setLoading] = useState(false);

  const toggleOpenStatus = async () => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: !isOpen },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // ✅ Fix: use the returned value from server, not local toggle
      const newStatus = data.restaurant.isOpen;
      setIsOpen(newStatus);
      onUpdate(data.restaurant); // ✅ propagate to parent so reload stays consistent
      toast.success(data.message);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update restaurant status"
      );
      console.error("Error updating restaurant status:", error);
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      onUpdate(data.restaurant);
      toast.success(data.message || "Restaurant updated successfully");
      setEditMode(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update restaurant"
      );
      console.error("Error saving changes:", error);
    } finally {
      setLoading(false);
    }
  };

  const { setIsAuth, setUser } = useAppData();

  const logoutHandler = async () => {
    try {
      await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: false },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (_) {
      // best effort — log out regardless
    }
    localStorage.setItem("token", "");
    setIsAuth(false);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[#333] bg-[#181818] shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      
      {/* Banner */}
      <div className="relative group">
        {restaurant.image && (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="h-48 w-full object-cover transition duration-300"
          />
        )}
        {isSeller && (
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <div className="flex items-center gap-2 rounded-full bg-[#d4a017] px-4 py-2 text-sm font-semibold text-[#0f0f0f] hover:brightness-110">
              {loading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <BiEdit className="h-5 w-5" />
                  <span>Update Banner</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={loading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setLoading(true);
                  const formData = new FormData();
                  formData.append("file", file);
                  const { data } = await axios.put(
                    `${restaurantService}/api/restaurant/image/update`,
                    formData,
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  );
                  onUpdate(data.restaurant);
                  toast.success("Banner updated!");
                } catch (error: any) {
                  toast.error(
                    error.response?.data?.message || "Failed to update banner"
                  );
                } finally {
                  setLoading(false);
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 p-5 text-white">

        {/* Name + Location row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {editMode ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#444] bg-[#1a1a1a] px-3 py-1.5 text-lg font-semibold text-white outline-none focus:border-[#d4a017] transition-colors"
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold text-white">{name}</h2>
                {isSeller && (
                  <VerificationBadge isVerified={restaurant.isVerified} size={18} />
                )}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400">
              <BiMapPin className="h-4 w-4 shrink-0 text-[#d4a017]" />
              <span className="truncate">
                {restaurant.autoLocation?.formattedAddress || "Location unavailable"}
              </span>
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="shrink-0 rounded-lg border border-[#333] p-1.5 text-neutral-400 hover:border-[#d4a017] hover:text-[#f0c040] transition-colors"
            >
              <BiEdit size={18} />
            </button>
          )}
        </div>

        {/* Description */}
        {editMode ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#444] bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4a017] transition-colors resize-none"
          />
        ) : (
          <p className="text-sm text-neutral-400">
            {description || "No description added"}
          </p>
        )}

        {/* Status + Actions row */}
        <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-4">
          <span
            className={`text-sm font-semibold tracking-wide ${
              isOpen ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isOpen ? "● OPEN" : "● CLOSED"}
          </span>

          <div className="flex items-center gap-2">
            {editMode && (
              <button
                onClick={saveChanges}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-[#d4a017] px-3 py-1.5 text-sm font-semibold text-[#0f0f0f] hover:brightness-110 disabled:opacity-50 transition"
              >
                <BiSave size={16} />
                {loading ? "Saving..." : "Save"}
              </button>
            )}

            {isSeller && (
              <button
                onClick={toggleOpenStatus}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${
                  isOpen
                    ? "bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30"
                    : "bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                }`}
              >
                {isOpen ? "Close Restaurant" : "Open Restaurant"}
              </button>
            )}

            {isSeller && (
              <button
                onClick={logoutHandler}
                className="rounded-xl border border-[#333] px-4 py-1.5 text-sm font-medium text-neutral-400 hover:border-red-400/40 hover:text-red-300 transition"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Created date */}
        <p className="text-xs text-neutral-600">
          Created on {new Date(restaurant.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default RestaurantProfile;
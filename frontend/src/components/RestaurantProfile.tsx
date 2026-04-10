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
        },
      );
      toast.success(data.message);
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update restaurant status",
      );
      console.error("Error updating restaurant status:", error);
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        {
          name,
          description,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      onUpdate(data.restaurant);
      toast.success(data.message || "Restaurant updated successfully");
      setEditMode(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update restaurant",
      );
      console.error("Error saving changes:", error);
    } finally {
      setLoading(false);
    }
  };


const { setIsAuth, setUser } = useAppData();

const logoutHandler = async () => {
  await axios.put(
    `${restaurantService}/api/restaurant/status`,
    { status: false },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  localStorage.setItem("token", "");
  setIsAuth(false);
  setUser(null);
  toast.success("LoggedOut Successfully");
};
  return (
    <div
      className="mx-auto max-w-xl rounded-xl bg-white shadow-sm
    overflow-hidden"
    >
      <div className="relative group">
        {restaurant.image && (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="h-48 w-full object-cover transition duration-300"
          />
        )}
        
        {/* Banner Edit Overlay */}
        {isSeller && (
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 font-semibold text-gray-800 shadow backdrop-blur-sm hover:bg-white text-sm">
              {loading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <BiEdit className="h-5 w-5 text-gray-700" />
                  <span>Update Banner Image</span>
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
                         Authorization: `Bearer ${localStorage.getItem("token")}`
                      }
                    }
                  );
                  onUpdate(data.restaurant);
                  toast.success("Banner updated!");
                } catch (error: any) {
                  toast.error(error.response?.data?.message || "Failed to update banner");
                } finally {
                  setLoading(false);
                }
              }}
            />
          </label>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            {editMode ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold border-b"
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                {isSeller && (
                  <VerificationBadge isVerified={restaurant.isVerified} size={18} />
                )}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <BiMapPin className="h-4 w-4 text-red-500" />
              {restaurant.autoLocation.formattedAddress ||
                "Location unavailable"}
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-gray-500 hover:text-black"
            >
              <BiEdit size={18} />
            </button>
          )}
        </div>

        {editMode ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        ) : (
          <p className="text-sm text-gray-600">
            {restaurant.description || "No description added"}
          </p>
        )}
        <div
          className="felx items-center justify-betweenp-3
        b-top "
        >
          <span
            className={`text-sm font-medium ${
              isOpen ? "text-green-600" : "text-red-500"
            }`}
          >
            {isOpen ? "OPEN" : "CLOSED"}
          </span>
          <div className="flex gap-3">
            {editMode && (
              <button
                onClick={saveChanges}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                <BiSave size={16} />
                Save
              </button>
            )}
            {isSeller && (
              <button
                onClick={toggleOpenStatus}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${
                  isOpen
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isOpen ? "Close Restaurant" : "Open Restaurant"}
              </button>
            )}
                        {isSeller && (
              <button
                onClick={logoutHandler}
                className="rounded-lg px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700" >
               Logout
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Created on {new Date(restaurant.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default RestaurantProfile;

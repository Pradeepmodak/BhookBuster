import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave, BiUpload } from "react-icons/bi";
import { FiLogOut, FiPower } from "react-icons/fi";
import type { IRestaurant } from "../types.ts";
import { restaurantService } from "../config";
import { useAppData } from "../context/AppContext.tsx";
import VerificationBadge from "./VerificationBadge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import { getErrorMessage } from "../utils/http";

interface Props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: Props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description || "");
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { setIsAuth, setUser } = useAppData();

  const handleBannerUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.put(`${restaurantService}/api/restaurant/image/update`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      onUpdate(data.restaurant);
      toast.success("Banner updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update banner"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
      const newStatus = data.restaurant.isOpen;
      setIsOpen(newStatus);
      onUpdate(data.restaurant);
      toast.success(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update restaurant status"));
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
        },
      );
      onUpdate(data.restaurant);
      toast.success(data.message || "Restaurant updated successfully");
      setEditMode(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update restaurant"));
      console.error("Error saving changes:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutHandler = async () => {
    try {
      await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: false },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
    } catch {
      // Best effort only. We still log the seller out locally.
    }

    localStorage.setItem("token", "");
    setIsAuth(false);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      <div className="relative">
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} className="h-52 w-full object-cover" />
        ) : (
          <div className="h-52 w-full bg-[linear-gradient(135deg,#1f1f1f,#101010)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {isSeller ? (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">Restaurant profile</p>
              <p className="mt-2 text-sm text-white/80">
                {editMode ? "Update banner, name, and description in one place." : "Manage branding and profile details from a single edit flow."}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setEditMode((value) => !value)} leftIcon={<BiEdit />}>
              {editMode ? "Cancel Edit" : "Edit Profile"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-5 p-5 text-white md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            {editMode ? (
              <Input label="Restaurant Name" value={name} onChange={(event) => setName(event.target.value)} className="px-0" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-white">{name}</h2>
                {isSeller ? <VerificationBadge isVerified={restaurant.isVerified} size={18} /> : null}
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 text-sm text-gray-400">
              <BiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              <span>{restaurant.autoLocation?.formattedAddress || "Location unavailable"}</span>
            </div>
          </div>
        </div>

        {editMode ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--color-accent)]/40"
              />
            </label>

            <Card className="space-y-3 p-4">
              <p className="text-sm font-medium text-white">Banner</p>
              <p className="text-sm text-gray-400">Keep restaurant identity updates inside the same edit flow.</p>
              <Button
                variant="secondary"
                leftIcon={<BiUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? "Uploading..." : "Upload New Banner"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={loading}
                onChange={(event) => handleBannerUpload(event.target.files?.[0] || null)}
              />
            </Card>
          </div>
        ) : (
          <p className="text-sm leading-6 text-gray-400">{description || "No description added yet."}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-gray-400">Status</p>
            <p className={`mt-2 text-lg font-semibold ${isOpen ? "text-emerald-300" : "text-red-300"}`}>
              {isOpen ? "Open now" : "Closed now"}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Verification</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {restaurant.isVerified ? "Approved" : "Pending review"}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Created</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {new Date(restaurant.createdAt).toLocaleDateString()}
            </p>
          </Card>
        </div>

        {isSeller ? (
          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
            {editMode ? (
              <Button onClick={saveChanges} disabled={loading} leftIcon={<BiSave />}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            ) : null}

            <Button variant={isOpen ? "danger" : "secondary"} onClick={toggleOpenStatus} leftIcon={<FiPower />}>
              {isOpen ? "Close Restaurant" : "Open Restaurant"}
            </Button>

            <Button variant="ghost" onClick={logoutHandler} leftIcon={<FiLogOut />}>
              Logout
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default RestaurantProfile;


import React, { useState } from "react";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiX, BiUpload } from "react-icons/bi";
import { useAppData } from "../context/AppContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentName: string;
  currentPhone: string;
}

const RiderEditProfile = ({ isOpen, onClose, onSuccess, currentName, currentPhone }: Props) => {
  const { fetchUser } = useAppData(); // To refresh User model name
  const [name, setName] = useState(currentName);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    if (name !== currentName) formData.append("name", name);
    if (phoneNumber !== currentPhone) formData.append("phoneNumber", phoneNumber);
    if (image) formData.append("file", image);

    try {
      await axios.put(`${riderService}/api/rider/profile/update`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Profile updated successfully!");
      if (name !== currentName) await fetchUser(); // Update global auth context
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold text-gray-800">Edit Profile</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition"
          >
            <BiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Profile Picture (Optional)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-6 hover:bg-gray-50 transition">
              <BiUpload className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-600">
                {image ? image.name : "Click to upload new display picture"}
              </span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {loading ? "Saving Changes..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RiderEditProfile;

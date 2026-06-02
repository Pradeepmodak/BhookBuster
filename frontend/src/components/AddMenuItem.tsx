import { useState } from "react";
import { restaurantService } from "../config";
import axios from "axios";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";

const AddMenuItem = ({ onItemAdded }: { onItemAdded: () => void }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [dietaryFlags, setDietaryFlags] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setTags("");
    setDietaryFlags("");
    setImage(null);
  };

  const handleSubmit = async () => {
    if (!name || !price || !image) {
      toast.error("Name, price and image are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    if (tags) formData.append("tags", tags);
    if (dietaryFlags) formData.append("dietaryFlags", dietaryFlags);
    formData.append("file", image);

    try {
      setLoading(true);
      await axios.post(`${restaurantService}/api/item/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Item added successfully");
      resetForm();
      onItemAdded();
    } catch (error) {
      console.log(error);
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-[#f0c040]">Add Menu Item</h2>

      {/* Name */}
      <input
        type="text"
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#d4a017] transition-colors"
      />

      {/* Description */}
      <textarea
        placeholder="Item description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#d4a017] transition-colors resize-none"
      />

      {/* Price */}
      <input
        type="number"
        placeholder="Price ₹"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#d4a017] transition-colors"
      />

      {/* Tags */}
      <input
        type="text"
        placeholder="Tags (e.g., Spicy, Vegan, Bestseller)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#d4a017] transition-colors"
      />

      {/* Dietary Flags */}
      <input
        type="text"
        placeholder="Dietary Flags (e.g., Contains Nuts, Gluten-Free)"
        value={dietaryFlags}
        onChange={(e) => setDietaryFlags(e.target.value)}
        className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#d4a017] transition-colors"
      />

      {/* Image Upload */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#333] border-dashed bg-[#1a1a1a] p-4 text-sm text-gray-500 hover:border-[#d4a017] hover:text-[#f0c040] transition-colors">
        <BiUpload className="h-5 w-5 text-[#d4a017] shrink-0" />
        <span className="truncate">
          {image ? image.name : "Upload item image"}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
          className="hidden"
        />
      </label>

      {/* Image Preview */}
      {image && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[#333]">
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 bg-black/60 text-gray-300 hover:text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        disabled={loading}
        onClick={handleSubmit}
        className={`w-full rounded-lg py-3 text-sm font-semibold transition-all
          ${loading
            ? "bg-[#2a2a2a] text-gray-500 cursor-not-allowed border border-[#333]"
            : "bg-[#d4a017] hover:bg-[#f0c040] text-[#1a1a1a] cursor-pointer"
          }`}
      >
        {loading ? "Adding..." : "Add Item"}
      </button>
    </div>
  );
};

export default AddMenuItem;

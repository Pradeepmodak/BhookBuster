import { useState } from "react";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../config";
import { BiMapPin, BiUpload } from "react-icons/bi";
import { FiBarChart2, FiHome, FiMapPin, FiPhone } from "react-icons/fi";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { getErrorMessage } from "../utils/http";

interface AddRestaurantProps {
  fetchMyRestaurant: () => Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: AddRestaurantProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { loadingLocation, location } = useAppData();

  const handleSubmit = async () => {
    if (!name || !image || !location) {
      toast.error("Restaurant name, image, and location are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("phone", phone);
    formData.append("latitude", location.latitude.toString());
    formData.append("longitude", location.longitude.toString());
    formData.append("formattedAddress", location.formattedAddress);
    formData.append("file", image);

    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Restaurant created successfully");
      fetchMyRestaurant();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create restaurant"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white">
      <div className="mx-auto grid min-h-[84vh] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center shadow-[0_28px_90px_rgba(0,0,0,0.4)] lg:grid-cols-[1fr_1.05fr]">
        <div className="border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-[#facc15]">
            <FiBarChart2 />
            Seller onboarding
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Launch your restaurant on BhookBuster.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300">
            Create your seller profile to start publishing menu items, accepting orders, and tracking business analytics from one dashboard.
          </p>

          <div className="mt-8 grid gap-3">
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">Orders and fulfillment</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">Move orders from accepted to ready-for-rider and manage fulfillment flow live.</p>
            </Card>
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">Menu management</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">Add dishes, control availability, and keep the customer menu accurate.</p>
            </Card>
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">BI-style analytics</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">Track revenue, customer mix, payout economics, and item performance in one place.</p>
            </Card>
          </div>
        </div>

        <div className="flex items-center p-6 lg:p-9">
          <Card className="w-full border-white/10 bg-[#171717]/95 p-6 lg:p-7" glow>
            <div>
              <h2 className="text-2xl font-semibold text-white">Create restaurant profile</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                This becomes your seller identity inside BhookBuster and powers menu, order, and analytics views.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <Input
                label="Restaurant name"
                placeholder="Spice Route Kitchen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<FiHome size={16} />}
              />

              <Input
                label="Contact number"
                type="number"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<FiPhone size={16} />}
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Restaurant description</span>
                <textarea
                  placeholder="Describe your cuisine, signature dishes, and what makes your restaurant special."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-[var(--color-accent)]/40"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Restaurant banner</span>
                <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-neutral-300 transition hover:border-white/20 hover:bg-white/5">
                  <BiUpload className="h-5 w-5 text-[#facc15]" />
                  <span>{image ? image.name : "Upload restaurant image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                  />
                </div>
              </label>

              <Card className="border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-[#facc15]/10 p-2 text-[#facc15]">
                    <BiMapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Restaurant location</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      {loadingLocation
                        ? "Fetching your current location for seller setup..."
                        : location
                          ? location.formattedAddress
                          : "Location unavailable. Please allow location access and try again."}
                    </p>
                  </div>
                </div>
              </Card>

              <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting || loadingLocation}>
                {submitting ? "Creating restaurant..." : "Create restaurant"}
              </Button>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <FiMapPin className="text-[#facc15]" />
                BhookBuster uses your seller location to place the restaurant correctly in nearby discovery.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddRestaurant;


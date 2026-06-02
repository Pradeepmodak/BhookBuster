import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../config";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";
import { FiMapPin, FiPhone } from "react-icons/fi";
import { motion } from "framer-motion";
import type { AddressRecord } from "../types";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Types
type Address = AddressRecord;

// Click picker
const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Locate Me button
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();

  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16);
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };

  return (
    <button
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2
      rounded-xl bg-[#111118] px-3 py-2 text-sm border border-[#2A2A35]
      hover:border-yellow-500 transition"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const AddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [mobile, setMobile] = useState<string>("");
  const [formattedAddress, setFormattedAddress] = useState<string>("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const geocodeAbortRef = useRef<AbortController | null>(null);

  // Reverse geocode
  const fetchFormattedAddress = useCallback(
    async (lat: number, lng: number) => {
      geocodeAbortRef.current?.abort();
      geocodeAbortRef.current = new AbortController();

      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/reverse?key=pk.80c138d580502bcf900f951710ca327b&lat=${lat}&lon=${lng}&format=json`,
          { signal: geocodeAbortRef.current.signal }
        );

        const data = await res.json();
        setFormattedAddress(data.display_name || "");
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          toast.error("Failed to fetch address");
        }
      }
    },
    []
  );

  const setLocation = useCallback(
    (lat: number, lng: number) => {
      setLatitude(lat);
      setLongitude(lng);
      fetchFormattedAddress(lat, lng);
    },
    [fetchFormattedAddress]
  );

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/address/all`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setAddresses(data.addresses || []);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
    return () => geocodeAbortRef.current?.abort();
  }, [fetchAddresses]);

  // Add address
  const addAddress = async () => {
    if (!mobile || !formattedAddress || latitude === null || longitude === null) {
      toast.error("Select a valid location");
      return;
    }

    if (mobile.length < 10) {
      toast.error("Invalid mobile number");
      return;
    }

    try {
      setAdding(true);

      await axios.post(
        `${restaurantService}/api/address/new`,
        { formattedAddress, mobile, latitude, longitude },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Address saved!");

      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);

      fetchAddresses();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // Delete address
  const deleteAddress = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;

    try {
      setDeletingId(id);

      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Deleted");
      fetchAddresses();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Heading */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">
            Set your delivery location
          </h1>
          <p className="text-gray-400 mt-2">
            Find the fastest delivery options near you.
          </p>
        </div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-[#2A2A35] bg-[#111118]"
        >
          <MapContainer
            center={[latitude ?? 23.37, longitude ?? 85.33]}
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker setLocation={setLocation} />
            <LocateMeButton onLocate={setLocation} />
            {latitude !== null && longitude !== null && (
              <Marker position={[latitude, longitude]} />
            )}
          </MapContainer>
        </motion.div>

        {/* Address Preview */}
        {formattedAddress && (
          <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <FiMapPin className="text-yellow-500 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{formattedAddress}</span>
          </div>
        )}

        {/* Mobile Input */}
        <input
          type="tel"
          placeholder="Enter mobile number"
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value.replace(/\D/g, ""))
          }
          className="w-full rounded-xl border border-[#2A2A35] bg-[#111118] px-4 py-3 text-white focus:border-yellow-500"
        />

        {/* Save Button */}
        <button
          onClick={addAddress}
          disabled={adding}
          className="w-full flex items-center justify-center gap-2 rounded-xl
          bg-yellow-500 text-black font-semibold px-4 py-3
          hover:bg-yellow-400 transition shadow-lg"
        >
          {adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
          Save Address
        </button>

        {/* Saved Addresses */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Saved Addresses
          </h2>

          {loading ? (
            <div className="animate-pulse h-20 bg-[#111118] rounded-xl" />
          ) : addresses.length === 0 ? (
            <p className="text-gray-500">No saved addresses</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className="flex justify-between items-center rounded-xl border border-[#2A2A35] bg-[#111118] p-4 hover:border-yellow-500/40 transition"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {addr.formattedAddress}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <FiPhone size={12} /> {addr.mobile}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteAddress(addr._id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                  >
                    {deletingId === addr._id ? (
                      <BiLoader className="animate-spin" />
                    ) : (
                      <BiTrash />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AddressPage;


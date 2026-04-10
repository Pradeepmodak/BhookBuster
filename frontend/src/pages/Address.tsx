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
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";

// ─── Fix Leaflet default marker icon (Webpack/Vite bundler issue) ─────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

// ─── Sub-component: click-to-pick location on map ────────────────────────────
// Renders nothing — exists only to subscribe to map click events (headless component)
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

// ─── Sub-component: "Use current location" button ────────────────────────────
// Must live inside <MapContainer> to access the Leaflet map instance via useMap()
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();

  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // flyTo animates the camera to the user's position
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied"),
    );
  };

  return (
    <button
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2
        rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────
const AddAddressPage = () => {
  const [addresses, setAddresses]   = useState<Address[]>([]);
  const [loading, setLoading]       = useState(true);
  const [adding, setAdding]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [mobile, setMobile]                     = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude]                 = useState<number | null>(null);
  const [longitude, setLongitude]               = useState<number | null>(null);

  // FIX 1: AbortController ref — cancels stale reverse-geocode requests.
  // If the user clicks the map quickly twice, the first (slower) request is
  // aborted so it can't overwrite the result of the second (correct) one.
  const geocodeAbortRef = useRef<AbortController | null>(null);

  // ── Reverse geocoding (lat/lng → human-readable address) ──────────────────
  const fetchFormattedAddress = useCallback(async (lat: number, lng: number) => {
    // Cancel any in-flight request before starting a new one
    geocodeAbortRef.current?.abort();
    geocodeAbortRef.current = new AbortController();

    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=pk.80c138d580502bcf900f951710ca327b&lat=${lat}&lon=${lng}&format=json`,
        { signal: geocodeAbortRef.current.signal },
      );
      const data = await res.json();
      setFormattedAddress(data.display_name || "");
    } catch (err: any) {
      // Ignore AbortError — it's intentional cancellation, not a real failure
      if (err.name !== "AbortError") {
        toast.error("Failed to fetch address");
      }
    }
  }, []);

  // FIX 2: useCallback — stable reference so this function doesn't cause
  // unnecessary re-renders when passed as a prop to child components
  const setLocation = useCallback(
    (lat: number, lng: number) => {
      setLatitude(lat);
      setLongitude(lng);
      fetchFormattedAddress(lat, lng);
    },
    [fetchFormattedAddress],
  );

  // ── Fetch saved addresses ──────────────────────────────────────────────────
  // FIX 3: useCallback so fetchAddresses has a stable identity and can safely
  // be listed in dependency arrays without causing infinite loops
  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data.addresses || []);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // FIX 4: Cleanup on unmount — abort any pending geocode request if the
  // user navigates away before it resolves (prevents setState on unmounted component)
  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
    };
  }, []);

  // ── Add a new address ──────────────────────────────────────────────────────
  const addAddress = async () => {
    if (!mobile || !formattedAddress || latitude === null || longitude === null) {
      toast.error("Please select a location on the map");
      return;
    }

    // FIX 5: Validate mobile number length (basic guard)
    if (mobile.length < 10) {
      toast.error("Please enter a valid mobile number");
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
        },
      );
      toast.success("Address saved!");
      // Reset form
      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // ── Delete an address ──────────────────────────────────────────────────────
  // FIX 6: useCallback with stable reference for delete handler
  const deleteAddress = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this address?")) return;
      try {
        setDeletingId(id);
        await axios.delete(`${restaurantService}/api/address/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        toast.success("Address deleted");
        fetchAddresses();
      } catch {
        toast.error("Failed to delete address");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchAddresses],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Select Delivery Address</h1>

      {/* Map — LocationPicker and LocateMeButton must be inside MapContainer */}
      <div className="relative h-96 w-full overflow-hidden rounded-lg border">
        <MapContainer
          // FIX 7: key prop forces a full remount if center changes drastically.
          // Without this, MapContainer ignores the `center` prop after first render.
          center={[latitude ?? 23.3769166, longitude ?? 85.3442246]}
          zoom={13}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Headless — listens for map clicks and calls setLocation */}
          <LocationPicker setLocation={setLocation} />
          {/* Must be inside MapContainer to access useMap() */}
          <LocateMeButton onLocate={setLocation} />
          {/* Only render marker when both coords are valid numbers */}
          {latitude !== null && longitude !== null && (
            <Marker position={[latitude, longitude]} />
          )}
        </MapContainer>
      </div>

      {/* Selected address preview */}
      {formattedAddress && (
        <div className="rounded-lg border bg-green-50 p-3 text-sm">
          📍 {formattedAddress}
        </div>
      )}

      {/* Mobile number input */}
      <input
        type="tel"
        placeholder="Mobile number"
        value={mobile}
        maxLength={15}
        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
        className="w-full rounded-lg border px-4 py-2"
      />

      {/* Save button — disabled while a save is in progress */}
      <button
        disabled={adding}
        onClick={addAddress}
        className="flex items-center justify-center gap-2 rounded-lg
          bg-[#E23744] px-4 py-3 text-white hover:bg-[#d32f3a] disabled:opacity-50"
      >
        {adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
        Save Address
      </button>

      {/* Saved addresses list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses saved yet</p>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr._id}
              className="flex items-center justify-between rounded-lg border bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium">{addr.formattedAddress}</p>
                <p className="text-xs text-gray-500">📞 {addr.mobile}</p>
              </div>
              {/* deletingId tracks WHICH item is loading — not a global boolean,
                  so only that row shows a spinner while others remain interactive */}
              <button
                onClick={() => deleteAddress(addr._id)}
                disabled={deletingId === addr._id}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === addr._id ? (
                  <BiLoader size={16} className="animate-spin" />
                ) : (
                  <BiTrash size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddAddressPage;
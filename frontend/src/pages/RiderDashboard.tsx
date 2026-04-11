import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import audio from "../assets/order_received.mp3";
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import VerificationBadge from "../components/VerificationBadge";
import RiderEarnings from "../components/RiderEarnings";
import RiderEditProfile from "../components/RiderEditProfile";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { FiCreditCard, FiLogOut, FiPhone } from "react-icons/fi";
import { getErrorMessage } from "../utils/http";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
}

const RiderDashboard = () => {
  const { user, setIsAuth, setUser } = useAppData();
  const { socket } = useSocket();
  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"deliveries" | "earnings">("deliveries");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.preload = "auto";
  }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      toast.success("Sound enabled");
    } catch {
      toast.error("Tap again to enable sound");
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onOrderAvailable = ({ orderId }: { orderId: string }) => {
      setIncomingOrders((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);
    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [socket, audioUnlocked]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/myprofile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProfile(data?.rider || null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/order/current`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setCurrentOrder(data.order);
    } catch {
      setCurrentOrder(null);
    }
  };

  const handleCurrentOrderStatusUpdate = (nextOrder: IOrder | null) => {
    setCurrentOrder(nextOrder);
  };

  const fetchDeliveryQueue = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/order/queue`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const queuedOrderIds = (data?.queue || []).map((entry: { orderId: string }) => entry.orderId);
      setIncomingOrders(queuedOrderIds);
    } catch {
      // Queue polling is a resilience fallback, so we avoid noisy UI errors here.
    }
  };

  useEffect(() => {
    if (user?.role === "rider") fetchProfile();
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchCurrentOrder();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.isAvailable || currentOrder) return;

    fetchDeliveryQueue();
    const interval = setInterval(fetchDeliveryQueue, 5000);
    return () => clearInterval(interval);
  }, [profile?.isAvailable, currentOrder]);

  const toggleAvailability = async () => {
    if (!navigator.geolocation) {
      toast.error("Location Access Required");
      return;
    }
    setToggling(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await axios.patch(
            `${riderService}/api/rider/toggle`,
            {
              isAvailable: !profile?.isAvailable,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          if (data?.rider) {
            setProfile(data.rider);
          }
          toast.success(data?.message || (profile?.isAvailable ? "You are offline" : "You are online"));
          fetchProfile();
        } catch (error) {
          toast.error(getErrorMessage(error, "Failed to toggle availability"));
        } finally {
          setToggling(false);
        }
      },
      () => {
        toast.error("Unable to read your location");
        setToggling(false);
      },
    );
  };

  const handleSubmit = async () => {
    if (!navigator.geolocation) {
      toast.error("Location Access Required");
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const formData = new FormData();
        formData.append("phoneNumber", phoneNumber);
        formData.append("aadharNumber", aadharNumber);
        formData.append("drivingLicenseNumber", drivingLicenseNumber);
        formData.append("latitude", pos.coords.latitude.toString());
        formData.append("longitude", pos.coords.longitude.toString());
        if (image) formData.append("file", image);

        try {
          const { data } = await axios.post(`${riderService}/api/rider/new`, formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          toast.success(data.message);
          fetchProfile();
        } catch (error) {
          toast.error(getErrorMessage(error, "Failed to submit profile"));
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        toast.error("Unable to read your location");
        setSubmitting(false);
      },
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    window.location.href = "/login";
  };

  if (user?.role !== "rider") {
    return <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">You are not registered as a rider</div>;
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-neutral-400">Loading rider details...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] px-4 py-6 text-white">
        <div className="mx-auto max-w-lg space-y-5 rounded-[28px] border border-white/10 bg-[#121212] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <h1 className="text-2xl font-semibold">Create Rider Profile</h1>
          <p className="text-sm leading-6 text-neutral-400">
            Phone number, Aadhaar number, and driving licence number are required before your rider account can be verified.
          </p>
          <Input
            label="Phone Number"
            type="tel"
            placeholder="Enter contact number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            icon={<FiPhone size={16} />}
          />
          <Input
            label="Aadhaar Number"
            type="text"
            placeholder="Enter Aadhaar number"
            value={aadharNumber}
            onChange={(e) => setAadharNumber(e.target.value)}
            icon={<FiCreditCard size={16} />}
          />
          <Input
            label="Driving Licence Number"
            type="text"
            placeholder="Enter driving licence number"
            value={drivingLicenseNumber}
            onChange={(e) => setDrivingLicenseNumber(e.target.value)}
            icon={<FiCreditCard size={16} />}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-[#171717] p-4 text-sm text-neutral-300 hover:bg-white/5">
            <BiUpload className="h-5 w-5 text-[#facc15]" />
            {image ? image.name : "Upload your image"}
            <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </label>
          <Button onClick={handleSubmit} disabled={submitting} fullWidth>
            {submitting ? "Submitting..." : "Create Rider Profile"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-12 text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Verification", value: profile.isVerified ? "Verified" : "Pending" },
            { label: "Availability", value: profile.isAvailable ? "Online" : "Offline" },
            { label: "Incoming Queue", value: incomingOrders.length },
            { label: "Active Tab", value: activeTab === "deliveries" ? "Deliveries" : "Earnings" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[26px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              <div className="text-sm text-neutral-400">{stat.label}</div>
              <div className="mt-3 text-2xl font-semibold text-[#facc15]">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <Card className="relative p-5">
              <div className="absolute right-4 top-4 flex gap-2">
                <button onClick={() => setIsEditModalOpen(true)} className="text-xs font-semibold text-[#facc15]">
                  Edit Profile
                </button>
                <button onClick={handleLogout} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-300 hover:text-white">
                  <FiLogOut size={12} />
                  Logout
                </button>
              </div>
              <img src={profile.picture} className="mx-auto h-24 w-24 rounded-full object-cover" alt="" />
              <p className="mt-3 text-center text-xl font-semibold">{user?.name}</p>
              <p className="text-center text-sm text-neutral-400">{profile.phoneNumber}</p>
              <div className="mt-4 grid gap-2 rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Aadhaar</span>
                  <span>{profile.aadharNumber}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Driving licence</span>
                  <span>{profile.drivingLicenseNumber}</span>
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-2">
                <VerificationBadge isVerified={profile.isVerified} size={16} />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200">
                  {profile.isAvailable ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-4 text-center text-sm text-neutral-400">
                Stay near active hotspots to receive more high-quality delivery opportunities.
              </p>
              {profile.isVerified && !currentOrder && (
                <button
                  onClick={toggleAvailability}
                  disabled={toggling}
                  className={`mt-5 w-full rounded-2xl py-3 font-semibold ${
                    toggling
                      ? "bg-neutral-600 text-neutral-300"
                      : profile.isAvailable
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#facc15] text-[#0f0f0f] hover:brightness-110"
                  }`}
                >
                  {toggling ? "Updating..." : profile.isAvailable ? "Go Offline" : "Go Online"}
                </button>
              )}
            </Card>

            <div className="flex rounded-2xl bg-[#171717] p-1">
              <button
                onClick={() => setActiveTab("deliveries")}
                className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all ${
                  activeTab === "deliveries" ? "bg-[#facc15] text-[#0f0f0f]" : "text-neutral-400 hover:text-white"
                }`}
              >
                Active Deliveries
              </button>
              <button
                onClick={() => setActiveTab("earnings")}
                className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all ${
                  activeTab === "earnings" ? "bg-[#facc15] text-[#0f0f0f]" : "text-neutral-400 hover:text-white"
                }`}
              >
                My Earnings
              </button>
            </div>
          </div>

          {activeTab === "deliveries" ? (
            <div className="space-y-4">
              {!audioUnlocked && (
                <div className="flex items-center justify-between rounded-[24px] border border-[#facc15]/20 bg-[#facc15]/10 p-4">
                  <div>
                    <p className="font-medium text-[#facc15]">Enable Sound Notification</p>
                    <p className="text-sm text-neutral-300">Get notified instantly when new orders arrive.</p>
                  </div>
                  <button onClick={unlockAudio} className="rounded-2xl bg-[#facc15] px-4 py-2 font-semibold text-[#0f0f0f]">
                    Enable sound
                  </button>
                </div>
              )}

              {profile.isAvailable && incomingOrders.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {incomingOrders.map((id) => (
                    <RiderOrderRequest key={id} orderId={id} onAccepted={() => { fetchProfile(); fetchCurrentOrder(); }} />
                  ))}
                </div>
              )}

              {currentOrder && (
                <div className="space-y-4">
                  <RiderCurrentOrder order={currentOrder} onStatusUpdate={handleCurrentOrderStatusUpdate} />
                  <RiderOrderMap order={currentOrder} />
                </div>
              )}

              {profile.isAvailable && !currentOrder && incomingOrders.length === 0 && (
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#141414,#101010)] px-6 py-14 text-center shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-[#facc15]/8 blur-3xl" />
                  <div className="relative flex flex-col items-center justify-center">
                    <div className="rider-wave-shell mb-6">
                      <div className="rider-wave-ring" />
                      <div className="rider-wave-ring rider-wave-ring--delay" />
                      <div className="rider-wave-core">
                        <div className="h-3.5 w-3.5 rounded-full bg-[#161616]" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">Looking for nearby orders...</p>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-400">
                      Keep the app open to receive alerts. Your rider presence is actively broadcasting for nearby delivery requests.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <RiderEarnings profile={profile} />
          )}
        </div>

        {user && profile && (
          <RiderEditProfile
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={fetchProfile}
            currentName={user.name}
            currentPhone={profile.phoneNumber}
            currentAadharNumber={profile.aadharNumber}
            currentDrivingLicenseNumber={profile.drivingLicenseNumber}
          />
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;

import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import audio from "../assets/order_received.mp3"
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import VerificationBadge from "../components/VerificationBadge";
import RiderEarnings from "../components/RiderEarnings";
import RiderEditProfile from "../components/RiderEditProfile";

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
  const { user } = useAppData();
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
    toast.success("Sound Enabled");
  } catch (error) {
    toast.error("Tap again to enable sound");
  }
};
useEffect(() => {
  if (!socket) return;

  const onOrderAvailable = ({ orderId }: { orderId: string }) => {
    setIncomingOrders((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId]
    );

    if (audioUnlocked && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => {
  setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
}, 10000);
  };

  socket.on('order:available', onOrderAvailable);

  return () => {
    socket.off('order:available', onOrderAvailable);
  };
},[socket,audioUnlocked]);
const fetchProfile = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/myprofile`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setProfile(data || null);
  } catch (error) {
    setProfile(null);
  }finally{
    setLoading(false);
  }
};
useEffect(() => {
  if (user?.role === "rider") fetchProfile();
  else setLoading(false);
}, [user]);


// latest order status appears in the ui
const fetchCurrentOrder = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/order/current`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setCurrentOrder(data.order);
  } catch {
    setCurrentOrder(null);
  }
};
useEffect(() => {
  if (profile) {
    fetchCurrentOrder();
  }
}, [profile]);

const toggleAvailability = async () => {
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setToggling(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
  try {
    await axios.patch(
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
      }
    );
toast.success(
  profile?.isAvailable ? "You are offline" : "You are online");
fetchProfile();
} catch (error: any) {
  toast.error(error?.response?.data?.message || "Failed to toggle availability");
} finally {
  setToggling(false);
}
});
};

const [phoneNumber, setPhoneNumber] = useState("");
const [aadharNumber, setaadharNumber] = useState("");
const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
const [image, setImage] = useState<File | null>(null);
const [submitting, setSubmitting] = useState(false);

const handleSubmit=async()=>{
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setSubmitting(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
    const formData=new FormData();
    formData.append("phoneNumber", phoneNumber);
formData.append("aadharNumber", aadharNumber);
formData.append("drivingLicenseNumber", drivingLicenseNumber);
formData.append("latitude", pos.coords.latitude.toString());
formData.append("longitude", pos.coords.longitude.toString());
if(image){
formData.append("file",image);
}
  try {
const { data } = await axios.post(
  `${riderService}/api/rider/new`,
  formData,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    params: {
      isAvailable: !profile?.isAvailable,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    },
  }
);
toast.success(data.message);
fetchProfile();
} catch (error: any) {
  toast.error(error?.response?.data?.message || "Failed to submit profile");
} finally {
  setSubmitting(false);
}
});
}

if (user?.role !== "rider") {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      You are not registered as a rider
    </div>
  );
}

if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      Loading rider details...
    </div>
  );
}
if(!profile){
      return (
        <div className='min-h-screen bg-gray-50 px-4 py-6'>
        <div className='mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5 '>
        <h1 className='text-xl font-semibold'>Add Your Profile</h1>    
        <input type="number" placeholder="Aadhar Number" value={aadharNumber} onChange={(e) => setaadharNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="number" placeholder='Contact number' value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="text" placeholder='Driving Licence' value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
       
<label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
  <BiUpload className="h-5 w-5 text-red-500" />
  {image ? image.name : "Upload your image"}
  <input
    type="file"
    accept="image/*"
    hidden
    onChange={(e) => setImage(e.target.files?.[0] || null)}
  />
</label>

        <button onClick={handleSubmit} disabled={submitting} className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400'>{submitting ? "Submitting..." : "Add Profile"}</button>
        </div>    
        </div>
      )
}

  return (
    <div className="space-y-4 pb-12">
      {/* Profile Header */}
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="relative rounded-xl bg-white p-4 shadow space-y-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="absolute top-4 right-4 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Edit Profile
          </button>
          <img
            src={profile.picture}
            className="mx-auto h-24 w-24 rounded-full object-cover"
            alt=""
          />
          <p className="text-center font-semibold">{user?.name}</p>
          <p className="text-center text-sm text-gray-500">
            {profile.phoneNumber}
          </p>

          <div className="flex justify-center gap-2 mt-1">
            <VerificationBadge isVerified={profile.isVerified} size={16} />
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">
              {profile.isAvailable?"Online":"Offline"}
            </span>
          </div>
          <div>
            <p className="text-blue-400 text-sm text-center">
              Please be within a 5km radius of a restaurant hotspot to receive orders.
            </p>
          </div>
          {profile.isVerified && !currentOrder &&  (
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`w-full py-2 rounded-lg text-white font-semibold shadow-sm transition-colors ${
                toggling
                  ? "bg-gray-400"
                  : profile.isAvailable
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-[#e23744] hover:bg-[#c12635]"
              }`}
            >
              {toggling
                ? "Updating..."
                : profile.isAvailable
                ? "Go Offline"
                : "Go Online"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-md px-4">
        <div className="flex rounded-lg bg-gray-200 p-1">
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${
              activeTab === "deliveries"
                ? "bg-white text-gray-800 shadow shadow-black/5"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active Deliveries
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${
              activeTab === "earnings"
                ? "bg-white text-gray-800 shadow shadow-black/5"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My Earnings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "deliveries" ? (
        <div className="space-y-4">
          {/* Show this UI ONLY if audio is NOT unlocked */}
          {!audioUnlocked && (
            <div className="mx-auto max-w-md px-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                </div>
                <div>
                  <p className="font-medium text-blue-900">
                    Enable Sound Notification
                  </p>
                  <p className="text-sm text-blue-700">
                    Get Notified when new orders arrive
                  </p>
                </div>
                <button
                  onClick={unlockAudio}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Enable sound
                </button>
              </div>
            </div>
          )}

          {profile.isAvailable && incomingOrders.length > 0 && (
            <div className="mx-auto max-w-md px-4 space-y-3">
              <h3 className="font-semibold text-gray-700">Incoming Orders</h3>
              {incomingOrders.map((id) => (
                <RiderOrderRequest
                  key={id}
                  orderId={id}
                  onAccepted={() => {
                    fetchProfile();
                    fetchCurrentOrder();
                  }}
                />
              ))}
            </div>
          )}

          {currentOrder && (
            <div className="mx-auto max-w-md px-4 space-y-4">
              <RiderCurrentOrder
                order={currentOrder}
                onStatusUpdate={fetchCurrentOrder}
              />
              <RiderOrderMap order={currentOrder}/>
            </div>
          )}
          
          {profile.isAvailable && !currentOrder && incomingOrders.length === 0 && (
             <div className="mx-auto max-w-md px-4">
               <div className="flex flex-col items-center justify-center rounded-xl bg-white py-12 shadow-sm border border-gray-100 text-center">
                 <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                   <div className="h-4 w-4 bg-blue-500 rounded-full animate-ping"></div>
                 </div>
                 <p className="font-medium text-gray-700">Looking for nearby orders...</p>
                 <p className="text-sm text-gray-400 mt-1">Keep the app open to receive alerts</p>
               </div>
             </div>
          )}
        </div>
      ) : (
        <RiderEarnings profile={profile} />
      )}

      {/* Edit Profile Modal */}
      {user && profile && (
        <RiderEditProfile
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchProfile}
          currentName={user.name}
          currentPhone={profile.phoneNumber}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
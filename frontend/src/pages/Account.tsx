import toast from "react-hot-toast";
import {useAppData} from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { BiLogOut, BiMapPin, BiPackage, BiRefresh } from "react-icons/bi";
import { useState } from "react";
const Account = () => {
const {user,setUser,setIsAuth,fetchUser}=useAppData();
const [refreshing, setRefreshing] = useState(false);
const firstLetter=user?.name.charAt(0).toUpperCase();
const navigate=useNavigate();

const handleRefresh = async () => {
  setRefreshing(true);
  try {
    await fetchUser();
    toast.success("Profile synced with server");
  } catch (error) {
    toast.error("Failed to sync profile");
  } finally {
    setRefreshing(false);
  }
};

const logoutHandler=()=>{
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Logged out successfully");
}
  return (
  <div className="min-h-screen bg-gray-50 px-4 py-6">
    <div className="mx-auto max-w-md rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl font-semibold text-white">
          {firstLetter}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user?.name}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>
   <div className="divide-y">
  <div
    className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
    onClick={handleRefresh}
    title="Sync profile with server to pick up any role changes"
  >
    <BiRefresh className={`h-5 w-5 text-red-500 ${refreshing ? 'animate-spin' : ''}`} />
    <span className="font-medium">{refreshing ? 'Refreshing...' : 'Sync Profile'}</span>
  </div>
</div>
<div className="divide-y">
  <div
    className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
    onClick={() => navigate("/orders")}
  >
    <BiPackage className="h-5 w-5 text-red-500" />
    <span className="font-medium">Your Orders</span>
  </div>
</div>
<div className="divide-y">
  <div
    className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
    onClick={() => navigate("/address")}
  >
    <BiMapPin className="h-5 w-5 text-red-500" />
    <span className="font-medium">Addresses</span>
  </div>
</div>
<div className="divide-y">
  <div
    className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
    onClick={logoutHandler}
  >
    <BiLogOut className="h-5 w-5 text-red-500" />
    <span className="font-medium">Logout</span>
  </div>
</div>
    </div>
  </div>
  )
}

export default Account
import  { useEffect, useState } from "react";
import axios from "axios";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import AdminRiderCard from "../components/AdminRiderCard";

const Admin = () => {
  const [restaurant, setRestaurant] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");

  const fetchData = async () => {
    try {
      setLoading(true);

      const [res1, res2] = await Promise.all([
        axios.get(`${adminService}/v1/api/admin/restaurant/pending`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
        axios.get(`${adminService}/v1/api/admin/rider/pending`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
      ]);

      setRestaurant(res1.data.restaurants || []);
      setRiders(res2.data.riders || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
if (loading) {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-10 h-10 border-4 border-gray-300 border-t-yellow-400 rounded-full animate-spin"></div>
    </div>
  );
}
  return (
<div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
  <h1 className="text-2xl font-bold">Admin Dashboard</h1>

  <div className="flex gap-4">
    {/* Restaurant Button */}
    <button
      onClick={() => setTab("restaurant")}
      className={`px-4 py-2 rounded ${
        tab === "restaurant"
          ? "bg-red-500 text-white"
          : "bg-gray-200 text-black"
      }`}
    >
      Restaurant
    </button>

    {/* Rider Button */}
    <button
      onClick={() => setTab("rider")}
      className={`px-4 py-2 rounded ${
        tab === "rider"
          ? "bg-red-500 text-white"
          : "bg-gray-200 text-black"
      }`}
    >
      Rider
    </button>
  </div>
{tab === "restaurant" && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {restaurant.length === 0 ? (
      <p>No pending restaurants</p>
    ) : (
      restaurant.map((r) => <AdminRestaurantCard key={r._id} restaurant={r}
       onVerify={fetchData}/>)
    )}
  </div>
)}

{tab === "rider" && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {riders.length === 0 ? (
      <p>No pending riders</p>
    ) : (
      riders.map((r) =>  <AdminRiderCard key={r._id} rider={r}
       onVerify={fetchData}/>)
    )}
  </div>
)}

</div>
  );
};

export default Admin;
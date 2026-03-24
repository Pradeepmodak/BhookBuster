import { useState } from "react";
import type { IRestaurant } from "../types.ts";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin } from "react-icons/bi";
interface props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate:(restaurant:IRestaurant)=>void;
}
const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description || "");
  const [phone, setPhone] = useState(restaurant.phone.toString());
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [loading, setLoading] = useState(false);

  const toggleOpenStatus = async () => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/${restaurant._id}/status`,
        { status: !isOpen },
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        },
      );
      toast.success(data.message);
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to update restaurant status");
        console.error("Error updating restaurant status:", error);

    }
  };

  const saveChanges=async()=>{
    try {
        setLoading(true);
        const {data}=await axios.put(`${restaurantService}/api/restaurant/edit`,{
            name,
            description},
            {
                headers:{
                    Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        }
    );
   onUpdate(data.restaurant);
   toast.success(data.message || "Restaurant updated successfully");
} catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to update restaurant");
        console.error("Error saving changes:", error);
    }
    finally{
        setLoading(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-xl rounded-xl bg-white shadow-sm
    overflow-hidden"
    >
      {restaurant.image && (
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="h-48 w-full object-cover"
        />
      )}
      <div className="p-5 space-y-4"> 
        {
isSeller && <div className="flex items-center justify-between">
<div>{
editMode ? <input type="text" value={name} onChange={(e) => setName(e.target.value)}
 className="text-lg font-semibold border-b" /> :
  <h2 className="text-xl font-semibold">{restaurant.name}</h2>}
 <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
    <BiMapPin className="h-4 w-4 text-red-500" />
    {restaurant.autoLocation.formattedAddress ||
        "Location unavailable"}
</div>
</div>
<button
    onClick={() => setEditMode(!editMode)}
    className="text-gray-500 hover:text-black"
>
    <BiEdit size={18} />
</button>
</div>
        }
      </div>
    </div>
  );
};

export default RestaurantProfile;

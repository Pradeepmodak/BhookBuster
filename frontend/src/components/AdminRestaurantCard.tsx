import axios from "axios";
import { adminService } from "../main";
import { toast } from "react-hot-toast";
import VerificationBadge from "./VerificationBadge";

const AdminRestaurantCard = ({
  restaurant,
  onVerify,
}: {
  restaurant: any;
  onVerify: () => void;
}) => {
  const verify = async () => {
    try {
      await axios.patch(
        `${adminService}/v1/api/verify/restaurant/${restaurant._id}`,
        {}, // empty body
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Restaurant verified");
      onVerify();
    } catch (error) {
      toast.error("Failed to verify Restaurant");
    }
  };

  return (
  <div className="rounded-xl bg-white p-4 shadow space-y-2">
    <img
      src={restaurant.image}
      className="h-40 w-full object-cover rounded"
      alt=""
    />
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="font-semibold text-lg">{restaurant.name}</h3>
      <VerificationBadge isVerified={restaurant.isVerified} size={16} />
    </div>

    <p className="text-sm text-gray-500">
      {restaurant.phone}
    </p>

    <p>
      {restaurant.autoLocation?.formattedAddress}
    </p>
    <button
  className="w-full rounded bg-green-500 py-2 text-white hover:bg-green-600"
  onClick={verify}
>
  Verify Restaurant
</button>
  </div>
);
};

export default AdminRestaurantCard;
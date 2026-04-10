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
  <div className="space-y-3 rounded-[24px] border border-white/10 bg-[#171717] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
    <img
      src={restaurant.image}
      className="h-40 w-full rounded-2xl object-cover"
      alt=""
    />
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="text-lg font-semibold text-white">{restaurant.name}</h3>
      <VerificationBadge isVerified={restaurant.isVerified} size={16} />
    </div>

    <p className="text-sm text-neutral-400">
      {restaurant.phone}
    </p>

    <p className="text-sm text-neutral-300">
      {restaurant.autoLocation?.formattedAddress}
    </p>
    <button
  className="w-full rounded-2xl bg-[#facc15] py-2.5 font-semibold text-[#0f0f0f] transition hover:brightness-110"
  onClick={verify}
>
  Verify Restaurant
</button>
  </div>
);
};

export default AdminRestaurantCard;

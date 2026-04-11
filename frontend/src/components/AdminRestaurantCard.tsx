import axios from "axios";
import { adminService } from "../main";
import { toast } from "react-hot-toast";
import VerificationBadge from "./VerificationBadge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import type { PendingRestaurant } from "../types";

const AdminRestaurantCard = ({
  restaurant,
  onVerify,
}: {
  restaurant: PendingRestaurant;
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
    } catch {
      toast.error("Failed to verify Restaurant");
    }
  };

  return (
  <Card className="space-y-3 p-4">
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
    <Button fullWidth onClick={verify}>
      Verify Restaurant
    </Button>
  </Card>
);
};

export default AdminRestaurantCard;

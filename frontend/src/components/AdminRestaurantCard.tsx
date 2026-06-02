import axios from "axios";
import { adminService } from "../config";
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
    <Card className="flex h-full flex-col space-y-3 p-4">
      <img
        src={restaurant.image}
        className="h-40 w-full shrink-0 rounded-2xl object-cover"
        alt=""
      />
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{restaurant.name}</h3>
        <VerificationBadge isVerified={restaurant.isVerified} size={16} />
      </div>

      <p className="text-sm text-neutral-400">
        {restaurant.phone}
      </p>

      <p className="text-sm text-neutral-300">
        {restaurant.autoLocation?.formattedAddress}
      </p>
      
      <div className="mt-auto pt-2">
        <Button fullWidth onClick={verify}>
          Verify Restaurant
        </Button>
      </div>
    </Card>
  );
};

export default AdminRestaurantCard;


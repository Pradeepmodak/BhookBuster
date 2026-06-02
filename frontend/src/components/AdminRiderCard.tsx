import axios from "axios";
import { adminService } from "../config";
import { toast } from "react-hot-toast";
import VerificationBadge from "./VerificationBadge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import type { PendingRider } from "../types";

const AdminRiderCard = ({
  rider,
  onVerify,
}: {
  rider: PendingRider;
  onVerify: () => void;
}) => {
  const verify = async () => {
    try {
      await axios.patch(
        `${adminService}/v1/api/verify/rider/${rider._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Rider verified");
      onVerify();
    } catch {
      toast.error("Failed to verify Rider");
    }
  };

  return (
    <Card className="flex h-full flex-col space-y-3 p-4">
      <img
        src={rider.picture}
        className="h-40 w-full shrink-0 rounded-2xl object-cover"
        alt=""
      />
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-white">Rider ID: {rider._id}</h3>
        <VerificationBadge isVerified={rider.isVerified} size={14} />
      </div>

      <p className="text-sm text-neutral-400">
        Phone: {rider.phoneNumber}
      </p>
      <p className="text-sm text-neutral-400">
        Aadhar: {rider.aadharNumber}
      </p>
      <p className="text-sm text-neutral-300">
        DL: {rider.drivingLicenseNumber}
      </p>
      
      <div className="mt-auto pt-2">
        <Button fullWidth onClick={verify}>
          Verify Rider
        </Button>
      </div>
    </Card>
  );
};

export default AdminRiderCard;


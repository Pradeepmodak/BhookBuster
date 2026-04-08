import axios from "axios";
import { adminService } from "../main";
import { toast } from "react-hot-toast";
import VerificationBadge from "./VerificationBadge";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
}

const AdminRiderCard = ({
  rider,
  onVerify,
}: {
  rider: IRider;
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
    } catch (error) {
      toast.error("Failed to verify Rider");
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow space-y-2">
      <img
        src={rider.picture}
        className="h-40 w-full object-cover rounded"
        alt=""
      />
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold">Rider ID: {rider._id}</h3>
        <VerificationBadge isVerified={rider.isVerified} size={14} />
      </div>

      <p className="text-sm text-gray-500">
        Phone: {rider.phoneNumber}
      </p>
<p className="text-sm text-gray-500">
  Aadhar:{rider.aadharNumber}
</p>
      <p className="text-sm">
        DL: {rider.drivingLicenseNumber}
      </p>
      

      <button
        className="w-full rounded bg-green-500 py-2 text-white hover:bg-green-600"
        onClick={verify}
      >
        Verify Rider
      </button>
    </div>
  );
};

export default AdminRiderCard;
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
    <div className="space-y-3 rounded-[24px] border border-white/10 bg-[#171717] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
      <img
        src={rider.picture}
        className="h-40 w-full rounded-2xl object-cover"
        alt=""
      />
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-white">Rider ID: {rider._id}</h3>
        <VerificationBadge isVerified={rider.isVerified} size={14} />
      </div>

      <p className="text-sm text-neutral-400">
        Phone: {rider.phoneNumber}
      </p>
<p className="text-sm text-neutral-400">
  Aadhar:{rider.aadharNumber}
</p>
      <p className="text-sm text-neutral-300">
        DL: {rider.drivingLicenseNumber}
      </p>
      

      <button
        className="w-full rounded-2xl bg-[#facc15] py-2.5 font-semibold text-[#0f0f0f] transition hover:brightness-110"
        onClick={verify}
      >
        Verify Rider
      </button>
    </div>
  );
};

export default AdminRiderCard;

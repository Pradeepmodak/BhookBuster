import axios from "axios";
import { useEffect, useState } from "react";
import { riderService } from "../main";
import toast from "react-hot-toast";

interface Props {
  orderId: string;
  onAccepted: () => void;
}

const RiderOrderRequest = ({ orderId, onAccepted }: Props) => {
const [accepting, setAccepting] = useState(false);
const [secondsLeft, setSecondsLeft] = useState(10);

useEffect(() => {
  const interval = setInterval(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        onAccepted();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  return ()=>clearInterval(interval);
}, [onAccepted]);

const acceptOrder = async () => {
  try {
    await axios.post(
      `${riderService}/api/rider/accept/${orderId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
  toast.success("Order Accepted");
onAccepted();
} catch (error: any) {
  toast.error(error.response.data.message);
  onAccepted();
} finally {
  setAccepting(false);
}
};
  return (
  <div className="space-y-3 rounded-[24px] border border-[#facc15]/20 bg-[#121212] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
    <p className="text-center text-xs font-semibold text-[#facc15]">
      Accept within {secondsLeft}
    </p>
        <p className="text-center text-xs font-semibold text-emerald-300">
     New Delivery Request
    </p>
    <p className="text-xs text-neutral-300">
  Order ID: <b>{orderId.slice(-6)}</b>
</p>

<button
  disabled={accepting}
  onClick={acceptOrder}
  className="w-full rounded-2xl bg-[#facc15] py-2 text-sm font-semibold text-[#0f0f0f] hover:brightness-110
   disabled:opacity-50"
>
  {accepting ? "Accepting..." : "Accept Order"}
</button>
  </div>
);
};

export default RiderOrderRequest;

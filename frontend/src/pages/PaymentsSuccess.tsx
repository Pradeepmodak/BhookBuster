import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { BsArrowRight } from "react-icons/bs";
import { BiCheckCircle } from "react-icons/bi";

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { fetchCart } = useAppData();

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#333] bg-[#181818] p-8 text-center space-y-5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <BiCheckCircle size={44} className="text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Payment Successful</h1>
          <p className="text-sm text-gray-500">
            Your order has been placed successfully 🎉
          </p>
        </div>

        {/* Payment ID */}
        {paymentId && (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-left">
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wider">Payment ID</p>
            <p className="font-mono text-sm break-all text-[#f0c040]">{paymentId}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4a017] py-3 text-sm font-semibold text-[#0f0f0f] hover:brightness-110 transition"
          >
            Order More <BsArrowRight size={16} />
          </button>

          <button
            onClick={() => navigate("/orders")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#333] bg-transparent py-3 text-sm font-semibold text-gray-300 hover:border-[#d4a017] hover:text-[#f0c040] transition"
          >
            Your Orders <BsArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

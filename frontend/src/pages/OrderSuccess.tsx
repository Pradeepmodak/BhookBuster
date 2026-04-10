import axios from "axios";
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { utilsService } from "../main";
import toast from "react-hot-toast";
import { BiCheckCircle } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { useAppData } from "../context/AppContext";

const OrderSuccess = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { fetchCart } = useAppData();
  const calledRef = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || calledRef.current) return;
      calledRef.current = true;

      try {
        await axios.post(`${utilsService}/api/payment/stripe/verify`, {
          sessionId,
        });

        toast.success("Payment successful 🎉");
        
        // Brief delay to allow backend background worker to clear the cart
        setTimeout(() => {
          fetchCart();
        }, 1500);

      } catch (error) {
        toast.error("Stripe verification failed");
        console.log(error);
      }
    };
    verifyPayment();
  }, [sessionId, fetchCart]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm text-center space-y-4">
        <BiCheckCircle size={64} className="mx-auto text-green-500" />
        <h1 className="text-2xl font-bold text-gray-800">Payment Successful</h1>

        <p className="text-sm text-gray-500">
          Your order has been placed successfully 🎉
        </p>

        {sessionId && (
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500 text-sm font-medium">Payment ID: </span>
            <p className="font-mono text-sm break-all text-gray-700 mt-1 select-all">{sessionId}</p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e23744] py-3 text-sm font-semibold text-white hover:bg-[#d32f3a] transition"
            onClick={() => navigate("/")}
          >
            Order More <BsArrowRight size={16} />
          </button>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
            onClick={() => navigate("/orders")}
          >
            Your Orders
            <BsArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
import axios from "axios";
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { utilsService } from "../main";
import toast from "react-hot-toast";
import { BiCheckCircle } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { useAppData } from "../context/AppContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

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

        toast.success("Payment successful");

        // Brief delay to allow backend background worker to clear the cart.
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
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0f0f0f] px-4">
      <Card className="w-full max-w-md space-y-5 p-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
            <BiCheckCircle size={44} className="text-emerald-400" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Payment Successful</h1>
          <p className="text-sm text-gray-400">Your Stripe payment has been verified and your order is confirmed.</p>
        </div>

        {sessionId ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left">
            <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">Stripe Session ID</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--color-accent)]">{sessionId}</p>
          </div>
        ) : null}

        <div className="space-y-2 pt-1">
          <Button fullWidth onClick={() => navigate("/")} rightIcon={<BsArrowRight size={16} />}>
            Order More
          </Button>

          <Button
            fullWidth
            variant="secondary"
            onClick={() => navigate("/orders")}
            rightIcon={<BsArrowRight size={16} />}
          >
            Your Orders
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OrderSuccess;

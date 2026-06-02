import axios from "axios";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiMapPin, FiPackage, FiRefreshCcw } from "react-icons/fi";
import type { IOrder } from "../types";
import { ORDER_ACTIONS } from "../utils/orderflow";
import { restaurantService } from "../config";
import toast from "react-hot-toast";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { getErrorMessage } from "../utils/http";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const statusConfig = (status: string) => {
  switch (status) {
    case "placed":
      return {
        accent: "bg-[#facc15]",
        chip: "border-[#facc15]/25 bg-[#facc15]/10 text-[#facc15]",
      };
    case "accepted":
      return {
        accent: "bg-orange-300",
        chip: "border-orange-400/25 bg-orange-400/10 text-orange-300",
      };
    case "preparing":
      return {
        accent: "bg-sky-300",
        chip: "border-sky-400/25 bg-sky-400/10 text-sky-300",
      };
    case "ready_for_rider":
      return {
        accent: "bg-violet-300",
        chip: "border-violet-400/25 bg-violet-400/10 text-violet-300",
      };
    case "rider_assigned":
      return {
        accent: "bg-cyan-300",
        chip: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
      };
    case "picked_up":
      return {
        accent: "bg-pink-300",
        chip: "border-pink-400/25 bg-pink-400/10 text-pink-300",
      };
    case "delivered":
      return {
        accent: "bg-emerald-300",
        chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      };
    default:
      return {
        accent: "bg-gray-300",
        chip: "border-white/10 bg-white/5 text-gray-300",
      };
  }
};

const OrderCard = ({ order, onStatusUpdate }: Props) => {
  const [loading, setLoading] = useState(false);
  const [retryVisible, setRetryVisible] = useState(false);
  const actions = ORDER_ACTIONS[order.status] || [];
  const status = statusConfig(order.status);

  useEffect(() => {
    if (order.status !== "ready_for_rider") {
      setRetryVisible(false);
      return;
    }

    const timer = setTimeout(() => setRetryVisible(true), 10000);
    return () => clearTimeout(timer);
  }, [order.status]);

  const updateStatus = async (nextStatus: string) => {
    try {
      setLoading(true);
      setRetryVisible(false);
      await axios.put(
        `${restaurantService}/api/order/${order._id}`,
        { status: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Order status updated");
      onStatusUpdate();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update order status"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.05))] p-5">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">BhookBuster Order</p>
            <p className="mt-2 text-lg font-semibold text-white">#{order._id.slice(-6)}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${status.chip}`}>
            <span className={`h-2 w-2 rounded-full ${status.accent}`} />
            {order.status.replaceAll("_", " ")}
          </span>
        </div>

        <div className="grid gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FiPackage className="text-[var(--color-accent)]" />
            <span>{order.items.length} item{order.items.length === 1 ? "" : "s"} in this order</span>
          </div>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={`${item.itemId}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-white">{item.name}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-accent)]">Rs {order.totalAmount}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Payment</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <FiCheckCircle />
              {order.paymentStatus}
            </p>
          </div>
        </div>

        {order.deliveryAddress?.formattedAddress ? (
          <div className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
            <FiMapPin className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
            <span>{order.deliveryAddress.formattedAddress}</span>
          </div>
        ) : null}

        <div className="mt-auto space-y-3">
          {order.paymentStatus === "paid" && actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  disabled={loading}
                  onClick={() => updateStatus(nextStatus)}
                  size="sm"
                >
                  Mark as {nextStatus.replaceAll("_", " ")}
                </Button>
              ))}
            </div>
          ) : null}

          {order.status === "ready_for_rider" && !retryVisible ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              <FiClock />
              Waiting to retry rider dispatch
            </div>
          ) : null}

          {order.status === "ready_for_rider" && retryVisible ? (
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => updateStatus("ready_for_rider")}
              leftIcon={<FiRefreshCcw />}
              fullWidth
            >
              Retry Ready for Rider
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default OrderCard;


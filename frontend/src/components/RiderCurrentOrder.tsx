import axios from "axios";
import { useState } from "react";
import { riderService } from "../main";
import toast from "react-hot-toast";
import type { IOrder } from "../types";
import { BiStore, BiMapPin, BiWallet, BiPhoneCall, BiNavigation, BiCheckCircle } from "react-icons/bi";
import { getErrorMessage } from "../utils/http";

interface Props {
  order: IOrder;
  onStatusUpdate: (nextOrder: IOrder | null) => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const nextStatus =
    order.status === "rider_assigned"
      ? "picked_up"
      : order.status === "picked_up"
        ? "delivered"
        : null;

  const updateStatus = async () => {
    if (!nextStatus || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);
      await axios.put(
        `${riderService}/api/rider/order/update/${order._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success("Order status updated!");
      onStatusUpdate(
        nextStatus === "delivered"
          ? null
          : {
              ...order,
              status: nextStatus,
            },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update status"));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#121212] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition-all">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#facc15] to-[#d4a80a] px-5 py-4 text-[#0f0f0f]">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide opacity-90">Active Delivery</p>
          <h2 className="text-xl font-bold">Order #{order._id.substring(order._id.length - 6).toUpperCase()}</h2>
        </div>
        <div className="rounded-full border border-black/10 bg-black/10 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
          {order.status.replace("_", " ").toUpperCase()}
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="relative space-y-5">
          <div className="absolute bottom-5 left-4 top-5 w-0.5 bg-white/10"></div>

          <div className="relative flex items-start gap-4">
            <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-orange-100 shadow-sm">
              <BiStore className="h-4 w-4 text-orange-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pickup From</p>
              <p className="text-base font-semibold text-white">{order.restaurantName}</p>
            </div>
          </div>

          <div className="relative flex items-start gap-4">
            <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-green-100 shadow-sm">
              <BiMapPin className="h-5 w-5 text-green-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Deliver To</p>
              <p className="text-base font-medium leading-snug text-white">{order.deliveryAddress.formattedAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#171717] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Order Value</p>
            <p className="text-lg font-bold text-white">Rs {order.totalAmount}</p>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <BiWallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Your Earning</p>
              <p className="text-lg font-bold tracking-tight text-[#facc15]">Rs {order.riderAmount}</p>
            </div>
          </div>
        </div>

        {order.deliveryAddress.mobile && (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Customer Phone</p>
              <p className="mt-0.5 text-base font-bold tracking-wide text-white">{order.deliveryAddress.mobile}</p>
            </div>
            <a
              href={`tel:${order.deliveryAddress.mobile}`}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#facc15] transition-colors hover:bg-[#facc15] hover:text-[#0f0f0f]"
            >
              <BiPhoneCall className="h-5 w-5" />
            </a>
          </div>
        )}

        <div className="pt-2">
          {order.status === "rider_assigned" && (
            <button
              onClick={updateStatus}
              disabled={isUpdating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#facc15] py-3.5 text-base font-bold text-[#0f0f0f] shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BiNavigation className="h-5 w-5 animate-pulse" />
              {isUpdating ? "Updating..." : "I Have Picked Up The Order"}
            </button>
          )}

          {order.status === "picked_up" && (
            <button
              onClick={updateStatus}
              disabled={isUpdating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BiCheckCircle className="h-5 w-5" />
              {isUpdating ? "Updating..." : "Mark As Delivered"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderCurrentOrder;

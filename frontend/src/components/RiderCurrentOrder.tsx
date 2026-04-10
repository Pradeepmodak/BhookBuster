import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import type { IOrder } from "../types";
import { BiStore, BiMapPin, BiWallet, BiPhoneCall, BiNavigation, BiCheckCircle } from "react-icons/bi";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const updateStatus = async () => {
    try {
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
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E23774] to-[#ff5e93] px-5 py-4 flex items-center justify-between text-white">
        <div>
          <p className="text-sm font-medium opacity-90 uppercase tracking-wide">Active Delivery</p>
          <h2 className="text-xl font-bold">Order #{order._id.substring(order._id.length - 6).toUpperCase()}</h2>
        </div>
        <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm border border-white/30">
          {order.status.replace("_", " ").toUpperCase()}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Route Container */}
        <div className="relative space-y-5">
          {/* Timeline Line */}
          <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200"></div>

          {/* Pickup */}
          <div className="relative flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 border-2 border-white shadow-sm z-10">
              <BiStore className="h-4 w-4 text-orange-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Pickup From</p>
              <p className="text-base font-semibold text-gray-800">{order.restaurantName}</p>
            </div>
          </div>

          {/* Dropoff */}
          <div className="relative flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 border-2 border-white shadow-sm z-10">
              <BiMapPin className="h-5 w-5 text-green-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Deliver To</p>
              <p className="text-base font-medium text-gray-800 leading-snug">
                {order.deliveryAddress.formattedAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Earning & Total */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 border border-gray-100">
             <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Order Value</p>
                <p className="text-lg font-bold text-gray-800">₹{order.totalAmount}</p>
             </div>
             <div className="h-10 w-px bg-gray-200"></div>
             <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <BiWallet className="h-5 w-5" />
                </div>
                <div>
                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Your Earning</p>
                     <p className="text-lg font-bold text-emerald-600 tracking-tight">₹{order.riderAmount}</p>
                </div>
             </div>
        </div>

        {/* Customer Actions */}
        {order.deliveryAddress.mobile && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Phone</p>
              <p className="text-base font-bold text-gray-800 tracking-wide mt-0.5">
                {order.deliveryAddress.mobile}
              </p>
            </div>
            <a
              href={`tel:${order.deliveryAddress.mobile}`}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
            >
              <BiPhoneCall className="h-5 w-5" />
            </a>
          </div>
        )}

        {/* Dynamic Action Button */}
        <div className="pt-2">
          {order.status === "rider_assigned" && (
            <button
              onClick={updateStatus}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5 focus:ring-4 focus:ring-orange-500/30"
            >
              <BiNavigation className="h-5 w-5 animate-pulse" />
              I Have Picked Up The Order
            </button>
          )}

          {order.status === "picked_up" && (
            <button
              onClick={updateStatus}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 text-base font-bold text-white shadow-md shadow-green-500/20 transition-all hover:bg-green-600 hover:shadow-lg hover:-translate-y-0.5 focus:ring-4 focus:ring-green-500/30"
            >
              <BiCheckCircle className="h-5 w-5" />
              Mark As Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderCurrentOrder;

import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { restaurantService } from "../config";
import axios from "axios";
import UserOrderMap from "../components/UserOrderMap";

const formatCurrency = (value: number) => `Rs ${value}`;

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrder(data.order);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join-room", `order:${id}`);

    const onOrderUpdate = () => {
      fetchOrder();
    };

    const onRiderLocation = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      setRiderLocation([latitude, longitude]);
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);
    socket.on("rider:location", onRiderLocation);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
      socket.off("rider:location", onRiderLocation);
      socket.emit("leave-room", `order:${id}`);
    };
  }, [socket, id]);

  if (loading) {
    return <p className="py-12 text-center text-neutral-400">Loading order...</p>;
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <p className="text-neutral-400">No order found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-white">
      <div className="rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{order.restaurantName || "Restaurant"}</h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">Order #{order._id.slice(-6)}</p>
          </div>
          <span className="rounded-full bg-[#facc15]/10 px-4 py-2 text-sm font-semibold capitalize tracking-wide text-[#facc15]">
            {order.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <h2 className="font-semibold">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items.length ? (
                order.items.map((item) => (
                  <div className="flex justify-between text-sm" key={item.itemId}>
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-400">No items found</p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#171717] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <h2 className="font-semibold">Delivery Address</h2>
            <p className="mt-3 text-sm text-neutral-300">{order.deliveryAddress.formattedAddress}</p>
            <p className="mt-1 text-sm text-neutral-400">Mobile: {order.deliveryAddress.mobile}</p>
          </div>

          {(order.status === "rider_assigned" || order.status === "picked_up" || order.status === "delivered") &&
            order.riderName && (
              <div className="flex items-center justify-between rounded-[28px] border border-[#facc15]/20 bg-[#facc15]/10 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#facc15] text-xl text-[#0f0f0f]">
                    R
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#facc15]">Delivery partner</p>
                    <p className="text-lg font-bold text-white">{order.riderName}</p>
                    <p className="text-sm text-neutral-300">Verified rider</p>
                  </div>
                </div>

                {order.riderPhone && (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#facc15]/40"
                  >
                    Call
                  </a>
                )}
              </div>
            )}

          {(order.status === "rider_assigned" || order.status === "picked_up") &&
            (riderLocation ? (
              <UserOrderMap
                riderLocation={riderLocation}
                deliveryLocation={[order.deliveryAddress.latitude, order.deliveryAddress.longitude]}
              />
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-[#171717] px-5 py-8 text-center text-neutral-400">
                Waiting for rider location
              </div>
            ))}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <h2 className="font-semibold">Payment summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Delivery Fee</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Platform Fee</span>
              <span>{formatCurrency(order.platformFee)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-4 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            <p className="text-xs text-neutral-400">
              Payment Method: <span className="uppercase text-white">{order.paymentMethod}</span>
            </p>
            <p className="text-xs text-neutral-400">
              Payment Status: <span className="uppercase text-white">{order.paymentStatus}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;


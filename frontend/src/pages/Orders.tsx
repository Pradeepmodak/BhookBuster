import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const formatCurrency = (value: number) => `Rs ${value}`;

const OrderRow = ({
  order,
  onClick,
}: {
  order: IOrder;
  onClick: () => void;
}) => (
  <div
    className="cursor-pointer rounded-[26px] border border-white/10 bg-[#171717] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:border-[#facc15]/40"
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
      <span className="rounded-full bg-[#facc15]/10 px-3 py-1 text-xs capitalize text-[#facc15]">
        {order.status.replaceAll("_", " ")}
      </span>
    </div>

    <div className="mt-3 text-sm text-neutral-400">
      {order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}
    </div>

    <div className="mt-4 flex justify-between text-sm font-medium">
      <span>Total</span>
      <span>{formatCurrency(order.totalAmount)}</span>
    </div>
  </div>
);

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/my`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setOrders(data.orders);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);
    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return <p className="py-12 text-center text-neutral-400">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <p className="text-neutral-400">No orders yet</p>
      </div>
    );
  }

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-semibold">My Orders</h1>
        <p className="mt-2 text-sm text-neutral-400">Track live progress and revisit completed deliveries.</p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Active Orders</h2>
          {activeOrders.length === 0 ? (
            <p className="text-neutral-400">No active orders</p>
          ) : (
            activeOrders.map((order) => (
              <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
            ))
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Completed Orders</h2>
          {completedOrders.length === 0 ? (
            <p className="text-neutral-400">No completed orders</p>
          ) : (
            completedOrders.map((order) => (
              <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
            ))
          )}
        </section>
      </div>
    </div>
  );
};

export default Orders;

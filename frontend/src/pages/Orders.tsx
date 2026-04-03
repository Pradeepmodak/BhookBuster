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
// component Order row
const OrderRow = ({
  order,
  onClick,
}: {
  order: IOrder;
  onClick: () => void;
}) => {
  return (
    <div
      className="cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
        <span className="text-xs capitalize text-gray-500">{order.status}</span>
      </div>
    </div>
  );
};
const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
const navigate = useNavigate();
const { socket } = useSocket();

const fetchOrders = async () => {
  try {
    const { data } = await axios.get(
      `${restaurantService}/api/order/my`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    setOrders(data.orders);
  } catch (error) {
  console.log(error);
  }finally{
    setLoading(false);
  }
};
useEffect(() => {
  fetchOrders();
}, []);


// Whenever the backend tells me an order changed, I will refresh my orders list.”
// “We subscribe to a WebSocket event inside useEffect and clean up the listener to prevent memory leaks, enabling real-time UI updates.”
useEffect(() => {
  if (!socket) return;

//    “If I receive update → call API again”
  const onOrderUpdate = () => {
    fetchOrders();
  };

//    “Hey socket, when you receive order:update, run this function”
  socket.on("order:update", onOrderUpdate);
    return () => {
        socket.off("order:update", onOrderUpdate);
    };
}, [socket]);

if (loading) {
  return <p className="text-center text-gray-500">Loading orders...</p>;
}

if (orders.length === 0) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-gray-500">No orders yet</p>
    </div>
  );
}
const activeOrders = orders.filter((o) =>
  ACTIVE_STATUSES.includes(o.status)
);

const completedOrders = orders.filter(
  (o) => !ACTIVE_STATUSES.includes(o.status)
);

return (
  <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
    <h1 className="text-2xl font-bold">My Orders</h1>
    
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Active Orders</h2>
      {
  activeOrders.length === 0 ? (
    <p>No active orders</p>
  ) : (
    activeOrders.map((order) => (
      <OrderRow
        key={order._id}
        order={order}
        onClick={() => navigate(`/order/${order._id}`)}
      />
    ))
  )
}
    </section>
        <section className="space-y-3">
      <h2 className="text-lg font-semibold">Completed Orders</h2>
      {
  completedOrders.length === 0 ? (
    <p>No completed orders</p>
  ) : (
    completedOrders.map((order) => (
      <OrderRow
        key={order._id}
        order={order}
        onClick={() => navigate(`/order/${order._id}`)}
      />
    ))
  )
}
    </section>
  </div>
);
};

export default Orders;
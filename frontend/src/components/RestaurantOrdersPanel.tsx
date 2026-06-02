import { useEffect, useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/order_placed.mp3";
import axios from "axios";
import { restaurantService } from "../config";
import OrderCard from "./OrderCard";
import Button from "./ui/Button";
import Card from "./ui/Card";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const RestaurantOrdersPanel = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.load();
  }, []);

  const unlockAudio = () => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
      })
      .catch((err) => console.error("Error unlocking audio:", err));
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId]);

  useEffect(() => {
    if (!socket || !restaurantId) return;
    const roomName = `restaurant:${restaurantId}`;
    socket.emit("join-room", roomName);

    const onNewOrder = () => {
      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
      fetchOrders();
    };

    socket.on("order:new", onNewOrder);
    return () => {
      socket.off("order:new", onNewOrder);
      socket.emit("leave-room", roomName);
    };
  }, [socket, audioUnlocked, restaurantId]);

  useEffect(() => {
    if (!socket) return;
    const onUpdateOrder = () => fetchOrders();
    socket.on("order:rider_assigned", onUpdateOrder);
    return () => {
      socket.off("order:rider_assigned", onUpdateOrder);
    };
  }, [socket]);

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="flex flex-col gap-7">
      {!audioUnlocked && (
        <Card className="flex flex-col items-start justify-between gap-4 border-[#facc15]/20 bg-[#facc15]/10 p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#facc15]/30 bg-black/20 text-xl">
              !
            </div>
            <div>
              <p className="text-base font-semibold text-[#facc15]">Enable sound notifications</p>
              <p className="text-sm text-neutral-300">Get alerted instantly when new orders arrive.</p>
            </div>
          </div>
          <Button onClick={unlockAudio}>Enable Sound</Button>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Active Orders</h3>
          {activeOrders.length > 0 && (
            <span className="rounded-full border border-[#facc15]/30 bg-[#facc15]/10 px-3 py-1 text-xs font-semibold text-[#facc15]">
              {activeOrders.length}
            </span>
          )}
          <div className="h-px flex-1 bg-gradient-to-r from-[#facc15]/20 to-transparent" />
        </div>

        {activeOrders.length === 0 ? (
          <Card className="border-dashed px-6 py-10 text-center text-sm text-gray-400">
            <p>No active orders right now</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {activeOrders.map((order) => (
              <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-300">Completed Orders</h3>
          {completedOrders.length > 0 && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
              {completedOrders.length}
            </span>
          )}
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        {completedOrders.length === 0 ? (
          <Card className="border-dashed px-6 py-10 text-center text-sm text-gray-400">
            <p>No completed orders yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {completedOrders.map((order) => (
              <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantOrdersPanel;


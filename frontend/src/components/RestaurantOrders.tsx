import { useEffect, useEffect, useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const RestaurantOrders = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
const [loading, setLoading] = useState(true);
const [audioUnlocked, setAudioUnlocked] = useState(false);

const { socket } = useSocket();
const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  audioRef.current = new Audio(audio);
}, []);
  return <div>RestaurantOrders</div>;
};

export default RestaurantOrders;
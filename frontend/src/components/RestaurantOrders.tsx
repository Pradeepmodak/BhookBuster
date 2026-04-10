import { useEffect, useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/order_placed.mp3";
import axios from "axios";
import { restaurantService } from "../main";
import OrderCard from "./OrderCard";

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
  const [, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.load();
  }, []);

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioUnlocked(true);
        })
        .catch((err) => console.error("Error unlocking audio:", err));
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/restaurant/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [restaurantId]);

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
    return () => { socket.off("order:rider_assigned", onUpdateOrder); };
  }, [socket]);

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .bb-orders-root {
          font-family: 'DM Sans', sans-serif;
          color: #f0ede6;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Sound banner */
        .bb-sound-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #1a1a14 0%, #111110 100%);
          border: 1px solid #c9a84c44;
          border-radius: 14px;
          padding: 16px 20px;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .bb-sound-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at left center, #c9a84c12 0%, transparent 65%);
          pointer-events: none;
        }
        .bb-sound-banner-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bb-bell-icon {
          width: 42px;
          height: 42px;
          background: #c9a84c18;
          border: 1px solid #c9a84c55;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .bb-sound-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #f0ede6;
          margin: 0 0 2px 0;
        }
        .bb-sound-sub {
          font-size: 13px;
          color: #888070;
          margin: 0;
        }
        .bb-enable-btn {
          background: #c9a84c;
          color: #0d0d0b;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.3px;
        }
        .bb-enable-btn:hover {
          background: #d9b85c;
          transform: translateY(-1px);
        }

        /* Section headers */
        .bb-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bb-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bb-section-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 18px;
          color: #f0ede6;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .bb-section-count {
          background: #c9a84c22;
          border: 1px solid #c9a84c55;
          color: #c9a84c;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 12px;
          padding: 2px 9px;
          border-radius: 20px;
        }
        .bb-section-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, #c9a84c22, transparent);
        }

        /* Empty state */
        .bb-empty {
          text-align: center;
          padding: 40px 20px;
          background: #111110;
          border: 1px dashed #2a2a20;
          border-radius: 14px;
          color: #555040;
          font-size: 14px;
        }
        .bb-empty-icon {
          font-size: 32px;
          margin-bottom: 10px;
          opacity: 0.4;
        }

        /* Orders grid */
        .bb-orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        /* Completed section dimmer */
        .bb-completed .bb-section-title {
          color: #888070;
          font-weight: 600;
        }
        .bb-completed .bb-section-count {
          background: #ffffff08;
          border-color: #ffffff15;
          color: #555040;
        }
      `}</style>

      <div className="bb-orders-root">

        {/* Sound Notification Banner */}
        {!audioUnlocked && (
          <div className="bb-sound-banner">
            <div className="bb-sound-banner-left">
              <div className="bb-bell-icon">🔔</div>
              <div>
                <p className="bb-sound-title">Enable Sound Notifications</p>
                <p className="bb-sound-sub">Get alerted instantly when new orders arrive</p>
              </div>
            </div>
            <button className="bb-enable-btn" onClick={unlockAudio}>
              Enable Sound
            </button>
          </div>
        )}

        {/* Active Orders */}
        <div className="bb-section">
          <div className="bb-section-header">
            <h3 className="bb-section-title">Active Orders</h3>
            {activeOrders.length > 0 && (
              <span className="bb-section-count">{activeOrders.length}</span>
            )}
            <div className="bb-section-line" />
          </div>

          {activeOrders.length === 0 ? (
            <div className="bb-empty">
              <div className="bb-empty-icon">🍽️</div>
              <p>No active orders right now</p>
            </div>
          ) : (
            <div className="bb-orders-grid">
              {activeOrders.map((order) => (
                <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders */}
        <div className="bb-section bb-completed">
          <div className="bb-section-header">
            <h3 className="bb-section-title">Completed Orders</h3>
            {completedOrders.length > 0 && (
              <span className="bb-section-count">{completedOrders.length}</span>
            )}
            <div className="bb-section-line" />
          </div>

          {completedOrders.length === 0 ? (
            <div className="bb-empty">
              <div className="bb-empty-icon">✅</div>
              <p>No completed orders yet</p>
            </div>
          ) : (
            <div className="bb-orders-grid">
              {completedOrders.map((order) => (
                <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default RestaurantOrders;
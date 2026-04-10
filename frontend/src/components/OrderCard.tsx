import axios from "axios";
import type { IOrder } from "../types";
import { ORDER_ACTIONS } from "../utils/orderflow";
import { restaurantService } from "../main";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const statusConfig = (status: string) => {
  switch (status) {
    case "placed":
      return { bg: "#c9a84c22", border: "#c9a84c66", color: "#c9a84c", dot: "#c9a84c" };
    case "accepted":
      return { bg: "#f9731622", border: "#f9731666", color: "#fb923c", dot: "#f97316" };
    case "preparing":
      return { bg: "#3b82f622", border: "#3b82f666", color: "#60a5fa", dot: "#3b82f6" };
    case "ready_for_rider":
      return { bg: "#8b5cf622", border: "#8b5cf666", color: "#a78bfa", dot: "#8b5cf6" };
    case "rider_assigned":
      return { bg: "#06b6d422", border: "#06b6d466", color: "#22d3ee", dot: "#06b6d4" };
    case "picked_up":
      return { bg: "#ec489922", border: "#ec489966", color: "#f472b6", dot: "#ec4899" };
    case "delivered":
      return { bg: "#22c55e22", border: "#22c55e66", color: "#4ade80", dot: "#22c55e" };
    default:
      return { bg: "#ffffff11", border: "#ffffff22", color: "#888070", dot: "#555" };
  }
};

const OrderCard = ({ order, onStatusUpdate }: props) => {
  const [loading, setLoading] = useState(false);
  const [retryVisible, setRetryVisible] = useState(false);
  const actions = ORDER_ACTIONS[order.status] || [];
  const sc = statusConfig(order.status);

  useEffect(() => {
    if (order.status !== "ready_for_rider") {
      setRetryVisible(false);
      return;
    }
    const timer = setTimeout(() => setRetryVisible(true), 10000);
    return () => clearTimeout(timer);
  }, [order.status]);

  const updateStatus = async (status: string) => {
    try {
      setLoading(true);
      setRetryVisible(false);
      await axios.put(
        `${restaurantService}/api/order/${order._id}`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Order status updated");
      onStatusUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .bb-card {
          background: linear-gradient(145deg, #1a1a14 0%, #111110 100%);
          border: 1px solid #2a2a1e;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, transform 0.2s;
          position: relative;
          overflow: hidden;
        }
        .bb-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(to right, transparent, #c9a84c33, transparent);
        }
        .bb-card:hover {
          border-color: #c9a84c44;
          transform: translateY(-2px);
        }

        .bb-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bb-order-id {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #888070;
          letter-spacing: 0.5px;
        }
        .bb-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: capitalize;
        }
        .bb-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: bb-pulse 2s infinite;
        }
        @keyframes bb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .bb-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bb-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
          color: #f0ede6;
          font-weight: 500;
        }
        .bb-item-qty {
          background: #c9a84c18;
          border: 1px solid #c9a84c33;
          color: #c9a84c;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .bb-divider {
          height: 1px;
          background: linear-gradient(to right, #c9a84c22, transparent);
        }

        .bb-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .bb-total-label {
          font-size: 12px;
          color: #555040;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Syne', sans-serif;
        }
        .bb-total-amount {
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #c9a84c;
        }

        .bb-payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #22c55e15;
          border: 1px solid #22c55e33;
          color: #4ade80;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Syne', sans-serif;
          padding: 3px 9px;
          border-radius: 6px;
        }

        .bb-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bb-action-btn {
          background: linear-gradient(135deg, #c9a84c, #b8943e);
          color: #0d0d0b;
          border: none;
          padding: 9px 16px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.2px;
          text-transform: capitalize;
        }
        .bb-action-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .bb-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .bb-retry-btn {
          width: 100%;
          background: transparent;
          border: 1px solid #c9a84c55;
          color: #c9a84c;
          padding: 9px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          letter-spacing: 0.2px;
        }
        .bb-retry-btn:hover {
          background: #c9a84c18;
          border-color: #c9a84c;
        }
      `}</style>

      <div className="bb-card">
        {/* Header */}
        <div className="bb-card-header">
          <span className="bb-order-id">Order #{order._id.slice(-6)}</span>
          <span
            className="bb-status-badge"
            style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
          >
            <span className="bb-status-dot" style={{ background: sc.dot }} />
            {order.status.replaceAll("_", " ")}
          </span>
        </div>

        {/* Items */}
        <div className="bb-items">
          {order.items.map((item, i) => (
            <div key={i} className="bb-item-row">
              <span>{item.name}</span>
              <span className="bb-item-qty">×{item.quantity}</span>
            </div>
          ))}
        </div>

        <div className="bb-divider" />

        {/* Total */}
        <div className="bb-total-row">
          <span className="bb-total-label">Total</span>
          <span className="bb-total-amount">₹{order.totalAmount}</span>
        </div>

        {/* Payment */}
        <div>
          <span className="bb-payment-badge">
            ✓ {order.paymentStatus}
          </span>
        </div>

        {/* Action buttons */}
        {order.paymentStatus === "paid" && actions.length > 0 && (
          <div className="bb-actions">
            {actions.map((status) => (
              <button
                key={status}
                disabled={loading}
                onClick={() => updateStatus(status)}
                className="bb-action-btn"
              >
                Mark as {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        )}

        {/* Retry button */}
        {order.status === "ready_for_rider" && retryVisible && (
          <button
            className="bb-retry-btn"
            disabled={loading}
            onClick={() => updateStatus("ready_for_rider")}
          >
            ↺ Retry Ready for Rider
          </button>
        )}
      </div>
    </>
  );
};

export default OrderCard;
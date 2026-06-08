import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { BsCartPlus } from "react-icons/bs";
import { VscLoading } from "react-icons/vsc";
import { restaurantService } from "../config";
import { useAppData } from "../context/AppContext";
import type { IDishSearchResult, IRecommendedMenuItem, IRestaurant } from "../types";
import { captureFoodEvent } from "../utils/foodEvents";

type Props = {
  dish: IDishSearchResult | IRecommendedMenuItem;
  restaurant: IRestaurant & { distanceKm?: number };
};

const DishSearchResultCard = ({ dish, restaurant }: Props) => {
  const [loading, setLoading] = useState(false);
  const { cart, fetchCart } = useAppData();

  const incrementCart = async (itemId: string) => {
    try {
      setLoading(true);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      fetchCart();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to increase");
    } finally {
      setLoading(false);
    }
  };

  const decrementCart = async (itemId: string) => {
    try {
      setLoading(true);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      fetchCart();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to decrease");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId: restaurant._id,
          itemId: dish._id,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      captureFoodEvent({
        eventType: "addToCart",
        restaurantId: restaurant._id,
        itemId: dish._id,
      });
      fetchCart();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="group relative flex gap-4 rounded-3xl border border-white/5 bg-[#141414] p-4 shadow-lg transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-black/50 cursor-pointer"
      onClick={() =>
        captureFoodEvent({
          eventType: "click",
          restaurantId: restaurant._id,
          itemId: dish._id,
        })
      }
    >
      {dish.image && (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#0f0f0f]">
          <img
            src={dish.image}
            alt={dish.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/80 via-transparent to-transparent opacity-50" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold tracking-tight text-white/95 transition-colors group-hover:text-[#facc15]">
                {dish.name}
              </h3>
              <p className="text-[13px] font-medium text-white/40 mt-0.5">{restaurant.name}</p>
            </div>
            <p className="font-bold text-white shrink-0 text-md">₹{dish.price}</p>
          </div>
          {dish.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/40">
              {dish.description}
            </p>
          )}
          {dish.dietaryFlags && dish.dietaryFlags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {dish.dietaryFlags.map((flag: string) => (
                <span
                  key={flag}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60">
            <span className="text-[#facc15] font-semibold">{restaurant.name}</span>
            <span className="text-white/30">•</span>
            <span>
              {typeof restaurant.distanceKm === "number"
                ? `${restaurant.distanceKm.toFixed(1)} km`
                : "Nearby"}
            </span>
          </span>
          {(() => {
            const cartItem = cart?.find((c: any) => c.itemId === dish._id || c.itemId?._id === dish._id);
            const quantity = cartItem?.quantity || 0;

            if (quantity > 0) {
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 rounded-xl bg-[#facc15] p-1 shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                >
                  <button
                    disabled={loading}
                    onClick={() => decrementCart(dish._id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/10 text-[#0f0f0f] transition hover:bg-black/20 disabled:opacity-50"
                  >
                    <span className="text-xl font-bold leading-none -mt-0.5">-</span>
                  </button>
                  {loading ? (
                    <div className="flex w-5 justify-center"><VscLoading className="animate-spin text-[#0f0f0f]" size={16} /></div>
                  ) : (
                    <span className="w-5 text-center text-sm font-bold text-[#0f0f0f]">{quantity}</span>
                  )}
                  <button
                    disabled={loading}
                    onClick={() => incrementCart(dish._id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/10 text-[#0f0f0f] transition hover:bg-black/20 disabled:opacity-50"
                  >
                    <span className="text-xl font-bold leading-none -mt-0.5">+</span>
                  </button>
                </div>
              );
            }

            return (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  addToCart();
                }}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-[#facc15] px-4 py-2 text-xs font-bold text-[#0f0f0f] shadow-[0_0_15px_rgba(250,204,21,0.15)] transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <VscLoading className="animate-spin" /> : <BsCartPlus className="text-[15px]" />}
                Add
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default DishSearchResultCard;


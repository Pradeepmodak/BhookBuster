import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

const formatCurrency = (value: number) => `Rs ${value}`;

const Cart = () => {
  const { cart, subtotal, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <p className="text-lg text-neutral-400">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subtotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subtotal + deliveryFee + platformFee;

  const increaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      await fetchCart();
    } catch (_error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      await fetchCart();
    } catch (_error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear your cart?");
    if (!confirm) return;

    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Cart cleared successfully");
      await fetchCart();
    } catch (_error) {
      toast.error("Something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h1 className="text-3xl font-semibold">{restaurant.name}</h1>
            <p className="mt-2 text-sm text-neutral-400">{restaurant.autoLocation.formattedAddress}</p>
          </div>

          <div className="space-y-4">
            {cart.map((cartItem: ICart) => {
              const item = cartItem.itemId as IMenuItem;
              const isLoading = loadingItemId === item._id;

              return (
                <div
                  key={item._id}
                  className="grid gap-4 rounded-[28px] border border-white/10 bg-[#171717] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.26)] md:grid-cols-[92px_1fr_auto_auto]"
                >
                  <img src={item.image} alt={item.name} className="h-24 w-24 rounded-2xl object-cover" />

                  <div>
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="mt-2 text-sm text-neutral-400">{formatCurrency(item.price)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-full border border-white/10 p-2 hover:bg-white/5 disabled:opacity-50"
                      disabled={isLoading}
                      onClick={() => decreaseQty(item._id)}
                    >
                      {isLoading ? <VscLoading size={16} className="animate-spin" /> : <BiMinus size={16} />}
                    </button>
                    <span className="font-medium">{cartItem.quantity}</span>
                    <button
                      className="rounded-full border border-white/10 p-2 hover:bg-white/5 disabled:opacity-50"
                      disabled={isLoading}
                      onClick={() => increaseQty(item._id)}
                    >
                      {isLoading ? <VscLoading size={16} className="animate-spin" /> : <BiPlus size={16} />}
                    </button>
                  </div>

                  <p className="text-right text-lg font-semibold text-[#facc15]">
                    {formatCurrency(item.price * cartItem.quantity)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-fit rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <h2 className="text-2xl font-semibold">Order summary</h2>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Delivery fee</span>
              <span>{deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Platform fee</span>
              <span>{formatCurrency(platformFee)}</span>
            </div>

            {subtotal < 250 && (
              <div className="rounded-2xl border border-[#facc15]/20 bg-[#facc15]/10 px-4 py-3 text-[#facc15]">
                Add items worth {formatCurrency(250 - subtotal)} more to unlock free delivery
              </div>
            )}

            <div className="flex justify-between border-t border-white/10 pt-4 text-base font-semibold">
              <span>Grand total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className={`mt-6 w-full rounded-2xl py-3 text-sm font-semibold transition ${
              !restaurant.isOpen
                ? "cursor-not-allowed bg-neutral-700 text-neutral-400"
                : "bg-[#facc15] text-[#0f0f0f] hover:brightness-110"
            }`}
            disabled={!restaurant.isOpen}
          >
            {!restaurant.isOpen ? "Restaurant is closed" : "Proceed to checkout"}
          </button>

          <button
            onClick={clearCart}
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-transparent py-3 text-sm font-semibold text-neutral-300 transition hover:border-red-400/40 hover:text-red-300"
            disabled={clearingCart}
          >
            Clear cart <TbTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;

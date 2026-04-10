import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";
import { useAppData } from "../context/AppContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const formatCurrency = (value: number) => `Rs ${value}`;

const Checkout = () => {
  const { cart, subtotal, quantity } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(`${restaurantService}/api/address/all`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setAddresses(data.addresses || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart]);

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

  const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod,
          addressId: selectedAddressId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return data;
    } catch (_error) {
      toast.error("Failed to create order");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);

      if (!(window as Window & { Razorpay?: unknown }).Razorpay) {
        toast.error("Payment system not ready. Please refresh.");
        return;
      }

      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, { orderId });
      const { razorpayOrderId, key } = data;

      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "BhookBuster",
        description: "Food Order Payment",
        order_id: razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });

            toast.success("Payment successful");
            navigate(`/paymentsuccess/${response.razorpay_payment_id}`);
          } catch (_error) {
            toast.error("Payment verification failed");
          }
        },
        theme: {
          color: "#facc15",
        },
      };

      const RazorpayConstructor = ((window as unknown) as Window & {
        Razorpay: new (options: unknown) => { open: () => void };
      }).Razorpay;
      const razorpay = new RazorpayConstructor(options);
      razorpay.open();
    } catch (_error) {
      toast.error("Payment failed to initialize");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;

      const { orderId } = order;
      await stripePromise;
      const { data } = await axios.post(`${utilsService}/api/payment/stripe/create`, { orderId });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate Stripe payment");
      }
    } catch (_error) {
      toast.error("Payment failed");
    } finally {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h1 className="text-3xl font-semibold">Checkout</h1>
            <p className="mt-3 text-sm text-neutral-400">{restaurant.name} • {restaurant.autoLocation.formattedAddress}</p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#171717] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold">Delivery address</h2>
            <div className="mt-5 space-y-3">
              {loadingAddress ? (
                <p className="text-sm text-neutral-400">Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <p className="text-sm text-neutral-400">No address found. Please add one first.</p>
              ) : (
                addresses.map((address) => (
                  <label
                    key={address._id}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                      selectedAddressId === address._id
                        ? "border-[#facc15] bg-[#facc15]/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedAddressId === address._id}
                      onChange={() => setSelectedAddressId(address._id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{address.formattedAddress}</p>
                      <p className="text-xs text-neutral-400">{address.mobile}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold">Order summary</h2>

            <div className="mt-5 space-y-3">
              {cart.map((cartItem: ICart) => {
                const item = cartItem.itemId as IMenuItem;
                return (
                  <div className="flex justify-between text-sm" key={cartItem._id}>
                    <span>
                      {item.name} x {cartItem.quantity}
                    </span>
                    <span>{formatCurrency(item.price * cartItem.quantity)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Items ({quantity})</span>
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
              <div className="flex justify-between border-t border-white/10 pt-4 text-base font-semibold">
                <span>Grand total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#171717] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold">Payment methods</h2>
            <div className="mt-5 grid gap-3">
              <button
                disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
                onClick={payWithRazorpay}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#facc15] py-3 text-sm font-semibold text-[#0f0f0f] transition hover:brightness-110 disabled:opacity-50"
              >
                {loadingRazorpay ? <BiLoader size={18} className="animate-spin" /> : <BiCreditCard size={18} />}
                Pay with Razorpay
              </button>

              <button
                disabled={!selectedAddressId || loadingStripe || creatingOrder}
                onClick={payWithStripe}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 py-3 text-sm font-semibold text-white transition hover:border-[#facc15]/40 disabled:opacity-50"
              >
                {loadingStripe ? <BiLoader size={18} className="animate-spin" /> : <BiCreditCard size={18} />}
                Pay with Stripe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

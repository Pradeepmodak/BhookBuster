/**
 * SUMMARY FOR INTERVIEW:
 * ----------------------
 * This component represents the Checkout Page.
 * It is responsible for:
 * 1. Address Management: Fetches and displays a list of the customer's saved delivery addresses.
 * 2. Order Creation: Registers a pending order in the backend database.
 * 3. Payment Gateway Integrations:
 *    - Razorpay: Implements a Client-Side Modal checkout flow (calls backend to create Razorpay order -> opens Razorpay SDK popup -> verifies signature on backend).
 *    - Stripe: Implements a Redirect-based checkout flow (requests a Stripe hosted checkout URL from backend -> redirects user -> handles webhook processing asynchronously on backend).
 */

import { useEffect, useState } from "react"; // React hooks for component state and lifecycle side-effects
import axios from "axios"; // Promise-based HTTP client for API request management
import { restaurantService, utilsService } from "../config"; // Backend microservice base URL configurations
import type { ICart, IMenuItem, IRestaurant } from "../types"; // Strict TypeScript type declarations for consistent data structures
import { useNavigate } from "react-router-dom"; // Hook for programmatically managing routes and navigating users
import toast from "react-hot-toast"; // Library to display elegant, non-blocking notification popups
import { BiCreditCard, BiLoader } from "react-icons/bi"; // High-quality vector icons from the BoxIcons library
import { loadStripe } from "@stripe/stripe-js"; // Standard loader to dynamically load the Stripe.js script securely
import { useAppData } from "../context/AppContext"; // Custom context hook to access global shopping cart data and totals

// Load the Stripe SDK globally using the publishable API key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

// FUNCTION EXPLANATION FOR INTERVIEW:
// Simple utility function to format numbers into localized Currency strings (e.g., "Rs 250").
const formatCurrency = (value: number) => `Rs ${value}`;

/**
 * COMPONENT EXPLANATION FOR INTERVIEW:
 * ------------------------------------
 * The main Checkout page component. It integrates cart state, 
 * delivery addresses, order summary display, and triggers payment workflows.
 */
const Checkout = () => {
  const { cart, subtotal, quantity } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const navigate = useNavigate();

  // INTERVIEW TALKING POINT: Fetch Addresses hook.
  // Triggers only when the cart contains items, fetching all registered customer addresses.
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

  // Calculate pricing summary details
  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subtotal < 250 ? 49 : 0; // Free delivery threshold is Rs 250
  const platformFee = 7;
  const grandTotal = subtotal + deliveryFee + platformFee;

  /**
   * FUNCTION EXPLANATION FOR INTERVIEW:
   * -----------------------------------
   * Shared helper function to instantiate a new Order in our database before payment.
   * It creates a "pending" or "unpaid" order record which is later updated upon successful payment.
   */
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
    } catch {
      toast.error("Failed to create order");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  /**
   * FUNCTION EXPLANATION FOR INTERVIEW: Razorpay SDK checkout flow.
   * -------------------------------------------------------------
   * 1. Creates an order in our database.
   * 2. Requests `utilsService` to register the transaction with Razorpay API (generates a `razorpayOrderId`).
   * 3. Configures options and opens the interactive Razorpay overlay.
   * 4. Once user pays, the checkout modal returns client-side response parameters.
   * 5. Forwards signature parameter to our backend `/api/payment/verify` for cryptographic verification (prevents fraud).
   */
  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);

      // Verify that the Razorpay CDN script loaded successfully
      if (!(window as Window & { Razorpay?: unknown }).Razorpay) {
        toast.error("Payment system not ready. Please refresh.");
        return;
      }

      // Step 1: Create local order
      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;

      // Step 2: Fetch Razorpay details
      const { data } = await axios.post(`${utilsService}/api/payment/create`, { orderId }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const { razorpayOrderId, key } = data;

      // Step 3: Configure client-side Razorpay SDK options
      const options = {
        key,
        amount: amount * 100, // Razorpay processes amounts in paisa (sub-units), hence multiplied by 100
        currency: "INR",
        name: "BhookBuster",
        description: "Food Order Payment",
        order_id: razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Step 4 & 5: Handle callback and verify signature on backend
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            }, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            toast.success("Payment successful");
            navigate(`/paymentsuccess/${response.razorpay_payment_id}`);
          } catch {
            toast.error("Payment verification failed");
          }
        },
        theme: {
          color: "#facc15", // Theme accent color matching app design
        },
      };

      const RazorpayConstructor = ((window as unknown) as Window & {
        Razorpay: new (options: unknown) => { open: () => void };
      }).Razorpay;
      const razorpay = new RazorpayConstructor(options);
      razorpay.open();
    } catch {
      toast.error("Payment failed to initialize");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  /**
   * FUNCTION EXPLANATION FOR INTERVIEW: Stripe checkout redirect.
   * -------------------------------------------------------------
   * 1. Creates an order in our database.
   * 2. Requests `utilsService` to generate a Stripe Checkout Session URL.
   * 3. Redirects the browser window to Stripe's highly-secure, hosted payment portal.
   * 4. Stripe redirects the user back to `/paymentsuccess` or checkout based on outcome.
   */
  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);

      // Step 1: Create local order
      const order = await createOrder("stripe");
      if (!order) return;

      const { orderId } = order;
      await stripePromise;

      // Step 2: Request Stripe Hosted Checkout URL
      const { data } = await axios.post(`${utilsService}/api/payment/stripe/create`, { orderId }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Step 3: Redirect user
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate Stripe payment");
      }
    } catch {
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


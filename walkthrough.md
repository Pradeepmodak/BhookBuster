# BhookBuster — Comprehensive Bug Fix Walkthrough

## Summary
Fixed **10 bugs** across **6 files** (4 frontend, 2 backend) in a single coordinated pass.

---

## Changes Made

### Frontend (4 files)

| File | Bug | Fix |
|------|-----|-----|
| `MenuItems.tsx` | Swapped `addToCart` params | `addToCart(item.restaurantId, item._id)` |
| `MenuItems.tsx` | Unsafe `error.response.data.message` | `error?.response?.data?.message \|\| "fallback"` |
| `Cart.tsx` | Duplicate decrease button | Removed 14-line duplicate block |
| `RiderDashboard.tsx` | Socket cleanup `order_available` → `order:available` | Fixed event name |
| `RiderDashboard.tsx` | 2x unsafe error handling | Added optional chaining |
| `Restaurant.tsx` | Stray text in JSX | Removed `Here's the text from the image:` |

### Backend (2 files)

| File | Bug | Fix |
|------|-----|-----|
| `cart.ts` | Null crash in `fetchMyCart` | Added null guard + auto-purge of orphaned entries |
| `cart.ts` | Missing `return` in `decrementCartItem` | Added `return` before `res.json()` |
| `order.ts` | `deleteOne` instead of `deleteMany` | Changed to `Cart.deleteMany()` |
| `order.ts` | No fallback in `updateOrderStatusRider` | Added 400 response for unexpected statuses |
| `order.ts` | Unused `count` import | Removed |

---

## Files Modified

```diff:MenuItems.tsx
import { useState } from "react";
import type { IMenuItem } from "../types";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { FiEyeOff } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import axios from "axios";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const [loadingItemId, setloadingItemId] = useState<string | null>(null);
 
  const handleDelete = async (itemId: string) => {
  const confirm = window.confirm("Are you sure you want to delete this item");
  if (!confirm) return;

  try {
    await axios.delete(`${restaurantService}/api/item/${itemId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.success("Item deleted")
    onItemDeleted()
  } catch (error) {
    console.log(error);
    toast.error("Failed to delete item");
  }
};

const toggleAvailability = async (itemId: string) => {
  try {
    const { data } = await axios.put(`${restaurantService}/api/item/status/${itemId}`,
      // PPP me 2nd argument dena hi pdega . yha pe hmlog empty set kiye hai
      {},
      {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.success(data.message);
    onItemDeleted();
  } catch (error) {
    console.log(error);
    toast.error("Failed to update status");
  }
};

const { fetchCart } = useAppData();

const addToCart = async (restaurantId: string, itemId: string) => {
  try {
    setloadingItemId(itemId);
    const { data } = await axios.post(
      `${restaurantService}/api/cart/add`,
      {
        restaurantId,
        itemId,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    toast.success(data.message);
    fetchCart();
  } catch (error:any) {
    toast.error(error.response.data.message);
  }finally{
    setloadingItemId(null);
  }
};

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isLoading = loadingItemId === item._id;

        return (
          <div
            className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${
              !item.isAvailable ? "opacity-70" : ""
            }`} key={item._id}
          >
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt=""
                className={`h-20 w-20 rounded object-cover ${
                  !item.isAvailable ? "grayscale brightness-75" : ""
                }`}
              />

              {!item.isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">
                  Not Available
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
  <div>
    <h3 className="font-semibold">{item.name}</h3>
    {item.description && (
      <p className="text-sm text-gray-500 line-clamp-2">
        {item.description}
      </p>
    )}
  </div>
</div>

<div className="flex items-center justify-center">
  <p className="font-medium">₹{item.price}</p>

  {isSeller && (
    <div className="flex gap-2">
      <button
        onClick={() => toggleAvailability(item._id)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
      >
        {item.isAvailable ? (
          <BsEye size={18} />
        ) : (
          <FiEyeOff size={18} />
        )}
      </button>
      <button
  onClick={() => handleDelete(item._id)}
  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
>
  <BiTrash size={18} />
</button>
    </div>
  )}
{!isSeller && (
  <button
    disabled={!item.isAvailable || isLoading}
    onClick={() => addToCart(item._id,item.restaurantId)}
    className={`flex items-center justify-center rounded-lg p-2 ${
      !item.isAvailable || isLoading
        ? "cursor-not-allowed text-gray-400"
        : "text-red-500 hover:bg-red-50"
    }`}
  >
    {isLoading ? <VscLoading size={18} className="animate-spin" /> : <BsCartPlus size={18} />}
  </button>
)}
</div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuItems;
===
import { useState } from "react";
import type { IMenuItem } from "../types";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { FiEyeOff } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import axios from "axios";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const [loadingItemId, setloadingItemId] = useState<string | null>(null);
 
  const handleDelete = async (itemId: string) => {
  const confirm = window.confirm("Are you sure you want to delete this item");
  if (!confirm) return;

  try {
    await axios.delete(`${restaurantService}/api/item/${itemId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.success("Item deleted")
    onItemDeleted()
  } catch (error) {
    console.log(error);
    toast.error("Failed to delete item");
  }
};

const toggleAvailability = async (itemId: string) => {
  try {
    const { data } = await axios.put(`${restaurantService}/api/item/status/${itemId}`,
      // PPP me 2nd argument dena hi pdega . yha pe hmlog empty set kiye hai
      {},
      {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.success(data.message);
    onItemDeleted();
  } catch (error) {
    console.log(error);
    toast.error("Failed to update status");
  }
};

const { fetchCart } = useAppData();

const addToCart = async (restaurantId: string, itemId: string) => {
  try {
    setloadingItemId(itemId);
    const { data } = await axios.post(
      `${restaurantService}/api/cart/add`,
      {
        restaurantId,
        itemId,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    toast.success(data.message);
    fetchCart();
  } catch (error:any) {
    toast.error(error?.response?.data?.message || "Failed to add item");
  }finally{
    setloadingItemId(null);
  }
};

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isLoading = loadingItemId === item._id;

        return (
          <div
            className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${
              !item.isAvailable ? "opacity-70" : ""
            }`} key={item._id}
          >
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt=""
                className={`h-20 w-20 rounded object-cover ${
                  !item.isAvailable ? "grayscale brightness-75" : ""
                }`}
              />

              {!item.isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">
                  Not Available
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
  <div>
    <h3 className="font-semibold">{item.name}</h3>
    {item.description && (
      <p className="text-sm text-gray-500 line-clamp-2">
        {item.description}
      </p>
    )}
  </div>
</div>

<div className="flex items-center justify-center">
  <p className="font-medium">₹{item.price}</p>

  {isSeller && (
    <div className="flex gap-2">
      <button
        onClick={() => toggleAvailability(item._id)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
      >
        {item.isAvailable ? (
          <BsEye size={18} />
        ) : (
          <FiEyeOff size={18} />
        )}
      </button>
      <button
  onClick={() => handleDelete(item._id)}
  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
>
  <BiTrash size={18} />
</button>
    </div>
  )}
{!isSeller && (
  <button
    disabled={!item.isAvailable || isLoading}
    onClick={() => addToCart(item.restaurantId, item._id)}
    className={`flex items-center justify-center rounded-lg p-2 ${
      !item.isAvailable || isLoading
        ? "cursor-not-allowed text-gray-400"
        : "text-red-500 hover:bg-red-50"
    }`}
  >
    {isLoading ? <VscLoading size={18} className="animate-spin" /> : <BsCartPlus size={18} />}
  </button>
)}
</div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuItems;
```

```diff:Cart.tsx
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

const Cart = () => {
  const { cart, subtotal, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }
const restaurant = cart[0].restaurantId as IRestaurant;

const deliveryFee = subtotal < 250 ? 49:0;

const platformFee=7;
const grandTotal=subtotal + deliveryFee + platformFee;

const increaseQty=async(itemId:string)=>{
    try {
  setLoadingItemId(itemId);

  await axios.put(
    `${restaurantService}/api/cart/inc`,
    { itemId },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  await fetchCart();
} catch (error) {
     toast.error("something went wrong");   
}finally{
    setLoadingItemId(null);
}
}
const decreaseQty=async(itemId:string)=>{
    try {
  setLoadingItemId(itemId);

  await axios.put(
    `${restaurantService}/api/cart/dec`,
    { itemId },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  await fetchCart();
} catch (error) {
     toast.error("something went wrong");   
}finally{
    setLoadingItemId(null);
}
}
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
  } catch (error) {
    toast.error("Something went wrong");
  } finally {
    setClearingCart(false);
  }
};
const checkout=()=>{
    navigate("/checkout");
}
 return (
  <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
    
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">{restaurant.name}</h2>
      <p className="text-sm text-gray-500">
        {restaurant.autoLocation.formattedAddress}
      </p>
    </div>

    <div className="space-y-4">
      {cart.map((cartItem: ICart) => {
        const item = cartItem.itemId as IMenuItem;
        const isLoading = loadingItemId === item._id;

        return (
          <div
            key={item._id}
            className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
          >
            <img
  src={item.image}
  alt={item.image}
  className="h-20 w-20 rounded object-cover"
/>

<div className="flex-1">
  <h3 className="font-semibold">{item.name}</h3>
  <p className="text-sm text-gray-500">₹{item.price}</p>
</div>
<div className="flex items-center gap-3">
  <button
    className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
    disabled={isLoading}
    onClick={() => decreaseQty(item._id)}
  >
    {isLoading ? (
      <VscLoading size={16} className="animate-spin" />
    ) : (
      <BiMinus size={16} />
    )}
  </button>

<span className="font-medium">{cartItem.quantity}</span>

    <button
    className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
    disabled={isLoading}
    onClick={() => increaseQty(item._id)}
  >
    {isLoading ? (
      <VscLoading size={16} className="animate-spin" />
    ) : (
      <BiPlus size={16} />
    )}
  </button>

  

    <button
    className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
    disabled={isLoading}
    onClick={() => decreaseQty(item._id)}
  >
    {isLoading ? (
      <VscLoading size={16} className="animate-spin" />
    ) : (
      <BiMinus size={16} />
    )}
  </button>
</div>
<p className="w-20 text-right font-medium">
   ₹{item.price * cartItem.quantity}
</p>

          </div>
        );
      })}
   

<div className="flex justify-between text-sm">
  <span>Subtotal</span>
  <span>₹{subtotal}</span>
</div>

<div className="flex justify-between text-sm">
  <span>Delivery Fee</span>
  <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
</div>

<div className="flex justify-between text-sm">
  <span>Platform Fee</span>
  <span>₹{platformFee}</span>
</div>

{subtotal < 250 && (
  <p className="text-xs text-gray-500">
    Add Item worth ₹{250 - subtotal} more to get Free delivery
  </p>
)}

<div className="flex justify-between text-base font-semibold border-t pt-2">
  <span>Grand Total</span>
  <span>₹{grandTotal}</span>
</div>

<button
  onClick={checkout}
  className={`mt-3 w-full rounded-lg bg-[#E23744] py-3 text-sm font-semibold text-white hover:bg-red-800 ${
    !restaurant.isOpen ? "opacity-50 cursor-not-allowed" : ""
  }`}
  disabled={!restaurant.isOpen}
>
  {!restaurant.isOpen ? "Restaurant is Closed" : "Proceed to Checkout"}
</button>
<button
  onClick={clearCart}
  className="mt-3 w-full rounded-lg bg-[#545252] py-3 text-sm font-semibold text-white hover:bg-gray-900 flex justify-center items-center gap-3"
  disabled={clearingCart}
>
  Clear Cart <TbTrash size={16} />
</button>
  </div>
   </div>
);
};

export default Cart;
===
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

const Cart = () => {
  const { cart, subtotal, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }
const restaurant = cart[0].restaurantId as IRestaurant;

const deliveryFee = subtotal < 250 ? 49:0;

const platformFee=7;
const grandTotal=subtotal + deliveryFee + platformFee;

const increaseQty=async(itemId:string)=>{
    try {
  setLoadingItemId(itemId);

  await axios.put(
    `${restaurantService}/api/cart/inc`,
    { itemId },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  await fetchCart();
} catch (error) {
     toast.error("something went wrong");   
}finally{
    setLoadingItemId(null);
}
}
const decreaseQty=async(itemId:string)=>{
    try {
  setLoadingItemId(itemId);

  await axios.put(
    `${restaurantService}/api/cart/dec`,
    { itemId },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  await fetchCart();
} catch (error) {
     toast.error("something went wrong");   
}finally{
    setLoadingItemId(null);
}
}
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
  } catch (error) {
    toast.error("Something went wrong");
  } finally {
    setClearingCart(false);
  }
};
const checkout=()=>{
    navigate("/checkout");
}
 return (
  <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
    
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">{restaurant.name}</h2>
      <p className="text-sm text-gray-500">
        {restaurant.autoLocation.formattedAddress}
      </p>
    </div>

    <div className="space-y-4">
      {cart.map((cartItem: ICart) => {
        const item = cartItem.itemId as IMenuItem;
        const isLoading = loadingItemId === item._id;

        return (
          <div
            key={item._id}
            className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
          >
            <img
  src={item.image}
  alt={item.image}
  className="h-20 w-20 rounded object-cover"
/>

<div className="flex-1">
  <h3 className="font-semibold">{item.name}</h3>
  <p className="text-sm text-gray-500">₹{item.price}</p>
</div>
<div className="flex items-center gap-3">
  <button
    className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
    disabled={isLoading}
    onClick={() => decreaseQty(item._id)}
  >
    {isLoading ? (
      <VscLoading size={16} className="animate-spin" />
    ) : (
      <BiMinus size={16} />
    )}
  </button>

<span className="font-medium">{cartItem.quantity}</span>

    <button
    className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
    disabled={isLoading}
    onClick={() => increaseQty(item._id)}
  >
    {isLoading ? (
      <VscLoading size={16} className="animate-spin" />
    ) : (
      <BiPlus size={16} />
    )}
  </button>
</div>
<p className="w-20 text-right font-medium">
   ₹{item.price * cartItem.quantity}
</p>

          </div>
        );
      })}
   

<div className="flex justify-between text-sm">
  <span>Subtotal</span>
  <span>₹{subtotal}</span>
</div>

<div className="flex justify-between text-sm">
  <span>Delivery Fee</span>
  <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
</div>

<div className="flex justify-between text-sm">
  <span>Platform Fee</span>
  <span>₹{platformFee}</span>
</div>

{subtotal < 250 && (
  <p className="text-xs text-gray-500">
    Add Item worth ₹{250 - subtotal} more to get Free delivery
  </p>
)}

<div className="flex justify-between text-base font-semibold border-t pt-2">
  <span>Grand Total</span>
  <span>₹{grandTotal}</span>
</div>

<button
  onClick={checkout}
  className={`mt-3 w-full rounded-lg bg-[#E23744] py-3 text-sm font-semibold text-white hover:bg-red-800 ${
    !restaurant.isOpen ? "opacity-50 cursor-not-allowed" : ""
  }`}
  disabled={!restaurant.isOpen}
>
  {!restaurant.isOpen ? "Restaurant is Closed" : "Proceed to Checkout"}
</button>
<button
  onClick={clearCart}
  className="mt-3 w-full rounded-lg bg-[#545252] py-3 text-sm font-semibold text-white hover:bg-gray-900 flex justify-center items-center gap-3"
  disabled={clearingCart}
>
  Clear Cart <TbTrash size={16} />
</button>
  </div>
   </div>
);
};

export default Cart;
```

```diff:RiderDashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import audio from "../assets/order_received.mp3"
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
}

const RiderDashboard = () => {
  const { user } = useAppData();
  const { socket } = useSocket();
  const [profile, setProfile] = useState<IRider | null>(null);
const [loading, setLoading] = useState(true);

const [toggling, setToggling] = useState(false);
const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);

const [audioUnlocked, setAudioUnlocked] = useState(false);
const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  audioRef.current = new Audio(audio);
  audioRef.current.preload = "auto";
}, []);

const unlockAudio = async () => {
  try {
    if (!audioRef.current) return;

    await audioRef.current.play();

    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    setAudioUnlocked(true);
    toast.success("Sound Enabled");
  } catch (error) {
    toast.error("Tap again to enable sound");
  }
};
useEffect(() => {
  if (!socket) return;

  const onOrderAvailable = ({ orderId }: { orderId: string }) => {
    setIncomingOrders((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId]
    );

    if (audioUnlocked && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => {
  setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
}, 10000);
  };

  socket.on('order:available', onOrderAvailable);

  return () => {
    socket.off('order_available', onOrderAvailable);
  };
},[socket,audioUnlocked]);
const fetchProfile = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/myprofile`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setProfile(data || null);
  } catch (error) {
    setProfile(null);
  }finally{
    setLoading(false);
  }
};
useEffect(() => {
  if (user?.role === "rider") fetchProfile();
  else setLoading(false);
}, [user]);


// latest order status appears in the ui
const fetchCurrentOrder = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/order/current`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setCurrentOrder(data.order);
  } catch (error) {
    console.log(error);
    setCurrentOrder(null);
  }
};
useEffect(()=>{
  fetchCurrentOrder();
},[])

const toggleAvailability = async () => {
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setToggling(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
  try {
    await axios.patch(
      `${riderService}/api/toggle`,
      {
        isAvailable: !profile?.isAvailable,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
toast.success(
  profile?.isAvailable ? "You are offline" : "You are online");
fetchProfile();
} catch (error: any) {
  toast.error(error.response.data.message);
} finally {
  setToggling(false);
}
});
};

const [phoneNumber, setPhoneNumber] = useState("");
const [aadharNumber, setaadharNumber] = useState("");
const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
const [image, setImage] = useState<File | null>(null);
const [submitting, setSubmitting] = useState(false);

const handleSubmit=async()=>{
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setSubmitting(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
    const formData=new FormData();
    formData.append("phoneNumber", phoneNumber);
formData.append("aadharNumber", aadharNumber);
formData.append("drivingLicenseNumber", drivingLicenseNumber);
formData.append("latitude", pos.coords.latitude.toString());
formData.append("longitude", pos.coords.longitude.toString());
if(image){
formData.append("file",image);
}
  try {
const { data } = await axios.post(
  `${riderService}/api/rider/new`,
  formData,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    params: {
      isAvailable: !profile?.isAvailable,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    },
  }
);
toast.success(data.message);
fetchProfile();
} catch (error: any) {
  toast.error(error.response.data.message);
} finally {
  setSubmitting(false);
}
});
}

if (user?.role !== "rider") {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      You are not registered as a rider
    </div>
  );
}

if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      Loading rider details...
    </div>
  );
}
if(!profile){
      return (
        <div className='min-h-screen bg-gray-50 px-4 py-6'>
        <div className='mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5 '>
        <h1 className='text-xl font-semibold'>Add Your Profile</h1>    
        <input type="number" placeholder="Aadhar Number" value={aadharNumber} onChange={(e) => setaadharNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="number" placeholder='Contact number' value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="text" placeholder='Driving Licence' value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
       
<label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
  <BiUpload className="h-5 w-5 text-red-500" />
  {image ? image.name : "Upload your image"}
  <input
    type="file"
    accept="image/*"
    hidden
    onChange={(e) => setImage(e.target.files?.[0] || null)}
  />
</label>

        <button onClick={handleSubmit} disabled={submitting} className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400'>{submitting ? "Submitting..." : "Add Profile"}</button>
        </div>    
        </div>
      )
}
  return <div className="space-y-4">
  <div className="mx-auto max-w-md px-4 py-4">
    <div className="rounded-xl bg-white p-4 shadow space-y-3">
    <img
      src={profile.picture}
      className="mx-auto h-24 w-24 rounded-full object-cover"
      alt=""
    />
    <p className="text-center font-semibold">{user?.name}</p>
    <p className="text-center text-sm text-gray-500">
      {profile.phoneNumber}
    </p>

    <div className="flex justify-center gap-2">
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
        {profile.isVerified?"Verified":"Pending"}
      </span>
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
        {profile.isAvailable?"Online":"Offline"}
      </span>
    </div>
    <div>
  <p className="text-blue-400">
    Please be within a 500 m radius of any restaurant (which we call a hotspot) before going online as a rider to receive orders.
  </p>
</div>
{profile.isVerified && !currentOrder &&  (
  <button
    onClick={toggleAvailability}
    disabled={toggling}
    className={`w-full py-2 rounded-lg text-white font-semibold ${
      toggling
        ? "bg-gray-400"
        : profile.isAvailable
        ? "bg-gray-600"
        : "bg-[#e23744]"
    }`}
  >{toggling
  ? "Updating..."
  : profile.isAvailable
  ? "Go Offline"
  : "Go Online"}
  </button>
)}
    </div>
  </div>
      {/* Show this UI ONLY if audio is NOT unlocked */}
    {!audioUnlocked && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔔</span>
        </div>
        <div>
  <p className="font-medium text-blue-900">
    Enable Sound Notification
  </p>
  <p className="text-sm text-blue-700">
    Get Notified when new orders arrive
  </p>
</div>
<button
  onClick={unlockAudio}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
>
  Enable sound
</button>
      </div>
    )}

    {profile.isAvailable && incomingOrders.length > 0 && (
  <div className="mx-auto max-w-md px-4 space-y-3">
    <h3 className="font-semibold text-gray-700">Incoming Orders</h3>

{incomingOrders.map((id) => (
  <RiderOrderRequest
    key={id}
    orderId={id}
    onAccepted={() => {
      fetchProfile();
      fetchCurrentOrder();
    }}
  />
))}
  </div>
)}
{currentOrder && (
  <div className="mx-auto max-w-md px-4 space-y-4">
    <RiderCurrentOrder
      order={currentOrder}
      onStatusUpdate={fetchCurrentOrder}
    />
    <RiderOrderMap order={currentOrder}/>
  </div>
)}
</div>
};

export default RiderDashboard;
===
import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import audio from "../assets/order_received.mp3"
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import VerificationBadge from "../components/VerificationBadge";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailable: boolean;
}

const RiderDashboard = () => {
  const { user } = useAppData();
  const { socket } = useSocket();
  const [profile, setProfile] = useState<IRider | null>(null);
const [loading, setLoading] = useState(true);

const [toggling, setToggling] = useState(false);
const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);

const [audioUnlocked, setAudioUnlocked] = useState(false);
const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  audioRef.current = new Audio(audio);
  audioRef.current.preload = "auto";
}, []);

const unlockAudio = async () => {
  try {
    if (!audioRef.current) return;

    await audioRef.current.play();

    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    setAudioUnlocked(true);
    toast.success("Sound Enabled");
  } catch (error) {
    toast.error("Tap again to enable sound");
  }
};
useEffect(() => {
  if (!socket) return;

  const onOrderAvailable = ({ orderId }: { orderId: string }) => {
    setIncomingOrders((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId]
    );

    if (audioUnlocked && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => {
  setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
}, 10000);
  };

  socket.on('order:available', onOrderAvailable);

  return () => {
    socket.off('order:available', onOrderAvailable);
  };
},[socket,audioUnlocked]);
const fetchProfile = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/myprofile`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setProfile(data || null);
  } catch (error) {
    setProfile(null);
  }finally{
    setLoading(false);
  }
};
useEffect(() => {
  if (user?.role === "rider") fetchProfile();
  else setLoading(false);
}, [user]);


// latest order status appears in the ui
const fetchCurrentOrder = async () => {
  try {
    const { data } = await axios.get(
      `${riderService}/api/rider/order/current`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setCurrentOrder(data.order);
  } catch (error) {
    console.log(error);
    setCurrentOrder(null);
  }
};
useEffect(()=>{
  fetchCurrentOrder();
},[])

const toggleAvailability = async () => {
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setToggling(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
  try {
    await axios.patch(
      `${riderService}/api/toggle`,
      {
        isAvailable: !profile?.isAvailable,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
toast.success(
  profile?.isAvailable ? "You are offline" : "You are online");
fetchProfile();
} catch (error: any) {
  toast.error(error?.response?.data?.message || "Failed to toggle availability");
} finally {
  setToggling(false);
}
});
};

const [phoneNumber, setPhoneNumber] = useState("");
const [aadharNumber, setaadharNumber] = useState("");
const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
const [image, setImage] = useState<File | null>(null);
const [submitting, setSubmitting] = useState(false);

const handleSubmit=async()=>{
  if (!navigator.geolocation) {
    toast.error("Location Access Required");
    return;
  }

  setSubmitting(true);
// “The Geolocation API allows the browser to retrieve the user’s 
// current coordinates, which can be used for location-based services 
// like maps, delivery tracking, or nearest resource allocation.”
navigator.geolocation.getCurrentPosition(async (pos) => {
    const formData=new FormData();
    formData.append("phoneNumber", phoneNumber);
formData.append("aadharNumber", aadharNumber);
formData.append("drivingLicenseNumber", drivingLicenseNumber);
formData.append("latitude", pos.coords.latitude.toString());
formData.append("longitude", pos.coords.longitude.toString());
if(image){
formData.append("file",image);
}
  try {
const { data } = await axios.post(
  `${riderService}/api/rider/new`,
  formData,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    params: {
      isAvailable: !profile?.isAvailable,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    },
  }
);
toast.success(data.message);
fetchProfile();
} catch (error: any) {
  toast.error(error?.response?.data?.message || "Failed to submit profile");
} finally {
  setSubmitting(false);
}
});
}

if (user?.role !== "rider") {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      You are not registered as a rider
    </div>
  );
}

if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
      Loading rider details...
    </div>
  );
}
if(!profile){
      return (
        <div className='min-h-screen bg-gray-50 px-4 py-6'>
        <div className='mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5 '>
        <h1 className='text-xl font-semibold'>Add Your Profile</h1>    
        <input type="number" placeholder="Aadhar Number" value={aadharNumber} onChange={(e) => setaadharNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="number" placeholder='Contact number' value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
        <input type="text" placeholder='Driving Licence' value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
       
<label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
  <BiUpload className="h-5 w-5 text-red-500" />
  {image ? image.name : "Upload your image"}
  <input
    type="file"
    accept="image/*"
    hidden
    onChange={(e) => setImage(e.target.files?.[0] || null)}
  />
</label>

        <button onClick={handleSubmit} disabled={submitting} className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400'>{submitting ? "Submitting..." : "Add Profile"}</button>
        </div>    
        </div>
      )
}
  return <div className="space-y-4">
  <div className="mx-auto max-w-md px-4 py-4">
    <div className="rounded-xl bg-white p-4 shadow space-y-3">
    <img
      src={profile.picture}
      className="mx-auto h-24 w-24 rounded-full object-cover"
      alt=""
    />
    <p className="text-center font-semibold">{user?.name}</p>
    <p className="text-center text-sm text-gray-500">
      {profile.phoneNumber}
    </p>

    <div className="flex justify-center gap-2 mt-1">
      <VerificationBadge isVerified={profile.isVerified} size={16} />
      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">
        {profile.isAvailable?"Online":"Offline"}
      </span>
    </div>
    <div>
  <p className="text-blue-400">
    Please be within a 500 m radius of any restaurant (which we call a hotspot) before going online as a rider to receive orders.
  </p>
</div>
{profile.isVerified && !currentOrder &&  (
  <button
    onClick={toggleAvailability}
    disabled={toggling}
    className={`w-full py-2 rounded-lg text-white font-semibold ${
      toggling
        ? "bg-gray-400"
        : profile.isAvailable
        ? "bg-gray-600"
        : "bg-[#e23744]"
    }`}
  >{toggling
  ? "Updating..."
  : profile.isAvailable
  ? "Go Offline"
  : "Go Online"}
  </button>
)}
    </div>
  </div>
      {/* Show this UI ONLY if audio is NOT unlocked */}
    {!audioUnlocked && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔔</span>
        </div>
        <div>
  <p className="font-medium text-blue-900">
    Enable Sound Notification
  </p>
  <p className="text-sm text-blue-700">
    Get Notified when new orders arrive
  </p>
</div>
<button
  onClick={unlockAudio}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
>
  Enable sound
</button>
      </div>
    )}

    {profile.isAvailable && incomingOrders.length > 0 && (
  <div className="mx-auto max-w-md px-4 space-y-3">
    <h3 className="font-semibold text-gray-700">Incoming Orders</h3>

{incomingOrders.map((id) => (
  <RiderOrderRequest
    key={id}
    orderId={id}
    onAccepted={() => {
      fetchProfile();
      fetchCurrentOrder();
    }}
  />
))}
  </div>
)}
{currentOrder && (
  <div className="mx-auto max-w-md px-4 space-y-4">
    <RiderCurrentOrder
      order={currentOrder}
      onStatusUpdate={fetchCurrentOrder}
    />
    <RiderOrderMap order={currentOrder}/>
  </div>
)}
</div>
};

export default RiderDashboard;
```

```diff:Restaurant.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import type { IMenuItem, IRestaurant } from "../types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";

type SellerTab = "menu" | "add-item" | "sales";

const Restaurant = () => {
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/my`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setRestaurant(data.restaurant || null);
      if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.reload();
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  const [menuItems,setMenuItems]=useState<IMenuItem[]>([]);
  const fetchMenuItems = async (restaurantId: string) => {
  try {
    const { data } = await axios.get(
      `${restaurantService}/api/item/all/${restaurantId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    setMenuItems(data);
  } catch (error) {
    console.log(error);
  }
};

useEffect(()=>{
  if(restaurant?._id){
  fetchMenuItems(restaurant._id);
  }
},[restaurant]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 ">Loading your restaurant...</p>
      </div>
    );
  }
  if (!restaurant) {
    return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;
  }
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={true}
      />
  <RestaurantOrders restaurantId={restaurant._id} />
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex border-b">
          {[
            { key: "menu", label: "Menu Items" },
            { key: "add-item", label: "Add Item" },
            { key: "sales", label: "Sales" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as SellerTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === t.key ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        Here's the text from the image:


<div className="p-5">
    {tab === "menu" && <div><MenuItems items={menuItems}
    onItemDeleted={()=>fetchMenuItems(restaurant._id)}
    isSeller={true}
    /></div>}
    {tab === "add-item" && <div><AddMenuItem onItemAdded={() => {
      fetchMenuItems(restaurant._id);
      setTab("menu");
    }} /></div>}
    {tab === "sales" && <p>Sales Page</p>}
</div>

      </div>
    </div>
  );
};

export default Restaurant;
===
import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import type { IMenuItem, IRestaurant } from "../types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";

type SellerTab = "menu" | "add-item" | "sales";

const Restaurant = () => {
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/my`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setRestaurant(data.restaurant || null);
      if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.reload();
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  const [menuItems,setMenuItems]=useState<IMenuItem[]>([]);
  const fetchMenuItems = async (restaurantId: string) => {
  try {
    const { data } = await axios.get(
      `${restaurantService}/api/item/all/${restaurantId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    setMenuItems(data);
  } catch (error) {
    console.log(error);
  }
};

useEffect(()=>{
  if(restaurant?._id){
  fetchMenuItems(restaurant._id);
  }
},[restaurant]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 ">Loading your restaurant...</p>
      </div>
    );
  }
  if (!restaurant) {
    return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;
  }
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={true}
      />
  <RestaurantOrders restaurantId={restaurant._id} />
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex border-b">
          {[
            { key: "menu", label: "Menu Items" },
            { key: "add-item", label: "Add Item" },
            { key: "sales", label: "Sales" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as SellerTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === t.key ? "border-b-2 border-red-500 text-red-500" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

<div className="p-5">
    {tab === "menu" && <div><MenuItems items={menuItems}
    onItemDeleted={()=>fetchMenuItems(restaurant._id)}
    isSeller={true}
    /></div>}
    {tab === "add-item" && <div><AddMenuItem onItemAdded={() => {
      fetchMenuItems(restaurant._id);
      setTab("menu");
    }} /></div>}
    {tab === "sales" && <p>Sales Page</p>}
</div>

      </div>
    </div>
  );
};

export default Restaurant;
```

```diff:cart.ts
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";

export const addToCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const { restaurantId, itemId } = req.body;

if (
  !mongoose.Types.ObjectId.isValid(restaurantId) ||
  !mongoose.Types.ObjectId.isValid(itemId)
) {
  return res.status(400).json({
    message: "Invalid restaurant IDs",
  });
}

const cartFromDifferentRestaurant = await Cart.findOne({
  userId,
  restaurantId: { $ne: restaurantId },
});

if (cartFromDifferentRestaurant) {
  return res.status(400).json({
    message:
      "You can order from only one restaurant at a time. Please clear your cart first to add items from this restaurant.",
  });
}

const cartItem = await Cart.findOneAndUpdate(
  { userId, restaurantId, itemId },
  {
    $inc: { quantity: 1 },
    $setOnInsert: { userId, restaurantId, itemId },
  },
  { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
);

return res.json({
  message: "Item added to cart",
  cart: cartItem,
});
});

export const fetchMyCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const cartItems = await Cart.find({ userId })
    .populate("itemId")
    .populate("restaurantId");

  let subtotal = 0;
  let cartLength = 0;

  for(const cartItem of cartItems){
    const item:any=cartItem.itemId;
    subtotal+=item.price*cartItem.quantity;
    cartLength+=cartItem.quantity;
  }
return res.json({
    success:true,
    cartLength,
    subtotal,
    cart:cartItems,
})
});

export const incrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemId },
      { $inc: { quantity: 1 } },
      { new: true }
    );

    if(!cartItem){
        return res.status(404).json({
            message:"Item not found",
        })
    }
   res.json({
    message:"Quantity increased",
    cartItem,
   })
  }
);
export const decrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOne({userId,itemId});

    if(!cartItem){
        return res.status(404).json({
            message:"Item not found",
        })
    }
    if(cartItem.quantity===1){
        await Cart.deleteOne({userId,itemId});
        res.json({
            message:"Item removed from cart",
        })
    }
   
    cartItem.quantity-=1;
    await cartItem.save();

   res.json({
    message:"Quantity decreased",
    cartItem,
   })
  }
);

export const clearCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  await Cart.deleteMany({ userId });

  res.json({
    message: "Cart cleared successfully",
  });
});
===
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";

export const addToCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const { restaurantId, itemId } = req.body;

if (
  !mongoose.Types.ObjectId.isValid(restaurantId) ||
  !mongoose.Types.ObjectId.isValid(itemId)
) {
  return res.status(400).json({
    message: "Invalid restaurant IDs",
  });
}

const cartFromDifferentRestaurant = await Cart.findOne({
  userId,
  restaurantId: { $ne: restaurantId },
});

if (cartFromDifferentRestaurant) {
  return res.status(400).json({
    message:
      "You can order from only one restaurant at a time. Please clear your cart first to add items from this restaurant.",
  });
}

const cartItem = await Cart.findOneAndUpdate(
  { userId, restaurantId, itemId },
  {
    $inc: { quantity: 1 },
    $setOnInsert: { userId, restaurantId, itemId },
  },
  { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
);

return res.json({
  message: "Item added to cart",
  cart: cartItem,
});
});

export const fetchMyCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const cartItems = await Cart.find({ userId })
    .populate("itemId")
    .populate("restaurantId");

  let subtotal = 0;
  let cartLength = 0;
  const validCartItems = [];

  for(const cartItem of cartItems){
    const item:any=cartItem.itemId;
    if (item && item.price) {
        subtotal+=item.price*cartItem.quantity;
        cartLength+=cartItem.quantity;
        validCartItems.push(cartItem);
    } else {
        // Auto-purge corrupted/orphaned cart entries
        await Cart.findByIdAndDelete(cartItem._id);
    }
  }

  return res.json({
      success:true,
      cartLength,
      subtotal,
      cart:validCartItems,
  })
});

export const incrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemId },
      { $inc: { quantity: 1 } },
      { new: true }
    );

    if(!cartItem){
        return res.status(404).json({
            message:"Item not found",
        })
    }
   res.json({
    message:"Quantity increased",
    cartItem,
   })
  }
);
export const decrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOne({userId,itemId});

    if(!cartItem){
        return res.status(404).json({
            message:"Item not found",
        })
    }
    if(cartItem.quantity===1){
        await Cart.deleteOne({userId,itemId});
        return res.json({
            message:"Item removed from cart",
        })
    }
   
    cartItem.quantity-=1;
    await cartItem.save();

   res.json({
    message:"Quantity decreased",
    cartItem,
   })
  }
);

export const clearCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  await Cart.deleteMany({ userId });

  res.json({
    message: "Cart cleared successfully",
  });
});
```

```diff:order.ts
import { count } from "console";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import axios from "axios";
import { publishEvent } from "../config/order.publisher.js";

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

const { paymentMethod, addressId } = req.body;
if (!addressId) {
  return res.status(400).json({
    message: "Address is required",
  });
}

const address = await Address.findOne({
  _id: addressId,
  userId: user._id,
});

if (!address) {
  return res.status(404).json({
    message: "Address Not found",
  });
}
  // Haversine Formula to calculate distance
  const getDistanceKm = ({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *  // ✅ fixed: lat1 instead of lat2
      Math.cos((lat2 * Math.PI) / 180) *  // ✅ added missing cos(lat2)
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

const cartItems = await Cart.find({ userId: user._id })
  .populate<{itemId:IMenuItem}>("itemId")
  .populate<{restaurantId:IRestaurant}>("restaurantId");

if (cartItems.length === 0) {
  return res.status(400).json({ message: "Cart is empty" });
}

const firstCartItem=cartItems[0];

if(!firstCartItem || !firstCartItem.restaurantId){
    return res.json({
        message:"Invalid Cart Data",
    });
}

const restaurantId=firstCartItem.restaurantId._id;
const restaurant=await Restaurant.findById(restaurantId);

if (!restaurant) {
  return res.status(404).json({
    message: "No restaurant with this id",
  });
}

if (!restaurant.isOpen) {
  return res.status(404).json({
    message: "Sorry this restaurant is closed for now",
  });
}

const distance = getDistanceKm({
  lat1:address.location.coordinates[1],
  lon1:address.location.coordinates[0],
  lat2:restaurant.autoLocation.coordinates[1],
  lon2:restaurant.autoLocation.coordinates[0],
}
);
let subtotal = 0;

// this creates a list with subitems user want's to order
const orderItems = cartItems.map((cart)=>{
  const item = cart.itemId;

  if (!item) {
    throw new Error("Invalid cart item");
  }

  const itemTotal = item.price * cart.quantity;
  subtotal+=itemTotal;
  
  return {
    itemId:item._id.toString(),
    name:item.name,
    price:item.price,
    quantity:cart.quantity,
  }
});
const deliveryFee = subtotal < 250 ? 49 : 0;
const platformFee = 7;
const totalAmount = subtotal + deliveryFee + platformFee;

const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

const [longitude, latitude] = address.location.coordinates;

const riderAmount=Math.ceil(distance)*17;

const order = await Order.create({
  userId: user._id.toString(),
  restaurantId: restaurant._id.toString(),
  restaurantName: restaurant.name,
  distance,
  riderAmount,
  riderId: null,
  items: orderItems,
  subtotal,
  deliveryFee,
  platformFee,
  totalAmount,
  addressId: address._id.toString(),
  deliveryAddress: {
    formattedAddress:address.formattedAddress,
    mobile:address.mobile,
    latitude,
    longitude,
  },
  paymentMethod,
  paymentStatus:"pending",
  status:"placed",
  expiresAt,
});

await Cart.deleteOne({userId:user._id});

res.json({
    message:"Order created Successfully",
    orderId:order._id.toString(),
    amount:totalAmount,
});
});

export const fetchOrderForPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if(order.paymentStatus!=="pending"){
    return res.status(400).json({
        message:"Order already paid",
    })
  }
  res.json({
    orderId:order._id,
    amount:order.totalAmount,
    curreny:"INR",
  }) 

});

export const fetchRestaurantOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { restaurantId } = req.params;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    if (!restaurantId) {
  return res.status(400).json({
    message: "Restaurant id is required",
  });
}

const  limit  = req.query.limit? Number(req.query.limit) : 0;

const orders = await Order.find({
  restaurantId,
  paymentStatus: "paid",
}).sort({ createdAt: -1 })
.limit(limit);

return res.json({
    success:true,
    count:orders.length,
  orders,
})
  }
);

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"] as const;

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { orderId } = req.params;
    const { status } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const order = await Order.findById(orderId);

if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.paymentStatus !== "paid") {
    return res.status(404).json({
    message: "Order not completed",
  });
  }
const restaurant = await Restaurant.findById(order.restaurantId);

if (!restaurant) {
  return res.status(404).json({
    message: "Restaurant not found",
  });
}
// Only the restaurant owner can update the order.
// rbac implementation can be added here in future to allow other users to update order status like riders can update status to delivered and users can cancel the order etc.
if (restaurant.ownerId !== user._id.toString()) {
  return res.status(401).json({
    message: "You are not allowed to update this order",
  });
}

order.status = status;

await order.save();

await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
  event: "order:update",
  // Only this user gets the update (not everyone)
  room: `user:${order.userId}`,
  payload: {
    orderId: order._id,
    status: order.status,
  },
}, {
  headers: {
    "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
  }
}).catch(() => {});

// NOW ASSIGNS RIDER AUTOMATICALLY WHEN ORDER IS READY FOR RIDER TO PICKUP
if (status === "ready_for_rider") {
  console.log(
    "Publishing Order ready for rider event for order",
    order._id
  );
  await publishEvent("ORDER_READY_FOR_RIDER", {
  orderId: order._id.toString(),
  restaurantId: restaurant._id.toString(),
  location: restaurant.autoLocation,
});
console.log("Event Published Successfully");
}



res.json({
  message: "Order status updated successfully",
  order,
})
}
);

export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const orders = await Order.find({
    userId: req.user._id.toString(),
    paymentStatus: "paid",
  }).sort({ createdAt: -1 });

  res.json({ orders });
});

export const fetchSingleOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.userId !== req.user._id.toString()) {
  return res.status(401).json({
    message: "You are not allowed to view this order",
  });
}
res.json({ order });
  }
);

export const assignRiderToOrder = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId, riderName, riderPhone } = req.body;

  const orderAvailable=await Order.findOne({
    riderId,
    status:{$ne:"delivered"},
  }); 
  if(orderAvailable){
    return res.status(400).json({
      message:"You already have an order",
    });
  }

  const order = await Order.findById(orderId);

  if (order?.riderId !== null) {
    return res.status(400).json({
      message: "Order Already taken",
    });
  }
  const orderUpdated = await Order.findOneAndUpdate(
  { _id: orderId, riderId: null },
  {
    riderId,
    riderName,
    riderPhone,
    status: "rider_assigned",
  },
  { returnDocument:'after' }
);
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);

await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);
res.json({
  message: "Rider Assigned Successfully",
  success: true,
  order: orderUpdated,
});
});

export const getCurrentOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (!riderId) {
    return res.status(400).json({
      message: "Rider id is required",
    });
  }
  const order = await Order.findOne({
  riderId,
  status: { $ne: "delivered" },
}).populate("restaurantId");

if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

res.json(order);
});

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.status === "rider_assigned") {
  order.status = "picked_up";

  await order.save();

  
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});

  await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);
return res.json({
  message:"Order Updated Successfully"
})
}

if(order.status=="picked_up"){
   order.status = "delivered";

  await order.save();

  
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});

  await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});
return res.json({
  message:"Order Updated Successfully"
})
}
===
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import axios from "axios";
import { publishEvent } from "../config/order.publisher.js";

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

const { paymentMethod, addressId } = req.body;
if (!addressId) {
  return res.status(400).json({
    message: "Address is required",
  });
}

const address = await Address.findOne({
  _id: addressId,
  userId: user._id,
});

if (!address) {
  return res.status(404).json({
    message: "Address Not found",
  });
}
  // Haversine Formula to calculate distance
  const getDistanceKm = ({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *  // ✅ fixed: lat1 instead of lat2
      Math.cos((lat2 * Math.PI) / 180) *  // ✅ added missing cos(lat2)
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

const cartItems = await Cart.find({ userId: user._id })
  .populate<{itemId:IMenuItem}>("itemId")
  .populate<{restaurantId:IRestaurant}>("restaurantId");

if (cartItems.length === 0) {
  return res.status(400).json({ message: "Cart is empty" });
}

const firstCartItem=cartItems[0];

if(!firstCartItem || !firstCartItem.restaurantId){
    return res.json({
        message:"Invalid Cart Data",
    });
}

const restaurantId=firstCartItem.restaurantId._id;
const restaurant=await Restaurant.findById(restaurantId);

if (!restaurant) {
  return res.status(404).json({
    message: "No restaurant with this id",
  });
}

if (!restaurant.isOpen) {
  return res.status(404).json({
    message: "Sorry this restaurant is closed for now",
  });
}

const distance = getDistanceKm({
  lat1:address.location.coordinates[1],
  lon1:address.location.coordinates[0],
  lat2:restaurant.autoLocation.coordinates[1],
  lon2:restaurant.autoLocation.coordinates[0],
}
);
let subtotal = 0;

// this creates a list with subitems user want's to order
const orderItems = cartItems.map((cart)=>{
  const item = cart.itemId;

  if (!item) {
    throw new Error("Invalid cart item");
  }

  const itemTotal = item.price * cart.quantity;
  subtotal+=itemTotal;
  
  return {
    itemId:item._id.toString(),
    name:item.name,
    price:item.price,
    quantity:cart.quantity,
  }
});
const deliveryFee = subtotal < 250 ? 49 : 0;
const platformFee = 7;
const totalAmount = subtotal + deliveryFee + platformFee;

const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

const [longitude, latitude] = address.location.coordinates;

const riderAmount=Math.ceil(distance)*17;

const order = await Order.create({
  userId: user._id.toString(),
  restaurantId: restaurant._id.toString(),
  restaurantName: restaurant.name,
  distance,
  riderAmount,
  riderId: null,
  items: orderItems,
  subtotal,
  deliveryFee,
  platformFee,
  totalAmount,
  addressId: address._id.toString(),
  deliveryAddress: {
    formattedAddress:address.formattedAddress,
    mobile:address.mobile,
    latitude,
    longitude,
  },
  paymentMethod,
  paymentStatus:"pending",
  status:"placed",
  expiresAt,
});

await Cart.deleteMany({userId:user._id});

res.json({
    message:"Order created Successfully",
    orderId:order._id.toString(),
    amount:totalAmount,
});
});

export const fetchOrderForPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if(order.paymentStatus!=="pending"){
    return res.status(400).json({
        message:"Order already paid",
    })
  }
  res.json({
    orderId:order._id,
    amount:order.totalAmount,
    curreny:"INR",
  }) 

});

export const fetchRestaurantOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { restaurantId } = req.params;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    if (!restaurantId) {
  return res.status(400).json({
    message: "Restaurant id is required",
  });
}

const  limit  = req.query.limit? Number(req.query.limit) : 0;

const orders = await Order.find({
  restaurantId,
  paymentStatus: "paid",
}).sort({ createdAt: -1 })
.limit(limit);

return res.json({
    success:true,
    count:orders.length,
  orders,
})
  }
);

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"] as const;

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { orderId } = req.params;
    const { status } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const order = await Order.findById(orderId);

if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.paymentStatus !== "paid") {
    return res.status(404).json({
    message: "Order not completed",
  });
  }
const restaurant = await Restaurant.findById(order.restaurantId);

if (!restaurant) {
  return res.status(404).json({
    message: "Restaurant not found",
  });
}
// Only the restaurant owner can update the order.
// rbac implementation can be added here in future to allow other users to update order status like riders can update status to delivered and users can cancel the order etc.
if (restaurant.ownerId !== user._id.toString()) {
  return res.status(401).json({
    message: "You are not allowed to update this order",
  });
}

order.status = status;

await order.save();

await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
  event: "order:update",
  // Only this user gets the update (not everyone)
  room: `user:${order.userId}`,
  payload: {
    orderId: order._id,
    status: order.status,
  },
}, {
  headers: {
    "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
  }
}).catch(() => {});

// NOW ASSIGNS RIDER AUTOMATICALLY WHEN ORDER IS READY FOR RIDER TO PICKUP
if (status === "ready_for_rider") {
  console.log(
    "Publishing Order ready for rider event for order",
    order._id
  );
  await publishEvent("ORDER_READY_FOR_RIDER", {
  orderId: order._id.toString(),
  restaurantId: restaurant._id.toString(),
  location: restaurant.autoLocation,
});
console.log("Event Published Successfully");
}



res.json({
  message: "Order status updated successfully",
  order,
})
}
);

export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const orders = await Order.find({
    userId: req.user._id.toString(),
    paymentStatus: "paid",
  }).sort({ createdAt: -1 });

  res.json({ orders });
});

export const fetchSingleOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.userId !== req.user._id.toString()) {
  return res.status(401).json({
    message: "You are not allowed to view this order",
  });
}
res.json({ order });
  }
);

export const assignRiderToOrder = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId, riderName, riderPhone } = req.body;

  const orderAvailable=await Order.findOne({
    riderId,
    status:{$ne:"delivered"},
  }); 
  if(orderAvailable){
    return res.status(400).json({
      message:"You already have an order",
    });
  }

  const order = await Order.findById(orderId);

  if (order?.riderId !== null) {
    return res.status(400).json({
      message: "Order Already taken",
    });
  }
  const orderUpdated = await Order.findOneAndUpdate(
  { _id: orderId, riderId: null },
  {
    riderId,
    riderName,
    riderPhone,
    status: "rider_assigned",
  },
  { returnDocument:'after' }
);
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);

await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);
res.json({
  message: "Rider Assigned Successfully",
  success: true,
  order: orderUpdated,
});
});

export const getCurrentOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (!riderId) {
    return res.status(400).json({
      message: "Rider id is required",
    });
  }
  const order = await Order.findOne({
  riderId,
  status: { $ne: "delivered" },
}).populate("restaurantId");

if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

res.json(order);
});

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
  return res.status(404).json({
    message: "Order not found",
  });
}

if (order.status === "rider_assigned") {
  order.status = "picked_up";

  await order.save();

  
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});

  await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);
return res.json({
  message:"Order Updated Successfully"
})
}

if(order.status=="picked_up"){
   order.status = "delivered";

  await order.save();

  
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `restaurant:${order.restaurantId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});

  await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: order,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
).catch(() => {});
return res.json({
  message:"Order Updated Successfully"
})
}

return res.status(400).json({
  message: "Cannot update order with current status",
});
});
```

---

## Documentation Created
- [PROJECT_ISSUES_AND_FIXES.md](file:///d:/BhookBuster/PROJECT_ISSUES_AND_FIXES.md) — Issues #17 through #26 added
- [INTERVIEW_PREP_FEATURES_LOG.md](file:///d:/BhookBuster/INTERVIEW_PREP_FEATURES_LOG.md) — 8 interview-ready talking points

## Verification
- All fixes are pure code corrections — no new dependencies, no schema changes.
- The restaurant service should be restarted to pick up the backend changes.

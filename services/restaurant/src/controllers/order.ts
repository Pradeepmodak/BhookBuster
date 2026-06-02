import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import axios from "axios";
import { publishEvent } from "../config/order.publisher.js";
import { deleteCache } from "../cache/redis.js";
import mongoose from "mongoose";

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

const { paymentMethod, addressId } = req.body;
if (!["razorpay", "stripe"].includes(paymentMethod)) {
  return res.status(400).json({
    message: "Invalid payment method",
  });
}
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
const customerDeliveryFee = subtotal < 250 ? 49 : 0;
const platformFee = 7;
const totalAmount = subtotal + customerDeliveryFee + platformFee;

const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

const [longitude, latitude] = address.location.coordinates;

const riderAmount=Math.ceil(distance)*17;
const platformSubsidy = Math.max(0, riderAmount - customerDeliveryFee);
const estimatedPlatformRevenue = platformFee + customerDeliveryFee - riderAmount;

const order = await Order.create({
  userId: user._id.toString(),
  restaurantId: restaurant._id.toString(),
  restaurantName: restaurant.name,
  distance,
  riderAmount,
  customerDeliveryFee,
  platformSubsidy,
  estimatedPlatformRevenue,
  riderId: null,
  items: orderItems,
  subtotal,
  deliveryFee: customerDeliveryFee,
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
    currency:"INR",
    userId: order.userId,
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

const restaurant = await Restaurant.findOne({
  _id: restaurantId,
  ownerId: user._id.toString(),
});

if (!restaurant) {
  return res.status(403).json({
    message: "You are not allowed to view these orders",
  });
}

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



  await deleteCache(`restaurant:dashboard:${order.restaurantId}`);

  return res.json({
    message: "Order status updated successfully",
    order,
  });
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

  const { orderId, riderId, riderUserId, riderName, riderPhone } = req.body;

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

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.riderId !== null) {
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
if (!orderUpdated) {
  return res.status(409).json({
    message: "Order already taken",
  });
}
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:rider_assigned",
    room: `user:${order.userId}`,
    payload: orderUpdated,
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
    payload: orderUpdated,
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
    room: `user:${riderUserId}`,
    payload: orderUpdated,
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);

await deleteCache(`restaurant:dashboard:${order.restaurantId}`);

return res.json({
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

  if (typeof riderId !== "string" || !mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({
      message: "Invalid rider id",
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

export const getAvailableOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const maxDistance = Number(req.query.maxDistance || 5000);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({
      message: "latitude and longitude are required",
    });
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const haversineDistanceInMeters = ({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }) => {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const orders = await Order.find({
    paymentStatus: "paid",
    status: "ready_for_rider",
    riderId: null,
  }).select("_id restaurantId");

  const uniqueRestaurantIds = [...new Set(orders.map((order) => order.restaurantId))];
  const restaurants = await Restaurant.find({
    _id: { $in: uniqueRestaurantIds },
  }).select("_id autoLocation");

  const restaurantMap = new Map(
    restaurants.map((restaurant) => [restaurant._id.toString(), restaurant.autoLocation]),
  );

  const availableOrders = orders
    .map((order) => {
      const location = restaurantMap.get(order.restaurantId.toString());
      if (!location?.coordinates) {
        return null;
      }

      const [restaurantLongitude, restaurantLatitude] = location.coordinates;
      const distance = haversineDistanceInMeters({
        lat1: latitude,
        lon1: longitude,
        lat2: restaurantLatitude,
        lon2: restaurantLongitude,
      });

      if (distance > maxDistance) {
        return null;
      }

      return {
        orderId: order._id.toString(),
        restaurantId: order.restaurantId.toString(),
        distance: Math.round(distance),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a?.distance || 0) - (b?.distance || 0));

  res.json({
    count: availableOrders.length,
    orders: availableOrders,
  });
});

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const orderId = typeof req.params.orderId === "string" ? req.params.orderId : null;
  if (!orderId) {
    return res.status(400).json({
      message: "Order id is required",
    });
  }
  const riderId = req.headers["x-rider-id"];

  if (typeof riderId !== "string" || !riderId) {
    return res.status(400).json({
      message: "Rider id is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      message: "Invalid order id",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({
      message: "Invalid rider id",
    });
  }

  const order = await Order.findOne({ _id: orderId, riderId });

  if (!order) {
  return res.status(404).json({
    message: "Assigned order not found",
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
  await deleteCache(`restaurant:dashboard:${order.restaurantId}`);

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
  await deleteCache(`restaurant:dashboard:${order.restaurantId}`);

  return res.json({
    message:"Order Updated Successfully"
  })
}

return res.status(400).json({
  message: "Cannot update order with current status",
});
});
export const getRiderEarningsAnalytics = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { riderId } = req.params;
  if (!riderId) {
    return res.status(400).json({ message: "Rider ID is required" });
  }
  if (!riderId) {
    return res.status(400).json({ message: "Rider ID is required" });
  }

  const analytics = await Order.aggregate([
    {
      $match: {
        riderId: riderId,
        status: "delivered",
        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } // This year only
      }
    },
    {
      $facet: {
        monthlyData: [
          {
            $group: {
              _id: { $month: "$createdAt" },
              earnings: { $sum: "$riderAmount" },
              deliveries: { $sum: 1 }
            }
          },
          { $sort: { "_id": 1 } }
        ],
        overallTotals: [
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: "$riderAmount" },
              totalDeliveries: { $sum: 1 },
              uniqueLocations: { $addToSet: "$deliveryAddress.formattedAddress" }
            }
          }
        ]
      }
    }
  ]);

  if (!analytics || analytics.length === 0 || (!analytics[0].monthlyData.length && !analytics[0].overallTotals.length)) {
    return res.json({ 
      monthlyData: [], 
      totalEarnings: 0, 
      totalDeliveries: 0, 
      uniqueLocationsCount: 0 
    });
  }

  // Format array for Recharts
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedMonthly = analytics[0].monthlyData.map((data: any) => ({
    name: monthNames[data._id - 1],
    earnings: data.earnings,
    deliveries: data.deliveries,
  }));

  const totals = analytics[0].overallTotals[0] || { totalEarnings: 0, totalDeliveries: 0, uniqueLocations: [] };
  
  res.json({
    monthlyData: formattedMonthly,
    totalEarnings: totals.totalEarnings,
    totalDeliveries: totals.totalDeliveries,
    uniqueLocationsCount: totals.uniqueLocations ? totals.uniqueLocations.length : 0,
  });
});

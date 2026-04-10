import axios from "axios";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { getChannel } from "./rabbitmq.js";

// listening to the queue
export const startPaymentConsumer = async () => {
const channel = getChannel();
// Listen to PAYMENT_QUEUE and run this function whenever a message arrives
channel.consume(process.env.PAYMENT_QUEUE!, async (msg) => {
if (!msg) return;
const event = JSON.parse(msg.content.toString());
try {
  if (event.type !== "PAYMENT_SUCCESS") {
  channel.ack(msg);
  return;
}  
const { orderId } = event.data;
const order = await Order.findOneAndUpdate(
    {
  _id: orderId,
  paymentStatus: { $ne: "paid" },
},
{
  $set: {
    paymentStatus: "paid",
    status: "placed",
  },
  $unset:{
    // removes expires at , no longer expiring needed
    expiresAt:1,
  }
},
// hey mongoose return the updated doc
{returnDocument:'after'}
);
// if order is already paid or invalid id then ack it and remove 
// it from queue otherwise it will do infinite retry
if(!order){
    channel.ack(msg);
    return;
}

// Clear user's cart ONLY after payment success
await Cart.deleteMany({ userId: order.userId });
console.log(`✅ Order ${order._id} Placed & Cart Cleared`);

// socket work
await axios.post(
  `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
  {
    event: "order:new",
    room: `restaurant:${order.restaurantId}`,
    payload: {
      orderId: order._id,
    },
  },
  {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  }
);

channel.ack(msg);
} catch (error:any) {
    console.log("❌ Payment consumer error :",error);
}

});
}
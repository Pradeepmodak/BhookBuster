import Order from "../models/Order.js";
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
{new :true}
);
// if order is already paid or invalid id then ack it and remove 
// it from queue otherwise it will do infinite retry
if(!order){
    channel.ack(msg);
    return;
}
console.log("✅Order Placed: ",order._id)
} catch (error:any) {
    console.log("❌ Payment consumer error :",error);
}

});
}
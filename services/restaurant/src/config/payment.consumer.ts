// HTTP client for inter-service communication (e.g., notifying the Realtime Service)
import axios from "axios";

// Mongoose models for atomic updates and interactions with the MongoDB database
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import UserFoodEvent from "../models/UserFoodEvent.js";

// Utility to retrieve the active RabbitMQ multiplexed channel
import { getChannel } from "./rabbitmq.js";

// Publisher utility to emit secondary events to downstream message queues
import { publishUserFoodEvent } from "./userEvents.publisher.js";

// Redis utility for cache invalidation to keep live dashboard data in sync
import { deleteCache } from "../cache/redis.js";

/**
 * Initializes the RabbitMQ consumer to listen for payment events.
 * This acts as a background worker, processing payment successes asynchronously 
 * to decouple heavy operations (DB updates, cache invalidation, socket events) 
 * from the main HTTP request flow.
 */
export const startPaymentConsumer = async () => {
  // Retrieve the multiplexed RabbitMQ channel
  const channel = getChannel();
  
  if (!channel) {
    console.warn("Payment consumer skipped: RabbitMQ is offline.");
    return;
  }

  // Register an asynchronous event listener on the PAYMENT_QUEUE.
  // RabbitMQ will push messages to this callback as soon as they arrive on the queue.
  channel.consume(process.env.PAYMENT_QUEUE!, async (msg) => {
    if (!msg) return;
    
    // Convert the raw binary buffer payload back into a parsed JSON object
    const event = JSON.parse(msg.content.toString());
    
    try {
      // Message Envelope Pattern: We use the 'type' discriminator to filter events.
      // If it isn't a PAYMENT_SUCCESS, we simply acknowledge it (discard it) and return.
      if (event.type !== "PAYMENT_SUCCESS") {
        channel.ack(msg);
        return;
      }  
      
      const { orderId } = event.data;
      
      // Atomically update the order status.
      // The condition `paymentStatus: { $ne: "paid" }` ensures IDEMPOTENCY.
      // If the message is accidentally delivered twice, we won't process it twice.
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
            // Remove the TTL (Time-To-Live) expiration field since the order is now finalized
            expiresAt: 1,
          }
        },
        // Instruct Mongoose to return the updated document rather than the old one
        { returnDocument: 'after' }
      );

      // If the order wasn't found (or was already marked paid), acknowledge the message
      // to remove it from the queue. Otherwise, RabbitMQ will trap us in an infinite retry loop!
      if (!order) {
        channel.ack(msg);
        return;
      }

      // Clear user's cart ONLY after payment success is confirmed
      await Cart.deleteMany({ userId: order.userId });
      
      // Log an analytics/audit event for user ordering behavior
      await UserFoodEvent.create({
        userId: order.userId,
        eventType: "orderPaid",
        restaurantId: order.restaurantId,
        metadata: {
          orderId: order._id.toString(),
        },
      });
      
      // Publish the event to another topic/queue for downstream analytics processing
      await publishUserFoodEvent({
        userId: order.userId,
        eventType: "orderPaid",
        restaurantId: order.restaurantId,
        metadata: {
          orderId: order._id.toString(),
        },
      });
      
      console.log(`✅ Order ${order._id} Placed & Cart Cleared`);

      // Invalidate the restaurant dashboard cache to ensure live data accuracy
      await deleteCache(`restaurant:dashboard:${order.restaurantId}`);

      // Internal Microservice Communication: Notify the Realtime Service via HTTP.
      // This tells the Realtime service to emit a WebSocket event to the restaurant's live dashboard.
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
      ).catch(() => {
        // Silently swallow realtime notification errors so they don't block the message acknowledgement.
        // A failed notification shouldn't crash the entire background job.
      });

      // Acknowledge the message to RabbitMQ, marking it as permanently processed.
      channel.ack(msg);
      
    } catch (error: any) {
      console.log("❌ Payment consumer error :", error);
      // In a production system, you might intentionally NOT ack() here so the message is re-queued, 
      // or you might route it to a Dead Letter Queue (DLQ) after X retries.
    }
  });
};

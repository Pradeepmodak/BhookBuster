import { getChannel } from "./rabbitmq.js";

/**
 * Publishes a 'PAYMENT_SUCCESS' event to the RabbitMQ message broker.
 * This asynchronously decouples the payment gateway logic from post-payment actions (like updating order status).
 * 
 * @param {Object} payload - The core data required for processing the successful payment downstream.
 * @param {string} payload.orderId - The internal ID of the order that was paid for.
 * @param {string} payload.paymentId - The transaction ID returned by the payment provider.
 * @param {"razorpay" | "stripe"} payload.provider - The payment gateway that was used.
 */
export const publishPaymentSuccess = async (payload: {
  orderId: string;
  paymentId: string;
  provider: "razorpay" | "stripe";
}) => {
  // Retrieve the active RabbitMQ communication channel (the "pipe")
  const channel = getChannel();
  
  if (!channel) {
    console.error("❌ Cannot publish payment success event: RabbitMQ channel is offline.");
    return;
  }

  // Push the message into the specified RabbitMQ queue
  channel.sendToQueue(
    // The non-null assertion operator (!) guarantees to TypeScript that this environment variable is defined
    process.env.PAYMENT_QUEUE!,
    
    // RabbitMQ transmits data over the network as binary Buffers.
    // We must first stringify our JSON object, and then convert that string into a Buffer.
    Buffer.from(
      JSON.stringify({
        type: "PAYMENT_SUCCESS",
        data: payload,
      })
    ),
    
    // Message options: `persistent: true` ensures the message is written to disk by RabbitMQ.
    // This guarantees the message won't be lost even if the RabbitMQ broker crashes or restarts.
    { persistent: true }
  );
};
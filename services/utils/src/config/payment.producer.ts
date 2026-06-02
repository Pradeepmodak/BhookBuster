import { getChannel } from "./rabbitmq.js";

// payload --> actual data we are sending
export const publishPaymentSuccess = async (payload: {
  orderId: string;
  paymentId: string;
  provider: "razorpay" | "stripe";
}) => {
    // communication pipe 
  const channel = getChannel();
  if (!channel) {
    console.error("❌ Cannot publish payment success event: RabbitMQ channel is offline.");
    return;
  }

  //send a message into the queue
  channel.sendToQueue(
    // guranteed its not undefined - typescript format
    process.env.PAYMENT_QUEUE!,
    // buffer = binary data . which rabbitmq accepts 
    Buffer.from(
        // conversion to string vcoz buffer only accepts string
      JSON.stringify({
        type: "PAYMENT_SUCCESS",
        data: payload,
      })
    ),
    // don't loose the messsage even if rabbit mq crashes
    { persistent: true }
  );
};
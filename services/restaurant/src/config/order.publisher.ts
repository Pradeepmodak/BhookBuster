import { getChannel } from "./rabbitmq.js";

export const publishEvent = async (type: string, data: any) => {
    // gets RabbitMQ channel
    const channel = getChannel();
    if (!channel) {
        console.error("❌ Cannot publish order event: RabbitMQ channel is offline.");
        return;
    }

    // sends message to a queue
  channel.sendToQueue(
    // queue name
    process.env.ORDER_READY_QUEUE!,
    // converts data to buffer (required format)
    Buffer.from(JSON.stringify({ type, data })),
    // ensures message is not lost if server crashes
    { persistent: true }
  );
};
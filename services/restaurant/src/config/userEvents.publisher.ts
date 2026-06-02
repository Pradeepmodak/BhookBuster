import { getChannel } from "./rabbitmq.js";

export type UserEventPayload = {
  userId: string;
  eventType: string;
  itemId?: string;
  restaurantId?: string;
  query?: string;
  ratingValue?: number;
  metadata?: Record<string, unknown>;
};

export const publishUserFoodEvent = async (event: UserEventPayload) => {
  const queue = process.env.USER_EVENT_QUEUE;
  const channel = getChannel();

  if (!queue || !channel) {
    return;
  }

  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(event)), {
    persistent: true,
  });
};


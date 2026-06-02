import amqp from "amqplib";

let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    channel = await connection.createChannel();

    await channel.assertQueue(process.env.RIDER_QUEUE!, {
      durable: true,
    });
    await channel.assertQueue(process.env.ORDER_READY_QUEUE!, {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq(rider service)");
  } catch (error: any) {
    console.warn("🐇 RabbitMQ connection failed for rider service, continuing without queues:", error.message);
    channel = null;
  }
};

export const getChannel = () => channel;

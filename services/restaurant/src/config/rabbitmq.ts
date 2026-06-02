import amqp from "amqplib";
let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);
        channel = await connection.createChannel();
        await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
            durable: true,
        });
        await channel.assertQueue(process.env.RIDER_QUEUE!, {
            durable: true,  // QUEUE WILL SURVIVE SERVER RESTART
        });
        if (process.env.USER_EVENT_QUEUE) {
            await channel.assertQueue(process.env.USER_EVENT_QUEUE, {
                durable: true,
            });
        }
        console.log("connected To Rabbitmq(restaurant service)");
    } catch (error: any) {
        console.warn("🐇 RabbitMQ connection failed for restaurant service, continuing without queues:", error.message);
        channel = null;
    }
};

export const getChannel = () => channel;

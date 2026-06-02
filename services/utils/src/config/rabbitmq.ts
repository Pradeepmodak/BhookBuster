import amqp from "amqplib";
let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);
        channel = await connection.createChannel();
        await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
            durable: true,
        });
        console.log("connected To Rabbitmq");
    } catch (error: any) {
        console.warn("🐇 RabbitMQ connection failed for utils service, continuing without queues:", error.message);
        channel = null;
    }
};

export const getChannel = () => channel;
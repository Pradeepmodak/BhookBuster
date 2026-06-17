// The amqplib library is the standard Node.js client for interacting with RabbitMQ over the AMQP protocol
import amqp from "amqplib";

// Global singleton instance of the RabbitMQ channel. 
// A channel is a virtual connection inside the main TCP connection, which makes it lightweight and efficient.
let channel: amqp.Channel | null = null;

/**
 * Establishes a connection to the RabbitMQ message broker and initializes the required queues.
 * This should typically be called once during the server startup.
 */
export const connectRabbitMQ = async () => {
    try {
        // 1. Establish the main TCP connection to the RabbitMQ server
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);
        
        // 2. Open a multiplexed "channel" over the single TCP connection
        channel = await connection.createChannel();
        
        // 3. Declare (assert) the queue. If it doesn't exist, RabbitMQ creates it.
        // `durable: true` ensures the queue metadata itself survives a RabbitMQ broker restart.
        await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
            durable: true,
        });
        
        console.log("✅ Connected To Rabbitmq");
    } catch (error: any) {
        // If RabbitMQ is down, we don't crash the entire Node.js process.
        // Instead, we log a warning and let the application continue without queue functionality.
        // This is a resilience/fault-tolerance pattern (graceful degradation).
        console.warn("🐇 RabbitMQ connection failed for utils service, continuing without queues:", error.message);
        channel = null;
    }
};

/**
 * Getter function to retrieve the active RabbitMQ channel.
 * This is used by other files (like the producer) to send messages into the queue.
 * @returns {amqp.Channel | null} The active channel, or null if the connection failed.
 */
export const getChannel = () => channel;
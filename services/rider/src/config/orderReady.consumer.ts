import axios from "axios";
import { Rider } from "../models/Rider.js";
import { getChannel } from "./rabbitmq.js";

// This is a RabbitMQ consumer that listens for “order ready”
//  events and notifies nearby riders
export const startOrderReadyConsumer = async () => {
    const channel = getChannel();
    if (!channel) {
        console.warn("OrderReady consumer skipped: RabbitMQ is offline.");
        return;
    }

    console.log("Starting to consume from:", process.env.ORDER_READY_QUEUE);
// start listening for messages
    channel.consume(process.env.ORDER_READY_QUEUE!, async (msg) => {

        try {
            console.log("Recieved Message", msg!.content.toString());

            const event = JSON.parse(msg!.content.toString());

            console.log("event type:", event.type);

            if (event.type !== "ORDER_READY_FOR_RIDER") {
                console.log("skipping non-order-ready-for-rider event");
                channel.ack(msg!);
                return;
            }
            const { orderId, restaurantId, location } = event.data;

            console.log("Searching for riders near:", JSON.stringify(location?.coordinates));

            const riders = await Rider.find({
                isAvailable: true,
                isVerified: true,
                location: {
                    $near: {
                        $geometry: location,
                        $maxDistance: 5000, // 5km radius
                    },
                },
            })

            console.log(`Found ${riders.length} nearby verified & online riders`);

            if (riders.length === 0) {
  console.log("No riders available nearby — ensure riders are verified, online, and within 5km");
  channel.ack(msg!);
  return;
}

for (const rider of riders) {
  console.log(`Notifying rider userId: ${rider.userId}`);

  try {
    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,{
    event:"order:available",
    room:`user:${rider.userId}`,
    payload:{orderId,restaurantId},    
    },{
    headers:{
        "x-internal-key":process.env.INTERNAL_SERVICE_KEY,
    }
    });
    console.log(`Notified Rider ${rider.userId} successfully`);
  } catch (error) {
    console.log(`Failed to notify rider ${rider.userId}`);
  }
}
channel.ack(msg!);
console.log("Message acknowledge");
        } catch (error) {
            console.log("OrderReady consumer error :",error);
         }

    });
};
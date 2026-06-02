import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://pminsights:pminsights@cluster0.ruitbsk.mongodb.net/BhookBuster?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "BhookBuster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    const db = client.db(DB_NAME);

    const restaurantsCollection = db.collection("restaurants");
    const ridersCollection = db.collection("riders");

    const restaurants = await restaurantsCollection.find({}).toArray();
    console.log(`\n--- Restaurants found: ${restaurants.length} ---`);
    restaurants.forEach((r, i) => {
      console.log(`${i + 1}. Name: ${r.name} | isVerified: ${r.isVerified} (${typeof r.isVerified}) | Owner: ${r.ownerId}`);
    });

    const riders = await ridersCollection.find({}).toArray();
    console.log(`\n--- Riders found: ${riders.length} ---`);
    riders.forEach((r, i) => {
      console.log(`${i + 1}. Picture: ${r.picture ? "Exists" : "None"} | isVerified: ${r.isVerified} (${typeof r.isVerified}) | User: ${r.userId}`);
    });

  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await client.close();
  }
}

run();

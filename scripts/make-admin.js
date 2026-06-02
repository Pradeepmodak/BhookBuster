import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://pminsights:pminsights@cluster0.ruitbsk.mongodb.net/BhookBuster?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "BhookBuster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");

    const users = await usersCollection.find({}).toArray();
    if (users.length === 0) {
      console.log("No users found in the database. Please sign in via Google Auth first on the frontend.");
      return;
    }

    console.log("\n--- Current Users in Database ---");
    users.forEach((u, i) => {
      console.log(`${i + 1}. Name: ${u.name} | Email: ${u.email} | Role: ${u.role || "null"}`);
    });

    console.log("\nUpdating all users in database to role: 'admin' to bypass 403 Forbidden during testing...");
    const result = await usersCollection.updateMany({}, { $set: { role: "admin" } });
    console.log(`Successfully updated ${result.modifiedCount} user(s) to 'admin'!`);

    console.log("\nPlease log out and log back in on the web frontend to refresh your JWT token with the admin role!");

  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await client.close();
  }
}

run();

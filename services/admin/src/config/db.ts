import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
let client: MongoClient;
let db: Db;

export const connectDb = async (): Promise<Db> => {
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  db = client.db(process.env.DB_NAME || "BhookBuster");
  console.log("Admin service connected to mongodb");
  return db;
}

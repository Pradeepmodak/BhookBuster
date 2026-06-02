import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
console.log("=== Gemini API Key Diagnostic ===");
console.log("Loaded API Key prefix:", apiKey ? apiKey.substring(0, 8) + "..." : "NONE");
console.log("Loaded API Key length:", apiKey ? apiKey.length : 0);

if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY, GOOGLE_AI_API_KEY, or GOOGLE_API_KEY is not defined in services/ai-gateway/.env");
  process.exit(1);
}

try {
  console.log("\nAttempting to connect to Gemini API using model 'gemini-2.5-flash'...");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const response = await model.generateContent("Hello, respond with the word SUCCESS.");
  console.log("\n✅ Success! Gemini API responded successfully.");
  console.log("Response text:", response.response.text().trim());
} catch (error) {
  console.error("\n❌ Error connecting to Gemini API:");
  console.error(error);
}

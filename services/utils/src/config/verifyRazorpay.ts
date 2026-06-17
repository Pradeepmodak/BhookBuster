// Built-in Node.js module used for cryptographic functions, like generating HMAC hashes
import crypto from "crypto";

/**
 * Verifies the authenticity of a Razorpay webhook/payment by checking its signature.
 * It regenerates the HMAC SHA256 signature using the order ID and payment ID 
 * along with the Razorpay secret, and compares it against the received signature.
 * 
 * @param {string} orderId - The Razorpay order ID.
 * @param {string} paymentId - The Razorpay payment ID.
 * @param {string} signature - The signature sent by Razorpay in the request.
 * @returns {boolean} - Returns true if the signature is valid, false otherwise.
 */
export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  // Razorpay expects the payload to be formatted strictly as "order_id|payment_id"
  const body = `${orderId}|${paymentId}`;
  
  // Generate the HMAC SHA256 hash using the body and the Razorpay key secret
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  // Securely compare the expected signature with the actual signature from the request
  return expectedSignature === signature;
}
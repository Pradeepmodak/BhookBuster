import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const signBody = (rawBody: Buffer, secret: string) =>
  crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

const signaturesMatch = (expected: string, provided: string) => {
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

export const serviceAuth = (
  req: any,
  res: any,
  next: any
) => {
  const secret = process.env.GATEWAY_HMAC_SECRET;
  const signature = req.get("X-Service-Signature");

  if (!secret || !signature || !req.rawBody) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const expected = signBody(req.rawBody, secret);

  try {
    if (!signaturesMatch(expected, signature)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};


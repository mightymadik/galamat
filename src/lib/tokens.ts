import crypto from "crypto";

export function createRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  const salt = process.env.REFRESH_TOKEN_SALT || "change_me";
  return crypto.createHash("sha256").update(`${token}:${salt}`).digest("hex");
}

export function createAccessToken(payload: {
  sub: number;
  role?: string;
  /** Strapi documentId — используется queue-backend как userId менеджера */
  documentId?: string;
}) {
  // npm i jsonwebtoken
  const jwt = require("jsonwebtoken");
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): { sub: number; role?: string; documentId?: string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require("jsonwebtoken");
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw new Error("ACCESS_TOKEN_SECRET missing");
    return jwt.verify(token, secret) as any;
  } catch {
    return null;
  }
}
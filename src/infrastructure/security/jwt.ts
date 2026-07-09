import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "surgisense_super_secret_jwt_key_2026_secured";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "surgisense_super_secret_refresh_jwt_key_2026_secured";

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

export class TokenService {
  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  }

  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  public static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  }
}

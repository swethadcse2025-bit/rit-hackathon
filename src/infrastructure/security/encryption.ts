import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY || "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914df4e";
const KEY = Buffer.from(KEY_HEX, "hex");

export class EncryptionService {
  public static encrypt(text: string): string {
    if (!text) return "";
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  public static decrypt(cipherText: string): string {
    if (!cipherText) return "";
    try {
      const parts = cipherText.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid cipher text format");
      }
      
      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    } catch (error: any) {
      console.error("Decryption failed:", error.message);
      // Return raw string if it wasn't encrypted (e.g. for fallback/test migrations)
      return cipherText;
    }
  }
}

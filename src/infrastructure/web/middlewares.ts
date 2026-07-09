import { Request, Response, NextFunction } from "express";
import { TokenService, TokenPayload } from "../security/jwt";
import { logger } from "../logging/logger";
import { rateLimit } from "express-rate-limit";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// 1. JWT Authentication Middleware
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "Bearer token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = TokenService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.warn("JWT verification failed", { error: error.message });
    return res.status(401).json({ error: "Unauthorized", message: "Token is invalid or expired" });
  }
};

// 2. Role-Based Access Control (RBAC) Middleware
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "User credentials not found" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`RBAC violation: user ${req.user.userId} with role ${req.user.role} attempted to access restricted resource`, {
        path: req.path,
        allowedRoles
      });
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You do not have permission to perform this action" 
      });
    }

    next();
  };
};

// 3. Centralized Error Handling Middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled API Error", { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : "Bad Request",
    message: err.message || "An unexpected error occurred."
  });
};

// 4. Rate Limiter configurations
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per windowMs
  message: {
    error: "Too Many Requests",
    message: "Too many login/registration attempts from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: {
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please try again in a minute."
  },
  standardHeaders: true,
  legacyHeaders: false
});

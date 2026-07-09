import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import { prismaClient } from "./infrastructure/db/client";
import { logger } from "./infrastructure/logging/logger";
import { errorHandler, apiRateLimiter } from "./infrastructure/web/middlewares";
import { createRouter } from "./infrastructure/web/routes";
import { SurgiSenseService } from "./application/services/surgisense-service";
import {
  PrismaUserRepository,
  PrismaPatientRepository,
  PrismaDoctorRepository,
  PrismaRecoveryPassportRepository,
  PrismaRecoveryTwinRepository,
  PrismaDoctorFeedbackRepository,
  PrismaTaskRepository,
  PrismaAuditLogRepository,
  PrismaConsentRepository,
  PrismaBlockchainRecordRepository,
  PrismaClinicalMemoryRepository,
  PrismaDocumentRepository,
  PrismaImageRepository,
  PrismaSessionRepository,
  PrismaDeviceRepository,
  PrismaNotificationRepository,
  PrismaAppointmentRepository
} from "./infrastructure/db/prisma-repositories";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Request parsing middleware
app.use(helmet());
app.use(cors({ origin: "*" })); // Configure strictly in production environments
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter globally to all API routes
app.use("/api", apiRateLimiter);

// 1. Dependency Injection setup
const userRepo = new PrismaUserRepository(prismaClient);
const patientRepo = new PrismaPatientRepository(prismaClient);
const doctorRepo = new PrismaDoctorRepository(prismaClient);
const passportRepo = new PrismaRecoveryPassportRepository(prismaClient);
const twinRepo = new PrismaRecoveryTwinRepository(prismaClient);
const feedbackRepo = new PrismaDoctorFeedbackRepository(prismaClient);
const taskRepo = new PrismaTaskRepository(prismaClient);
const auditRepo = new PrismaAuditLogRepository(prismaClient);
const consentRepo = new PrismaConsentRepository(prismaClient);
const blockchainRepo = new PrismaBlockchainRecordRepository(prismaClient);
const memoryRepo = new PrismaClinicalMemoryRepository(prismaClient);
const docRepo = new PrismaDocumentRepository(prismaClient);
const imgRepo = new PrismaImageRepository(prismaClient);
const sessionRepo = new PrismaSessionRepository(prismaClient);
const deviceRepo = new PrismaDeviceRepository(prismaClient);
const notifRepo = new PrismaNotificationRepository(prismaClient);
const appointmentRepo = new PrismaAppointmentRepository(prismaClient);

const service = new SurgiSenseService(
  userRepo,
  patientRepo,
  doctorRepo,
  passportRepo,
  twinRepo,
  feedbackRepo,
  taskRepo,
  auditRepo,
  consentRepo,
  blockchainRepo,
  memoryRepo,
  docRepo,
  imgRepo,
  sessionRepo,
  deviceRepo,
  notifRepo,
  appointmentRepo
);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Basic DB check
    await prismaClient.$queryRaw`SELECT 1`;
    res.json({ status: "healthy", database: "connected", timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ status: "unhealthy", database: "error", error: err.message });
  }
});

// Serve uploaded assets securely
app.use("/uploads", express.static("uploads"));

// 2. Mount API Routes
app.use("/api/v1", createRouter(service));

// 3. 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: `Cannot ${req.method} ${req.path}` });
});

// 4. Centralized Error Filter
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`SurgiSense AI Backend initialized successfully and listening on port ${PORT}`);
});

export { app, server };

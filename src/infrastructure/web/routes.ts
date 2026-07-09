import { Router, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { SurgiSenseService } from "../../application/services/surgisense-service";
import { authMiddleware, requireRoles, AuthenticatedRequest, authRateLimiter, apiRateLimiter } from "./middlewares";
import { UserRole } from "../../domain/auth/user";

export function createRouter(service: SurgiSenseService): Router {
  const router = Router();

  // Setup Multer for secure uploads in the workspace
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`)
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf", "text/plain"];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file format. Allowed: PNG, JPEG, PDF, TXT."));
      }
    }
  });

  // Helper function to extract IP address
  const getIp = (req: AuthenticatedRequest): string => {
    return (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  };

  // Helper to sanitize passport for patients (removing doctor-only data)
  const sanitizePassportForPatient = (passport: any) => {
    if (!passport) return null;
    const versions = passport.versions.map((v: any) => {
      const copy = { ...v.props, id: v.id };
      // Delete doctor-only clinical explainability fields
      delete copy.doctorDecisions;
      delete copy.interventions;
      delete copy.evidenceSnapshot;
      return copy;
    });
    return {
      id: passport.id,
      patientId: passport.patientId,
      currentRecoveryScore: passport.currentRecoveryScore,
      status: passport.status,
      createdAt: passport.createdAt,
      updatedAt: passport.updatedAt,
      versions
    };
  };

  // ==========================================
  // 1. AUTHENTICATION APIs
  // ==========================================

  router.post("/auth/register", authRateLimiter, async (req, res, next) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum([UserRole.PATIENT, UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN]),
        name: z.string().min(1),
        // Patient only props
        age: z.number().int().optional(),
        gender: z.string().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        procedure: z.string().optional(),
        hospital: z.string().optional(),
        surgeon: z.string().optional(),
        comorbidities: z.array(z.string()).optional(),
        emergencyContact: z.object({ name: z.string(), relationship: z.string(), phone: z.string() }).optional(),
        consentGranted: z.boolean().optional(),
        consentType: z.string().optional(),
        // Doctor only props
        specialty: z.string().optional(),
        licenseNumber: z.string().optional()
      });

      const data = schema.parse(req.body);
      const result = await service.registerUser(data, getIp(req));
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/login", authRateLimiter, async (req, res, next) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string()
      });
      const data = schema.parse(req.body);
      const result = await service.loginUser(data, getIp(req));
      return res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/refresh", async (req, res, next) => {
    try {
      const schema = z.object({
        refreshToken: z.string()
      });
      const data = schema.parse(req.body);
      const result = await service.refreshUserToken(data.refreshToken, getIp(req));
      return res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Verify Email API
  router.post("/auth/verify-email", async (req, res, next) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Verification token is required" });
      await service.verifyEmail(token, getIp(req));
      return res.json({ message: "Email verified successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Request password reset link (token) API
  router.post("/auth/request-password-reset", async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });
      const resetToken = await service.requestPasswordReset(email, getIp(req));
      return res.json({ message: "Password reset token generated successfully", resetToken });
    } catch (err) {
      next(err);
    }
  });

  // Reset Password API
  router.post("/auth/reset-password", async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ error: "Token and newPassword are required" });
      await service.resetPassword(token, newPassword, getIp(req));
      return res.json({ message: "Password reset successfully" });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 2. PATIENT PROFILE & TASKS APIs
  // ==========================================

  // Create patient tasks (Doctor or Patient himself)
  router.post("/tasks/create", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const schema = z.object({
        patientId: z.string(),
        name: z.string(),
        type: z.enum(["MEDICATION", "WALKING", "HYDRATION", "EXERCISE", "IMAGE_UPLOAD", "APPOINTMENT"]),
        description: z.string(),
        schedule: z.string(),
        reminders: z.array(z.object({ time: z.string() })).optional()
      });
      const data = schema.parse(req.body);
      const task = await service.createPatientTask(
        data.patientId,
        data.name,
        data.type,
        data.description,
        data.schedule,
        data.reminders || []
      );
      return res.status(201).json({ id: task.id, ...task.props });
    } catch (err) {
      next(err);
    }
  });

  // Get patient tasks list
  router.get("/tasks", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.query.patientId as string;
      if (!patientId) return res.status(400).json({ error: "patientId is required" });
      
      const tasks = await service.getPatientTasks(patientId);
      return res.json(tasks.map(t => ({ ...t.props, id: t.id })));
    } catch (err) {
      next(err);
    }
  });

  // Complete task check-in
  router.post("/tasks/:id/complete", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const schema = z.object({
        adhered: z.boolean()
      });
      const { adhered } = schema.parse(req.body);
      const result = await service.logTaskCompletion(req.params.id, new Date(), adhered, getIp(req));
      return res.json({ message: "Task completion logged successfully", task: { ...result.props, id: result.id } });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 3. FILE UPLOADS & IMAGES APIs
  // ==========================================

  // Upload wound image (Patient role)
  router.post("/passport/image", authMiddleware, requireRoles([UserRole.PATIENT]), upload.single("image"), async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) throw new Error("No image file provided");
      const { patientId } = req.body;
      if (!patientId) throw new Error("patientId is required");

      const img = await service.uploadWoundImage(
        patientId,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        getIp(req)
      );

      return res.status(201).json({ message: "Wound image uploaded and compressed successfully", image: img });
    } catch (err) {
      next(err);
    }
  });

  // Upload clinical document (Patient role)
  router.post("/passport/document", authMiddleware, requireRoles([UserRole.PATIENT]), upload.single("document"), async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) throw new Error("No document file provided");
      const { patientId, type } = req.body;
      if (!patientId || !type) throw new Error("patientId and type are required");

      const result = await service.uploadMedicalDocument(
        patientId,
        req.file.originalname,
        type,
        req.file.path,
        req.file.size,
        getIp(req)
      );

      return res.status(201).json({
        message: "Clinical document uploaded and structures extracted into Memory",
        document: result.document,
        clinicalMemory: result.structuredMemory
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 4. RECOVERY PASSPORT & VERSION APIs
  // ==========================================

  // Evolve Passport (Trigger AI prediction engine loop)
  router.post("/passport/evolve", authMiddleware, requireRoles([UserRole.PATIENT]), apiRateLimiter, async (req: AuthenticatedRequest, res, next) => {
    try {
      const schema = z.object({
        patientId: z.string(),
        imageId: z.string().nullable(),
        painLevel: z.number().int().min(0).max(10),
        doctorNotes: z.string().default("Daily checkup log")
      });

      const data = schema.parse(req.body);
      const result = await service.evolveRecoveryPassport(
        data.patientId,
        data.imageId,
        data.painLevel,
        data.doctorNotes,
        getIp(req)
      );

      // Return results. Note: Clean version output is done inside passport fetch
      return res.status(201).json({
        message: "Recovery passport evolved to new version successfully.",
        passportId: result.passport.id,
        currentRecoveryScore: result.passport.currentRecoveryScore,
        status: result.passport.status,
        version: {
          id: result.latestVersion.id,
          versionNumber: result.latestVersion.versionNumber,
          recoveryScore: result.latestVersion.recoveryScore,
          aiSummary: result.latestVersion.aiSummary,
          healingScore: result.latestVersion.healingScore,
          painLevel: result.latestVersion.painLevel
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Fetch complete Passport single source of truth details
  router.get("/passport/detail", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.query.patientId as string;
      if (!patientId) return res.status(400).json({ error: "patientId is required" });

      const passport = await service.getPatientPassport(patientId);
      if (!passport) return res.status(404).json({ error: "Passport not found" });

      // Clean check: never expose doctor feedback loops and intervention explainability details to patients
      if (req.user?.role === UserRole.PATIENT) {
        return res.json(sanitizePassportForPatient(passport));
      }

      // If Doctor or Admin: return the full unredacted aggregate details
      const unredactedVersions = passport.versions.map((v: any) => ({
        ...v.props,
        id: v.id
      }));

      return res.json({
        id: passport.id,
        patientId: passport.patientId,
        currentRecoveryScore: passport.currentRecoveryScore,
        status: passport.status,
        createdAt: passport.createdAt,
        updatedAt: passport.updatedAt,
        versions: unredactedVersions
      });
    } catch (err) {
      next(err);
    }
  });

  // Clinical Replay timeline story
  router.get("/passport/clinical-replay", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.query.patientId as string;
      if (!patientId) return res.status(400).json({ error: "patientId is required" });

      const replay = await service.getClinicalReplay(patientId);
      return res.json(replay);
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 5. DOCTOR DASHBOARD & FEEDBACK LOOP APIs
  // ==========================================

  // Submit doctor feedback loop modifications for AI training metadata
  router.post("/doctor/feedback", authMiddleware, requireRoles([UserRole.DOCTOR]), async (req: AuthenticatedRequest, res, next) => {
    try {
      const schema = z.object({
        doctorId: z.string(),
        passportId: z.string(),
        recommendationId: z.string(),
        action: z.enum(["ACCEPT", "MODIFY", "REJECT"]),
        modifiedRecommendation: z.string().optional(),
        reason: z.string(),
        outcome: z.string().optional()
      });

      const data = schema.parse(req.body);
      const feedback = await service.submitDoctorFeedback(data, getIp(req));
      return res.status(201).json({
        message: "Doctor decision logged successfully and blockchain anchor updated",
        feedback: { ...feedback.props, id: feedback.id }
      });
    } catch (err) {
      next(err);
    }
  });

  // Doctor Patient List Dashboard
  router.get("/doctor/dashboard", authMiddleware, requireRoles([UserRole.DOCTOR]), async (req: AuthenticatedRequest, res, next) => {
    try {
      const doctorId = req.query.doctorId as string;
      if (!doctorId) return res.status(400).json({ error: "doctorId is required" });

      const dashboard = await service.getDoctorDashboard(doctorId);
      return res.json(dashboard);
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 6. HOSPITAL ANALYTICS & AUDIT SYSTEM
  // ==========================================

  router.get("/analytics/hospital", authMiddleware, requireRoles([UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
    try {
      const analytics = await service.getHospitalAnalytics();
      return res.json(analytics);
    } catch (err) {
      next(err);
    }
  });

  // Audit Logs inspection API (SYSTEM_ADMIN only)
  router.get("/audit/logs", authMiddleware, requireRoles([UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
    try {
      const logs = await service.getAuditLogs();
      return res.json(logs.map(l => ({ ...l.props, id: l.id })));
    } catch (err) {
      next(err);
    }
  });

  // Blockchain trust anchors verification API
  router.get("/passport/blockchain", authMiddleware, async (req, res, next) => {
    try {
      const passportId = req.query.passportId as string;
      if (!passportId) return res.status(400).json({ error: "passportId is required" });

      const records = await service.getBlockchainRecords(passportId);
      return res.json({
        passportId,
        verificationStatus: "VALID",
        blocksCount: records.length,
        ledger: records.map(r => ({
          blockId: r.id,
          consentHash: r.consentHash,
          predictionHash: r.predictionHash,
          doctorReviewHash: r.doctorReviewHash,
          modelVersion: r.modelVersion,
          timestamp: r.timestamp
        }))
      });
    } catch (err) {
      next(err);
    }
  });



  // ==========================================
  // 8. SESSION & DEVICE MANAGEMENT APIs
  // ==========================================

  // Get active sessions (authenticated user)
  router.get("/auth/sessions", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const sessions = await service.getActiveSessions(userId);
      return res.json(sessions);
    } catch (err) {
      next(err);
    }
  });

  // Get registered devices (authenticated user)
  router.get("/auth/devices", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const devices = await service.getRegisteredDevices(userId);
      return res.json(devices);
    } catch (err) {
      next(err);
    }
  });

  // Logout session API
  router.post("/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) return res.status(400).json({ error: "Auth token is required" });
      await service.logoutSession(token, getIp(req));
      return res.json({ message: "Session logged out successfully" });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 9. NOTIFICATION ENGINE APIs
  // ==========================================

  // Get all notifications for user
  router.get("/notifications", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const notifications = await service.getUserNotifications(userId);
      return res.json(notifications);
    } catch (err) {
      next(err);
    }
  });

  // Send manual alert notification (DOCTOR or SYSTEM_ADMIN only)
  router.post("/notifications/send", authMiddleware, requireRoles([UserRole.DOCTOR, UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
    try {
      const schema = z.object({
        userId: z.string(),
        title: z.string(),
        message: z.string(),
        channel: z.enum(["EMAIL", "SMS", "PUSH"])
      });
      const data = schema.parse(req.body);
      const notif = await service.sendNotification(data.userId, data.title, data.message, data.channel);
      return res.status(201).json({ message: "Notification dispatched successfully", notification: notif });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 10. APPOINTMENT MANAGEMENT APIs
  // ==========================================

  // Schedule a review appointment
  router.post("/appointments/create", authMiddleware, requireRoles([UserRole.DOCTOR, UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
    try {
      const schema = z.object({
        patientId: z.string(),
        doctorId: z.string(),
        appointmentDate: z.string().transform(val => new Date(val)),
        notes: z.string().default("Follow-up recovery check")
      });
      const data = schema.parse(req.body);
      const app = await service.scheduleAppointment(data.patientId, data.doctorId, data.appointmentDate, data.notes);
      return res.status(201).json({ message: "Appointment scheduled successfully", appointment: app });
    } catch (err) {
      next(err);
    }
  });

  // Get appointments list (for patient or doctor)
  router.get("/appointments", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.query.patientId as string;
      const doctorId = req.query.doctorId as string;

      if (patientId) {
        // Enforce privacy check: patients cannot view other patients' appointments
        if (req.user?.role === UserRole.PATIENT) {
          const profile = await service.patientRepo.findByUserId(req.user.userId);
          if (!profile || profile.id !== patientId) {
            return res.status(403).json({ error: "Access denied: Cannot query other patients' appointments" });
          }
        }
        const apps = await service.getPatientAppointments(patientId);
        return res.json(apps);
      } else if (doctorId) {
        const apps = await service.getDoctorAppointments(doctorId);
        return res.json(apps);
      } else {
        return res.status(400).json({ error: "patientId or doctorId query parameter is required" });
      }
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 11. CLINICAL MEMORY APIs
  // ==========================================

  // Retrieve patient structured clinical memory details
  router.get("/passport/clinical-memory", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.query.patientId as string;
      if (!patientId) return res.status(400).json({ error: "patientId query parameter is required" });

      // Privacy shield: patients cannot read other patients' records
      if (req.user?.role === UserRole.PATIENT) {
        const profile = await service.patientRepo.findByUserId(req.user.userId);
        if (!profile || profile.id !== patientId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const memory = await service.getClinicalMemory(patientId);
      if (!memory) return res.status(404).json({ error: "Clinical memory snapshot not found" });
      return res.json(memory);
    } catch (err) {
      next(err);
    }
  });

  // ==========================================
  // 12. DETAILED PATIENT PROFILE DASHBOARD API
  // ==========================================

  // Get patient specific clinical profile details (DOCTOR role only)
  router.get("/doctor/patient/:id", authMiddleware, requireRoles([UserRole.DOCTOR]), async (req: AuthenticatedRequest, res, next) => {
    try {
      const patientId = req.params.id;
      const doctorId = req.query.doctorId as string;
      if (!doctorId) return res.status(400).json({ error: "doctorId query parameter is required" });

      const details = await service.getDoctorPatientDetail(doctorId, patientId);
      return res.json(details);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

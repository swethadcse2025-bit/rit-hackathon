import * as crypto from "crypto";
import * as fs from "fs";
import { User, UserRole } from "../../domain/auth/user";
import { Patient } from "../../domain/patient/patient";
import { Doctor } from "../../domain/doctor/doctor";
import { RecoveryPassport, PassportStatus } from "../../domain/passport/recovery-passport";
import { RecoveryVersion, DoctorDecision } from "../../domain/passport/recovery-version";
import { RecoveryTwin } from "../../domain/intelligence/recovery-twin";
import { DoctorFeedback } from "../../domain/doctor/doctor-feedback";
import { Task, TaskType } from "../../domain/patient/task";
import { AuditLog } from "../../domain/audit/audit-log";
import { Consent } from "../../domain/audit/consent";
import { BlockchainRecord } from "../../domain/audit/blockchain-record";
import {
  IUserRepository,
  IPatientRepository,
  IDoctorRepository,
  IRecoveryPassportRepository,
  IRecoveryTwinRepository,
  IDoctorFeedbackRepository,
  ITaskRepository,
  IAuditLogRepository,
  IConsentRepository,
  IBlockchainRecordRepository,
  IClinicalMemoryRepository,
  IDocumentRepository,
  IImageRepository,
  ClinicalMemoryData,
  ISessionRepository,
  IDeviceRepository,
  INotificationRepository,
  IAppointmentRepository,
  SessionData,
  DeviceData,
  NotificationData,
  AppointmentData
} from "../../domain/repositories.interface";

import { TokenService } from "../../infrastructure/security/jwt";
import { VisionMockService } from "../../infrastructure/ai/vision-mock";
import { MemoryMockService } from "../../infrastructure/ai/memory-mock";
import {
  RecoveryIntelligenceEngine,
  RecoveryTwinEngine,
  CohortIntelligenceEngine,
  EvidenceEngine,
  ClinicalReplayEngine,
  InterventionIntelligenceEngine
} from "../../domain/intelligence/recovery-engines";

export class SurgiSenseService {
  constructor(
    public userRepo: IUserRepository,
    public patientRepo: IPatientRepository,
    public doctorRepo: IDoctorRepository,
    public passportRepo: IRecoveryPassportRepository,
    public twinRepo: IRecoveryTwinRepository,
    public feedbackRepo: IDoctorFeedbackRepository,
    public taskRepo: ITaskRepository,
    public auditRepo: IAuditLogRepository,
    public consentRepo: IConsentRepository,
    public blockchainRepo: IBlockchainRecordRepository,
    public memoryRepo: IClinicalMemoryRepository,
    public docRepo: IDocumentRepository,
    public imgRepo: IImageRepository,
    public sessionRepo: ISessionRepository,
    public deviceRepo: IDeviceRepository,
    public notifRepo: INotificationRepository,
    public appointmentRepo: IAppointmentRepository
  ) {}

  private async audit(userId: string | undefined, role: string | undefined, action: string, target: string, ip: string, payload: any) {
    const payloadStr = JSON.stringify(payload || {});
    const payloadHash = crypto.createHash("sha256").update(payloadStr).digest("hex");
    const log = AuditLog.create({
      userId,
      userRole: role,
      action,
      target,
      ipAddress: ip,
      payloadHash,
      timestamp: new Date()
    });
    await this.auditRepo.save(log);
  }

  // --- AUTH SERVICES ---

  public async registerUser(dto: any, ip: string): Promise<any> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    // Simple secure hashing
    const passwordHash = crypto.createHash("sha256").update(dto.password + salt).digest("hex") + ":" + salt;

    const user = User.create({
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      isVerified: false,
      verificationToken: crypto.randomBytes(24).toString("hex")
    });

    await this.userRepo.save(user);

    let profile: any = null;

    if (dto.role === UserRole.PATIENT) {
      profile = Patient.create({
        userId: user.id,
        name: dto.name,
        demographics: {
          age: dto.age || 45,
          gender: dto.gender || "Other",
          height: dto.height || 170,
          weight: dto.weight || 70
        },
        procedure: dto.procedure || "Routine Observation",
        hospital: dto.hospital || "General Hospital",
        surgeon: dto.surgeon || "Dr. Anonymous",
        comorbidities: dto.comorbidities || [],
        medicalHistory: "No prior historical records uploaded.",
        emergencyContact: dto.emergencyContact || { name: "Guardian", relationship: "Next of Kin", phone: "000-0000" }
      });
      await this.patientRepo.save(profile);

      // Initialize Recovery Passport & Digital Recovery Twin
      const passport = RecoveryPassport.create({
        patientId: profile.id,
        currentRecoveryScore: 100.0,
        status: PassportStatus.ACTIVE
      });
      await this.passportRepo.save(passport);

      profile.linkRecoveryPassport(passport.id);
      await this.patientRepo.save(profile);

      // Create Digital Twin Expected curve
      const expectedCurve = RecoveryTwinEngine.generateExpectedCurve(
        profile.demographics.age,
        profile.demographics.gender,
        profile.procedure,
        profile.comorbidities
      );

      const twin = RecoveryTwin.create({
        patientId: profile.id,
        expectedRecoveryCurve: expectedCurve,
        actualRecoveryCurve: [{ day: 0, score: 100 }],
        deviationTimeline: [],
        projectedRecoveryCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deviationEvents: [],
        recoveryTwinConfidence: 95.0
      });
      await this.twinRepo.save(twin);

      // Save initial Consent
      const consent = Consent.create({
        patientId: profile.id,
        consentType: dto.consentType || "CLINICAL_DATA_USE",
        granted: dto.consentGranted !== undefined ? dto.consentGranted : true,
        ipAddress: ip,
        signedAt: new Date()
      });
      await this.consentRepo.save(consent);
    } else if (dto.role === UserRole.DOCTOR) {
      profile = Doctor.create({
        userId: user.id,
        name: dto.name,
        specialty: dto.specialty || "General Surgery",
        hospital: dto.hospital || "General Hospital",
        licenseNumber: dto.licenseNumber || "LIC-99999"
      });
      await this.doctorRepo.save(profile);
    }

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // Track session
    await this.sessionRepo.save({
      userId: user.id,
      token: accessToken,
      ipAddress: ip,
      userAgent: dto.userAgent || "Unknown Client",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day session
    });

    // Track device
    if (dto.deviceId) {
      await this.deviceRepo.save({
        userId: user.id,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName || "Web Portal User",
        type: dto.deviceType || "DESKTOP",
        isTrusted: true
      });
    }

    await this.audit(user.id, user.role, "AUTH", `REGISTER_${user.role}`, ip, { email: dto.email });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
      verificationToken: user.verificationToken,
      profile: profile ? { id: profile.id, ...profile.props } : null
    };
  }

  public async loginUser(dto: any, ip: string): Promise<any> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new Error("Invalid credentials");

    const parts = user.passwordHash.split(":");
    const storedHash = parts[0];
    const salt = parts[1];
    const computedHash = crypto.createHash("sha256").update(dto.password + salt).digest("hex");

    if (computedHash !== storedHash) {
      throw new Error("Invalid credentials");
    }

    let profile: any = null;
    if (user.role === UserRole.PATIENT) {
      profile = await this.patientRepo.findByUserId(user.id);
    } else if (user.role === UserRole.DOCTOR) {
      profile = await this.doctorRepo.findByUserId(user.id);
    }

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // Track session
    await this.sessionRepo.save({
      userId: user.id,
      token: accessToken,
      ipAddress: ip,
      userAgent: dto.userAgent || "Unknown Client",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day session
    });

    // Track device
    if (dto.deviceId) {
      await this.deviceRepo.save({
        userId: user.id,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName || "Web Portal User",
        type: dto.deviceType || "DESKTOP",
        isTrusted: true
      });
    }

    await this.audit(user.id, user.role, "AUTH", "LOGIN", ip, { email: dto.email });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
      profile: profile ? { id: profile.id, ...profile.props } : null
    };
  }

  public async refreshUserToken(token: string, ip: string): Promise<any> {
    try {
      const decoded = TokenService.verifyRefreshToken(token);
      const user = await this.userRepo.findById(decoded.userId);
      if (!user) throw new Error("User not found");

      const payload = { userId: user.id, role: user.role, email: user.email };
      const accessToken = TokenService.generateAccessToken(payload);
      
      await this.audit(user.id, user.role, "AUTH", "REFRESH_TOKEN", ip, {});
      return { accessToken };
    } catch {
      throw new Error("Invalid refresh token");
    }
  }

  // --- DOCUMENT & MEMORY CLINICAL RAG SERVICES ---

  public async uploadMedicalDocument(patientId: string, docName: string, docType: string, path: string, size: number, ip: string): Promise<any> {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new Error("Patient not found");

    const doc = await this.docRepo.save({
      patientId,
      name: docName,
      type: docType,
      path,
      size,
      status: "UPLOADED"
    });

    // Run Asynchronous structured Clinical Memory Engine extraction
    const extractedData = await MemoryMockService.parseDocument(patientId, docName, docType);
    
    // Save structured memory
    const savedMemory = await this.memoryRepo.save(extractedData);

    // Update document status
    doc.status = "PARSED";
    doc.parsedMemoryId = savedMemory.id;
    await this.docRepo.save(doc);

    // Append medications/restrictions to Patient Profile
    const updatedHistory = `Analyzed ${docType} on ${new Date().toLocaleDateString()}: ${extractedData.diagnosis}. Procedure: ${extractedData.procedure}.`;
    patient.updateMedicalHistory(`${patient.medicalHistory}\n${updatedHistory}`);
    await this.patientRepo.save(patient);

    await this.audit(patient.userId, UserRole.PATIENT, "UPLOAD", `DOCUMENT_${doc.id}`, ip, { docName, docType });

    return {
      document: doc,
      structuredMemory: savedMemory
    };
  }

  // --- IMAGE MANAGEMENT ---

  public async uploadWoundImage(patientId: string, path: string, size: number, mimeType: string, ip: string): Promise<any> {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new Error("Patient not found");

    // Prevent duplicate uploads by calculating image cryptographic checksum hash
    const fileBuffer = fs.readFileSync(path);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const existingImage = await this.imgRepo.findByHash(fileHash);
    if (existingImage) {
      // Remove temporary upload file to save disk space
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
      throw new Error("Duplicate upload detected: This wound image has already been uploaded and analyzed");
    }

    const img = await this.imgRepo.save({
      patientId,
      path,
      metadata: JSON.stringify({ size, mimeType, compressed: true }),
      fileHash
    });

    await this.audit(patient.userId, UserRole.PATIENT, "UPLOAD", `WOUND_IMAGE_${img.id}`, ip, { path, fileHash });
    return img;
  }

  // --- CORE RECOVERY PASSPORT EVOLUTION ENGINE (VERSION GENERATOR) ---

  public async evolveRecoveryPassport(patientId: string, imageId: string | null, painLevel: number, doctorNotes: string, ip: string): Promise<any> {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new Error("Patient not found");

    const passport = await this.passportRepo.findByPatientId(patientId);
    if (!passport) throw new Error("Recovery passport not active for patient");

    const twin = await this.twinRepo.findByPatientId(patientId);
    if (!twin) throw new Error("Digital Recovery twin not found");

    const clinicalMemory = await this.memoryRepo.findByPatientId(patientId);
    const tasks = await this.taskRepo.findByPatientId(patientId);

    // Calculate Task adherence score
    let overallAdherence = 85.0; // Default
    if (tasks.length > 0) {
      const sum = tasks.reduce((acc, t) => acc + t.adherenceScore, 0);
      overallAdherence = Math.round(sum / tasks.length);
    }

    // Run Vision AI analysis if imageId is provided
    let visionAnalysis: any = null;
    let imageRow: any = null;
    if (imageId) {
      imageRow = await this.imgRepo.findById(imageId);
      if (imageRow && !imageRow.versionId) {
        visionAnalysis = await VisionMockService.analyzeWound(imageRow.path);
      }
    }

    // Generate Recovery Version details
    const versionCount = passport.versions.length;
    const nextVersionNum = versionCount + 1;

    // Convert ClinicalMemory to snapshot format
    const memorySnapshot = clinicalMemory ? {
      procedure: clinicalMemory.procedure,
      procedureDate: clinicalMemory.procedureDate,
      diagnosis: clinicalMemory.diagnosis,
      comorbidities: clinicalMemory.comorbidities,
      allergies: clinicalMemory.allergies,
      medications: clinicalMemory.medications,
      restrictions: clinicalMemory.restrictions,
      riskFactors: clinicalMemory.riskFactors
    } : {
      procedure: patient.procedure,
      procedureDate: new Date(),
      diagnosis: "Postoperative Recovery",
      comorbidities: patient.comorbidities,
      allergies: [],
      medications: [],
      restrictions: [],
      riskFactors: []
    };

    // Calculate Recovery Intelligence
    const intelligence = RecoveryIntelligenceEngine.calculate(
      memorySnapshot,
      visionAnalysis,
      nextVersionNum,
      overallAdherence,
      painLevel
    );

    // Update Digital Recovery Twin
    const currentDay = nextVersionNum * 3; // Simulate version uploads spaced by 3 days
    RecoveryTwinEngine.updateTwin(
      twin,
      currentDay,
      intelligence.recoveryScore,
      painLevel,
      visionAnalysis?.inflammationDetected || false,
      overallAdherence
    );
    await this.twinRepo.save(twin);

    // Run Cohort Intelligence
    const cohort = CohortIntelligenceEngine.compare(
      patient.procedure,
      patient.demographics.age,
      patient.comorbidities,
      intelligence.recoveryScore
    );

    // Generate Ranked Interventions
    const interventions = InterventionIntelligenceEngine.generate(
      intelligence.recoveryScore,
      intelligence.complicationProbability,
      intelligence.recoveryScore - (twin.expectedRecoveryCurve.find(c => c.day === currentDay)?.score || 80),
      painLevel,
      visionAnalysis?.inflammationDetected || false
    );

    // Map into recommendations
    const recommendations = interventions.map(i => ({
      id: i.id,
      intervention: i.intervention,
      priority: i.priority,
      expectedBenefit: i.expectedBenefit,
      riskReduction: i.riskReduction,
      reasoning: i.reasoning,
      confidence: i.confidence
    }));

    // Evidence Explainability Snapshot
    const currentDeviation = intelligence.recoveryScore - (twin.expectedRecoveryCurve.find(c => c.day === currentDay)?.score || 80);
    const evidence = EvidenceEngine.generate(
      recommendations[0]?.id || "REC-0",
      recommendations[0]?.reasoning || "Routine surveillance",
      memorySnapshot,
      visionAnalysis,
      currentDeviation,
      recommendations[0]?.confidence || 0.95
    );

    // Create AI Clinical Summary text
    const aiSummary = `SurgiSense AI summary: Recovery score is ${intelligence.recoveryScore}/100 (${intelligence.riskTrend} risk profile). Healing velocity is ${intelligence.healingVelocity}% progress per event. Digital Twin shows deviation severity is ${Math.abs(currentDeviation) > 20 ? "High" : "Low"}. Pain is ${painLevel}/10 and compliance is ${overallAdherence}%. Recommended next action: "${recommendations[0]?.intervention || "Routine Monitoring"}"`;

    // Create the immutable Recovery Version
    const newVersion = RecoveryVersion.create({
      passportId: passport.id,
      versionNumber: nextVersionNum,
      timestamp: new Date(),
      uploadedImages: imageRow ? [imageRow.path] : [],
      visionAnalysis: visionAnalysis || {
        healingPercentage: 0,
        inflammationDetected: false,
        swellingDetected: false,
        tissueAppearance: "N/A",
        healingStage: "N/A",
        imageQualityScore: 0,
        confidenceScore: 0
      },
      healingScore: visionAnalysis?.healingPercentage || 0,
      inflammationScore: visionAnalysis?.inflammationDetected ? 70 : 10,
      swellingScore: visionAnalysis?.swellingDetected ? 60 : 10,
      painLevel,
      medicationAdherence: overallAdherence,
      clinicalMemorySnapshot: memorySnapshot,
      doctorNotes,
      aiSummary,
      recoveryScore: intelligence.recoveryScore,
      evidenceSnapshot: evidence,
      recommendations,
      interventions: interventions.map(i => i.intervention),
      doctorDecisions: []
    });

    passport.addNewVersion(newVersion);
    await this.passportRepo.save(passport);
    await this.passportRepo.saveVersion(newVersion);

    // Link uploaded image to version
    if (imageRow) {
      await this.imgRepo.updateVersionId(imageRow.id, newVersion.id);
    }

    // Anchor hash registers in Blockchain Trust Layer
    const predictionHash = crypto.createHash("sha256").update(JSON.stringify(intelligence) + JSON.stringify(recommendations)).digest("hex");
    const consentHash = crypto.createHash("sha256").update(patientId + "_CLINICAL_DATA_USE_TRUE").digest("hex");
    const doctorReviewHash = crypto.createHash("sha256").update("PENDING_DOCTOR_REVIEW").digest("hex");

    const blockchainRec = BlockchainRecord.create({
      passportId: passport.id,
      versionId: newVersion.id,
      consentHash,
      predictionHash,
      doctorReviewHash,
      modelVersion: "surgisense-v1.4.2",
      timestamp: new Date()
    });
    await this.blockchainRepo.save(blockchainRec);

    await this.audit(patient.userId, UserRole.PATIENT, "PREDICTION", `RECOVERY_VERSION_${newVersion.id}`, ip, {
      recoveryScore: intelligence.recoveryScore,
      complicationProbability: intelligence.complicationProbability
    });

    return {
      passport,
      latestVersion: newVersion,
      twin,
      cohort
    };
  }

  // --- DOCTOR INTERACTION & DECISION LEARNING LOOP ---

  public async submitDoctorFeedback(dto: any, ip: string): Promise<any> {
    const doctor = await this.doctorRepo.findById(dto.doctorId);
    if (!doctor) throw new Error("Doctor profile not found");

    const passport = await this.passportRepo.findById(dto.passportId);
    if (!passport) throw new Error("Passport not found");

    const latestVersion = passport.versions[passport.versions.length - 1];
    if (!latestVersion) throw new Error("No recovery versions found in passport");

    const originalRec = latestVersion.recommendations.find(r => r.id === dto.recommendationId);
    const originalRecStr = originalRec ? JSON.stringify(originalRec) : "{}";

    // Create feedback loop log
    const feedback = DoctorFeedback.create({
      recommendationId: dto.recommendationId,
      patientId: passport.patientId,
      doctorId: dto.doctorId,
      originalRecommendation: originalRecStr,
      doctorAction: dto.action, // ACCEPT, MODIFY, REJECT
      modifiedRecommendation: dto.modifiedRecommendation,
      reason: dto.reason || "Clinical decision based on patient physical checks",
      doctorSpecialty: doctor.specialty,
      outcome: dto.outcome || "Pending followup"
    });

    await this.feedbackRepo.save(feedback);

    // Apply decision to the immutable recovery version decisions list
    const decision: DoctorDecision = {
      recommendationId: dto.recommendationId,
      action: dto.action,
      modifiedRecommendation: dto.modifiedRecommendation,
      doctorNotes: dto.reason,
      timestamp: new Date()
    };
    latestVersion.addDoctorDecision(decision);
    await this.passportRepo.saveVersion(latestVersion);

    // Update Blockchain Anchor Record to reflect doctor review
    const doctorReviewHash = crypto.createHash("sha256").update(JSON.stringify(decision)).digest("hex");
    const pastRecords = await this.blockchainRepo.findByPassportId(passport.id);
    const versionRecord = pastRecords.find(r => r.versionId === latestVersion.id);
    if (versionRecord) {
      // Create new updated record block anchor
      const blockchainRec = BlockchainRecord.create({
        passportId: passport.id,
        versionId: latestVersion.id,
        consentHash: versionRecord.consentHash,
        predictionHash: versionRecord.predictionHash,
        doctorReviewHash,
        modelVersion: versionRecord.modelVersion,
        timestamp: new Date()
      });
      await this.blockchainRepo.save(blockchainRec);
    }

    await this.audit(doctor.userId, UserRole.DOCTOR, "REVIEW", `RECOMMENDATION_FEEDBACK_${feedback.id}`, ip, {
      action: dto.action,
      passportId: dto.passportId
    });

    return feedback;
  }

  // --- PATIENT TASKS & COMPLIANCE ---

  public async createPatientTask(patientId: string, name: string, type: string, description: string, schedule: string, reminders: any[]): Promise<Task> {
    const task = Task.create({
      patientId,
      name,
      type: type as TaskType,
      description,
      schedule,
      reminders: reminders || [],
      completionHistory: [],
      adherenceScore: 100
    });
    return this.taskRepo.save(task);
  }

  public async logTaskCompletion(taskId: string, completedAt: Date, adhered: boolean, ip: string): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new Error("Task not found");

    task.logCompletion(completedAt, adhered);
    const savedTask = await this.taskRepo.save(task);

    // Update digital twin actual curve point for today if needed
    const twin = await this.twinRepo.findByPatientId(task.patientId);
    if (twin) {
      // Re-evaluate twin score incorporating new compliance rates
      const passport = await this.passportRepo.findByPatientId(task.patientId);
      if (passport && passport.versions.length > 0) {
        const latest = passport.versions[passport.versions.length - 1];
        const day = latest.versionNumber * 3;
        const actualPoints = [...twin.actualRecoveryCurve.filter(p => p.day !== day), { day, score: latest.recoveryScore }];
        
        // Save back
        twin.updateTrajectory(
          actualPoints,
          twin.deviationTimeline,
          twin.deviationEvents,
          twin.projectedRecoveryCompletionDate,
          twin.recoveryTwinConfidence
        );
        await this.twinRepo.save(twin);
      }
    }

    return savedTask;
  }

  public async getPatientTasks(patientId: string): Promise<Task[]> {
    return this.taskRepo.findByPatientId(patientId);
  }

  public async getPatientPassport(patientId: string): Promise<RecoveryPassport | null> {
    return this.passportRepo.findByPatientId(patientId);
  }

  // --- STORY-REPLAY ENGINE ---

  public async getClinicalReplay(patientId: string): Promise<any> {
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new Error("Patient not found");

    const passport = await this.passportRepo.findByPatientId(patientId);
    if (!passport) throw new Error("Passport not found");

    const feedbacks = await this.feedbackRepo.findAll();
    const patientFeedbacks = feedbacks.filter(f => f.patientId === patientId);

    const tasks = await this.taskRepo.findByPatientId(patientId);

    const events = ClinicalReplayEngine.generateReplay(
      passport.createdAt,
      passport.versions,
      patientFeedbacks,
      tasks
    );

    return {
      patientName: patient.name,
      procedure: patient.procedure,
      timelineEvents: events
    };
  }

  // --- DOCTOR & DASHBOARD VIEWS ---

  public async getDoctorDashboard(doctorId: string): Promise<any> {
    const doctor = await this.doctorRepo.findById(doctorId);
    if (!doctor) throw new Error("Doctor not found");

    // Fetch all active patients in doctor's hospital
    const allPatients = await this.patientRepo.findAll();
    const hospitalPatients = allPatients.filter(p => p.hospital === doctor.hospital);

    const list = await Promise.all(hospitalPatients.map(async (p) => {
      const passport = await this.passportRepo.findByPatientId(p.id);
      const twin = await this.twinRepo.findByPatientId(p.id);
      const latestVersion = passport?.versions[passport.versions.length - 1] || null;

      return {
        patientId: p.id,
        name: p.name,
        procedure: p.procedure,
        currentRecoveryScore: passport?.currentRecoveryScore || 100,
        status: passport?.status || "ACTIVE",
        latestSummary: latestVersion?.aiSummary || "No checkups logged yet",
        lastActive: latestVersion?.timestamp || passport?.createdAt || new Date(),
        twinConfidence: twin?.recoveryTwinConfidence || 95
      };
    }));

    return {
      doctorName: doctor.name,
      specialty: doctor.specialty,
      hospital: doctor.hospital,
      patients: list.sort((a, b) => a.currentRecoveryScore - b.currentRecoveryScore) // Prioritize lower scores first
    };
  }

  // --- HOSPITAL ANALYTICS ENGINE ---

  public async getHospitalAnalytics(): Promise<any> {
    const patients = await this.patientRepo.findAll();
    const feedbacks = await this.feedbackRepo.findAll();

    const totalPatients = patients.length;
    let avgRecoveryDays = 30;
    let complicationRate = 8.5; // Default reference stats

    if (totalPatients > 0) {
      const activeCount = patients.length;
      const delayedCount = patients.filter(p => p.comorbidities.length > 2).length;
      complicationRate = Math.round((delayedCount / activeCount) * 100);
    }

    // Feedback loops calculations
    const totalRecsReviewed = feedbacks.length;
    const acceptedCount = feedbacks.filter(f => f.doctorAction === "ACCEPT").length;
    const modifiedCount = feedbacks.filter(f => f.doctorAction === "MODIFY").length;
    const rejectedCount = feedbacks.filter(f => f.doctorAction === "REJECT").length;

    const acceptanceRate = totalRecsReviewed > 0 
      ? Math.round((acceptedCount / totalRecsReviewed) * 100)
      : 88; // Default initial AI performance

    return {
      averageRecoveryDurationDays: avgRecoveryDays,
      estimatedComplicationRate: complicationRate,
      recommendationAcceptanceRate: acceptanceRate,
      feedbackLoopStats: {
        totalReviewed: totalRecsReviewed,
        accepted: acceptedCount,
        modified: modifiedCount,
        rejected: rejectedCount
      },
      readmissionRiskIndex: complicationRate * 0.4,
      populationHealthTrends: {
        activeMonitoring: totalPatients,
        totalInterventionsSuggested: totalRecsReviewed,
        systemHealthRating: Math.round(100 - complicationRate * 0.5)
      }
    };
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.auditRepo.findAll();
  }

  public async getBlockchainRecords(passportId: string): Promise<BlockchainRecord[]> {
    return this.blockchainRepo.findByPassportId(passportId);
  }

  // --- EMAIL VERIFICATION & PASSWORD RESET ---

  public async verifyEmail(token: string, ip: string): Promise<void> {
    const user = await this.userRepo.findByVerificationToken(token);
    if (!user) throw new Error("Invalid or expired email verification token");
    user.verify();
    await this.userRepo.save(user);
    await this.audit(user.id, user.role, "AUTH", "VERIFY_EMAIL", ip, {});
  }

  public async requestPasswordReset(email: string, ip: string): Promise<string> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error("User with this email not found");
    const resetToken = crypto.randomBytes(24).toString("hex");
    user.setVerificationToken(resetToken);
    await this.userRepo.save(user);
    await this.audit(user.id, user.role, "AUTH", "REQUEST_PASSWORD_RESET", ip, { email });
    return resetToken;
  }

  public async resetPassword(token: string, newPassword: string, ip: string): Promise<void> {
    const user = await this.userRepo.findByVerificationToken(token);
    if (!user) throw new Error("Invalid or expired password reset token");
    
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.createHash("sha256").update(newPassword + salt).digest("hex") + ":" + salt;
    
    user.changePassword(passwordHash);
    user.verify();
    
    await this.userRepo.save(user);
    await this.audit(user.id, user.role, "AUTH", "RESET_PASSWORD_SUCCESS", ip, {});
  }

  // --- SESSIONS & DEVICES ---

  public async getActiveSessions(userId: string): Promise<SessionData[]> {
    return this.sessionRepo.findByUserId(userId);
  }

  public async getRegisteredDevices(userId: string): Promise<DeviceData[]> {
    return this.deviceRepo.findByUserId(userId);
  }

  public async logoutSession(token: string, ip: string): Promise<void> {
    const session = await this.sessionRepo.findByToken(token);
    if (session) {
      await this.sessionRepo.deleteByToken(token);
      await this.audit(session.userId, undefined, "AUTH", "LOGOUT", ip, {});
    }
  }

  // --- NOTIFICATION ENGINE ---

  public async sendNotification(userId: string, title: string, message: string, channel: "EMAIL" | "SMS" | "PUSH"): Promise<NotificationData> {
    const notif = await this.notifRepo.save({
      userId,
      title,
      message,
      channel,
      status: "SENT"
    });
    return notif;
  }

  public async getUserNotifications(userId: string): Promise<NotificationData[]> {
    return this.notifRepo.findByUserId(userId);
  }

  // --- APPOINTMENTS ---

  public async scheduleAppointment(patientId: string, doctorId: string, date: Date, notes: string): Promise<AppointmentData> {
    const app = await this.appointmentRepo.save({
      patientId,
      doctorId,
      appointmentDate: date,
      status: "SCHEDULED",
      notes
    });
    
    // Trigger notification alert
    const patient = await this.patientRepo.findById(patientId);
    if (patient) {
      await this.sendNotification(
        patient.userId, 
        "Appointment Scheduled", 
        `Review scheduled with doctor for ${date.toLocaleString()}`, 
        "EMAIL"
      );
    }
    
    return app;
  }

  public async getPatientAppointments(patientId: string): Promise<AppointmentData[]> {
    return this.appointmentRepo.findByPatientId(patientId);
  }

  public async getDoctorAppointments(doctorId: string): Promise<AppointmentData[]> {
    return this.appointmentRepo.findByDoctorId(doctorId);
  }

  // --- CLINICAL MEMORY SEARCH ---

  public async getClinicalMemory(patientId: string): Promise<ClinicalMemoryData | null> {
    return this.memoryRepo.findByPatientId(patientId);
  }

  // --- DETAILED DOCTOR PATIENT DASHBOARD ---

  public async getDoctorPatientDetail(doctorId: string, patientId: string): Promise<any> {
    const doctor = await this.doctorRepo.findById(doctorId);
    if (!doctor) throw new Error("Doctor not found");

    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new Error("Patient not found");

    const passport = await this.passportRepo.findByPatientId(patientId);
    if (!passport) throw new Error("Passport not found");

    const twin = await this.twinRepo.findByPatientId(patientId);
    const clinicalMemory = await this.memoryRepo.findByPatientId(patientId);
    const tasks = await this.taskRepo.findByPatientId(patientId);
    const appointments = await this.appointmentRepo.findByPatientId(patientId);
    
    const feedbacks = await this.feedbackRepo.findAll();
    const patientFeedbacks = feedbacks.filter(f => f.patientId === patientId);

    const images = await this.imgRepo.findByPatientId(patientId);
    const latestVersion = passport.versions[passport.versions.length - 1] || null;

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        demographics: patient.demographics,
        procedure: patient.procedure,
        hospital: patient.hospital,
        surgeon: patient.surgeon,
        comorbidities: patient.comorbidities,
        recoveryStatus: patient.recoveryStatus,
        medicalHistory: patient.medicalHistory
      },
      passport: {
        id: passport.id,
        currentRecoveryScore: passport.currentRecoveryScore,
        status: passport.status,
        versions: passport.versions.map(v => ({ id: v.id, ...v.props }))
      },
      twin: twin ? { id: twin.id, ...twin.props } : null,
      clinicalMemory,
      tasks: tasks.map(t => ({ id: t.id, ...t.props })),
      appointments,
      feedbackHistory: patientFeedbacks.map(f => ({ id: f.id, ...f.props })),
      imageTimeline: images.map(i => ({ id: i.id, path: i.path, createdAt: i.createdAt })),
      latestVersionExplainability: latestVersion ? latestVersion.evidenceSnapshot : null
    };
  }
}

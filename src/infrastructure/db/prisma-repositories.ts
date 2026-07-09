import { PrismaClient } from "@prisma/client";
import { User, UserRole } from "../../domain/auth/user";
import { Patient, Demographics, EmergencyContact } from "../../domain/patient/patient";
import { Doctor } from "../../domain/doctor/doctor";
import { RecoveryPassport, PassportStatus } from "../../domain/passport/recovery-passport";
import { RecoveryVersion, VisionAnalysis, ClinicalMemorySnapshot, Recommendation, DoctorDecision } from "../../domain/passport/recovery-version";
import { RecoveryTwin, CurvePoint, DeviationEvent } from "../../domain/intelligence/recovery-twin";
import { DoctorFeedback } from "../../domain/doctor/doctor-feedback";
import { Task, TaskType, TaskReminder, CompletionEntry } from "../../domain/patient/task";
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
  DocumentData,
  ImageData,
  ISessionRepository,
  IDeviceRepository,
  INotificationRepository,
  IAppointmentRepository,
  SessionData,
  DeviceData,
  NotificationData,
  AppointmentData
} from "../../domain/repositories.interface";
import { EncryptionService } from "../security/encryption";

// User Repos implementation
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const userRow = await this.prisma.user.findUnique({ where: { id } });
    if (!userRow) return null;
    return User.create({
      email: userRow.email,
      passwordHash: userRow.passwordHash,
      role: userRow.role as UserRole,
      isVerified: userRow.isVerified,
      verificationToken: userRow.verificationToken,
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt
    }, userRow.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userRow = await this.prisma.user.findFirst({ where: { email } });
    if (!userRow) return null;
    return User.create({
      email: userRow.email,
      passwordHash: userRow.passwordHash,
      role: userRow.role as UserRole,
      isVerified: userRow.isVerified,
      verificationToken: userRow.verificationToken,
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt
    }, userRow.id);
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const userRow = await this.prisma.user.findFirst({ where: { verificationToken: token } });
    if (!userRow) return null;
    return User.create({
      email: userRow.email,
      passwordHash: userRow.passwordHash,
      role: userRow.role as UserRole,
      isVerified: userRow.isVerified,
      verificationToken: userRow.verificationToken,
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt
    }, userRow.id);
  }

  async save(user: User): Promise<User> {
    const data = {
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      isVerified: user.isVerified,
      verificationToken: user.verificationToken,
      updatedAt: user.updatedAt
    };
    const userRow = await this.prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data, createdAt: user.createdAt }
    });
    return user;
  }
}

// Patient Repos implementation
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private prisma: PrismaClient) {}

  private mapRowToEntity(row: any): Patient {
    const decryptedHistory = EncryptionService.decrypt(row.medicalHistory);
    const demo = JSON.parse(row.gender ? JSON.stringify({ age: row.age, gender: row.gender, height: row.height, weight: row.weight }) : "{}");
    const contact = JSON.parse(row.emergencyContact || "{}");
    const comorbidities = JSON.parse(row.comorbidities || "[]");

    return Patient.create({
      userId: row.userId,
      name: row.name,
      demographics: {
        age: row.age,
        gender: row.gender,
        height: row.height,
        weight: row.weight
      },
      procedure: row.procedure,
      hospital: row.hospital,
      surgeon: row.surgeon,
      comorbidities,
      medicalHistory: decryptedHistory,
      emergencyContact: contact,
      recoveryPassportId: row.recoveryPassportId || undefined,
      recoveryStatus: row.recoveryStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);
  }

  async findById(id: string): Promise<Patient | null> {
    const row = await this.prisma.patient.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapRowToEntity(row);
  }

  async findByUserId(userId: string): Promise<Patient | null> {
    const row = await this.prisma.patient.findUnique({ where: { userId } });
    if (!row) return null;
    return this.mapRowToEntity(row);
  }

  async save(patient: Patient): Promise<Patient> {
    const encryptedHistory = EncryptionService.encrypt(patient.medicalHistory);
    const data = {
      userId: patient.userId,
      name: patient.name,
      age: patient.demographics.age,
      gender: patient.demographics.gender,
      height: patient.demographics.height,
      weight: patient.demographics.weight,
      procedure: patient.procedure,
      hospital: patient.hospital,
      surgeon: patient.surgeon,
      comorbidities: JSON.stringify(patient.comorbidities),
      medicalHistory: encryptedHistory,
      emergencyContact: JSON.stringify(patient.emergencyContact),
      recoveryPassportId: patient.recoveryPassportId || null,
      recoveryStatus: patient.recoveryStatus
    };

    await this.prisma.patient.upsert({
      where: { id: patient.id },
      update: data,
      create: { id: patient.id, ...data }
    });
    return patient;
  }

  async findAll(): Promise<Patient[]> {
    const rows = await this.prisma.patient.findMany();
    return rows.map(r => this.mapRowToEntity(r));
  }
}

// Doctor Repos implementation
export class PrismaDoctorRepository implements IDoctorRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Doctor | null> {
    const row = await this.prisma.doctor.findUnique({ where: { id } });
    if (!row) return null;
    return Doctor.create({
      userId: row.userId,
      name: row.name,
      specialty: row.specialty,
      hospital: row.hospital,
      licenseNumber: row.licenseNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    const row = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!row) return null;
    return Doctor.create({
      userId: row.userId,
      name: row.name,
      specialty: row.specialty,
      hospital: row.hospital,
      licenseNumber: row.licenseNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);
  }

  async save(doctor: Doctor): Promise<Doctor> {
    const data = {
      userId: doctor.userId,
      name: doctor.name,
      specialty: doctor.specialty,
      hospital: doctor.hospital,
      licenseNumber: doctor.licenseNumber
    };
    await this.prisma.doctor.upsert({
      where: { id: doctor.id },
      update: data,
      create: { id: doctor.id, ...data }
    });
    return doctor;
  }

  async findAll(): Promise<Doctor[]> {
    const rows = await this.prisma.doctor.findMany();
    return rows.map(row => Doctor.create({
      userId: row.userId,
      name: row.name,
      specialty: row.specialty,
      hospital: row.hospital,
      licenseNumber: row.licenseNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id));
  }
}

// RecoveryPassport Repos implementation
export class PrismaRecoveryPassportRepository implements IRecoveryPassportRepository {
  constructor(private prisma: PrismaClient) {}

  private mapVersionRowToEntity(row: any): RecoveryVersion {
    const decryptedNotes = EncryptionService.decrypt(row.doctorNotes);
    return RecoveryVersion.create({
      passportId: row.passportId,
      versionNumber: row.versionNumber,
      timestamp: row.timestamp,
      uploadedImages: JSON.parse(row.uploadedImages || "[]"),
      visionAnalysis: JSON.parse(row.visionAnalysis || "{}"),
      healingScore: row.healingScore,
      inflammationScore: row.inflammationScore,
      swellingScore: row.swellingScore,
      painLevel: row.painLevel,
      medicationAdherence: row.medicationAdherence,
      clinicalMemorySnapshot: JSON.parse(row.clinicalMemorySnapshot || "{}"),
      doctorNotes: decryptedNotes,
      aiSummary: row.aiSummary,
      recoveryScore: row.recoveryScore,
      evidenceSnapshot: JSON.parse(row.evidenceSnapshot || "{}"),
      recommendations: JSON.parse(row.recommendations || "[]"),
      interventions: JSON.parse(row.interventions || "[]"),
      doctorDecisions: JSON.parse(row.doctorDecisions || "[]")
    }, row.id);
  }

  async findById(id: string): Promise<RecoveryPassport | null> {
    const row = await this.prisma.recoveryPassport.findUnique({ where: { id } });
    if (!row) return null;
    const passport = RecoveryPassport.create({
      patientId: row.patientId,
      currentRecoveryScore: row.currentRecoveryScore,
      status: row.status as PassportStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);

    const versionRows = await this.prisma.recoveryVersion.findMany({ where: { passportId: id } });
    const versions = versionRows.map(vr => this.mapVersionRowToEntity(vr));
    passport.loadVersions(versions);
    return passport;
  }

  async findByPatientId(patientId: string): Promise<RecoveryPassport | null> {
    const row = await this.prisma.recoveryPassport.findUnique({ where: { patientId } });
    if (!row) return null;
    const passport = RecoveryPassport.create({
      patientId: row.patientId,
      currentRecoveryScore: row.currentRecoveryScore,
      status: row.status as PassportStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);

    const versionRows = await this.prisma.recoveryVersion.findMany({ where: { passportId: row.id } });
    const versions = versionRows.map(vr => this.mapVersionRowToEntity(vr));
    passport.loadVersions(versions);
    return passport;
  }

  async save(passport: RecoveryPassport): Promise<RecoveryPassport> {
    const data = {
      patientId: passport.patientId,
      currentRecoveryScore: passport.currentRecoveryScore,
      status: passport.status
    };
    await this.prisma.recoveryPassport.upsert({
      where: { id: passport.id },
      update: data,
      create: { id: passport.id, ...data }
    });
    return passport;
  }

  async saveVersion(version: RecoveryVersion): Promise<RecoveryVersion> {
    const encryptedNotes = EncryptionService.encrypt(version.doctorNotes);
    const data = {
      passportId: version.passportId,
      versionNumber: version.versionNumber,
      timestamp: version.timestamp,
      uploadedImages: JSON.stringify(version.uploadedImages),
      visionAnalysis: JSON.stringify(version.visionAnalysis),
      healingScore: version.healingScore,
      inflammationScore: version.inflammationScore,
      swellingScore: version.swellingScore,
      painLevel: version.painLevel,
      medicationAdherence: version.medicationAdherence,
      clinicalMemorySnapshot: JSON.stringify(version.clinicalMemorySnapshot),
      doctorNotes: encryptedNotes,
      aiSummary: version.aiSummary,
      recoveryScore: version.recoveryScore,
      evidenceSnapshot: JSON.stringify(version.evidenceSnapshot),
      recommendations: JSON.stringify(version.recommendations),
      interventions: JSON.stringify(version.interventions),
      doctorDecisions: JSON.stringify(version.doctorDecisions)
    };

    await this.prisma.recoveryVersion.upsert({
      where: { id: version.id },
      update: data,
      create: { id: version.id, ...data }
    });
    return version;
  }

  async findVersionsByPassportId(passportId: string): Promise<RecoveryVersion[]> {
    const rows = await this.prisma.recoveryVersion.findMany({ where: { passportId } });
    return rows.map(vr => this.mapVersionRowToEntity(vr));
  }
}

// RecoveryTwin Repos implementation
export class PrismaRecoveryTwinRepository implements IRecoveryTwinRepository {
  constructor(private prisma: PrismaClient) {}

  async findByPatientId(patientId: string): Promise<RecoveryTwin | null> {
    const row = await this.prisma.recoveryTwin.findUnique({ where: { patientId } });
    if (!row) return null;
    return RecoveryTwin.create({
      patientId: row.patientId,
      expectedRecoveryCurve: JSON.parse(row.expectedRecoveryCurve || "[]"),
      actualRecoveryCurve: JSON.parse(row.actualRecoveryCurve || "[]"),
      deviationTimeline: JSON.parse(row.deviationTimeline || "[]").map((x: any) => ({ ...x, date: new Date(x.date) })),
      projectedRecoveryCompletionDate: row.projectedRecoveryCompletionDate,
      deviationEvents: JSON.parse(row.deviationEvents || "[]").map((x: any) => ({ ...x, date: new Date(x.date) })),
      recoveryTwinConfidence: row.recoveryTwinConfidence,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);
  }

  async save(twin: RecoveryTwin): Promise<RecoveryTwin> {
    const data = {
      patientId: twin.patientId,
      expectedRecoveryCurve: JSON.stringify(twin.expectedRecoveryCurve),
      actualRecoveryCurve: JSON.stringify(twin.actualRecoveryCurve),
      deviationTimeline: JSON.stringify(twin.deviationTimeline),
      projectedRecoveryCompletionDate: twin.projectedRecoveryCompletionDate,
      deviationEvents: JSON.stringify(twin.deviationEvents),
      recoveryTwinConfidence: twin.recoveryTwinConfidence
    };
    await this.prisma.recoveryTwin.upsert({
      where: { id: twin.id },
      update: data,
      create: { id: twin.id, ...data }
    });
    return twin;
  }
}

// DoctorFeedback Repos implementation
export class PrismaDoctorFeedbackRepository implements IDoctorFeedbackRepository {
  constructor(private prisma: PrismaClient) {}

  async save(feedback: DoctorFeedback): Promise<DoctorFeedback> {
    const data = {
      recommendationId: feedback.recommendationId,
      patientId: feedback.patientId,
      doctorId: feedback.doctorId,
      originalRecommendation: feedback.originalRecommendation,
      doctorAction: feedback.doctorAction,
      modifiedRecommendation: feedback.modifiedRecommendation || null,
      reason: feedback.reason,
      doctorSpecialty: feedback.doctorSpecialty,
      outcome: feedback.outcome || null
    };
    await this.prisma.doctorFeedback.upsert({
      where: { id: feedback.id },
      update: data,
      create: { id: feedback.id, ...data }
    });
    return feedback;
  }

  async findAll(): Promise<DoctorFeedback[]> {
    const rows = await this.prisma.doctorFeedback.findMany();
    return rows.map(row => DoctorFeedback.create({
      recommendationId: row.recommendationId,
      patientId: row.patientId,
      doctorId: row.doctorId,
      originalRecommendation: row.originalRecommendation,
      doctorAction: row.doctorAction as any,
      modifiedRecommendation: row.modifiedRecommendation || undefined,
      reason: row.reason,
      doctorSpecialty: row.doctorSpecialty,
      outcome: row.outcome || undefined,
      createdAt: row.createdAt
    }, row.id));
  }
}

// Task Repos implementation
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaClient) {}

  private mapRowToEntity(row: any): Task {
    return Task.create({
      patientId: row.patientId,
      name: row.name,
      type: row.type as TaskType,
      description: row.description,
      schedule: row.schedule,
      reminders: JSON.parse(row.reminders || "[]"),
      completionHistory: JSON.parse(row.completionHistory || "[]").map((x: any) => ({ ...x, completedAt: new Date(x.completedAt) })),
      adherenceScore: row.adherenceScore,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }, row.id);
  }

  async findById(id: string): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapRowToEntity(row);
  }

  async findByPatientId(patientId: string): Promise<Task[]> {
    const rows = await this.prisma.task.findMany({ where: { patientId } });
    return rows.map(r => this.mapRowToEntity(r));
  }

  async save(task: Task): Promise<Task> {
    const data = {
      patientId: task.patientId,
      name: task.name,
      type: task.type,
      description: task.description,
      schedule: task.schedule,
      reminders: JSON.stringify(task.reminders),
      completionHistory: JSON.stringify(task.completionHistory),
      adherenceScore: task.adherenceScore
    };
    await this.prisma.task.upsert({
      where: { id: task.id },
      update: data,
      create: { id: task.id, ...data }
    });
    return task;
  }
}

// AuditLog Repos implementation
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private prisma: PrismaClient) {}

  async save(log: AuditLog): Promise<AuditLog> {
    const data = {
      userId: log.userId || null,
      userRole: log.userRole || null,
      action: log.action,
      target: log.target,
      ipAddress: log.ipAddress,
      payloadHash: log.payloadHash,
      timestamp: log.timestamp
    };
    await this.prisma.auditLog.create({ data });
    return log;
  }

  async findAll(): Promise<AuditLog[]> {
    const rows = await this.prisma.auditLog.findMany();
    return rows.map(row => AuditLog.create({
      userId: row.userId || undefined,
      userRole: row.userRole || undefined,
      action: row.action,
      target: row.target,
      ipAddress: row.ipAddress,
      payloadHash: row.payloadHash,
      timestamp: row.timestamp
    }, row.id));
  }
}

// Consent Repos implementation
export class PrismaConsentRepository implements IConsentRepository {
  constructor(private prisma: PrismaClient) {}

  async findByPatientId(patientId: string): Promise<Consent | null> {
    const row = await this.prisma.consent.findUnique({ where: { patientId } });
    if (!row) return null;
    return Consent.create({
      patientId: row.patientId,
      consentType: row.consentType,
      granted: row.granted,
      ipAddress: row.ipAddress,
      signedAt: row.signedAt
    }, row.id);
  }

  async save(consent: Consent): Promise<Consent> {
    const data = {
      patientId: consent.patientId,
      consentType: consent.consentType,
      granted: consent.granted,
      ipAddress: consent.ipAddress,
      signedAt: consent.signedAt
    };
    await this.prisma.consent.upsert({
      where: { id: consent.id },
      update: data,
      create: { id: consent.id, ...data }
    });
    return consent;
  }
}

// BlockchainRecord Repos implementation
export class PrismaBlockchainRecordRepository implements IBlockchainRecordRepository {
  constructor(private prisma: PrismaClient) {}

  async save(record: BlockchainRecord): Promise<BlockchainRecord> {
    const data = {
      passportId: record.passportId,
      versionId: record.versionId || null,
      consentHash: record.consentHash,
      predictionHash: record.predictionHash,
      doctorReviewHash: record.doctorReviewHash,
      modelVersion: record.modelVersion,
      timestamp: record.timestamp
    };
    await this.prisma.blockchainRecord.create({ data });
    return record;
  }

  async findByPassportId(passportId: string): Promise<BlockchainRecord[]> {
    const rows = await this.prisma.blockchainRecord.findMany({ where: { passportId } });
    return rows.map(row => BlockchainRecord.create({
      passportId: row.passportId,
      versionId: row.versionId || undefined,
      consentHash: row.consentHash,
      predictionHash: row.predictionHash,
      doctorReviewHash: row.doctorReviewHash,
      modelVersion: row.modelVersion,
      timestamp: row.timestamp
    }, row.id));
  }
}

// ClinicalMemory Repos implementation
export class PrismaClinicalMemoryRepository implements IClinicalMemoryRepository {
  constructor(private prisma: PrismaClient) {}

  async save(memory: ClinicalMemoryData): Promise<ClinicalMemoryData> {
    const data = {
      patientId: memory.patientId,
      procedure: memory.procedure,
      procedureDate: memory.procedureDate,
      diagnosis: memory.diagnosis,
      implants: JSON.stringify(memory.implants),
      comorbidities: JSON.stringify(memory.comorbidities),
      allergies: JSON.stringify(memory.allergies),
      medications: JSON.stringify(memory.medications),
      restrictions: JSON.stringify(memory.restrictions),
      riskFactors: JSON.stringify(memory.riskFactors),
      previousSurgeries: JSON.stringify(memory.previousSurgeries),
      labValues: JSON.stringify(memory.labValues),
      followUpSchedule: JSON.stringify(memory.followUpSchedule),
      doctorInstructions: JSON.stringify(memory.doctorInstructions)
    };

    if (memory.id) {
      const row = await this.prisma.clinicalMemory.update({
        where: { id: memory.id },
        data
      });
      return { ...memory, updatedAt: row.updatedAt };
    } else {
      const row = await this.prisma.clinicalMemory.create({ data });
      return { ...memory, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
    }
  }

  async findByPatientId(patientId: string): Promise<ClinicalMemoryData | null> {
    const row = await this.prisma.clinicalMemory.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" }
    });
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patientId,
      procedure: row.procedure,
      procedureDate: row.procedureDate,
      diagnosis: row.diagnosis,
      implants: JSON.parse(row.implants || "[]"),
      comorbidities: JSON.parse(row.comorbidities || "[]"),
      allergies: JSON.parse(row.allergies || "[]"),
      medications: JSON.parse(row.medications || "[]"),
      restrictions: JSON.parse(row.restrictions || "[]"),
      riskFactors: JSON.parse(row.riskFactors || "[]"),
      previousSurgeries: JSON.parse(row.previousSurgeries || "[]"),
      labValues: JSON.parse(row.labValues || "{}"),
      followUpSchedule: JSON.parse(row.followUpSchedule || "[]"),
      doctorInstructions: JSON.parse(row.doctorInstructions || "[]"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

// Document Repos implementation
export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private prisma: PrismaClient) {}

  async save(doc: DocumentData): Promise<DocumentData> {
    const data = {
      patientId: doc.patientId,
      name: doc.name,
      type: doc.type,
      path: doc.path,
      size: doc.size,
      status: doc.status,
      parsedMemoryId: doc.parsedMemoryId || null
    };

    if (doc.id) {
      const row = await this.prisma.document.update({
        where: { id: doc.id },
        data
      });
      return { ...doc, updatedAt: row.updatedAt };
    } else {
      const row = await this.prisma.document.create({ data });
      return { ...doc, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
    }
  }

  async findById(id: string): Promise<DocumentData | null> {
    const row = await this.prisma.document.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patientId,
      name: row.name,
      type: row.type,
      path: row.path,
      size: row.size,
      status: row.status,
      parsedMemoryId: row.parsedMemoryId || undefined,
      createdAt: row.createdAt
    };
  }

  async findByPatientId(patientId: string): Promise<DocumentData[]> {
    const rows = await this.prisma.document.findMany({ where: { patientId } });
    return rows.map(row => ({
      id: row.id,
      patientId: row.patientId,
      name: row.name,
      type: row.type,
      path: row.path,
      size: row.size,
      status: row.status,
      parsedMemoryId: row.parsedMemoryId || undefined,
      createdAt: row.createdAt
    }));
  }
}

// Image Repos implementation
export class PrismaImageRepository implements IImageRepository {
  constructor(private prisma: PrismaClient) {}

  async save(img: ImageData): Promise<ImageData> {
    const data = {
      patientId: img.patientId,
      versionId: img.versionId || null,
      path: img.path,
      metadata: img.metadata,
      fileHash: img.fileHash || null
    };

    if (img.id) {
      await this.prisma.image.update({
        where: { id: img.id },
        data
      });
      return img;
    } else {
      const row = await this.prisma.image.create({ data });
      return { ...img, id: row.id, fileHash: row.fileHash || undefined, createdAt: row.createdAt };
    }
  }

  async findById(id: string): Promise<ImageData | null> {
    const row = await this.prisma.image.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patientId,
      versionId: row.versionId || undefined,
      path: row.path,
      metadata: row.metadata,
      fileHash: row.fileHash || undefined,
      createdAt: row.createdAt
    };
  }

  async findByHash(hash: string): Promise<ImageData | null> {
    const row = await this.prisma.image.findUnique({ where: { fileHash: hash } });
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patientId,
      versionId: row.versionId || undefined,
      path: row.path,
      metadata: row.metadata,
      fileHash: row.fileHash || undefined,
      createdAt: row.createdAt
    };
  }

  async findByPatientId(patientId: string): Promise<ImageData[]> {
    const rows = await this.prisma.image.findMany({ where: { patientId } });
    return rows.map(row => ({
      id: row.id,
      patientId: row.patientId,
      versionId: row.versionId || undefined,
      path: row.path,
      metadata: row.metadata,
      fileHash: row.fileHash || undefined,
      createdAt: row.createdAt
    }));
  }

  async updateVersionId(id: string, versionId: string): Promise<void> {
    await this.prisma.image.update({
      where: { id },
      data: { versionId }
    });
  }
}

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  async save(session: SessionData): Promise<SessionData> {
    const data = {
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt
    };
    if (session.id) {
      const row = await this.prisma.session.update({ where: { id: session.id }, data });
      return { ...session, id: row.id, createdAt: row.createdAt };
    } else {
      const row = await this.prisma.session.create({ data });
      return { ...session, id: row.id, createdAt: row.createdAt };
    }
  }

  async findByToken(token: string): Promise<SessionData | null> {
    const row = await this.prisma.session.findUnique({ where: { token } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      token: row.token,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    };
  }

  async findByUserId(userId: string): Promise<SessionData[]> {
    const rows = await this.prisma.session.findMany({ where: { userId } });
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      token: row.token,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    }));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.session.delete({ where: { token } }).catch(() => {});
  }
}

export class PrismaDeviceRepository implements IDeviceRepository {
  constructor(private prisma: PrismaClient) {}

  async save(device: DeviceData): Promise<DeviceData> {
    const data = {
      userId: device.userId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      type: device.type,
      isTrusted: device.isTrusted
    };
    const row = await this.prisma.device.upsert({
      where: { deviceId: device.deviceId },
      update: data,
      create: data
    });
    return {
      id: row.id,
      userId: row.userId,
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      type: row.type,
      isTrusted: row.isTrusted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async findByDeviceId(deviceId: string): Promise<DeviceData | null> {
    const row = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      type: row.type,
      isTrusted: row.isTrusted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async findByUserId(userId: string): Promise<DeviceData[]> {
    const rows = await this.prisma.device.findMany({ where: { userId } });
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      type: row.type,
      isTrusted: row.isTrusted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async save(notif: NotificationData): Promise<NotificationData> {
    const data = {
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      channel: notif.channel,
      status: notif.status
    };
    if (notif.id) {
      const row = await this.prisma.notification.update({ where: { id: notif.id }, data });
      return { ...notif, id: row.id, sentAt: row.sentAt };
    } else {
      const row = await this.prisma.notification.create({ data });
      return { ...notif, id: row.id, sentAt: row.sentAt };
    }
  }

  async findByUserId(userId: string): Promise<NotificationData[]> {
    const rows = await this.prisma.notification.findMany({ where: { userId } });
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      title: row.title,
      message: row.message,
      channel: row.channel,
      status: row.status,
      sentAt: row.sentAt
    }));
  }
}

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private prisma: PrismaClient) {}

  async save(app: AppointmentData): Promise<AppointmentData> {
    const data = {
      patientId: app.patientId,
      doctorId: app.doctorId,
      appointmentDate: app.appointmentDate,
      status: app.status,
      notes: app.notes
    };
    if (app.id) {
      const row = await this.prisma.appointment.update({ where: { id: app.id }, data });
      return { ...app, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
    } else {
      const row = await this.prisma.appointment.create({ data });
      return { ...app, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
    }
  }

  async findById(id: string): Promise<AppointmentData | null> {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      appointmentDate: row.appointmentDate,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async findByPatientId(patientId: string): Promise<AppointmentData[]> {
    const rows = await this.prisma.appointment.findMany({ where: { patientId } });
    return rows.map(row => ({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      appointmentDate: row.appointmentDate,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  async findByDoctorId(doctorId: string): Promise<AppointmentData[]> {
    const rows = await this.prisma.appointment.findMany({ where: { doctorId } });
    return rows.map(row => ({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      appointmentDate: row.appointmentDate,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }
}

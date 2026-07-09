import { User } from "./auth/user";
import { Patient } from "./patient/patient";
import { Doctor } from "./doctor/doctor";
import { RecoveryPassport } from "./passport/recovery-passport";
import { RecoveryVersion } from "./passport/recovery-version";
import { RecoveryTwin } from "./intelligence/recovery-twin";
import { DoctorFeedback } from "./doctor/doctor-feedback";
import { Task } from "./patient/task";
import { AuditLog } from "./audit/audit-log";
import { Consent } from "./audit/consent";
import { BlockchainRecord } from "./audit/blockchain-record";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByUserId(userId: string): Promise<Patient | null>;
  save(patient: Patient): Promise<Patient>;
  findAll(): Promise<Patient[]>;
}

export interface IDoctorRepository {
  findById(id: string): Promise<Doctor | null>;
  findByUserId(userId: string): Promise<Doctor | null>;
  save(doctor: Doctor): Promise<Doctor>;
  findAll(): Promise<Doctor[]>;
}

export interface IRecoveryPassportRepository {
  findById(id: string): Promise<RecoveryPassport | null>;
  findByPatientId(patientId: string): Promise<RecoveryPassport | null>;
  save(passport: RecoveryPassport): Promise<RecoveryPassport>;
  saveVersion(version: RecoveryVersion): Promise<RecoveryVersion>;
  findVersionsByPassportId(passportId: string): Promise<RecoveryVersion[]>;
}

export interface IRecoveryTwinRepository {
  findByPatientId(patientId: string): Promise<RecoveryTwin | null>;
  save(twin: RecoveryTwin): Promise<RecoveryTwin>;
}

export interface IDoctorFeedbackRepository {
  save(feedback: DoctorFeedback): Promise<DoctorFeedback>;
  findAll(): Promise<DoctorFeedback[]>;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByPatientId(patientId: string): Promise<Task[]>;
  save(task: Task): Promise<Task>;
}

export interface IAuditLogRepository {
  save(log: AuditLog): Promise<AuditLog>;
  findAll(): Promise<AuditLog[]>;
}

export interface IConsentRepository {
  findByPatientId(patientId: string): Promise<Consent | null>;
  save(consent: Consent): Promise<Consent>;
}

export interface IBlockchainRecordRepository {
  save(record: BlockchainRecord): Promise<BlockchainRecord>;
  findByPassportId(passportId: string): Promise<BlockchainRecord[]>;
}

export interface ClinicalMemoryData {
  id?: string;
  patientId: string;
  procedure: string;
  procedureDate: Date;
  diagnosis: string;
  implants: string[];
  comorbidities: string[];
  allergies: string[];
  medications: string[];
  restrictions: string[];
  riskFactors: string[];
  previousSurgeries: string[];
  labValues: Record<string, string>;
  followUpSchedule: string[];
  doctorInstructions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IClinicalMemoryRepository {
  save(memory: ClinicalMemoryData): Promise<ClinicalMemoryData>;
  findByPatientId(patientId: string): Promise<ClinicalMemoryData | null>;
}

export interface DocumentData {
  id?: string;
  patientId: string;
  name: string;
  type: string;
  path: string;
  size: number;
  status: string;
  parsedMemoryId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDocumentRepository {
  save(doc: DocumentData): Promise<DocumentData>;
  findById(id: string): Promise<DocumentData | null>;
  findByPatientId(patientId: string): Promise<DocumentData[]>;
}

export interface ImageData {
  id?: string;
  patientId: string;
  versionId?: string;
  path: string;
  metadata: string;
  fileHash?: string;
  createdAt?: Date;
}

export interface IImageRepository {
  save(img: ImageData): Promise<ImageData>;
  findById(id: string): Promise<ImageData | null>;
  findByHash(hash: string): Promise<ImageData | null>;
  findByPatientId(patientId: string): Promise<ImageData[]>;
  updateVersionId(id: string, versionId: string): Promise<void>;
}

export interface SessionData {
  id?: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface ISessionRepository {
  save(session: SessionData): Promise<SessionData>;
  findByToken(token: string): Promise<SessionData | null>;
  findByUserId(userId: string): Promise<SessionData[]>;
  deleteByToken(token: string): Promise<void>;
}

export interface DeviceData {
  id?: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  type: string;
  isTrusted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeviceRepository {
  save(device: DeviceData): Promise<DeviceData>;
  findByDeviceId(deviceId: string): Promise<DeviceData | null>;
  findByUserId(userId: string): Promise<DeviceData[]>;
}

export interface NotificationData {
  id?: string;
  userId: string;
  title: string;
  message: string;
  channel: string; // EMAIL, SMS, PUSH
  status: string; // PENDING, SENT, FAILED
  sentAt?: Date;
}

export interface INotificationRepository {
  save(notif: NotificationData): Promise<NotificationData>;
  findByUserId(userId: string): Promise<NotificationData[]>;
}

export interface AppointmentData {
  id?: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  status: string; // SCHEDULED, COMPLETED, CANCELLED
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAppointmentRepository {
  save(app: AppointmentData): Promise<AppointmentData>;
  findById(id: string): Promise<AppointmentData | null>;
  findByPatientId(patientId: string): Promise<AppointmentData[]>;
  findByDoctorId(doctorId: string): Promise<AppointmentData[]>;
}


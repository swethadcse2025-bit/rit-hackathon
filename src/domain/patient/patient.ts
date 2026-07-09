import { Entity } from "../common/entity";

export interface Demographics {
  age: number;
  gender: string;
  height: number; // cm
  weight: number; // kg
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface PatientProps {
  userId: string;
  name: string;
  demographics: Demographics;
  procedure: string;
  hospital: string;
  surgeon: string;
  comorbidities: string[]; // List of strings
  medicalHistory: string;   // Structured/Encrypted
  emergencyContact: EmergencyContact;
  recoveryPassportId?: string;
  recoveryStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Patient extends Entity<PatientProps> {
  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get demographics(): Demographics {
    return this.props.demographics;
  }

  get procedure(): string {
    return this.props.procedure;
  }

  get hospital(): string {
    return this.props.hospital;
  }

  get surgeon(): string {
    return this.props.surgeon;
  }

  get comorbidities(): string[] {
    return this.props.comorbidities;
  }

  get medicalHistory(): string {
    return this.props.medicalHistory;
  }

  get emergencyContact(): EmergencyContact {
    return this.props.emergencyContact;
  }

  get recoveryPassportId(): string | undefined {
    return this.props.recoveryPassportId;
  }

  get recoveryStatus(): string {
    return this.props.recoveryStatus || "ACTIVE";
  }

  public linkRecoveryPassport(passportId: string): void {
    this.props.recoveryPassportId = passportId;
    this.props.updatedAt = new Date();
  }

  public updateMedicalHistory(history: string): void {
    this.props.medicalHistory = history;
    this.props.updatedAt = new Date();
  }

  public updateRecoveryStatus(status: string): void {
    this.props.recoveryStatus = status;
    this.props.updatedAt = new Date();
  }

  public static create(props: PatientProps, id?: string): Patient {
    return new Patient(props, id);
  }
}

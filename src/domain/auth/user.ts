import { Entity } from "../common/entity";

export enum UserRole {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  HOSPITAL_ADMIN = "HOSPITAL_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN"
}

interface UserProps {
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified?: boolean;
  verificationToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Entity<UserProps> {
  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isVerified(): boolean {
    return this.props.isVerified || false;
  }

  get verificationToken(): string | null {
    return this.props.verificationToken || null;
  }

  get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  get updatedAt(): Date {
    return this.props.updatedAt || new Date();
  }

  public changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  public verify(): void {
    this.props.isVerified = true;
    this.props.verificationToken = null;
    this.props.updatedAt = new Date();
  }

  public setVerificationToken(token: string): void {
    this.props.verificationToken = token;
    this.props.updatedAt = new Date();
  }

  public static create(props: UserProps, id?: string): User {
    return new User(props, id);
  }
}

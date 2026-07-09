import { Entity } from "../common/entity";

interface AuditLogProps {
  userId?: string;
  userRole?: string;
  action: string; // AUTH, UPLOAD, PREDICTION, REVIEW, ACCESS, UPDATE
  target: string;
  ipAddress: string;
  payloadHash: string; // Cryptographic hash for tamper evidence
  timestamp: Date;
}

export class AuditLog extends Entity<AuditLogProps> {
  get userId(): string | undefined {
    return this.props.userId;
  }

  get userRole(): string | undefined {
    return this.props.userRole;
  }

  get action(): string {
    return this.props.action;
  }

  get target(): string {
    return this.props.target;
  }

  get ipAddress(): string {
    return this.props.ipAddress;
  }

  get payloadHash(): string {
    return this.props.payloadHash;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  public static create(props: AuditLogProps, id?: string): AuditLog {
    return new AuditLog(props, id);
  }
}

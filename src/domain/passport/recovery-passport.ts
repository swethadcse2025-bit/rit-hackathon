import { Entity } from "../common/entity";
import { RecoveryVersion } from "./recovery-version";

export enum PassportStatus {
  ACTIVE = "ACTIVE",
  RECOVERED = "RECOVERED",
  COMPLICATED = "COMPLICATED"
}

interface RecoveryPassportProps {
  patientId: string;
  currentRecoveryScore: number;
  status: PassportStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RecoveryPassport extends Entity<RecoveryPassportProps> {
  private _versions: RecoveryVersion[] = [];

  get patientId(): string {
    return this.props.patientId;
  }

  get currentRecoveryScore(): number {
    return this.props.currentRecoveryScore;
  }

  get status(): PassportStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  get updatedAt(): Date {
    return this.props.updatedAt || new Date();
  }

  get versions(): RecoveryVersion[] {
    return this._versions;
  }

  public loadVersions(versions: RecoveryVersion[]): void {
    this._versions = versions.sort((a, b) => a.versionNumber - b.versionNumber);
    if (this._versions.length > 0) {
      this.props.currentRecoveryScore = this._versions[this._versions.length - 1].recoveryScore;
    }
  }

  public addNewVersion(version: RecoveryVersion): void {
    // Assert version number is incrementing
    const nextVersionNum = this._versions.length + 1;
    if (version.versionNumber !== nextVersionNum) {
      throw new Error(`Invalid version number. Expected ${nextVersionNum}, got ${version.versionNumber}`);
    }
    this._versions.push(version);
    this.props.currentRecoveryScore = version.recoveryScore;
    this.props.updatedAt = new Date();
  }

  public updateStatus(status: PassportStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  public static create(props: RecoveryPassportProps, id?: string): RecoveryPassport {
    return new RecoveryPassport(props, id);
  }
}

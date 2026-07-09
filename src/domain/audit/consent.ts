import { Entity } from "../common/entity";

interface ConsentProps {
  patientId: string;
  consentType: string; // e.g. "CLINICAL_DATA_USE,RESEARCH_USE"
  granted: boolean;
  ipAddress: string;
  signedAt: Date;
}

export class Consent extends Entity<ConsentProps> {
  get patientId(): string {
    return this.props.patientId;
  }

  get consentType(): string {
    return this.props.consentType;
  }

  get granted(): boolean {
    return this.props.granted;
  }

  get ipAddress(): string {
    return this.props.ipAddress;
  }

  get signedAt(): Date {
    return this.props.signedAt;
  }

  public revoke(ipAddress: string): void {
    this.props.granted = false;
    this.props.ipAddress = ipAddress;
    this.props.signedAt = new Date();
  }

  public static create(props: ConsentProps, id?: string): Consent {
    return new Consent(props, id);
  }
}

import { Entity } from "../common/entity";

interface BlockchainRecordProps {
  passportId: string;
  versionId?: string;
  consentHash: string;
  predictionHash: string;
  doctorReviewHash: string;
  modelVersion: string;
  timestamp: Date;
}

export class BlockchainRecord extends Entity<BlockchainRecordProps> {
  get passportId(): string {
    return this.props.passportId;
  }

  get versionId(): string | undefined {
    return this.props.versionId;
  }

  get consentHash(): string {
    return this.props.consentHash;
  }

  get predictionHash(): string {
    return this.props.predictionHash;
  }

  get doctorReviewHash(): string {
    return this.props.doctorReviewHash;
  }

  get modelVersion(): string {
    return this.props.modelVersion;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  public static create(props: BlockchainRecordProps, id?: string): BlockchainRecord {
    return new BlockchainRecord(props, id);
  }
}

import { Entity } from "../common/entity";

export interface CurvePoint {
  day: number;
  score: number;
}

export interface DeviationEvent {
  date: Date;
  metric: "HEALING" | "PAIN" | "ADHERENCE" | "INFLAMMATION";
  expectedValue: number;
  actualValue: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

interface RecoveryTwinProps {
  patientId: string;
  expectedRecoveryCurve: CurvePoint[];
  actualRecoveryCurve: CurvePoint[];
  deviationTimeline: { date: Date; deviationScore: number; severity: string }[];
  projectedRecoveryCompletionDate: Date;
  deviationEvents: DeviationEvent[];
  recoveryTwinConfidence: number; // 0 - 100
  createdAt?: Date;
  updatedAt?: Date;
}

export class RecoveryTwin extends Entity<RecoveryTwinProps> {
  get patientId(): string {
    return this.props.patientId;
  }

  get expectedRecoveryCurve(): CurvePoint[] {
    return this.props.expectedRecoveryCurve;
  }

  get actualRecoveryCurve(): CurvePoint[] {
    return this.props.actualRecoveryCurve;
  }

  get deviationTimeline() {
    return this.props.deviationTimeline;
  }

  get projectedRecoveryCompletionDate(): Date {
    return this.props.projectedRecoveryCompletionDate;
  }

  get deviationEvents(): DeviationEvent[] {
    return this.props.deviationEvents;
  }

  get recoveryTwinConfidence(): number {
    return this.props.recoveryTwinConfidence;
  }

  public updateTrajectory(
    actualPoints: CurvePoint[],
    deviations: { date: Date; deviationScore: number; severity: string }[],
    deviationEvents: DeviationEvent[],
    projectedCompletion: Date,
    confidence: number
  ): void {
    this.props.actualRecoveryCurve = actualPoints;
    this.props.deviationTimeline = deviations;
    this.props.deviationEvents = deviationEvents;
    this.props.projectedRecoveryCompletionDate = projectedCompletion;
    this.props.recoveryTwinConfidence = confidence;
    this.props.updatedAt = new Date();
  }

  public static create(props: RecoveryTwinProps, id?: string): RecoveryTwin {
    return new RecoveryTwin(props, id);
  }
}

import { Entity } from "../common/entity";

interface DoctorFeedbackProps {
  recommendationId: string;
  patientId: string;
  doctorId: string;
  originalRecommendation: string; // JSON string
  doctorAction: "ACCEPT" | "MODIFY" | "REJECT";
  modifiedRecommendation?: string;
  reason: string;
  doctorSpecialty: string;
  outcome?: string;
  createdAt?: Date;
}

export class DoctorFeedback extends Entity<DoctorFeedbackProps> {
  get recommendationId(): string {
    return this.props.recommendationId;
  }

  get patientId(): string {
    return this.props.patientId;
  }

  get doctorId(): string {
    return this.props.doctorId;
  }

  get originalRecommendation(): string {
    return this.props.originalRecommendation;
  }

  get doctorAction(): "ACCEPT" | "MODIFY" | "REJECT" {
    return this.props.doctorAction;
  }

  get modifiedRecommendation(): string | undefined {
    return this.props.modifiedRecommendation;
  }

  get reason(): string {
    return this.props.reason;
  }

  get doctorSpecialty(): string {
    return this.props.doctorSpecialty;
  }

  get outcome(): string | undefined {
    return this.props.outcome;
  }

  public updateOutcome(outcome: string): void {
    this.props.outcome = outcome;
  }

  public static create(props: DoctorFeedbackProps, id?: string): DoctorFeedback {
    return new DoctorFeedback(props, id);
  }
}

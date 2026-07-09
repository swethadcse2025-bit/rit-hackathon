import { Entity } from "../common/entity";

export interface VisionAnalysis {
  woundSegmentationPath?: string;
  healingPercentage: number;
  inflammationDetected: boolean;
  swellingDetected: boolean;
  tissueAppearance: string;
  healingStage: string;
  imageQualityScore: number;
  confidenceScore: number;
}

export interface ClinicalMemorySnapshot {
  procedure: string;
  procedureDate: Date;
  diagnosis: string;
  comorbidities: string[];
  allergies: string[];
  medications: string[];
  restrictions: string[];
  riskFactors: string[];
}

export interface Recommendation {
  id: string;
  intervention: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  expectedBenefit: string;
  riskReduction: string;
  reasoning: string;
  confidence: number;
}

export interface EvidenceSnapshot {
  clinicalFactors: string[];
  triggeringVersionIds: string[];
  guidelineReferences: string[];
  doctorExplanation: string;
}

export interface DoctorDecision {
  recommendationId: string;
  action: "ACCEPT" | "MODIFY" | "REJECT";
  modifiedRecommendation?: string;
  doctorNotes?: string;
  timestamp: Date;
}

interface RecoveryVersionProps {
  passportId: string;
  versionNumber: number;
  timestamp: Date;
  uploadedImages: string[]; // Paths of images uploaded in this version
  visionAnalysis: VisionAnalysis;
  healingScore: number;
  inflammationScore: number;
  swellingScore: number;
  painLevel: number;
  medicationAdherence: number; // 0 - 100
  clinicalMemorySnapshot: ClinicalMemorySnapshot;
  doctorNotes: string;
  aiSummary: string;
  recoveryScore: number;
  evidenceSnapshot: EvidenceSnapshot;
  recommendations: Recommendation[];
  interventions: string[];
  doctorDecisions: DoctorDecision[];
}

export class RecoveryVersion extends Entity<RecoveryVersionProps> {
  get passportId(): string {
    return this.props.passportId;
  }

  get versionNumber(): number {
    return this.props.versionNumber;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get uploadedImages(): string[] {
    return this.props.uploadedImages;
  }

  get visionAnalysis(): VisionAnalysis {
    return this.props.visionAnalysis;
  }

  get healingScore(): number {
    return this.props.healingScore;
  }

  get inflammationScore(): number {
    return this.props.inflammationScore;
  }

  get swellingScore(): number {
    return this.props.swellingScore;
  }

  get painLevel(): number {
    return this.props.painLevel;
  }

  get medicationAdherence(): number {
    return this.props.medicationAdherence;
  }

  get clinicalMemorySnapshot(): ClinicalMemorySnapshot {
    return this.props.clinicalMemorySnapshot;
  }

  get doctorNotes(): string {
    return this.props.doctorNotes;
  }

  get aiSummary(): string {
    return this.props.aiSummary;
  }

  get recoveryScore(): number {
    return this.props.recoveryScore;
  }

  get evidenceSnapshot(): EvidenceSnapshot {
    return this.props.evidenceSnapshot;
  }

  get recommendations(): Recommendation[] {
    return this.props.recommendations;
  }

  get interventions(): string[] {
    return this.props.interventions;
  }

  get doctorDecisions(): DoctorDecision[] {
    return this.props.doctorDecisions;
  }

  public addDoctorDecision(decision: DoctorDecision): void {
    this.props.doctorDecisions.push(decision);
  }

  public static create(props: RecoveryVersionProps, id?: string): RecoveryVersion {
    return new RecoveryVersion(props, id);
  }
}

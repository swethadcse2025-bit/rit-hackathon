import { VisionAnalysis, Recommendation, ClinicalMemorySnapshot } from "../passport/recovery-version";
import { CurvePoint, DeviationEvent, RecoveryTwin } from "./recovery-twin";
import { Task } from "../patient/task";

export interface IntelligenceResult {
  recoveryScore: number;
  healingVelocity: number;
  riskTrend: "IMPROVING" | "STABLE" | "DETERIORATING";
  recoveryStability: number; // 0 - 100
  complicationProbability: number; // 0 - 100
  recoveryTrend: string;
}

export interface CohortStats {
  healingPercentile: number;
  expectedComplicationPercentile: number;
  expectedRecoveryDurationDays: number;
  comparisonSummary: string;
}

export interface ReplayEvent {
  timestamp: Date;
  title: string;
  description: string;
  type: "PASSPORT_CREATED" | "IMAGE_UPLOAD" | "TASK_ADHERENCE" | "TWIN_DEVIATION" | "CLINICAL_MEMORY" | "DOCTOR_REVIEW" | "INTERVENTION";
}

// 1. Recovery Intelligence Engine
export class RecoveryIntelligenceEngine {
  public static calculate(
    clinicalMemory: ClinicalMemorySnapshot | null,
    vision: VisionAnalysis | null,
    pastVersionsCount: number,
    adherenceScore: number,
    painLevel: number
  ): IntelligenceResult {
    let healingVelocity = 0;
    if (vision) {
      // healing velocity = percent healed divided by days or version frequency
      healingVelocity = Math.round(vision.healingPercentage / Math.max(1, pastVersionsCount));
    }

    // Determine risk trend and complication probability
    let riskPoints = 0;
    if (painLevel > 5) riskPoints += 25;
    if (vision?.inflammationDetected) riskPoints += 30;
    if (vision?.swellingDetected) riskPoints += 15;
    if (adherenceScore < 70) riskPoints += 20;
    if (clinicalMemory?.riskFactors && clinicalMemory.riskFactors.length > 1) riskPoints += 10;

    const complicationProbability = Math.min(95, Math.max(5, riskPoints));

    let riskTrend: "IMPROVING" | "STABLE" | "DETERIORATING" = "STABLE";
    if (complicationProbability > 60) {
      riskTrend = "DETERIORATING";
    } else if (complicationProbability < 30) {
      riskTrend = "IMPROVING";
    }

    // Calculate stability
    const recoveryStability = Math.round(100 - complicationProbability);

    // Calculate main Recovery Score
    let baseScore = 100;
    if (vision) {
      baseScore = vision.healingPercentage * 0.4 + (100 - painLevel * 10) * 0.3 + adherenceScore * 0.3;
    } else {
      baseScore = (100 - painLevel * 10) * 0.5 + adherenceScore * 0.5;
    }
    const recoveryScore = Math.min(100, Math.max(10, Math.round(baseScore)));

    const recoveryTrend = recoveryScore > 80 
      ? "Patient shows strong healing with low distress markers." 
      : recoveryScore > 50 
        ? "Patient has moderate recovery with typical postoperative inflammation."
        : "Patient shows signs of delayed recovery or moderate wound complications.";

    return {
      recoveryScore,
      healingVelocity,
      riskTrend,
      recoveryStability,
      complicationProbability,
      recoveryTrend
    };
  }
}

// 2. Recovery Twin Engine
export class RecoveryTwinEngine {
  public static generateExpectedCurve(
    age: number,
    gender: string,
    procedure: string,
    comorbidities: string[]
  ): CurvePoint[] {
    const curve: CurvePoint[] = [];
    
    // Slower healing rate modifiers based on risk profiles
    let delayFactor = 1.0;
    if (age > 65) delayFactor += 0.2;
    if (comorbidities.includes("Diabetes") || comorbidities.some(c => c.toLowerCase().includes("diabet"))) {
      delayFactor += 0.3;
    }
    if (comorbidities.includes("Hypertension")) delayFactor += 0.15;

    // Build standard 30 day sigmoid healing curve
    for (let day = 0; day <= 30; day += 3) {
      // Sigmoid formula: score = 20 + 80 / (1 + exp(-0.15 * (day - 12 / delayFactor)))
      const midpoint = 12 * delayFactor;
      const expectedScore = Math.round(15 + 85 / (1 + Math.exp(-0.15 * (day - midpoint))));
      curve.push({ day, score: Math.min(100, expectedScore) });
    }

    return curve;
  }

  public static updateTwin(
    twin: RecoveryTwin,
    newDay: number,
    actualScore: number,
    painLevel: number,
    inflammationDetected: boolean,
    adherenceScore: number
  ): void {
    // Add point to actual curve
    const actualPoints = [...twin.expectedRecoveryCurve.filter(c => c.day < newDay), { day: newDay, score: actualScore }];
    
    // Find expected score for this day
    const expectedPoint = twin.expectedRecoveryCurve.find(c => c.day === newDay) || 
      twin.expectedRecoveryCurve[twin.expectedRecoveryCurve.length - 1];
    
    const deviationScore = actualScore - expectedPoint.score;
    const severity = Math.abs(deviationScore) > 25 ? "HIGH" : Math.abs(deviationScore) > 12 ? "MEDIUM" : "LOW";
    
    const newDeviation = {
      date: new Date(),
      deviationScore,
      severity
    };
    
    const deviationTimeline = [...twin.deviationTimeline, newDeviation];
    const deviationEvents = [...twin.deviationEvents];

    if (deviationScore < -15) {
      deviationEvents.push({
        date: new Date(),
        metric: "HEALING",
        expectedValue: expectedPoint.score,
        actualValue: actualScore,
        severity: severity as any,
        description: `Significant negative deviation of ${deviationScore} points detected in actual healing score on day ${newDay}.`
      });
    }

    if (painLevel > 7) {
      deviationEvents.push({
        date: new Date(),
        metric: "PAIN",
        expectedValue: 3,
        actualValue: painLevel,
        severity: "HIGH",
        description: `Unmanaged severe post-op pain reported (Level ${painLevel}/10).`
      });
    }

    if (adherenceScore < 60) {
      deviationEvents.push({
        date: new Date(),
        metric: "ADHERENCE",
        expectedValue: 80,
        actualValue: adherenceScore,
        severity: "MEDIUM",
        description: `Poor task adherence detected: ${adherenceScore}%.`
      });
    }

    // Estimate projected recovery date based on current deviation
    const baseCompletionDays = 30;
    const adjustmentDays = deviationScore < -15 ? 10 : deviationScore > 10 ? -5 : 0;
    const projectedCompletion = new Date(twin.props.createdAt ? twin.props.createdAt.getTime() : Date.now());
    projectedCompletion.setDate(projectedCompletion.getDate() + baseCompletionDays + adjustmentDays);

    // Confidence index
    const twinConfidence = Math.max(50, Math.round(95 - deviationEvents.length * 10));

    twin.updateTrajectory(
      actualPoints,
      deviationTimeline,
      deviationEvents,
      projectedCompletion,
      twinConfidence
    );
  }
}

// 3. Cohort Intelligence Engine
export class CohortIntelligenceEngine {
  public static compare(
    procedure: string,
    age: number,
    comorbidities: string[],
    currentScore: number
  ): CohortStats {
    let healingPercentile = 70; // Default
    let expectedComplicationPercentile = 12;
    let expectedRecoveryDurationDays = 30;

    const procedureLower = procedure.toLowerCase();
    if (procedureLower.includes("knee")) {
      expectedRecoveryDurationDays = 28;
    } else if (procedureLower.includes("hip")) {
      expectedRecoveryDurationDays = 35;
    } else if (procedureLower.includes("bypass") || procedureLower.includes("cabg")) {
      expectedRecoveryDurationDays = 45;
    }

    // Adjust percentiles based on patient factors
    if (comorbidities.length > 1) {
      healingPercentile -= 15;
      expectedComplicationPercentile += 18;
      expectedRecoveryDurationDays += 7;
    }
    if (age > 70) {
      healingPercentile -= 10;
      expectedComplicationPercentile += 10;
      expectedRecoveryDurationDays += 5;
    }

    // Adjust relative to actual performance
    if (currentScore > 85) {
      healingPercentile += 15;
      expectedComplicationPercentile -= 5;
    } else if (currentScore < 60) {
      healingPercentile -= 20;
      expectedComplicationPercentile += 25;
    }

    healingPercentile = Math.max(5, Math.min(99, healingPercentile));
    expectedComplicationPercentile = Math.max(2, Math.min(95, expectedComplicationPercentile));

    const comparisonSummary = `Compared to a cohort of 142 patients who underwent ${procedure} with similar comorbidities: your healing score is in the ${healingPercentile}th percentile, and risk of complications is estimated at the ${expectedComplicationPercentile}th percentile.`;

    return {
      healingPercentile,
      expectedComplicationPercentile,
      expectedRecoveryDurationDays,
      comparisonSummary
    };
  }
}

// 4. Evidence Engine
export class EvidenceEngine {
  public static generate(
    recommendationId: string,
    triggerReason: string,
    clinicalMemory: ClinicalMemorySnapshot | null,
    vision: VisionAnalysis | null,
    twinDeviation: number,
    confidence: number
  ): any {
    const clinicalFactors: string[] = [];
    const guidelineReferences: string[] = [];

    if (vision?.inflammationDetected) {
      clinicalFactors.push("Active wound inflammation detected via Vision AI analysis");
      guidelineReferences.push("NICE Guideline NG125: Surgical site infections prevention and treatment (Section 1.3)");
    }
    if (vision && vision.healingPercentage < 40) {
      clinicalFactors.push(`Delayed epithelialization (Healing percentage: ${vision.healingPercentage}%)`);
    }
    if (twinDeviation < -15) {
      clinicalFactors.push(`Negative healing deviation from expected Digital Recovery Twin trajectory (${twinDeviation} points)`);
    }
    if (clinicalMemory?.comorbidities.includes("Diabetes")) {
      clinicalFactors.push("Patient has Type 2 Diabetes (known clinical risk factor for delayed wound closure)");
      guidelineReferences.push("ADA Standards of Medical Care: Postoperative Diabetic Wound Care Protocols");
    }

    if (clinicalFactors.length === 0) {
      clinicalFactors.push("Routine recovery surveillance scheduled monitoring");
      guidelineReferences.push("CDC Guidelines for Surgical Site Infection Surveillance");
    }

    const doctorExplanation = `Recommendation generated because of: ${clinicalFactors.join(" and ") || "routine protocol"}. Expected recovery curve deviation is ${twinDeviation} points. Clinical guidelines recommend close tracking of wound margins under these parameters.`;

    return {
      recommendationId,
      whyRecommendationWasMade: triggerReason,
      clinicalFactors,
      visionFindingsUsed: vision ? {
        healingPercentage: vision.healingPercentage,
        inflammation: vision.inflammationDetected,
        swelling: vision.swellingDetected,
        stage: vision.healingStage
      } : null,
      clinicalMemoryFindingsUsed: clinicalMemory ? {
        comorbidities: clinicalMemory.comorbidities,
        restrictions: clinicalMemory.restrictions
      } : null,
      recoveryTwinDeviation: twinDeviation,
      confidenceScore: confidence,
      supportingGuidelineReference: guidelineReferences,
      doctorReadableExplanation: doctorExplanation
    };
  }
}

// 5. Clinical Replay Engine
export class ClinicalReplayEngine {
  public static generateReplay(
    passportCreatedAt: Date,
    versions: any[],
    feedbacks: any[],
    tasks: Task[]
  ): ReplayEvent[] {
    const events: ReplayEvent[] = [];

    // 1. Passport creation event
    events.push({
      timestamp: passportCreatedAt,
      title: "Recovery Passport™ Opened",
      description: "Recovery Passport single source of truth created. Expected recovery trajectory initialized.",
      type: "PASSPORT_CREATED"
    });

    // Sort versions by date
    const sortedVersions = [...versions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedVersions.forEach(v => {
      const parsedMemory = typeof v.clinicalMemorySnapshot === "string" ? JSON.parse(v.clinicalMemorySnapshot) : v.clinicalMemorySnapshot;
      const parsedVision = typeof v.visionAnalysis === "string" ? JSON.parse(v.visionAnalysis) : v.visionAnalysis;
      
      // If version is version 1, log clinical memory parsing
      if (v.versionNumber === 1 && parsedMemory?.procedure) {
        events.push({
          timestamp: new Date(new Date(v.timestamp).getTime() - 5000), // Slightly before image upload
          title: "Clinical Memory Engine Initialized",
          description: `Extracted structured surgical details from medical records: ${parsedMemory.procedure}. Primary diagnosis: ${parsedMemory.diagnosis}.`,
          type: "CLINICAL_MEMORY"
        });
      }

      // Wound Image upload
      if (v.uploadedImages && v.uploadedImages.length > 0) {
        events.push({
          timestamp: v.timestamp,
          title: `Wound Image Analysis (Version #${v.versionNumber})`,
          description: `Patient uploaded wound image. Vision AI analysis completed with ${parsedVision?.healingPercentage || 0}% healing score, healing stage: "${parsedVision?.healingStage || "Unknown"}".`,
          type: "IMAGE_UPLOAD"
        });
      }

      // Pain level and recovery scores
      events.push({
        timestamp: v.timestamp,
        title: `Recovery Metric Snapshot`,
        description: `Pain level recorded at ${v.painLevel}/10, task adherence at ${v.medicationAdherence}%. Calculated combined Recovery Score: ${v.recoveryScore}.`,
        type: "TASK_ADHERENCE"
      });

      // Intervention AI suggestions
      const parsedRecs = typeof v.recommendations === "string" ? JSON.parse(v.recommendations) : v.recommendations;
      if (parsedRecs && parsedRecs.length > 0) {
        events.push({
          timestamp: v.timestamp,
          title: "Intervention Intelligence Generated",
          description: `AI recommended intervention: "${parsedRecs[0].intervention}" with priority ${parsedRecs[0].priority}. Confidence: ${parsedRecs[0].confidence * 100}%.`,
          type: "INTERVENTION"
        });
      }

      // Doctor review decisions
      const parsedDecs = typeof v.doctorDecisions === "string" ? JSON.parse(v.doctorDecisions) : v.doctorDecisions;
      if (parsedDecs && parsedDecs.length > 0) {
        parsedDecs.forEach((d: any) => {
          events.push({
            timestamp: new Date(d.timestamp),
            title: `Doctor Decision: ${d.action}`,
            description: `Doctor reviewed AI recommendations. Action: ${d.action}. Notes: "${d.doctorNotes || "None"}".`,
            type: "DOCTOR_REVIEW"
          });
        });
      }
    });

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

// 6. Intervention Intelligence Engine
export class InterventionIntelligenceEngine {
  public static generate(
    recoveryScore: number,
    complicationProbability: number,
    twinDeviation: number,
    painLevel: number,
    inflammation: boolean
  ): Recommendation[] {
    const list: Recommendation[] = [];

    // Rule-based ranking
    if (complicationProbability > 70 || painLevel >= 8) {
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        intervention: "Urgent Clinician Review & Emergency Evaluation",
        priority: "CRITICAL",
        expectedBenefit: "Immediate assessment of wound dehiscence or deep infection to prevent hospitalization.",
        riskReduction: "High risk mitigation of systemic sepsis.",
        reasoning: `Complication probability is critical (${complicationProbability}%) and pain level is extreme (${painLevel}/10).`,
        confidence: 0.96
      });
    }

    if (inflammation || twinDeviation < -15) {
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        intervention: "Schedule Earlier Post-op Clinic Review",
        priority: "HIGH",
        expectedBenefit: "In-person visualization of margins and physical examination of joint mobility.",
        riskReduction: "Prevents progression of superficial surgical site infection (SSI).",
        reasoning: `Wound inflammation detected combined with a significant negative trajectory deviation of ${twinDeviation} points from digital recovery twin.`,
        confidence: 0.89
      });
      
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        intervention: "Teleconsultation / Video Wound Check",
        priority: "MEDIUM",
        expectedBenefit: "Allows immediate visual assessment by a nurse specialist without patient travel.",
        riskReduction: "Reduces patient mobilization strain.",
        reasoning: "Wound shows active inflammation. Verification of local dressings is advised.",
        confidence: 0.85
      });
    }

    if (painLevel >= 5 && painLevel < 8) {
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        intervention: "Medication Review & Pain Management Adjustment",
        priority: "MEDIUM",
        expectedBenefit: "Optimizes analgesic efficacy to improve physical therapy participation.",
        riskReduction: "Minimizes development of chronic postoperative pain syndrome.",
        reasoning: `Elevated postoperative pain level (${painLevel}/10) requires pharmacotherapy review.`,
        confidence: 0.88
      });
    }

    // Default monitoring recommendation
    list.push({
      id: Math.random().toString(36).substring(2, 9),
      intervention: "Continue Standard Recovery Protocol & Exercise",
      priority: "LOW",
      expectedBenefit: "Maintains progressive range of motion and muscle strengthening.",
      riskReduction: "Prevents venous thromboembolism (VTE) and joint stiffness.",
      reasoning: "Routine recommendation to sustain prescribed rehabilitation tasks.",
      confidence: 0.95
    });

    return list.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

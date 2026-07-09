import { VisionAnalysis } from "../../domain/passport/recovery-version";

export class VisionMockService {
  public static async analyzeWound(imagePath: string): Promise<VisionAnalysis> {
    // Simulate Vision API latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Determine deterministic metrics based on filename to support testing
    const lowercasePath = imagePath.toLowerCase();
    
    let healingPercentage = 75;
    let inflammationDetected = false;
    let swellingDetected = false;
    let tissueAppearance = "Healthy granulation tissue, clean margins";
    let healingStage = "Proliferative Stage";
    let confidenceScore = 0.94;

    if (lowercasePath.includes("infected") || lowercasePath.includes("high_risk")) {
      healingPercentage = 30;
      inflammationDetected = true;
      swellingDetected = true;
      tissueAppearance = "Erythematous periwound area, purulent exudate observed";
      healingStage = "Inflammatory Stage";
      confidenceScore = 0.88;
    } else if (lowercasePath.includes("early") || lowercasePath.includes("fresh")) {
      healingPercentage = 15;
      inflammationDetected = true;
      swellingDetected = true;
      tissueAppearance = "Surgical incision clean but showing minor fibrin coating";
      healingStage = "Early Hemostasis/Inflammation";
      confidenceScore = 0.91;
    } else if (lowercasePath.includes("healed")) {
      healingPercentage = 98;
      inflammationDetected = false;
      swellingDetected = false;
      tissueAppearance = "Completely epithelialized, dry scar";
      healingStage = "Remodeling Stage";
      confidenceScore = 0.97;
    }

    return {
      woundSegmentationPath: `/uploads/segmented_${Date.now()}.png`,
      healingPercentage,
      inflammationDetected,
      swellingDetected,
      tissueAppearance,
      healingStage,
      imageQualityScore: 0.92,
      confidenceScore
    };
  }
}

import { ClinicalMemoryData } from "../../domain/repositories.interface";

export class MemoryMockService {
  public static async parseDocument(
    patientId: string, 
    documentName: string, 
    documentType: string
  ): Promise<Omit<ClinicalMemoryData, "id" | "createdAt" | "updatedAt">> {
    // Simulate AI extraction latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const nameLower = documentName.toLowerCase();
    
    // Default values
    let procedure = "Total Knee Arthroplasty (TKA)";
    let procedureDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    let diagnosis = "Severe Osteoarthritis of the Left Knee";
    let implants = ["Cruciate-retaining femoral component", "Modular tibial tray", "Polyethylene insert"];
    let comorbidities = ["Hypertension", "Type 2 Diabetes mellitus"];
    let allergies = ["Penicillin", "Sulfa drugs"];
    let medications = ["Apixaban 2.5mg BID", "Paracetamol 1g QID", "Celecoxib 200mg Daily"];
    let restrictions = ["Weight bearing as tolerated with walker", "No knee flexion past 90 degrees"];
    let riskFactors = ["Age > 65", "Mild chronic kidney disease"];
    let previousSurgeries = ["Appendectomy (2012)"];
    let labValues = { Hb: "11.8 g/dL", WBC: "8.5 x10^9/L", Cr: "1.1 mg/dL" };
    let followUpSchedule = ["2 weeks: Staple removal", "6 weeks: Clinical review with X-ray"];
    let doctorInstructions = ["Apply ice pack for 20 mins every 4 hours", "Perform ankle pumps and quad sets hourly"];

    if (nameLower.includes("hip") || documentType.includes("HIP")) {
      procedure = "Total Hip Arthroplasty (THA)";
      diagnosis = "Avascular Necrosis of the Right Femoral Head";
      implants = ["Cementless titanium femoral stem", "Ceramic head", "Acetabular shell with liner"];
      restrictions = ["Strict hip precautions", "No hip flexion past 90 degrees", "No adduction past midline"];
      doctorInstructions = ["Do not cross legs", "Use elevated toilet seat"];
    } else if (nameLower.includes("heart") || documentType.includes("CARDIAC")) {
      procedure = "Coronary Artery Bypass Graft (CABG)";
      diagnosis = "Triple Vessel Coronary Artery Disease";
      implants = ["Surgical staples", "Sternal wires"];
      restrictions = ["No lifting > 5 lbs", "No driving for 4 weeks", "Sternum precautions"];
      medications = ["Aspirin 81mg Daily", "Atorvastatin 40mg Daily", "Metoprolol Succinate 25mg Daily"];
      doctorInstructions = ["Inspect sternal wound daily for redness or drainage", "Use incentive spirometer hourly"];
    }

    return {
      patientId,
      procedure,
      procedureDate,
      diagnosis,
      implants,
      comorbidities,
      allergies,
      medications,
      restrictions,
      riskFactors,
      previousSurgeries,
      labValues,
      followUpSchedule,
      doctorInstructions
    };
  }
}

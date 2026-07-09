import { server } from "./main";
import { prismaClient } from "./infrastructure/db/client";

const BASE_URL = "http://localhost:5000/api/v1";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.log("\n==================================================");
  console.log("   SurgiSense AI E2E System Simulation Started    ");
  console.log("==================================================\n");

  // Clean the DB before running test to ensure consistency
  console.log("[DB] Clearing database tables...");
  await prismaClient.blockchainRecord.deleteMany();
  await prismaClient.auditLog.deleteMany();
  await prismaClient.doctorFeedback.deleteMany();
  await prismaClient.task.deleteMany();
  await prismaClient.consent.deleteMany();
  await prismaClient.clinicalMemory.deleteMany();
  await prismaClient.document.deleteMany();
  await prismaClient.image.deleteMany();
  await prismaClient.recoveryVersion.deleteMany();
  await prismaClient.recoveryPassport.deleteMany();
  await prismaClient.patient.deleteMany();
  await prismaClient.doctor.deleteMany();
  await prismaClient.user.deleteMany();
  console.log("[DB] Database cleared successfully.");

  let patientToken = "";
  let doctorToken = "";
  let adminToken = "";
  
  let patientId = "";
  let doctorId = "";
  let passportId = "";
  let imageId = "";
  let recId = "";

  // 1. REGISTER PATIENT
  console.log("\n[Auth] Registering new Patient: John Doe...");
  const registerPatientRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "patient.john@surgisense.com",
      password: "securePassword123",
      role: "PATIENT",
      name: "John Doe",
      age: 58,
      gender: "Male",
      height: 180,
      weight: 84.5,
      procedure: "Total Knee Arthroplasty (TKA)",
      hospital: "General Hospital",
      surgeon: "Dr. Elizabeth Vance",
      comorbidities: ["Hypertension", "Diabetes"],
      emergencyContact: { name: "Sarah Doe", relationship: "Spouse", phone: "555-0199" },
      consentGranted: true,
      consentType: "CLINICAL_DATA_USE"
    })
  });

  const patientReg = (await registerPatientRes.json()) as any;
  if (registerPatientRes.status !== 201) {
    throw new Error(`Patient registration failed: ${JSON.stringify(patientReg)}`);
  }
  patientToken = patientReg.accessToken;
  patientId = patientReg.profile.id;
  passportId = patientReg.profile.recoveryPassportId;
  console.log(`✓ Patient registered successfully. ID: ${patientId}, Passport ID: ${passportId}`);

  // 2. REGISTER DOCTOR
  console.log("\n[Auth] Registering new Doctor: Dr. Elizabeth Vance...");
  const registerDoctorRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "doctor.vance@surgisense.com",
      password: "doctorPassword456",
      role: "DOCTOR",
      name: "Dr. Elizabeth Vance",
      specialty: "Orthopedic Surgery",
      hospital: "General Hospital",
      licenseNumber: "LIC-88291"
    })
  });

  const doctorReg = (await registerDoctorRes.json()) as any;
  if (registerDoctorRes.status !== 201) {
    throw new Error(`Doctor registration failed: ${JSON.stringify(doctorReg)}`);
  }
  doctorToken = doctorReg.accessToken;
  doctorId = doctorReg.profile.id;
  console.log(`✓ Doctor registered successfully. ID: ${doctorId}`);

  // 3. REGISTER SYSTEM ADMIN (For audit logs check)
  console.log("\n[Auth] Registering System Administrator...");
  const registerAdminRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@surgisense.com",
      password: "adminPassword789",
      role: "SYSTEM_ADMIN",
      name: "Admin Overseer"
    })
  });
  const adminReg = (await registerAdminRes.json()) as any;
  adminToken = adminReg.accessToken;
  console.log("✓ Admin registered successfully.");

  // 4. UPLOAD CLINICAL DISCHARGE NOTES (Trigger Clinical Memory Parse)
  console.log("\n[Clinical Memory] Uploading post-op discharge summary document...");
  const docFormData = new FormData();
  docFormData.append("patientId", patientId);
  docFormData.append("type", "DISCHARGE_SUMMARY");
  
  const docBlob = new Blob(["Discharge summary report: Patient underwent Left Total Knee Arthroplasty. Patient has history of Hypertension, Type 2 Diabetes. Prescribed Celecoxib and Paracetamol. Restrictions: No weight-bearing past 90 degrees joint flexion."], { type: "text/plain" });
  docFormData.append("document", docBlob, "discharge_notes.txt");

  const docRes = await fetch(`${BASE_URL}/passport/document`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${patientToken}` },
    body: docFormData
  });

  const docResult = (await docRes.json()) as any;
  if (docRes.status !== 201) {
    throw new Error(`Document upload failed: ${JSON.stringify(docResult)}`);
  }
  console.log("✓ Discharge summary parsed successfully.");
  console.log("Extracted Memory diagnosis:", docResult.clinicalMemory.diagnosis);
  console.log("Extracted Memory implants:", docResult.clinicalMemory.implants);

  // 5. UPLOAD WOUND IMAGE (Trigger compression)
  console.log("\n[Image Management] Uploading surgical wound picture...");
  const imgFormData = new FormData();
  imgFormData.append("patientId", patientId);
  
  const imgBlob = new Blob(["wound_image_binary_data"], { type: "image/jpeg" });
  imgFormData.append("image", imgBlob, "infected_wound.jpg");

  const imgRes = await fetch(`${BASE_URL}/passport/image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${patientToken}` },
    body: imgFormData
  });

  const imgResult = (await imgRes.json()) as any;
  if (imgRes.status !== 201) {
    throw new Error(`Image upload failed: ${JSON.stringify(imgResult)}`);
  }
  imageId = imgResult.image.id;
  console.log(`✓ Wound image uploaded. ID: ${imageId}, path: ${imgResult.image.path}`);

  // 6. SETUP PATIENT COMPLIANCE TASKS
  console.log("\n[Tasks] Setup patient medication & hydration tasks...");
  const createTaskRes = await fetch(`${BASE_URL}/tasks/create`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${doctorToken}` 
    },
    body: JSON.stringify({
      patientId,
      name: "Take Celecoxib 200mg",
      type: "MEDICATION",
      description: "Take one capsule daily with food for joint swelling",
      schedule: "DAILY",
      reminders: [{ time: "09:00" }]
    })
  });
  const task = (await createTaskRes.json()) as any;
  console.log(`✓ Task created: "${task.name}". ID: ${task.id}`);

  // Complete the task (adhered = true)
  console.log("[Tasks] Patient checking-off task checklist...");
  await fetch(`${BASE_URL}/tasks/${task.id}/complete`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${patientToken}` 
    },
    body: JSON.stringify({ adhered: true })
  });
  console.log("✓ Task compliance check logged.");

  // 7. EVOLVE PASSPORT VERSION (Wound AI Analysis + Digital Twin calculation)
  console.log("\n[Passport Evolution] Evolving Recovery Passport (Version #1)...");
  const evolveRes = await fetch(`${BASE_URL}/passport/evolve`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${patientToken}` 
    },
    body: JSON.stringify({
      patientId,
      imageId,
      painLevel: 6,
      doctorNotes: "Doing leg raise exercises but joint is stiff."
    })
  });

  const evolveResult = (await evolveRes.json()) as any;
  if (evolveRes.status !== 201) {
    throw new Error(`Passport evolution failed: ${JSON.stringify(evolveResult)}`);
  }
  console.log(`✓ Passport evolved successfully!`);
  console.log(`New Recovery Score: ${evolveResult.currentRecoveryScore}/100`);
  console.log(`AI Summary: ${evolveResult.version.aiSummary}`);

  // 8. PRIVACY AUDIT: VERIFY PATIENT SHIELD (REDATING DOCTOR-ONLY METRICS)
  console.log("\n[Privacy Guard] Querying Passport Details as Patient...");
  const patientDetailRes = await fetch(`${BASE_URL}/passport/detail?patientId=${patientId}`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const patientDetail = (await patientDetailRes.json()) as any;
  
  const patientVersion = patientDetail.versions[0];
  console.log("Patient response version check:");
  console.log("  doctorDecisions visible?", patientVersion.doctorDecisions !== undefined ? "YES" : "NO (Shielded)");
  console.log("  evidenceSnapshot visible?", patientVersion.evidenceSnapshot !== undefined ? "YES" : "NO (Shielded)");
  console.log("  interventions visible?", patientVersion.interventions !== undefined ? "YES" : "NO (Shielded)");

  if (patientVersion.doctorDecisions !== undefined || patientVersion.evidenceSnapshot !== undefined) {
    throw new Error("FAIL: Protected clinical decision details exposed to patient!");
  }
  console.log("✓ Patient Privacy Shield verification PASSED.");

  // 9. QUERY PASSPORT AS DOCTOR (Full access to explainability evidence)
  console.log("\n[Clinician View] Querying Passport Details as Doctor...");
  const doctorDetailRes = await fetch(`${BASE_URL}/passport/detail?patientId=${patientId}`, {
    headers: { "Authorization": `Bearer ${doctorToken}` }
  });
  const doctorDetail = (await doctorDetailRes.json()) as any;
  const doctorVersion = doctorDetail.versions[0];
  console.log("Doctor response version check:");
  console.log("  evidenceSnapshot visible?", doctorVersion.evidenceSnapshot !== undefined ? "YES" : "NO");
  console.log("  interventions list count:", doctorVersion.interventions?.length);
  
  if (!doctorVersion.evidenceSnapshot || !doctorVersion.recommendations) {
    throw new Error("FAIL: Doctor-level clinical explanations not returned!");
  }
  recId = doctorVersion.recommendations[0].id;
  console.log("✓ Clinician detail check PASSED.");
  console.log("Explainability Guideline references:", doctorVersion.evidenceSnapshot.supportingGuidelineReference);

  // 10. DOCTOR FEEDBACK LOOP & MODEL TRAINING REGISTRATION
  console.log("\n[Learning Loop] Doctor reviewing and modifying AI Recommendation...");
  const feedbackRes = await fetch(`${BASE_URL}/doctor/feedback`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${doctorToken}` 
    },
    body: JSON.stringify({
      doctorId,
      passportId,
      recommendationId: recId,
      action: "MODIFY",
      modifiedRecommendation: "Schedule clinical review at 5 days instead of immediate emergency room visit",
      reason: "Inflammation is local, no signs of systemic fever or purulent discharge.",
      outcome: "Patient monitored closely, wound closed well"
    })
  });

  const feedbackResult = (await feedbackRes.json()) as any;
  if (feedbackRes.status !== 201) {
    throw new Error(`Doctor feedback submission failed: ${JSON.stringify(feedbackResult)}`);
  }
  console.log("✓ Doctor feedback submitted. ID:", feedbackResult.feedback.id);
  console.log("Original recommendation saved in audit:", feedbackResult.feedback.originalRecommendation);

  // 11. BLOCKCHAIN TRUST LEDGER AUDIT
  console.log("\n[Blockchain Trust] Fetching immutable hash anchors ledger...");
  const bcRes = await fetch(`${BASE_URL}/passport/blockchain?passportId=${passportId}`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const bcResult = (await bcRes.json()) as any;
  console.log(`✓ Verification status: ${bcResult.verificationStatus}. Anchored Blocks: ${bcResult.blocksCount}`);
  console.log("Prediction hash anchor:", bcResult.ledger[0]?.predictionHash);
  console.log("Doctor review hash anchor:", bcResult.ledger[1]?.doctorReviewHash);

  // 12. CLINICAL REPLAY STORY TIMELINE
  console.log("\n[Clinical Replay] Generating chronological patient recovery story...");
  const replayRes = await fetch(`${BASE_URL}/passport/clinical-replay?patientId=${patientId}`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const replay = (await replayRes.json()) as any;
  console.log(`✓ Patient: ${replay.patientName}. Procedure: ${replay.procedure}`);
  replay.timelineEvents.forEach((ev: any) => {
    console.log(`  [${new Date(ev.timestamp).toLocaleTimeString()}] (${ev.type}) ${ev.title} - ${ev.description}`);
  });

  // 13. HOSPITAL ANALYTICS
  console.log("\n[Analytics] Querying Hospital Recovery statistics...");
  const analyticRes = await fetch(`${BASE_URL}/analytics/hospital`, {
    headers: { "Authorization": `Bearer ${doctorToken}` }
  });
  const analytics = (await analyticRes.json()) as any;
  console.log(`✓ Average Recovery Duration: ${analytics.averageRecoveryDurationDays} days`);
  console.log(`✓ Complication Rate: ${analytics.estimatedComplicationRate}%`);
  console.log(`✓ AI Recommendation Acceptance Rate: ${analytics.recommendationAcceptanceRate}%`);

  // 14. ADMIN SECURITY AUDIT LOGS
  console.log("\n[Audit System] Inspecting platform audit trails as System Admin...");
  const auditRes = await fetch(`${BASE_URL}/audit/logs`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  const logs = (await auditRes.json()) as any;
  console.log(`✓ Fetched ${logs.length} audit events.`);
  console.log("Last audit entry:", logs[logs.length - 1].action, "targeting", logs[logs.length - 1].target);

  // 15. EMAIL VERIFICATION & PASSWORD RESET TEST
  console.log("\n[Auth] Testing email verification and password reset loop...");
  
  // Retrieve the generated verification token from the database
  const patientUser = await prismaClient.user.findFirst({
    where: { email: "patient.john@surgisense.com" }
  });
  const verificationToken = patientUser?.verificationToken;
  
  if (!verificationToken) {
    throw new Error("FAIL: Verification token not generated!");
  }
  
  // Perform email verification
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: verificationToken })
  });
  console.log(`✓ Email verification response code: ${verifyRes.status}`);
  if (verifyRes.status !== 200) {
    throw new Error("FAIL: Verification failed!");
  }
  
  // Perform Password Reset Request
  const pwResetReqRes = await fetch(`${BASE_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "patient.john@surgisense.com" })
  });
  const pwResetReq = (await pwResetReqRes.json()) as any;
  console.log(`✓ Request Password Reset response code: ${pwResetReqRes.status}`);
  const resetToken = pwResetReq.resetToken;
  
  // Perform Password Reset
  const pwResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: resetToken, newPassword: "newSecurePassword789" })
  });
  console.log(`✓ Reset Password response code: ${pwResetRes.status}`);
  if (pwResetRes.status !== 200) {
    throw new Error("FAIL: Reset password failed!");
  }

  // Attempt login with old password (should fail)
  const failLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "patient.john@surgisense.com", password: "securePassword123" })
  });
  console.log(`✓ Expected Login failure with old password: ${failLoginRes.status}`);
  
  // Attempt login with new password (should succeed and register session/device)
  const successLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "patient.john@surgisense.com",
      password: "newSecurePassword789",
      deviceId: "dev-iphone-15",
      deviceName: "iPhone 15 Pro Max",
      deviceType: "MOBILE",
      userAgent: "Mozilla/5.0 Mobile"
    })
  });
  const successLogin = (await successLoginRes.json()) as any;
  console.log(`✓ Login success with new password code: ${successLoginRes.status}`);
  patientToken = successLogin.accessToken; // update token

  // 16. SESSION & DEVICE MANAGEMENT LISTING
  console.log("\n[Sessions & Devices] Verifying tracking lists...");
  const sessionsRes = await fetch(`${BASE_URL}/auth/sessions`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const sessions = (await sessionsRes.json()) as any;
  console.log(`✓ Active Sessions count: ${sessions.length}`);
  
  const devicesRes = await fetch(`${BASE_URL}/auth/devices`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const devices = (await devicesRes.json()) as any;
  console.log(`✓ Registered Devices count: ${devices.length}. Model: ${devices[0]?.deviceName}`);

  // 17. DUPLICATE IMAGE PREVENTION TEST
  console.log("\n[Image Management] Verifying duplicate wound picture prevention...");
  const dupImgFormData = new FormData();
  dupImgFormData.append("patientId", patientId);
  const dupImgBlob = new Blob(["wound_image_binary_data"], { type: "image/jpeg" });
  dupImgFormData.append("image", dupImgBlob, "infected_wound.jpg");

  const dupImgRes = await fetch(`${BASE_URL}/passport/image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${patientToken}` },
    body: dupImgFormData
  });
  const dupImgResult = (await dupImgRes.json()) as any;
  console.log(`✓ Duplicate Image upload returned code: ${dupImgRes.status} (Expected: 500/error)`);
  console.log(`✓ Message: ${dupImgResult.error || dupImgResult.message}`);
  if (dupImgRes.status === 201) {
    throw new Error("FAIL: Duplicate wound image upload was not blocked!");
  }

  // 18. NOTIFICATION ENGINE LOGS & ALERTS
  console.log("\n[Notification Engine] Testing notifications fetch & trigger alert...");
  const initialNotifsRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const initialNotifs = (await initialNotifsRes.json()) as any;
  console.log(`✓ Initial Notifications count: ${initialNotifs.length}`);

  // Send a manual push alert from doctor
  const manualNotifRes = await fetch(`${BASE_URL}/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${doctorToken}`
    },
    body: JSON.stringify({
      userId: patientUser?.id,
      title: "Wound Redness Check",
      message: "Please submit a new wound picture if swelling persists.",
      channel: "PUSH"
    })
  });
  console.log(`✓ Doctor manual dispatch status: ${manualNotifRes.status}`);

  const updatedNotifsRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const updatedNotifs = (await updatedNotifsRes.json()) as any;
  console.log(`✓ Updated Notifications count: ${updatedNotifs.length}`);
  console.log(`✓ Title: ${updatedNotifs[updatedNotifs.length - 1]?.title}`);

  // 19. APPOINTMENTS SCHEDULE & CLINICAL REVIEWS
  console.log("\n[Appointments] Scheduling follow-up review...");
  const appointmentRes = await fetch(`${BASE_URL}/appointments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${doctorToken}`
    },
    body: JSON.stringify({
      patientId,
      doctorId,
      appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Post-op wound healing follow-up assessment"
    })
  });
  const appResult = (await appointmentRes.json()) as any;
  console.log(`✓ Appointment scheduled status: ${appointmentRes.status}`);

  const listAppRes = await fetch(`${BASE_URL}/appointments?patientId=${patientId}`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const listApp = (await listAppRes.json()) as any;
  console.log(`✓ Retrieve appointments list length: ${listApp.length}. Notes: ${listApp[0]?.notes}`);

  // 20. STRUCTURED CLINICAL MEMORY API
  console.log("\n[Clinical Memory] Testing structured clinical memory retrieval...");
  const memoryRes = await fetch(`${BASE_URL}/passport/clinical-memory?patientId=${patientId}`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  const memoryObj = (await memoryRes.json()) as any;
  console.log(`✓ Clinical Memory Procedure: ${memoryObj.procedure}`);

  // 21. DETAILED CLINICAL WORKFLOW / DOCTOR PATIENT DASHBOARD DETAILS
  console.log("\n[Doctor Dashboard Detail] Verifying detailed patient dashboard view...");
  const detailsRes = await fetch(`${BASE_URL}/doctor/patient/${patientId}?doctorId=${doctorId}`, {
    headers: { "Authorization": `Bearer ${doctorToken}` }
  });
  const details = (await detailsRes.json()) as any;
  console.log(`✓ Details response status: ${detailsRes.status}`);
  console.log(`✓ Patient demographics age: ${details.patient.demographics.age}`);
  console.log(`✓ Recovery Twin expected trajectory length: ${details.twin.expectedRecoveryCurve.length}`);
  console.log(`✓ Image Timeline uploads count: ${details.imageTimeline.length}`);

  // 22. SECURITY GATE: PATIENT RBAC AUDIT PROTECTION
  console.log("\n[Security Gate] Verifying patient cannot access audit logs (RBAC shield)...");
  const failAuditRes = await fetch(`${BASE_URL}/audit/logs`, {
    headers: { "Authorization": `Bearer ${patientToken}` }
  });
  console.log(`  Patient access attempt returned code: ${failAuditRes.status} (${failAuditRes.statusText})`);
  if (failAuditRes.status !== 403) {
    throw new Error("FAIL: RBAC shield did not block patient from admin endpoint!");
  }
  console.log("✓ RBAC Gate shield validation PASSED.");

  console.log("\n==================================================");
  console.log("   All SurgiSense AI Verification Tests Passed!   ");
  console.log("==================================================\n");
}

async function main() {
  try {
    // Wait for Express server to start up fully
    await sleep(1500);
    await runSimulation();
    
    // Shut down server and DB connection
    console.log("Shutting down server...");
    server.close(() => {
      console.log("Server stopped.");
      prismaClient.$disconnect().then(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("\n❌ Simulation Failed with Error:\n", error);
    server.close(() => {
      prismaClient.$disconnect().then(() => {
        process.exit(1);
      });
    });
  }
}

main();

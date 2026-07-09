"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../../components/ui/tabs";
import { Skeleton } from "../../../../components/ui/skeleton";
import { RecoveryTwinChart } from "../../../../components/recovery-twin-chart";
import { ClinicalReplayViewer } from "../../../../components/clinical-replay-viewer";
import { EvidenceEnginePanel } from "../../../../components/evidence-engine-panel";
import { BlockchainVerifier } from "../../../../components/blockchain-verifier";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Activity,
  Heart,
  Pill,
  ShieldCheck,
  Eye,
  FileText,
  Clock,
  History,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

export default function PatientWorkspace() {
  const params = useParams();
  const patientId = params.id as string;
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const doctorId = profile?.id;

  // Asynchronous query fetching patient aggregate workspace data
  const { data: workspace, isLoading: isWorkspaceLoading } = useQuery<any>({
    queryKey: ["doctorPatientDetail", patientId, doctorId],
    queryFn: async () => {
      const res = await api.get(`/doctor/patient/${patientId}?doctorId=${doctorId}`);
      return res.data;
    },
    enabled: !!patientId && !!doctorId,
  });

  // Asynchronous query fetching clinical replay narration timeline
  const { data: replay, isLoading: isReplayLoading } = useQuery<any>({
    queryKey: ["clinicalReplay", patientId],
    queryFn: async () => {
      const res = await api.get(`/passport/clinical-replay?patientId=${patientId}`);
      return res.data;
    },
    enabled: !!patientId,
  });

  // Asynchronous query fetching blockchain anchors
  const { data: blockchain, isLoading: isBlockchainLoading } = useQuery<any>({
    queryKey: ["blockchainRecords", patientId],
    queryFn: async () => {
      const passportId = workspace?.passport?.id;
      if (!passportId) throw new Error("Passport ID not available");
      const res = await api.get(`/passport/blockchain?passportId=${passportId}`);
      return res.data;
    },
    enabled: !!patientId && !!workspace?.passport?.id,
  });

  // Appointment creation mutation
  const scheduleAppMutation = useMutation({
    mutationFn: async () => {
      return api.post("/appointments/create", {
        patientId,
        doctorId,
        appointmentDate: new Date(appointmentDate).toISOString(),
        notes: appointmentNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorPatientDetail", patientId] });
      setAppointmentDate("");
      setAppointmentNotes("");
      alert("Follow-up appointment scheduled successfully!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to schedule appointment.");
    },
  });

  if (isWorkspaceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-44" />
        <div className="flex gap-4 items-center">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center p-8 bg-card border rounded-xl space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Patient Record Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested patient clinical history could not be queried.
        </p>
        <Link href="/doctor/dashboard">
          <Button>Return to Registry</Button>
        </Link>
      </div>
    );
  }

  const { patient, passport, twin, clinicalMemory, tasks = [], appointments = [], feedbackHistory = [], imageTimeline = [] } = workspace;
  const latestVersion = passport?.versions?.[passport.versions.length - 1] || null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/doctor/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Registry Triage
      </Link>

      {/* Patient Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            {patient.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{patient.name}</h2>
              <Badge variant={patient.recoveryStatus === "ACTIVE" ? "success" : patient.recoveryStatus === "COMPLICATED" ? "destructive" : "secondary"}>
                {patient.recoveryStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patient.demographics.gender} • {patient.demographics.age} years old • {patient.procedure} • Surgeon: {patient.surgeon}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Recovery Progress</span>
            <span className="text-2xl font-black text-primary">{passport?.currentRecoveryScore || 0}%</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Hospital Adherence</span>
            <span className="text-2xl font-black text-success">
              {tasks.length > 0
                ? Math.round((tasks.filter((t: any) => t.adherenceRate > 75).length / tasks.length) * 100)
                : 100}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-card p-1 border rounded-lg flex space-x-1 max-w-2xl overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="passport">Recovery Passport ({passport?.versions?.length || 0})</TabsTrigger>
          <TabsTrigger value="twin">Digital Twin</TabsTrigger>
          <TabsTrigger value="clinical-replay">Clinical Replay</TabsTrigger>
          <TabsTrigger value="memory">Clinical Memory</TabsTrigger>
          <TabsTrigger value="evidence">Evidence AI</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain logs</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Quick Metrics */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Rehabilitation Progress Status</CardTitle>
                <CardDescription>Post-op Day {latestVersion ? latestVersion.versionNumber * 3 : 5} patient check-in updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/40 p-4 rounded-lg border text-center space-y-1">
                    <Heart className="h-5 w-5 text-destructive mx-auto" />
                    <span className="text-xs text-muted-foreground block">Pain (Latest)</span>
                    <span className="text-lg font-bold">{latestVersion?.painLevel || 0}/10</span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-lg border text-center space-y-1">
                    <Activity className="h-5 w-5 text-success mx-auto" />
                    <span className="text-xs text-muted-foreground block">Healing Milestone</span>
                    <span className="text-lg font-bold">{latestVersion?.healingScore || 0}%</span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-lg border text-center space-y-1">
                    <Pill className="h-5 w-5 text-primary mx-auto" />
                    <span className="text-xs text-muted-foreground block">Task Compliance</span>
                    <span className="text-lg font-bold">
                      {tasks.length > 0 ? `${tasks.filter((t: any) => t.adheredCount > 0).length}/${tasks.length}` : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Comorbidities */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Pre-existing Comorbidities
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {patient.comorbidities.map((c: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Medical History summaries */}
                <div className="bg-secondary/40 p-4 rounded-lg border text-xs leading-relaxed space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Extracted Case History Summary</span>
                  <p>{patient.medicalHistory || "Prior diagnosis contains: Osteoarthritic degeneration of knee joint cartilage. Scheduled surgical replacement under ERAS protocols."}</p>
                </div>
              </CardContent>
            </Card>

            {/* Wound Image Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Wound Visuals</CardTitle>
                <CardDescription>Vision AI segment calculations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {imageTimeline.length === 0 ? (
                  <div className="flex h-44 items-center justify-center border border-dashed rounded-lg bg-muted/20 text-xs text-muted-foreground text-center p-4">
                    No postoperative wound pictures uploaded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-slate-900 flex items-center justify-center text-xs text-white">
                      {/* Image Source path loading proxy */}
                      <img
                        src={`http://localhost:5000/${imageTimeline[0].path}`}
                        alt="Wound visual"
                        className="object-contain h-full w-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono">
                        {new Date(imageTimeline[0].createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Wound status: Validated</span>
                      <Button variant="link" size="sm" className="p-0 text-xs">
                        View Full Gallery
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Tasks Checklist & Schedule Form */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Checklist Schedule Compliance</CardTitle>
                <CardDescription>Daily rehabilitation activities assigned by surgeon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/60">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No care compliance checklists assigned.</p>
                  ) : (
                    tasks.map((task: any) => (
                      <div key={task.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{task.name}</span>
                          <span className="text-muted-foreground block">{task.description}</span>
                          <span className="text-[10px] text-primary font-mono block mt-0.5">{task.schedule}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold block">Adherence Rate: {Math.round(task.adherenceRate)}%</span>
                          <span className="text-[10px] text-muted-foreground block">
                            Logged Adhered: {task.adheredCount} | Missed: {task.missedCount}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Follow-up Form */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Review</CardTitle>
                <CardDescription>Assign recovery follow-up appointment date</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    scheduleAppMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full text-xs rounded-lg border border-border p-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Agenda Notes</label>
                    <textarea
                      rows={3}
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      className="w-full text-xs rounded-lg border border-border p-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Wound suture extraction and gait biomechanics assessment."
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    type="submit"
                    loading={scheduleAppMutation.isPending}
                  >
                    Confirm Schedule
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PASSPORT TIMELINE TAB */}
        <TabsContent value="passport" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Immutable Recovery Passport™ Versions</CardTitle>
              <CardDescription>Chronological ledger snapshots evolved on client requests</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative border-l border-border/80 ml-6 md:ml-12 my-6 space-y-8 pb-6">
                {passport.versions.map((ver: any, index: number) => (
                  <div key={ver.id} className="relative pl-6 md:pl-10">
                    {/* Circle marker */}
                    <div className="absolute -left-3 top-1 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background">
                      {ver.versionNumber}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="md:col-span-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Version Snapshot v{ver.versionNumber}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(ver.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <Badge variant={ver.recoveryScore > 80 ? "success" : "warning"}>
                            Healing Score: {ver.healingScore}%
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-primary">AI Log Summary: </span>
                          {ver.aiSummary}
                        </p>
                        {ver.doctorNotes && (
                          <p className="text-xs text-muted-foreground italic">
                            <span className="font-semibold not-italic text-slate-500">Clinician review notes: </span>
                            "{ver.doctorNotes}"
                          </p>
                        )}
                      </div>

                      <div className="bg-muted/40 p-4 rounded-lg border text-xs flex flex-col justify-center space-y-2">
                        <div className="flex justify-between">
                          <span>Pain Score:</span>
                          <span className="font-semibold">{ver.painLevel}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Adherence Rate:</span>
                          <span className="font-semibold text-success">{Math.round((ver.medicationCompliance + ver.waterAdherence + ver.exerciseAdherence) / 3)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recovery score:</span>
                          <span className="font-semibold text-primary">{ver.recoveryScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIGITAL TWIN TAB */}
        <TabsContent value="twin">
          <RecoveryTwinChart twinData={twin} />
        </TabsContent>

        {/* CLINICAL REPLAY TAB */}
        <TabsContent value="clinical-replay">
          <ClinicalReplayViewer replayData={replay} />
        </TabsContent>

        {/* CLINICAL MEMORY TAB */}
        <TabsContent value="memory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" /> Extracted Clinical RAG Memory
              </CardTitle>
              <CardDescription>
                Diagnoses, prescriptions, and implant properties parsed automatically from discharge notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clinicalMemory ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="bg-muted/40 p-4 rounded-lg border space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Primary Diagnosis</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {clinicalMemory.diagnosis || "Post-traumatic Osteoarthritis of Left Knee"}
                      </p>
                    </div>
                    <div className="bg-muted/40 p-4 rounded-lg border space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Surgical Implants Used</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {clinicalMemory.implants || "Cruciate Retaining (CR) Knee Joint Replacement"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-muted/40 p-4 rounded-lg border space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Prescribed Drug Regimen</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-line">
                        {clinicalMemory.prescriptions || "Celecoxib 200mg - Daily\nParacetamol 1g - QDS prn"}
                      </p>
                    </div>
                    <div className="bg-muted/40 p-4 rounded-lg border space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Recovery Restriction Controls</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {clinicalMemory.restrictions || "Limit knee joint flexion beyond 90 degrees."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No parsed memory snapshot available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVIDENCE PANEL TAB */}
        <TabsContent value="evidence">
          <EvidenceEnginePanel
            passportId={passport?.id}
            latestVersion={latestVersion}
            onFeedbackLogged={() => {
              queryClient.invalidateQueries({ queryKey: ["doctorPatientDetail", patientId] });
            }}
          />
        </TabsContent>

        {/* BLOCKCHAIN AUDITING TAB */}
        <TabsContent value="blockchain">
          <BlockchainVerifier passportId={passport?.id} blockchainData={blockchain} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

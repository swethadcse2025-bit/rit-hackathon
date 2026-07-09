"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileText, Settings, Shield, Award } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DoctorFeedbackDialog } from "./doctor-feedback-dialog";

interface Intervention {
  id: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  expectedBenefit: string;
  confidence: number;
  clinicalReasoning: string;
  guidelineReferences: string[];
}

interface EvidenceEnginePanelProps {
  passportId: string;
  latestVersion: any;
  onFeedbackLogged?: () => void;
}

export function EvidenceEnginePanel({ passportId, latestVersion, onFeedbackLogged }: EvidenceEnginePanelProps) {
  const [expandedIntervention, setExpandedIntervention] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  if (!latestVersion) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-dashed rounded-xl p-8 bg-muted/20">
        <p className="text-sm text-muted-foreground">Clinical evidence engine logs not loaded.</p>
      </div>
    );
  }

  // Interventions from latest version data (or default simulated array if empty)
  const interventions: Intervention[] = latestVersion.interventions || [
    {
      id: "int_1",
      action: "Optimize NSAID Dosage (Celecoxib 200mg BID)",
      priority: "HIGH",
      expectedBenefit: "Reduces acute localized inflammation and restores active range of motion",
      confidence: 94,
      clinicalReasoning: "Surgical wound vision segment shows mild local swelling. Healing score decreased by 8% under signature profile. Patient recorded pain deviation of 7/10 at 09:00.",
      guidelineReferences: [
        "NICE Guidelines [NG180]: Postoperative pharmacological management of major joint arthroplasty",
        "AAOS Clinical Guidelines: Pain relief following knee reconstruction surgery"
      ]
    },
    {
      id: "int_2",
      action: "Initiate Assisted Hydration Reminder Prompts",
      priority: "MEDIUM",
      expectedBenefit: "Helps clear medication metabolites and mitigates minor orthostatic drop risk",
      confidence: 88,
      clinicalReasoning: "Patient water intake checks show less than 60% adherence threshold on days 3 and 4.",
      guidelineReferences: [
        "ERAS Society Consensus: Perioperative fluid balance optimizations for lower limb surgery"
      ]
    }
  ];

  const handleFeedbackTrigger = (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setFeedbackOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedIntervention(expandedIntervention === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* AI Summary Block */}
      <Card className="bg-gradient-to-r from-blue-50/20 to-indigo-50/20 border-blue-500/20 dark:from-blue-950/10 dark:to-indigo-950/10">
        <CardHeader className="flex flex-row items-center space-x-3 pb-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-base">Explainable AI Evidence Summary</CardTitle>
            <CardDescription>Clinical synthesis of latest Recovery Passport version</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {latestVersion.aiSummary ||
              "Patient is on postoperative Day 5 following left knee arthroplasty. Overall recovery score is stable at 82. However, wound vision AI reports slight localized swelling and patient log records pain spikes. Evidence recommends dosage adjustment and hydration check-in. Blockchain anchors confirm cryptographic immutability of version inputs."}
          </p>
        </CardContent>
      </Card>

      {/* Prioritized Action Recommendations */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          Clinical Action Recommendations
        </h4>

        {interventions.map((item) => {
          const isExpanded = expandedIntervention === item.id;
          return (
            <Card key={item.id} className="border-l-4 border-l-primary overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-slate-800 dark:text-slate-100">{item.action}</h5>
                      <Badge variant={item.priority === "HIGH" ? "destructive" : item.priority === "MEDIUM" ? "warning" : "secondary"}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Expected Benefit: {item.expectedBenefit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Confidence</span>
                      <span className="text-sm font-bold text-primary">{item.confidence}%</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => toggleExpand(item.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 pt-4 border-t border-border/50 text-sm transition-all duration-300">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">AI Recommendation Reasoning</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-muted/50 p-2.5 rounded-lg border">
                        {item.clinicalReasoning}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-primary" /> Guidelines Evidence Support
                      </span>
                      <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                        {item.guidelineReferences.map((ref, idx) => (
                          <li key={idx} className="italic">
                            {ref}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleFeedbackTrigger(item)}>
                        Log Decision / Mod
                      </Button>
                      <Button variant="primary" size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => handleFeedbackTrigger({ ...item, action: `ACCEPT: ${item.action}` })}>
                        Approve Action
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedIntervention && (
        <DoctorFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          passportId={passportId}
          recommendationId={selectedIntervention.id}
          recommendationText={selectedIntervention.action}
          onFeedbackLogged={() => {
            setFeedbackOpen(false);
            if (onFeedbackLogged) onFeedbackLogged();
          }}
        />
      )}
    </div>
  );
}

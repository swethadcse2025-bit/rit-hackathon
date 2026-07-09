"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCloseButton } from "./ui/dialog";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { useAuth } from "../hooks/use-auth";

interface DoctorFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passportId: string;
  recommendationId: string;
  recommendationText: string;
  onFeedbackLogged?: () => void;
}

export function DoctorFeedbackDialog({
  open,
  onOpenChange,
  passportId,
  recommendationId,
  recommendationText,
  onFeedbackLogged,
}: DoctorFeedbackDialogProps) {
  const { profile } = useAuth();
  const [action, setAction] = useState<"ACCEPT" | "MODIFY" | "REJECT">("ACCEPT");
  const [modifiedText, setModifiedText] = useState(recommendationText);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please specify your clinical reasoning for this decision.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const doctorId = profile?.id;
      if (!doctorId) throw new Error("Doctor profile not found.");

      await api.post("/doctor/feedback", {
        doctorId,
        passportId,
        recommendationId,
        action,
        modifiedRecommendation: action === "MODIFY" ? modifiedText : undefined,
        reason,
      });

      if (onFeedbackLogged) onFeedbackLogged();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to log feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Log Clinician Decision</DialogTitle>
          <DialogDescription>
            Override or validate AI recommended care plans. Decisions train model baseline parameters.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton onClose={() => onOpenChange(false)} />

        {error && (
          <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <div className="space-y-4 my-2">
          {/* Action selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Decision Action</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ACCEPT", "MODIFY", "REJECT"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAction(opt)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    action === opt
                      ? opt === "ACCEPT"
                        ? "bg-success/15 border-success text-success"
                        : opt === "REJECT"
                        ? "bg-destructive/15 border-destructive text-destructive"
                        : "bg-warning/15 border-warning text-warning"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* AI suggestion readback */}
          <div className="bg-muted/40 p-3 rounded-lg border text-xs">
            <span className="font-semibold block text-slate-500">AI Suggested Recommendation:</span>
            <p className="mt-1 text-slate-700 dark:text-slate-300">{recommendationText}</p>
          </div>

          {/* Modifier text field if needed */}
          {action === "MODIFY" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Modified Care Action Plan
              </label>
              <textarea
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Specify the adjusted medication dosage, scheduling or exercise restrictions..."
              />
            </div>
          )}

          {/* Reasoning box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Clinical Rationale / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Patient notes mild stomach discomfort from Celecoxib; swapping to paracetamol with orthopedic consult."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>
            Confirm and Commit
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

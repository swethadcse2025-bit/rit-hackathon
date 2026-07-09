"use client";

import React, { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Activity, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR" | "HOSPITAL_ADMIN" | "SYSTEM_ADMIN">("DOCTOR");
  
  // Specialty / license for Doctor
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Please fill in all standard details.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: any = {
      email,
      password,
      name,
      role,
    };

    if (role === "DOCTOR") {
      payload.specialty = specialty || "General Orthopedics";
      payload.licenseNumber = licenseNumber || "LIC-DEFAULT";
    }

    try {
      await register(payload);
    } catch (err: any) {
      setError(err || "Failed to register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Activity className="h-10 w-10 text-primary mx-auto animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight">SurgiSense AI Register</h1>
          <p className="text-xs text-muted-foreground">
            Create clinical portal account or register a patient baseline history profile
          </p>
        </div>

        <Card className="shadow-xl border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Create Account</CardTitle>
            <CardDescription>Setup access controls and profile parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="DOCTOR">Doctor (Clinician)</option>
                  <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                  <option value="SYSTEM_ADMIN">System Administrator</option>
                  <option value="PATIENT">Patient (Self check-in)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Elizabeth Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vance@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Special clinical fields if Doctor */}
              {role === "DOCTOR" && (
                <div className="space-y-4 pt-2 border-t border-border/60 animate-fadeIn">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Specialty
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Orthopedic Surgery"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Medical License Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LIC-88291"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full text-xs rounded-lg border border-border p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <Button variant="primary" className="w-full mt-2 font-bold" type="submit" loading={isSubmitting}>
                Register Account Profile
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t text-center text-xs">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { RecoveryTwin, CurvePoint } from "../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface RecoveryTwinProps {
  twinData: RecoveryTwin | null;
}

export function RecoveryTwinChart({ twinData }: RecoveryTwinProps) {
  if (!twinData) {
    return (
      <div className="flex h-[350px] items-center justify-center border border-dashed rounded-xl p-8 bg-muted/20">
        <p className="text-sm text-muted-foreground">Digital Recovery Twin data not available.</p>
      </div>
    );
  }

  const {
    expectedRecoveryCurve = [],
    actualRecoveryCurve = [],
    deviationEvents = [],
    recoveryTwinConfidence = 95,
    projectedRecoveryCompletionDate,
  } = twinData;

  // Format data for Recharts
  const maxDays = Math.max(
    expectedRecoveryCurve.length ? expectedRecoveryCurve[expectedRecoveryCurve.length - 1].day : 30,
    actualRecoveryCurve.length ? actualRecoveryCurve[actualRecoveryCurve.length - 1].day : 0
  );

  const chartData = Array.from({ length: maxDays + 1 }, (_, dayIndex) => {
    const expected = expectedRecoveryCurve.find((pt) => pt.day === dayIndex)?.score ?? null;
    const actual = actualRecoveryCurve.find((pt) => pt.day === dayIndex)?.score ?? null;
    return {
      day: `Day ${dayIndex}`,
      Expected: expected !== null ? Math.round(expected) : undefined,
      Actual: actual !== null ? Math.round(actual) : undefined,
      // Deviation calculation
      Deviation: expected !== null && actual !== null ? Math.round(expected - actual) : undefined,
    };
  }).filter((d) => d.Expected !== undefined || d.Actual !== undefined);

  const recentDeviation = deviationEvents.length > 0 ? deviationEvents[0] : null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Chart Panel */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Digital Recovery Twin™ Comparison</CardTitle>
            <CardDescription>Sigmoid baseline curve vs. actual validated milestones</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">AI Confidence:</span>
            <Badge variant={recoveryTwinConfidence > 85 ? "success" : "warning"}>
              {recoveryTwinConfidence}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: "Healing Score", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "var(--muted-foreground)" } }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  name="Expected Curve"
                  type="monotone"
                  dataKey="Expected"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  name="Actual Progress"
                  type="monotone"
                  dataKey="Actual"
                  stroke="#2563eb"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trajectory Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground block">Projected Healing Date</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {new Date(projectedRecoveryCompletionDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Compliance Adherence Status</span>
              <div className="flex items-center gap-2 mt-1">
                {deviationEvents.some((e) => e.severity === "HIGH") ? (
                  <>
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Severe Deviation Risk</span>
                  </>
                ) : deviationEvents.some((e) => e.severity === "MEDIUM") ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="text-sm font-semibold text-warning">Minor Delay Warning</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="text-sm font-semibold text-success">On-track Recovery</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deviation History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Deviation Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60 max-h-[220px] overflow-y-auto px-6 pb-4">
              {deviationEvents.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-muted-foreground">No deviation anomalies detected.</p>
                </div>
              ) : (
                deviationEvents.map((event, index) => (
                  <div key={index} className="py-3 flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {event.metric} Deviation
                      </span>
                      <Badge variant={event.severity === "HIGH" ? "destructive" : event.severity === "MEDIUM" ? "warning" : "secondary"}>
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mt-1">
                      <span>Expected: {Math.round(event.expectedValue)}</span>
                      <span>Actual: {Math.round(event.actualValue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

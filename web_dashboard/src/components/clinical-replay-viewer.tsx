"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Heart, Calendar, Activity, Pill, UserCheck } from "lucide-react";
import { ClinicalReplay } from "../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface ClinicalReplayViewerProps {
  replayData: ClinicalReplay | null;
}

export function ClinicalReplayViewer({ replayData }: ClinicalReplayViewerProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(3000); // ms per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && replayData && replayData.story.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= replayData.story.length - 1) {
            setIsPlaying(false); // Stop playing at the end
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, replayData]);

  if (!replayData || replayData.story.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-dashed rounded-xl p-8 bg-muted/20">
        <p className="text-sm text-muted-foreground">No clinical timeline events recorded yet.</p>
      </div>
    );
  }

  const { story } = replayData;
  const activeVersion = story[currentStep];

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleNext = () => {
    setIsPlaying(false);
    if (currentStep < story.length - 1) setCurrentStep(currentStep + 1);
  };
  const handlePrev = () => {
    setIsPlaying(false);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            Clinical Replay Narrative
          </CardTitle>
          <CardDescription>Chronological AI replay of John's recovery milestones</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPlaybackSpeed((s) => (s === 4000 ? 2000 : 4000))}>
            {playbackSpeed === 2000 ? "Fast 2s" : "Normal 4s"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Playback Controls */}
        <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3 border border-border/40">
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentStep === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="icon" className="rounded-full h-10 w-10 shadow-md" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentStep === story.length - 1}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          {/* Timeline Slider */}
          <div className="flex-1 mx-6 relative">
            <input
              type="range"
              min={0}
              max={story.length - 1}
              value={currentStep}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentStep(parseInt(e.target.value));
              }}
              className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>Day 0</span>
              <span>Day {story[story.length - 1].versionNumber} (Latest)</span>
            </div>
          </div>
          <div className="text-sm font-semibold whitespace-nowrap">
            Version {activeVersion.versionNumber} / {story.length}
          </div>
        </div>

        {/* Dashboard Telemetry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border border-border/60 shadow-sm flex items-center space-x-3">
            <Heart className="h-5 w-5 text-destructive" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Pain Level</span>
              <span className="text-lg font-bold">{activeVersion.painLevel}/10</span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border/60 shadow-sm flex items-center space-x-3">
            <Activity className="h-5 w-5 text-success" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Healing Score</span>
              <span className="text-lg font-bold">{activeVersion.healingScore}%</span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border/60 shadow-sm flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Timeline Mark</span>
              <span className="text-sm font-semibold">
                {new Date(activeVersion.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border/60 shadow-sm flex items-center space-x-3">
            <UserCheck className="h-5 w-5 text-warning" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Recovery Score</span>
              <span className="text-lg font-bold text-primary">{activeVersion.recoveryScore}</span>
            </div>
          </div>
        </div>

        {/* Story Screen */}
        <div className="relative min-h-[140px] bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-inner text-slate-100">
          <div className="absolute top-3 right-4 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">AI VOICE TRANSLATING</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <p className="text-sm leading-relaxed font-medium font-serif italic text-slate-200">
                "{activeVersion.narration}"
              </p>

              {/* Tags panel */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {activeVersion.significantEvents.map((evt, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full"
                  >
                    ★ {evt}
                  </span>
                ))}
                {activeVersion.medications.map((med, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <Pill className="h-2.5 w-2.5" /> {med}
                  </span>
                ))}
                {activeVersion.reviews.map((rev, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full"
                  >
                    ✓ Review: {rev}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

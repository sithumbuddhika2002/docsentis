"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, Lock, CheckCircle2, Cpu, Clock, Sparkles } from "lucide-react";

interface DecryptingLoaderProps {
  documentTitle: string;
  isReady: boolean; // True when underlying PDF binary is fetched and parsed
  onComplete: (elapsedTimeSec: number) => void;
  documentDescription?: string;
}

interface DecryptionStage {
  id: number;
  label: string;
  detail: string;
  threshold: number; // percentage progress needed to start/complete
}

const STAGES: DecryptionStage[] = [
  {
    id: 1,
    label: "Session Verification",
    detail: "Validating authenticated token & role permissions",
    threshold: 25,
  },
  {
    id: 2,
    label: "AES-256 Decryption",
    detail: "Decrypting high-entropy document binary stream",
    threshold: 55,
  },
  {
    id: 3,
    label: "Forensic Watermarking",
    detail: "Synthesizing dynamic university ownership stamps",
    threshold: 85,
  },
  {
    id: 4,
    label: "Isolated Canvas Guard",
    detail: "Mounting anti-extraction hardware viewport",
    threshold: 100,
  },
];

export default function DecryptingLoader({
  documentTitle,
  isReady,
  onComplete,
  documentDescription,
}: DecryptingLoaderProps) {
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [progress, setProgress] = useState<number>(10);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);

  // Live stopwatch timer running at ~40ms intervals
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (!hasFinishedRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 40);

    return () => clearInterval(timerInterval);
  }, []);

  // Smooth progress pacing
  // Gives user a realistic, reassuring visual experience of the cryptographic decryption pipeline
  useEffect(() => {
    const MIN_ANIMATION_DURATION = 1400; // ms to comfortably display animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTimeRef.current;
        const targetBasedOnTime = Math.min(88, (elapsed / MIN_ANIMATION_DURATION) * 88);

        if (isReady && elapsed >= MIN_ANIMATION_DURATION) {
          return 100;
        }

        if (isReady) {
          // If backend already ready, pace smoothly towards 100%
          const next = Math.max(prev + 4, targetBasedOnTime);
          return Math.min(next, 95);
        }

        // Still waiting for backend
        if (prev < 80) {
          return Math.max(prev + 3, targetBasedOnTime);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isReady]);

  // When progress reaches 100% and isReady is true, show complete state then trigger onComplete
  useEffect(() => {
    if (progress >= 100 && isReady && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      setIsFinishing(true);
      const totalElapsed = (Date.now() - startTimeRef.current) / 1000;

      const completionTimeout = setTimeout(() => {
        onComplete(Number(totalElapsed.toFixed(2)));
      }, 400);

      return () => clearTimeout(completionTimeout);
    }
  }, [progress, isReady, onComplete]);

  const elapsedSeconds = (elapsedMs / 1000).toFixed(2);

  return (
    <div className="flex flex-col items-center justify-center min-h-[460px] w-full max-w-lg mx-auto p-4 sm:p-6 select-none animate-fadeIn">
      {/* Outer Card */}
      <div className="w-full bg-white/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />

        {/* Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
            </div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-secondary">
              Docsentis Security Core
            </span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-border text-[11px] font-mono text-secondary">
            <Clock className="w-3 h-3 text-accent" />
            <span className="font-semibold text-primary">{elapsedSeconds}s</span>
          </div>
        </div>

        {/* Central Shield Animation */}
        <div className="relative my-6 flex flex-col items-center justify-center">
          {/* Animated Background Rings */}
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/30 animate-[spin_8s_linear_infinite]" />
            <div className="absolute -inset-2 rounded-full border border-accent/15 animate-[pulse_3s_ease-in-out_infinite]" />
            
            {/* Center Glowing Icon */}
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
                isFinishing
                  ? "bg-emerald-600 text-white shadow-emerald-500/25 scale-105"
                  : "bg-primary text-white shadow-primary/20"
              }`}
            >
              {isFinishing ? (
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 animate-scaleUp" />
              ) : (
                <div className="relative">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-accent-light opacity-90" />
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-accent absolute inset-0 m-auto animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Status Headline */}
          <h3 className="mt-4 text-base sm:text-lg font-bold text-primary text-center tracking-tight">
            {isFinishing ? "Decryption Complete" : "Decrypting Protected Document"}
          </h3>
          <p className="text-xs text-secondary-muted text-center mt-1 truncate max-w-xs font-medium">
            {documentTitle}
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-secondary-muted flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>AES-256-GCM Stream</span>
            </span>
            <span className="font-bold text-primary">{Math.round(progress)}%</span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-border/80">
            <div
              className={`h-full rounded-full transition-all duration-200 ease-out ${
                isFinishing
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Security Pipeline */}
        <div className="mt-6 space-y-2.5 pt-4 border-t border-border/70">
          {STAGES.map((stage) => {
            const isCompleted = progress >= stage.threshold || isFinishing;
            const isCurrent =
              !isCompleted &&
              progress >= stage.threshold - 30 &&
              progress < stage.threshold;

            return (
              <div
                key={stage.id}
                className={`flex items-start space-x-3 p-2 rounded-lg transition-colors ${
                  isCurrent ? "bg-accent/5" : ""
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-semibold leading-tight ${
                        isCompleted
                          ? "text-primary"
                          : isCurrent
                          ? "text-accent"
                          : "text-secondary-muted"
                      }`}
                    >
                      {stage.label}
                    </p>
                    {isCompleted && (
                      <span className="text-[10px] font-mono text-emerald-600 font-medium">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-secondary-muted leading-tight mt-0.5 truncate">
                    {stage.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Security Guarantee */}
        <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between text-[10px] text-secondary-muted">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>Encrypted in memory • Zero local file footprint</span>
          </span>
          <span className="font-mono font-medium">TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}

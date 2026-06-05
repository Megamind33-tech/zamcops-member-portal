"use client";

import React from "react";
import { motion } from "motion/react";
import { MembershipApplication } from "../lib/types";
import { Check, X, Clock, AlertCircle, FileText } from "lucide-react";

interface TimelineProps {
  app: MembershipApplication;
  variant?: "light" | "dark";
  showDetails?: boolean;
}

export function ApplicationStatusTimeline({ app, variant = "light", showDetails = false }: TimelineProps) {
  // Determine actual status state of each step: "completed" | "current" | "pending" | "skipped" | "rejected"
  
  // Step 1: Submitted (Initial Submission) - Always completed for items in this system
  const step1Status = "completed";
  const step1Date = app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "Pending";

  // Step 2: Reviewing (Document Auditing & Compliance Checks)
  let step2Status: "completed" | "current" | "pending" = "pending";
  if (app.status === "Approved" || app.status === "Rejected" || app.status === "Information Requested") {
    step2Status = "completed";
  } else if (app.status === "Pending") {
    step2Status = "current";
  }

  // Step 3: Clarification (Supplemental Information Requests)
  let step3Status: "completed" | "current" | "pending" | "skipped" = "pending";
  if (app.status === "Information Requested") {
    step3Status = "current";
  } else if (app.status === "Approved" || app.status === "Rejected") {
    // If we have an infoRequestNote, clarification WAS requested at some point, so it is completed. Otherwise bypassed.
    step3Status = app.infoRequestNote ? "completed" : "skipped";
  }

  // Step 4: Verified (Statutory Final Decision)
  let step4Status: "completed" | "rejected" | "pending" = "pending";
  if (app.status === "Approved") {
    step4Status = "completed";
  } else if (app.status === "Rejected") {
    step4Status = "rejected";
  }

  const steps = [
    {
      id: 1,
      label: "Submitted",
      status: step1Status,
      description: "on " + step1Date,
    },
    {
      id: 2,
      label: "Reviewing",
      status: step2Status,
      description: step2Status === "completed" ? "Audit complete" : step2Status === "current" ? "Under active review" : "In queue",
    },
    {
      id: 3,
      label: "Clarification",
      status: step3Status,
      description: step3Status === "current" ? "Info requested" : step3Status === "completed" ? "Resolved" : step3Status === "skipped" ? "Bypassed" : "No holds requested",
    },
    {
      id: 4,
      label: app.status === "Rejected" ? "Declined" : "Verified",
      status: step4Status,
      description: step4Status === "completed" ? "Approved with Stamp" : step4Status === "rejected" ? "Declined" : "Board sign-off pending",
    }
  ];

  const isDark = variant === "dark";

  return (
    <div className={`w-full ${isDark ? "text-zinc-300" : "text-gray-700"}`}>
      {/* Horizontal timeline optimized for app cards (Compact view) */}
      {!showDetails ? (
        <div className="relative flex items-center justify-between mt-4 mb-2">
          {/* Connector Track */}
          <div className="absolute left-[10%] right-[10%] top-[14px] h-[3px] bg-zinc-250/80 dark:bg-zinc-800 -z-0 rounded-full">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{
                width: 
                  app.status === "Approved" || app.status === "Rejected" ? "100%" :
                  app.status === "Information Requested" ? "66%" :
                  app.status === "Pending" ? "33%" : "0%"
              }}
            />
          </div>

          {/* Steps list */}
          {steps.map((step) => {
            const isCompleted = step.status === "completed" || step.status === "skipped";
            const isCurrent = step.status === "current";
            const isRejected = step.status === "rejected";
            const isSkipped = step.status === "skipped";

            let nodeStyles = "bg-zinc-150 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500 border-transparent";
            let fontStyles = isDark ? "text-zinc-500" : "text-gray-400";

            if (isCompleted) {
              if (isSkipped) {
                nodeStyles = "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-650 border-transparent";
                fontStyles = isDark ? "text-zinc-550" : "text-gray-400";
              } else {
                nodeStyles = "bg-emerald-500 text-white border-transparent";
                fontStyles = isDark ? "text-emerald-400 font-extrabold" : "text-emerald-700 font-extrabold";
              }
            } else if (isCurrent) {
              nodeStyles = "bg-amber-500 text-white font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.4)] border-transparent animate-pulse";
              fontStyles = isDark ? "text-amber-500 font-black" : "text-amber-600 font-black";
            } else if (isRejected) {
              nodeStyles = "bg-rose-500 text-white font-extrabold border-transparent";
              fontStyles = isDark ? "text-rose-400 font-extrabold" : "text-rose-600 font-extrabold";
            }

            return (
              <div key={step.id} className="flex flex-col items-center relative z-10 w-[24%]">
                {/* Node circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold ${nodeStyles} border transition-all duration-300`}>
                  {isCompleted && !isSkipped ? (
                    <Check size={11} className="stroke-[3.5]" />
                  ) : isRejected ? (
                    <X size={11} className="stroke-[3.5]" />
                  ) : isSkipped ? (
                    <span className="text-[7.5px] font-black uppercase tracking-tighter opacity-70">skip</span>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                {/* Step labels */}
                <span className={`text-[10px] font-extrabold tracking-tight mt-1 text-center truncate w-full ${fontStyles}`}>
                  {step.label}
                </span>
                <span className="text-[8px] font-mono font-bold text-zinc-400/80 dark:text-zinc-500 text-center truncate w-full mt-0.5">
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Vertical Timeline optimized for auditor workspace inspect panel */
        <div className="flex flex-col gap-4 relative pl-1 select-none">
          {/* Track vertical line */}
          <div className="absolute left-[13px] top-4 bottom-4 w-[2px] bg-zinc-800" />
          
          {steps.map((step) => {
            const isCompleted = step.status === "completed" || step.status === "skipped";
            const isCurrent = step.status === "current";
            const isRejected = step.status === "rejected";
            const isSkipped = step.status === "skipped";

            let iconBadgeStyles = "bg-zinc-900 border-zinc-800 text-zinc-650";
            let messageStyles = "text-zinc-500";
            let titleStyles = "text-zinc-500";

            if (isCompleted) {
              if (isSkipped) {
                iconBadgeStyles = "bg-zinc-950 text-zinc-600 border-zinc-900 opacity-60";
                messageStyles = "text-zinc-600";
                titleStyles = "text-zinc-550 line-through decoration-zinc-800";
              } else {
                iconBadgeStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                messageStyles = "text-zinc-400";
                titleStyles = "text-zinc-200 font-extrabold";
              }
            } else if (isCurrent) {
              iconBadgeStyles = "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)] animate-pulse";
              messageStyles = "text-zinc-300 font-medium";
              titleStyles = "text-amber-500 font-black";
            } else if (isRejected) {
              iconBadgeStyles = "bg-red-500/10 text-red-400 border-red-500/30";
              messageStyles = "text-zinc-400";
              titleStyles = "text-red-400 font-extrabold";
            }

            return (
              <div key={step.id} className="flex gap-3.5 relative z-10 items-start text-left">
                {/* Node Box */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black border shrink-0 ${iconBadgeStyles} text-[10.5px]`}>
                  {isCompleted && !isSkipped ? (
                    <Check size={11} className="stroke-[3.5]" />
                  ) : isRejected ? (
                    <X size={11} className="stroke-[3.5]" />
                  ) : isSkipped ? (
                    <span className="text-[8px] tracking-tight text-zinc-650">•</span>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Description details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10.5px] uppercase tracking-wider font-extrabold ${titleStyles}`}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[8px] bg-amber-500/15 text-amber-550 font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 animate-pulse">
                        Active Review
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-[7.5px] bg-zinc-850 text-zinc-550 font-mono font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-5">
                        Bypassed
                      </span>
                    )}
                  </div>
                  
                  <div className={`text-[10px] mt-1 leading-relaxed ${messageStyles}`}>
                    {step.id === 1 ? (
                      app.submittedAt ? (
                        <span>
                          Filing received on <span className="font-semibold text-zinc-300">{new Date(app.submittedAt).toLocaleDateString()}</span> at <span className="font-semibold text-zinc-300">{new Date(app.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> via secure statutory back-channel onboarding portal.
                        </span>
                      ) : (
                        <span>Application log recorded inside database.</span>
                      )
                    ) : step.id === 2 ? (
                      app.status === "Pending" ? (
                        <span>
                          Auditors currently cross-verify physical National Registry Card (NRC) Flatscans, Portrait photos, and signed deeds against state files.
                        </span>
                      ) : (
                        <span>
                          Checklist verified. Files match standard guidelines under CAP 138 with active auditor signatures logged.
                        </span>
                      )
                    ) : step.id === 3 ? (
                      app.status === "Information Requested" ? (
                        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl mt-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">
                            <AlertCircle size={10} />
                            <span>Pending Correction Response</span>
                          </div>
                          <p className="text-[10px] italic text-zinc-350 leading-relaxed font-sans font-medium">
                            &quot;{app.infoRequestNote || "Verify documents and post-up resolution flats."}&quot;
                          </p>
                        </div>
                      ) : app.infoRequestNote ? (
                        <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-xl mt-1.5 text-zinc-550">
                          <span className="text-[8.5px] font-extrabold uppercase tracking-widest block mb-0.5">Historical Corrections Resolved:</span>
                          <p className="text-[9.5px] italic leading-tight">&quot;{app.infoRequestNote}&quot;</p>
                        </div>
                      ) : (
                        <span>Automated scanning checked file structures and completed execution with zero clarification holds filed.</span>
                      )
                    ) : step.id === 4 ? (
                      app.status === "Approved" ? (
                        <span>
                          Statutory board approved. Created digital society membership portfolio <span className="font-mono text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-bold">Approved Entry</span> on legal ledger.
                        </span>
                      ) : app.status === "Rejected" ? (
                        <span>
                          Membership rejected. Application failed checklist verification criteria or signatures mismatches. Refer to audit session ledger.
                        </span>
                      ) : (
                        <span>
                          Pending formal final determination stamp by the statutory board review desk under Cap 138.
                        </span>
                      )
                    ) : (
                      <span>{step.description}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

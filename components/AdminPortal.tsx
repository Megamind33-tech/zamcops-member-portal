"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrackWork,
  RoyaltyEarning,
  MembershipApplication,
  AuditLog,
  User,
  ArtistProfile,
  LabelProfile
} from "../lib/types";
import { loadFullState, saveFullState } from "../lib/storage";
import { ApplicationStatusTimeline } from "./ApplicationStatusTimeline";
import {
  LogOut,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Users,
  Music,
  FileText,
  Search,
  Bell,
  Trash2,
  Lock,
  PlusCircle,
  UserCheck,
  Building,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  X,
  Info,
  ThumbsUp,
  AlertCircle,
  Pin,
  MessageSquarePlus,
  MessageSquare,
  History,
  PenLine,
  Highlighter,
  Type,
  FileDown,
  Download,
  FileSpreadsheet,
  ClipboardCheck,
  Keyboard
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Helper function to turn coordinate points array into SVG path data
const pointsToSvgPath = (points: Array<{ x: number; y: number }>) => {
  if (!points || points.length === 0) return "";
  return points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
};

interface AdminPortalProps {
  user: User;
  onLogout: () => void;
}

export function AdminPortal({ user, onLogout }: AdminPortalProps) {
  const [state, setState] = useState(() => loadFullState());
  const [activeTab, setActiveTab] = useState<"applications" | "works" | "members" | "audit">("applications");
  const [searchQuery, setSearchQuery] = useState("");

  // Document Viewer Session States
  const [selectedAppForDocs, setSelectedAppForDocs] = useState<MembershipApplication | null>(null);
  const [activeDocType, setActiveDocType] = useState<"nrc_front" | "nrc_back" | "passport" | "contract">("nrc_front");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Audit Verification checklist & notes
  const [idVerified, setIdVerified] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [bylawsCompliant, setBylawsCompliant] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState(false);
  
  // New Granular Compliance document verification checkboxes
  const [nrcFrontVerified, setNrcFrontVerified] = useState(false);
  const [nrcBackVerified, setNrcBackVerified] = useState(false);
  const [passportPhotoVerified, setPassportPhotoVerified] = useState(false);
  const [contractVerified, setContractVerified] = useState(false);
  
  const [auditNotes, setAuditNotes] = useState("");
  const [auditNotifyMsg, setAuditNotifyMsg] = useState("");
  
  // Information request flow states
  const [showInfoRequestInput, setShowInfoRequestInput] = useState(false);
  const [infoRequestNoteText, setInfoRequestNoteText] = useState("");

  // Annotations direct image coordinate commenting states
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<"pin" | "pen" | "marker" | "textbox">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [newAnnDrawingPoints, setNewAnnDrawingPoints] = useState<Array<{ x: number; y: number }> | null>(null);
  const [newAnnCoord, setNewAnnCoord] = useState<{ x: number; y: number } | null>(null);
  const [newAnnText, setNewAnnText] = useState("");
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  // General annotation text notes state
  const [docGeneralAnnotationNote, setDocGeneralAnnotationNote] = useState("");

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);

  // Bulk export states
  const [bulkExportStart, setBulkExportStart] = useState("2026-05-01");
  const [bulkExportEnd, setBulkExportEnd] = useState("2026-06-05");
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [showBulkExportPanel, setShowBulkExportPanel] = useState(false);

  const handlePrevDoc = () => {
    const docOrder: Array<"nrc_front" | "nrc_back" | "passport" | "contract"> = ["nrc_front", "nrc_back", "passport", "contract"];
    const currentIndex = docOrder.indexOf(activeDocType);
    if (currentIndex > 0) {
      setActiveDocType(docOrder[currentIndex - 1]);
      setZoomLevel(100);
      setRotation(0);
    }
  };

  const handleNextDoc = () => {
    const docOrder: Array<"nrc_front" | "nrc_back" | "passport" | "contract"> = ["nrc_front", "nrc_back", "passport", "contract"];
    const currentIndex = docOrder.indexOf(activeDocType);
    if (currentIndex < docOrder.length - 1) {
      setActiveDocType(docOrder[currentIndex + 1]);
      setZoomLevel(100);
      setRotation(0);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedAppForDocs) return;
    const element = document.getElementById("document-visualizer-stage");
    if (!element) return;

    setIsGeneratingPDF(true);

    try {
      // 1. Temporarily clear zoom & rotation style transformation from the element
      const originalTransform = element.style.transform;
      element.style.transform = "none";

      // Allow DOM to adjust for full size, unrotated capture
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2. Capture using html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // High DPI capture
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      // 3. Restore the original zoom & rotation transforms on the element
      element.style.transform = originalTransform;

      // 4. Convert canvas to PNG data
      const imgData = canvas.toDataURL("image/png");

      // 5. Measure dimensions to create custom Page size
      const widthInMm = canvas.width * 0.264583;
      const heightInMm = canvas.height * 0.264583;

      const pdf = new jsPDF({
        orientation: widthInMm > heightInMm ? "l" : "p",
        unit: "mm",
        format: [widthInMm, heightInMm],
      });

      pdf.addImage(imgData, "PNG", 0, 0, widthInMm, heightInMm);

      const docLabel = 
        activeDocType === "nrc_front" ? "NRC_Front" :
        activeDocType === "nrc_back" ? "NRC_Back" :
        activeDocType === "passport" ? "Passport" : "Contract";
      
      const fileName = `${selectedAppForDocs.stageOrRegName.replace(/\s+/g, "_")}_${docLabel}_Annotations.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Failed to generate PDF download:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportAuditSummary = () => {
    if (!selectedAppForDocs) return;
    setIsExportingAudit(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let y = 15;
      const margin = 15;
      const pageHeight = 280;

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight) {
          pdf.addPage();
          pdf.setFillColor(27, 27, 31);
          pdf.rect(0, 0, 210, 15, "F");
          pdf.setFont("Helvetica", "Bold");
          pdf.setFontSize(8);
          pdf.setTextColor(255, 255, 255);
          pdf.text("ZAMCOPS COMPLIANCE WORKSPACE • FORMAL AUDIT SUMMARY", 15, 10);
          pdf.setDrawColor(245, 158, 11);
          pdf.line(0, 15, 210, 15);
          y = 25;
        }
      };

      // --- BRANDED HEADER COVER ---
      pdf.setFillColor(27, 27, 31);
      pdf.rect(0, 0, 210, 32, "F");

      // decorative gold line
      pdf.setFillColor(245, 158, 11);
      pdf.rect(0, 0, 210, 2.5, "F");

      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 158, 11);
      pdf.text("ZAMCOPS COMPLIANCE AUDIT SERVICE", 15, 14);

      pdf.setFont("Helvetica", "Normal");
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text("Zambian Music Copyright Protection Society • Cap 138", 15, 20);
      pdf.text(`Report Generated: ${new Date().toUTCString()}`, 15, 25);

      // Status Badge Banner
      pdf.setFillColor(245, 158, 11);
      pdf.rect(145, 12, 50, 14, "F");
      
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(8);
      pdf.setTextColor(27, 27, 31);
      pdf.text("FILE VERIFICATION STATUS", 148, 17);
      pdf.setFontSize(9.5);
      pdf.text(selectedAppForDocs.status.toUpperCase(), 148, 22);

      y = 42;

      // --- SECTION 1: PROFILE METADATA ---
      checkNewPage(10);
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(11);
      pdf.setTextColor(217, 119, 6); // amber-600
      pdf.text("1. APPLICANT PROFILE METADATA", margin, y);
      
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + 2, 210 - margin, y + 2);
      y += 8;

      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y, 180, 38, "F");
      pdf.rect(margin, y, 180, 38, "S");

      const gridData = [
        { label: "Full/Entity Name", value: selectedAppForDocs.name },
        { label: "Stage/Reg Name", value: selectedAppForDocs.stageOrRegName },
        { label: "Account Type", value: selectedAppForDocs.type.toUpperCase() },
        { label: "Email Address", value: selectedAppForDocs.email },
        { label: "Phone Number", value: selectedAppForDocs.phone || "N/A" },
        { label: "NRC/PACRA ID", value: selectedAppForDocs.identifier || "N/A" },
        { label: "Submitted At", value: selectedAppForDocs.submittedAt ? new Date(selectedAppForDocs.submittedAt).toUTCString() : "N/A" },
        { label: "Assigned Auditor", value: user.email }
      ];

      let gx = margin + 5;
      let gy = y + 6;
      for (let i = 0; i < gridData.length; i++) {
        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(31, 41, 55);
        pdf.text(`${gridData[i].label}:`, gx, gy);

        pdf.setFont("Helvetica", "Normal");
        pdf.setTextColor(75, 85, 99);
        const textVal = String(gridData[i].value || "").slice(0, 35);
        pdf.text(textVal, gx + 38, gy);

        gy += 7.5;
        if (i === 3) {
          gx = margin + 92;
          gy = y + 6;
        }
      }

      y += 44;

      // --- SECTION 2: CHECKLISTS ---
      checkNewPage(12);
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(11);
      pdf.setTextColor(217, 119, 6);
      pdf.text("2. COMPLIANCE CHECKLIST RESOLUTION", margin, y);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y + 2, 210 - margin, y + 2);
      y += 8;

      const checklistItems = [
        { name: "Identity verified (Overall ID check)", state: idVerified },
        { name: "Contract signed (Overall Agreement checked)", state: contractSigned },
        { name: "By-laws compliant status checklist", state: bylawsCompliant },
        { name: "Musical/Professional Credentials valid", state: credentialsValid },
        { name: "NRC Frontline file verified", state: nrcFrontVerified },
        { name: "NRC Backline file verified", state: nrcBackVerified },
        { name: "Passport photo requirements completed", state: passportPhotoVerified },
        { name: "Compliance-based Contract deed verified", state: contractVerified }
      ];

      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, y, 180, 34, "F");
      pdf.rect(margin, y, 180, 34, "S");

      let cx = margin + 4;
      let cy = y + 6;
      for (let i = 0; i < checklistItems.length; i++) {
        const item = checklistItems[i];
        pdf.setDrawColor(item.state ? 16 : 220, item.state ? 185 : 38, item.state ? 129 : 38);
        pdf.setFillColor(item.state ? 209 : 254, item.state ? 250 : 226, item.state ? 229 : 226);
        pdf.rect(cx, cy - 3, 3.5, 3.5, "F");
        pdf.rect(cx, cy - 3, 3.5, 3.5, "S");

        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(item.state ? 6 : 153, item.state ? 95 : 27, item.state ? 70 : 27);
        pdf.text(item.state ? "Y" : "N", cx + 1, cy - 0.2);

        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(8);
        pdf.setTextColor(31, 41, 55);
        pdf.text(item.name, cx + 5, cy - 0.2);

        const stateLabel = item.state ? "[ PASSED ]" : "[ PENDING ]";
        if (item.state) {
          pdf.setTextColor(5, 150, 105);
        } else {
          pdf.setTextColor(220, 38, 38);
        }
        pdf.text(stateLabel, cx + 72, cy - 0.2);

        cy += 7.2;
        if (i === 3) {
          cx = margin + 92;
          cy = y + 6;
        }
      }

      y += 40;

      // --- SECTION 3: REVIEWS & ANNOTATIONS ---
      checkNewPage(12);
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(11);
      pdf.setTextColor(217, 119, 6);
      pdf.text("3. GEOSPATIAL ANNOTATIONS & MARKUP INDEX", margin, y);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y + 2, 210 - margin, y + 2);
      y += 8;

      const appAnnotations = annotations || [];
      if (appAnnotations.length === 0) {
        pdf.setFont("Helvetica", "Oblique");
        pdf.setFontSize(8.5);
        pdf.setTextColor(107, 114, 128);
        pdf.text("There are currently no custom graphic annotations or pinned markup logs on this application dossier.", margin + 4, y);
        y += 8;
      } else {
        pdf.setFillColor(27, 27, 31);
        pdf.rect(margin, y, 180, 6.5, "F");
        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        
        pdf.text("DOCUMENT", margin + 3, y + 4.5);
        pdf.text("COORDINATES", margin + 30, y + 4.5);
        pdf.text("MARKUP TYPE", margin + 60, y + 4.5);
        pdf.text("AUTHOR", margin + 92, y + 4.5);
        pdf.text("FINDING REMARK / OVERLAY TEXT", margin + 120, y + 4.5);

        y += 6.5;

        appAnnotations.forEach((ann, idx) => {
          checkNewPage(10);
          
          if (idx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, y, 180, 9, "F");
          }
          pdf.setDrawColor(243, 244, 246);
          pdf.rect(margin, y, 180, 9, "S");

          pdf.setFont("Helvetica", "Bold");
          pdf.setFontSize(8);
          pdf.setTextColor(17, 24, 39);
          
          const docTypeShort = 
            ann.docType === "nrc_front" ? "NRC Front" :
            ann.docType === "nrc_back" ? "NRC Back" :
            ann.docType === "passport" ? "Passport" : "Contract";

          pdf.text(docTypeShort, margin + 3, y + 5.5);
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setTextColor(55, 65, 81);
          pdf.text(`X:${ann.x.toFixed(1)}% Y:${ann.y.toFixed(1)}%`, margin + 30, y + 5.5);
          
          const markupType = 
            ann.type === "pen" ? "Pen Drawing" :
            ann.type === "marker" ? "Marker Overlay" :
            ann.type === "textbox" ? "Text Sticky" : "Pinned Remark";
          
          pdf.text(markupType, margin + 60, y + 5.5);
          
          const shortEmail = (ann.author || "").split("@")[0] || "System";
          pdf.text(shortEmail, margin + 92, y + 5.5);

          const feedbackText = ann.text || "";
          const splitFeedback = pdf.splitTextToSize(feedbackText, 55);
          pdf.text(splitFeedback[0] || "", margin + 120, y + 5);
          if (splitFeedback.length > 1) {
            pdf.setFontSize(7);
            pdf.setTextColor(107, 114, 128);
            pdf.text(splitFeedback[1] || "", margin + 120, y + 7.8);
            pdf.setFontSize(8);
          }

          y += 9;
        });

        y += 4;
      }

      // --- SECTION 4: AUDIT LOG TIMELINE ---
      checkNewPage(12);
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(11);
      pdf.setTextColor(217, 119, 6);
      pdf.text("4. HISTORICAL AUDIT TIMELINE LOGS", margin, y);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y + 2, 210 - margin, y + 2);
      y += 8;

      const historyLog = selectedAppForDocs.historicalAudits || [];
      if (historyLog.length === 0) {
        pdf.setFont("Helvetica", "Oblique");
        pdf.setFontSize(8.5);
        pdf.setTextColor(107, 114, 128);
        pdf.text("There are currently no administrative historical auditing log entries stored for this file.", margin + 4, y);
        y += 8;
      } else {
        pdf.setFillColor(27, 27, 31);
        pdf.rect(margin, y, 180, 6.5, "F");
        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);

        pdf.text("SESSION", margin + 3, y + 4.5);
        pdf.text("TIMESTAMP", margin + 20, y + 4.5);
        pdf.text("TARGET DOCUMENT", margin + 58, y + 4.5);
        pdf.text("AUDITOR", margin + 95, y + 4.5);
        pdf.text("EVENT STATUS", margin + 122, y + 4.5);
        pdf.text("AUDIT MESSAGE / REMARK DETAIL", margin + 145, y + 4.5);

        y += 6.5;
        pdf.setFont("Helvetica", "Normal");
        pdf.setFontSize(7.5);

        historyLog.forEach((h, hidx) => {
          checkNewPage(10);
          if (hidx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, y, 180, 9, "F");
          }
          pdf.setDrawColor(243, 244, 246);
          pdf.rect(margin, y, 180, 9, "S");

          pdf.setTextColor(17, 24, 39);
          pdf.text(`Sess #${h.sessionNo || hidx + 1}`, margin + 3, y + 5.5);
          
          pdf.setTextColor(75, 85, 99);
          const tStr = h.timestamp ? new Date(h.timestamp).toUTCString() : "N/A";
          pdf.text(tStr, margin + 20, y + 5.5);

          const hDocLabel = 
            h.docType === "nrc_front" ? "NRC Front page" :
            h.docType === "nrc_back" ? "NRC Back page" :
            h.docType === "passport" ? "Passport photos" : "Membership deed";
          pdf.text(hDocLabel, margin + 58, y + 5.5);

          const shortAuditor = (h.auditor || "").split("@")[0] || "System";
          pdf.text(shortAuditor, margin + 95, y + 5.5);

          const statusBadge = String(h.status || "Comment").toUpperCase();
          if (statusBadge === "REJECTION") {
            pdf.setTextColor(220, 38, 38);
            pdf.setFont("Helvetica", "Bold");
          } else {
            pdf.setTextColor(37, 99, 235);
          }
          pdf.text(statusBadge, margin + 122, y + 5.5);

          pdf.setFont("Helvetica", "Normal");
          pdf.setTextColor(55, 65, 81);
          const hMsg = h.message || "";
          const splitMsg = pdf.splitTextToSize(hMsg, 30);
          pdf.text(splitMsg[0] || "", margin + 145, y + 5);

          y += 9;
        });

        y += 4;
      }

      // --- SECTION 5: COMPREHENSIVE COMPLIANCE NOTES ---
      checkNewPage(22);
      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(11);
      pdf.setTextColor(217, 119, 6);
      pdf.text("5. COMPREHENSIVE COMPLIANCE NOTES", margin, y);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y + 2, 210 - margin, y + 2);
      y += 8;

      const summaryNotes = auditNotes?.trim() || "No general comprehensive compliance notes recorded by the auditor.";
      const splitSummary = pdf.splitTextToSize(summaryNotes, 170);

      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y, 180, Math.max(12, splitSummary.length * 4.2 + 5), "F");
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, y, 180, Math.max(12, splitSummary.length * 4.2 + 5), "S");

      pdf.setFont("Helvetica", "Normal");
      pdf.setFontSize(8);
      pdf.setTextColor(55, 65, 81);
      
      let ny = y + 4.5;
      splitSummary.forEach((lineText: string) => {
        pdf.text(lineText, margin + 4, ny);
        ny += 4.2;
      });

      // --- FOOTER AND SIGN OFF BLOCK ---
      y = Math.max(ny + 10, y + 25);
      checkNewPage(35);

      pdf.setDrawColor(209, 213, 219);
      pdf.line(margin, y, 210 - margin, y);
      y += 6;

      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      pdf.text("ZAMCOPS COMPLIANCE & LEGAL AFFAIRS DEPARTMENT", margin, y);

      pdf.setFont("Helvetica", "Normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(107, 114, 128);
      pdf.text("This document is generated automatically from the ZAMCOPS Artist Onboarding Portal.", margin, y + 4);
      pdf.text("Any alterations to the metadata rendered directly onto this audit summary nullify compliance validation.", margin, y + 7.5);

      pdf.setDrawColor(156, 163, 175);
      pdf.line(140, y + 3, 195, y + 3);
      pdf.setFont("Helvetica", "Bold");
      pdf.text("Compliance Officer Signature", 140, y + 6.8);
      pdf.setFont("Helvetica", "Normal");
      pdf.setFontSize(7);
      pdf.text(`Auditor: ${user.email}`, 140, y + 10);

      // Save Report PDF
      const formattedAppTitle = selectedAppForDocs.stageOrRegName.replace(/\s+/g, "_");
      pdf.save(`ZAMCOPS_Audit_Report_${formattedAppTitle}.pdf`);

    } catch (err) {
      console.error("Failed to export Audit Summary report:", err);
    } finally {
      setIsExportingAudit(false);
    }
  };

  const handleBulkExportPDF = () => {
    setIsBulkExporting(true);
    try {
      const verifiedApps = state.applications.filter((app) => {
        if (app.status !== "Approved") return false;
        if (!app.submittedAt) return false;
        
        const appDate = new Date(app.submittedAt);
        const startDate = new Date(bulkExportStart);
        const endDate = new Date(bulkExportEnd);
        // Ensure endDate includes all times of that day
        endDate.setHours(23, 59, 59, 999);
        
        return appDate >= startDate && appDate <= endDate;
      });

      const pdf = new jsPDF("p", "mm", "a4");
      let pageCount = 1;

      const drawHeader = (pageNo: number) => {
        pdf.setFillColor(27, 27, 31);
        pdf.rect(0, 0, 210, 35, "F");

        // Decorative gold line
        pdf.setFillColor(245, 158, 11);
        pdf.rect(0, 0, 210, 2.5, "F");

        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(14);
        pdf.setTextColor(245, 158, 11);
        pdf.text("ZAMCOPS COMPLIANCE & LEGAL LEDGER", 15, 13);

        pdf.setFont("Helvetica", "Normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(156, 163, 175);
        pdf.text("Zambian Music Copyright Protection Society • Statutory Board CAP 138", 15, 20);
        pdf.text(`VERIFIED MEMBERSHIP BLOCK ARCHIVE REPORT • PAGE ${pageNo}`, 15, 26);
        
        pdf.setFontSize(7.5);
        pdf.text(`EXPORT DATE: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, 140, 26);
      };

      drawHeader(pageCount);

      // Draw Metadata Box
      let y = 45;
      pdf.setFillColor(249, 250, 251);
      pdf.rect(15, y, 180, 28, "F");
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.35);
      pdf.rect(15, y, 180, 28, "S");

      pdf.setFont("Helvetica", "Bold");
      pdf.setFontSize(9);
      pdf.setTextColor(31, 41, 55);
      pdf.text("REPORT QUERY CONFIGURATION", 20, y + 6);

      pdf.setFont("Helvetica", "Normal");
      pdf.setFontSize(8);
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Date Range: ${new Date(bulkExportStart).toLocaleDateString()} to ${new Date(bulkExportEnd).toLocaleDateString()}`, 20, y + 13);
      pdf.text(`Auditor-in-Charge: ${user.email}`, 20, y + 20);

      pdf.text(`Verified Records Exported: ${verifiedApps.length} entries`, 110, y + 13);
      pdf.text(`Status Scope: COMPLIANCE APPROVED & LEDGER SIGNED-OFF`, 110, y + 20);

      y += 38;

      const drawTableHeader = (startHeight: number) => {
        pdf.setFillColor(30, 30, 34);
        pdf.rect(15, startHeight, 180, 8, "F");
        
        pdf.setFont("Helvetica", "Bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text("#", 17, startHeight + 5.5);
        pdf.text("STAGE/REG NAME", 22, startHeight + 5.5);
        pdf.text("REPRESENTATIVE", 62, startHeight + 5.5);
        pdf.text("TYPE", 102, startHeight + 5.5);
        pdf.text("NRC/PACRA ID", 115, startHeight + 5.5);
        pdf.text("SUBMITTED AT", 145, startHeight + 5.5);
        pdf.text("COMPLIANCE CHECKS", 172, startHeight + 5.5);
      };

      drawTableHeader(y);
      y += 8;

      if (verifiedApps.length === 0) {
        pdf.setFont("Helvetica", "Oblique");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text("No verified applications found matching the selected date criteria.", 20, y + 10);
      } else {
        verifiedApps.forEach((app, index) => {
          if (y > 265) {
            pdf.addPage();
            pageCount++;
            drawHeader(pageCount);
            y = 45;
            drawTableHeader(y);
            y += 8;
          }
          
          if (index % 2 === 1) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(15, y, 180, 13, "F");
          }
          
          pdf.setDrawColor(241, 242, 244);
          pdf.setLineWidth(0.2);
          pdf.line(15, y + 13, 195, y + 13);
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(55, 65, 81);
          
          pdf.text(String(index + 1), 17, y + 8);
          
          pdf.setFont("Helvetica", "Bold");
          pdf.setTextColor(17, 24, 39);
          const stageNameCropped = app.stageOrRegName.length > 22 ? app.stageOrRegName.substring(0, 20) + ".." : app.stageOrRegName;
          pdf.text(stageNameCropped, 22, y + 5);
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setTextColor(107, 114, 128);
          pdf.setFontSize(6.5);
          const contactCropped = app.email.length > 25 ? app.email.substring(0, 23) + ".." : app.email;
          pdf.text(contactCropped, 22, y + 9.5);
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(55, 65, 81);
          const repNameCropped = app.name.length > 22 ? app.name.substring(0, 20) + ".." : app.name;
          pdf.text(repNameCropped, 62, y + 5);
          
          pdf.setFontSize(6.5);
          pdf.setTextColor(107, 114, 128);
          pdf.text(app.phone || "N/A", 62, y + 9.5);
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(75, 85, 99);
          pdf.text(app.type.toUpperCase(), 102, y + 8);
          
          pdf.text(app.identifier || "N/A", 115, y + 8);
          
          const dateFormatted = app.submittedAt ? new Date(app.submittedAt).toISOString().split('T')[0] : "N/A";
          pdf.text(dateFormatted, 145, y + 8);
          
          pdf.setFontSize(6.5);
          pdf.setFont("Helvetica", "Bold");
          
          const indicatorsArr = [];
          if (app.idVerified || app.nrcFrontVerified) indicatorsArr.push("ID");
          if (app.contractSigned || app.contractVerified) indicatorsArr.push("CTR");
          if (app.bylawsCompliant) indicatorsArr.push("BYL");
          if (app.credentialsValid) indicatorsArr.push("CRD");
          
          const complianceText = indicatorsArr.length > 0 ? indicatorsArr.join(" | ") : "NONE";
          
          if (indicatorsArr.length === 4) {
            pdf.setTextColor(16, 185, 129);
            pdf.text("FULL COMPLIANCE ✔", 172, y + 5);
          } else {
            pdf.setTextColor(217, 119, 6);
            pdf.text("PARTIAL AUDIT ⚠", 172, y + 5);
          }
          
          pdf.setFont("Helvetica", "Normal");
          pdf.setTextColor(107, 114, 128);
          pdf.text(`[${complianceText}]`, 172, y + 9.5);
          
          y += 13;
        });
      }

      pdf.save(`ZAMCOPS_Verified_Applications_${bulkExportStart}_to_${bulkExportEnd}.pdf`);
    } catch (err) {
      console.error("Bulk export failed:", err);
    } finally {
      setIsBulkExporting(false);
    }
  };

  const handleExportApplicationsCSV = () => {
    try {
      const headers = [
        "Application ID",
        "Legal Name",
        "Stage/Registration Name",
        "Type",
        "NRC/PACRA ID",
        "Phone",
        "Email",
        "Status",
        "Submitted At",
        "ID Verified",
        "Contract Signed",
        "Bylaws Compliant",
        "Credentials Valid",
        "Audit Notes"
      ];

      const escapeCSV = (val: any) => {
        if (val === undefined || val === null) return "";
        const stringVal = String(val);
        return `"${stringVal.replace(/"/g, '""')}"`;
      };

      const rows = filteredApplications.map((app) => [
        escapeCSV(app.id),
        escapeCSV(app.name),
        escapeCSV(app.stageOrRegName),
        escapeCSV(app.type),
        escapeCSV(app.identifier),
        escapeCSV(app.phone),
        escapeCSV(app.email),
        escapeCSV(app.status),
        escapeCSV(app.submittedAt),
        escapeCSV(app.idVerified ? "YES" : "NO"),
        escapeCSV(app.contractSigned ? "YES" : "NO"),
        escapeCSV(app.bylawsCompliant ? "YES" : "NO"),
        escapeCSV(app.credentialsValid ? "YES" : "NO"),
        escapeCSV(app.auditNotes)
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ZAMCOPS_Applications_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV export failed:", err);
    }
  };

  const handleExportApplicationsExcel = () => {
    try {
      const dateStr = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
      const fileDate = new Date().toISOString().split("T")[0];
      const auditor = user.email;

      // Stats calculation
      const totalCount = filteredApplications.length;
      const approvedCount = filteredApplications.filter((a) => a.status === "Approved").length;
      const pendingCount = filteredApplications.filter((a) => a.status === "Pending").length;
      const infoRequestedCount = filteredApplications.filter((a) => a.status === "Information Requested").length;
      const rejectedCount = filteredApplications.filter((a) => a.status === "Rejected").length;

      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
         <x:ExcelWorkbook>
          <x:ExcelWorksheets>
           <x:ExcelWorksheet>
            <x:Name>Applications Audit Ledger</x:Name>
            <x:WorksheetOptions>
             <x:DisplayGridlines/>
            </x:WorksheetOptions>
           </x:ExcelWorksheet>
          </x:ExcelWorksheets>
         </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          .title-header { background-color: #1b1b1f; color: #f59e0b; font-size: 15pt; font-weight: bold; text-align: center; vertical-align: middle; height: 40px; }
          .subtitle-header { background-color: #1b1b1f; color: #a1a1aa; font-size: 9pt; text-align: center; vertical-align: middle; height: 25px; }
          .section-banner { background-color: #f4f4f5; font-size: 10pt; font-weight: bold; color: #18181b; border-bottom: 2px solid #f59e0b; padding: 6px; }
          .meta-label { font-weight: bold; background-color: #fafafa; border: 1px solid #e4e4e7; font-size: 9pt; color: #3f3f46; }
          .meta-value { border: 1px solid #e4e4e7; font-size: 9.5pt; color: #18181b; }
          .table-header { background-color: #1b1b1f; color: #ffffff; font-weight: bold; font-size: 9.5pt; border: 1px solid #3f3f46; text-align: left; height: 30px; }
          .table-data { border: 1px solid #e4e4e7; font-size: 9pt; vertical-align: middle; }
          .table-data-alt { border: 1px solid #e4e4e7; background-color: #fafafa; font-size: 9pt; vertical-align: middle; }
          .status-approved { background-color: #def7ec; color: #03543f; font-weight: bold; text-align: center; border: 1px solid #bcf0da; }
          .status-pending { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; border: 1px solid #fde68a; }
          .status-rejected { background-color: #fde8e8; color: #9b1c1c; font-weight: bold; text-align: center; border: 1px solid #fbd5d5; }
          .status-info { background-color: #e1effe; color: #1e429f; font-weight: bold; text-align: center; border: 1px solid #c3ddfd; }
          .check-verified { color: #0284c7; font-weight: bold; text-align: center; font-size: 8.5pt; }
          .check-unverified { color: #a1a1aa; text-align: center; font-size: 8.5pt; }
          .footer-note { font-style: italic; color: #71717a; font-size: 8pt; height: 30px; vertical-align: middle; }
        </style>
        </head>
        <body>
        <table>
          <!-- Branding Header Banner -->
          <tr>
            <td colspan="15" class="title-header">ZAMCOPS SYSTEM COMPLIANCE REPORT & AUDITING LEDGER</td>
          </tr>
          <tr>
            <td colspan="15" class="subtitle-header">Zambian Music Copyright Protection Society • Statutory Board CAP 138 • Internal Management System</td>
          </tr>
          
          <!-- Empty line -->
          <tr><td colspan="15"></td></tr>

          <!-- Section Banner: Audit Metadata -->
          <tr>
            <td colspan="15" class="section-banner">1. METADATA & REPORT AUDIT QUERY DETAILS</td>
          </tr>
          <tr>
            <td class="meta-label">Export Timestamp</td>
            <td colspan="3" class="meta-value">${dateStr}</td>
            <td class="meta-label">Auditor-In-Charge</td>
            <td colspan="4" class="meta-value">${auditor}</td>
            <td class="meta-label">Ledger Criteria</td>
            <td colspan="5" class="meta-value">All Displayed (Pending, Approved & Rejected)</td>
          </tr>
          <tr>
            <td class="meta-label">Record Volume</td>
            <td colspan="3" class="meta-value">${totalCount} entries currently displayed</td>
            <td class="meta-label">Compliance Level</td>
            <td colspan="4" class="meta-value">${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}% Registered Match Ratio</td>
            <td class="meta-label">Report System ID</td>
            <td colspan="5" class="meta-value">LEDGER-XL-USR-${user.email.split("@")[0].toUpperCase()}-${fileDate}</td>
          </tr>

          <!-- Empty line -->
          <tr><td colspan="15"></td></tr>

          <!-- Section Banner: Dashboard Metrics Summary -->
          <tr>
            <td colspan="15" class="section-banner">2. STANDING METRICS SNAPSHOT</td>
          </tr>
          <tr style="height: 24px; text-align: center;">
            <td colspan="3" style="background-color: #e4e4e7; font-weight: bold; border: 1px solid #d4d4d8; font-size: 9pt;">TOTAL DISPLAYED</td>
            <td colspan="3" style="background-color: #def7ec; font-weight: bold; border: 1px solid #bcf0da; font-size: 9pt; color: #03543f;">VERIFIED & APPROVED (COMPLIANT)</td>
            <td colspan="3" style="background-color: #fef3c7; font-weight: bold; border: 1px solid #fde68a; font-size: 9pt; color: #92400e;">PENDING COMPLIANCE AUDIT</td>
            <td colspan="3" style="background-color: #e1effe; font-weight: bold; border: 1px solid #c3ddfd; font-size: 9pt; color: #1e429f;">INFORMATION REQUESTED</td>
            <td colspan="3" style="background-color: #fde8e8; font-weight: bold; border: 1px solid #fbd5d5; font-size: 9pt; color: #9b1c1c;">REJECTED</td>
          </tr>
          <tr style="height: 30px; text-align: center; font-size: 15pt; font-weight: bold;">
            <td colspan="3" style="border: 1px solid #d4d4d8;">${totalCount}</td>
            <td colspan="3" style="border: 1px solid #bcf0da; color: #03543f; background-color: #f3faf7;">${approvedCount}</td>
            <td colspan="3" style="border: 1px solid #fde68a; color: #92400e; background-color: #fffbeb;">${pendingCount}</td>
            <td colspan="3" style="border: 1px solid #c3ddfd; color: #1e429f; background-color: #f4f9ff;">${infoRequestedCount}</td>
            <td colspan="3" style="border: 1px solid #fbd5d5; color: #9b1c1c; background-color: #fdf2f2;">${rejectedCount}</td>
          </tr>

          <!-- Empty line -->
          <tr><td colspan="15"></td></tr>

          <!-- Section Banner: Applications Database Table -->
          <tr>
            <td colspan="15" class="section-banner">3. REGISTRATION LEDGER ENTRIES</td>
          </tr>
          <tr>
            <th class="table-header" style="width: 130px;">Filer Application ID</th>
            <th class="table-header" style="width: 200px;">Legal Representative</th>
            <th class="table-header" style="width: 200px;">Stage / Corp Name</th>
            <th class="table-header" style="width: 100px;">Filer Type</th>
            <th class="table-header" style="width: 140px;">NRC or PACRA ID</th>
            <th class="table-header" style="width: 120px;">Phone No</th>
            <th class="table-header" style="width: 220px;">Email Contact</th>
            <th class="table-header" style="width: 110px;">Filing Date</th>
            <th class="table-header" style="width: 100px; text-align: center;">ID Check</th>
            <th class="table-header" style="width: 100px; text-align: center;">NRC Front</th>
            <th class="table-header" style="width: 100px; text-align: center;">NRC Back</th>
            <th class="table-header" style="width: 100px; text-align: center;">Passport File</th>
            <th class="table-header" style="width: 110px; text-align: center;">Contract Deed</th>
            <th class="table-header" style="width: 130px; text-align: center;">Filing Status</th>
            <th class="table-header" style="width: 250px;">Internal Audit & Compliance Officer Notes</th>
          </tr>
      `;

      // Draw Rows
      filteredApplications.forEach((app, idx) => {
        const rowClass = idx % 2 === 1 ? "table-data-alt" : "table-data";
        
        let statusStyle = "";
        if (app.status === "Approved") statusStyle = "status-approved";
        else if (app.status === "Pending") statusStyle = "status-pending";
        else if (app.status === "Rejected") statusStyle = "status-rejected";
        else statusStyle = "status-info"; // Information Requested

        const idCheckStyle = app.idVerified ? "check-verified" : "check-unverified";
        const nrcFrontStyle = app.nrcFrontVerified ? "check-verified" : "check-unverified";
        const nrcBackStyle = app.nrcBackVerified ? "check-verified" : "check-unverified";
        const passportStyle = app.passportPhotoVerified ? "check-verified" : "check-unverified";
        const contractStyle = app.contractVerified ? "check-verified" : "check-unverified";

        const formattedDate = app.submittedAt ? app.submittedAt.split("T")[0] : "N/A";

        html += `
          <tr style="height: 26px;">
            <td class="${rowClass}" style="font-family: Consolas, Monaco, monospace; font-size: 8.5pt;">${app.id}</td>
            <td class="${rowClass}" style="font-weight: bold;">${app.name}</td>
            <td class="${rowClass}">${app.stageOrRegName}</td>
            <td class="${rowClass}">${app.type.toUpperCase()}</td>
            <td class="${rowClass}" style="font-family: Consolas, Monaco, monospace;">${app.identifier || "N/A"}</td>
            <td class="${rowClass}">${app.phone || "N/A"}</td>
            <td class="${rowClass}">${app.email}</td>
            <td class="${rowClass}">${formattedDate}</td>
            <td class="${rowClass} ${idCheckStyle}">${app.idVerified ? "✔ VERIFIED" : "✖ PENDING"}</td>
            <td class="${rowClass} ${nrcFrontStyle}">${app.nrcFrontVerified ? "✔ ATTACHED" : "✖ MISSING"}</td>
            <td class="${rowClass} ${nrcBackStyle}">${app.nrcBackVerified ? "✔ ATTACHED" : "✖ MISSING"}</td>
            <td class="${rowClass} ${passportStyle}">${app.passportPhotoVerified ? "✔ ATTACHED" : "✖ N/A"}</td>
            <td class="${rowClass} ${contractStyle}">${app.contractVerified ? "✔ SIGNED" : "✖ UNSIGNED"}</td>
            <td class="${statusStyle}" style="font-size: 8.5pt; text-transform: uppercase;">${app.status}</td>
            <td class="${rowClass}" style="font-style: italic; font-size: 8.5pt; color: #52525b;">${app.auditNotes || ""}</td>
          </tr>
        `;
      });

      html += `
          <!-- Empty line -->
          <tr><td colspan="15"></td></tr>
          
          <!-- Report certification footer -->
          <tr>
            <td colspan="15" class="footer-note">
              Report automatically verified and compiled by ZAMCOPS IT-Compliance Engine on ${dateStr}. Protected under the Copyright and Neighboring Rights Act, Cap. 400 of the Laws of Zambia. Private and confidential statistical metadata ledger intended purely for auditing, validation, and regulatory assessment.
            </td>
          </tr>
        </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ZAMCOPS_Compliance_Ledger_${fileDate}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Excel export failed:", err);
    }
  };

  useEffect(() => {
    setState(loadFullState());
  }, []);

  useEffect(() => {
    if (!selectedAppForDocs) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // If typing in inputs or textareas, don't trigger shortcuts
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Document Switchers
      if (key === "1") {
        setActiveDocType("nrc_front");
        setZoomLevel(100);
        setRotation(0);
        event.preventDefault();
      } else if (key === "2") {
        setActiveDocType("nrc_back");
        setZoomLevel(100);
        setRotation(0);
        event.preventDefault();
      } else if (key === "3") {
        setActiveDocType("passport");
        setZoomLevel(100);
        setRotation(0);
        event.preventDefault();
      } else if (key === "4") {
        setActiveDocType("contract");
        setZoomLevel(100);
        setRotation(0);
        event.preventDefault();
      } else if (event.key === "ArrowLeft" || key === "[") {
        handlePrevDoc();
        event.preventDefault();
      } else if (event.key === "ArrowRight" || key === "]") {
        handleNextDoc();
        event.preventDefault();
      } else if (event.key === "Escape") {
        setSelectedAppForDocs(null);
        event.preventDefault();
      } else if (key === "v") {
        // Fast-track Verify & Approve Action
        if (selectedAppForDocs.status === "Pending") {
          event.preventDefault();
          
          // Instantly toggle checkboxes to checked
          setIdVerified(true);
          setContractSigned(true);
          setBylawsCompliant(true);
          setCredentialsValid(true);
          setNrcFrontVerified(true);
          setNrcBackVerified(true);
          setPassportPhotoVerified(true);
          setContractVerified(true);

          const updatedApps = state.applications.map((app) =>
            app.id === selectedAppForDocs.id
              ? {
                  ...app,
                  idVerified: true,
                  contractSigned: true,
                  bylawsCompliant: true,
                  credentialsValid: true,
                  nrcFrontVerified: true,
                  nrcBackVerified: true,
                  passportPhotoVerified: true,
                  contractVerified: true,
                  status: "Approved" as const,
                  auditNotes: `[Keyboard Shortcut 'V' Approval] All statutory checkpoints automatically validated during quick compliance review.\n` + (auditNotes ? auditNotes : ""),
                  annotations
                }
              : app
          );

          let updatedArtistProfiles = { ...state.artistProfiles };
          let updatedLabelProfiles = { ...state.labelProfiles };

          if (selectedAppForDocs.type === "artist") {
            updatedArtistProfiles[selectedAppForDocs.email] = {
              fullName: selectedAppForDocs.name,
              stageName: selectedAppForDocs.stageOrRegName,
              memberNumber: `ZAM-2526-${Math.floor(100 + Math.random() * 900)}`,
              membershipStatus: "Approved",
              nrcNumber: selectedAppForDocs.identifier,
              phone: selectedAppForDocs.phone,
              bankName: "ZANACO",
              bankBranch: "Main Civic Center",
              bankAccount: "Pending Profile Completion",
              mobileMoneyNumber: selectedAppForDocs.phone,
              createdAt: new Date().toISOString()
            };
          } else {
            updatedLabelProfiles[selectedAppForDocs.email] = {
              labelName: selectedAppForDocs.stageOrRegName,
              registrationNumber: selectedAppForDocs.identifier,
              representativeName: selectedAppForDocs.name,
              phone: selectedAppForDocs.phone,
              bankName: "FNB Zambia",
              bankAccount: "Pending PACRA Link",
              createdAt: new Date().toISOString()
            };
          }

          const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: user.email,
            action: "MEMBER_APPLICATION_APPROVED",
            details: `Approved ${selectedAppForDocs.type} membership application for ${selectedAppForDocs.stageOrRegName} via Instant Keyboard Shortcut (V)`
          };

          saveState({
            ...state,
            applications: updatedApps,
            artistProfiles: updatedArtistProfiles,
            labelProfiles: updatedLabelProfiles,
            auditLogs: [newLog, ...state.auditLogs]
          });

          setAuditNotifyMsg("Application automatically checked, approved and registered via Keyboard Shortcut 'V'!");
          setTimeout(() => setAuditNotifyMsg(""), 5000);
          setSelectedAppForDocs(null);
        }
      } else if (key === "r") {
        // Reject Action
        if (selectedAppForDocs.status === "Pending") {
          event.preventDefault();

          const updatedApps = state.applications.map((app) =>
            app.id === selectedAppForDocs.id
              ? {
                  ...app,
                  status: "Rejected" as const,
                  auditNotes: `[Keyboard Shortcut 'R' Decline] Rejected during compliance document inspection.\n` + (auditNotes ? auditNotes : "")
                }
              : app
          );

          const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: user.email,
            action: "MEMBER_APPLICATION_REJECTED",
            details: `Rejected ${selectedAppForDocs.type} membership application for ${selectedAppForDocs.stageOrRegName} via Keyboard Shortcut (R)`
          };

          saveState({
            ...state,
            applications: updatedApps,
            auditLogs: [newLog, ...state.auditLogs]
          });

          setAuditNotifyMsg("Application declined via Keyboard Shortcut 'R'!");
          setTimeout(() => setAuditNotifyMsg(""), 5000);
          setSelectedAppForDocs(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedAppForDocs,
    activeDocType,
    auditNotes,
    annotations,
    state,
    user
  ]);

  const saveState = (updatedState: typeof state) => {
    setState(updatedState);
    saveFullState(updatedState);
  };

  const handleOpenDocViewer = (app: MembershipApplication) => {
    setSelectedAppForDocs(app);
    setActiveDocType("nrc_front");
    setZoomLevel(100);
    setRotation(0);
    setIdVerified(!!app.idVerified);
    setContractSigned(!!app.contractSigned);
    setBylawsCompliant(!!app.bylawsCompliant);
    setCredentialsValid(!!app.credentialsValid);
    // New granular asset checkbox levels
    setNrcFrontVerified(!!app.nrcFrontVerified);
    setNrcBackVerified(!!app.nrcBackVerified);
    setPassportPhotoVerified(!!app.passportPhotoVerified);
    setContractVerified(!!app.contractVerified);
    setAuditNotes(app.auditNotes || "");
    setAuditNotifyMsg("");
    setShowInfoRequestInput(false);
    setInfoRequestNoteText(app.infoRequestNote || "");
    
    // Load annotations
    setAnnotations(app.annotations || []);
    setAnnotationMode(false);
    setNewAnnCoord(null);
    setNewAnnText("");
    setDocGeneralAnnotationNote("");
  };

  const handleSaveDocAudit = () => {
    if (!selectedAppForDocs) return;

    // Update application in state list
    const updatedApps = state.applications.map((app) =>
      app.id === selectedAppForDocs.id
        ? {
            ...app,
            idVerified,
            contractSigned,
            bylawsCompliant,
            credentialsValid,
            nrcFrontVerified,
            nrcBackVerified,
            passportPhotoVerified,
            contractVerified,
            auditNotes,
            annotations
          }
        : app
    );

    // Update selected app state as well to reflex immediate edit
    setSelectedAppForDocs({
      ...selectedAppForDocs,
      idVerified,
      contractSigned,
      bylawsCompliant,
      credentialsValid,
      nrcFrontVerified,
      nrcBackVerified,
      passportPhotoVerified,
      contractVerified,
      auditNotes,
      annotations
    });

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "APPLICATION_DOCUMENTS_AUDITED",
      details: `Logged security document review checklist & annotations for ${selectedAppForDocs.stageOrRegName}`
    };

    saveState({
      ...state,
      applications: updatedApps,
      auditLogs: [newLog, ...state.auditLogs]
    });

    setAuditNotifyMsg("Audit compliance log & annotations updated and pinned to ledger!");
    setTimeout(() => setAuditNotifyMsg(""), 5000);
  };

  const handleRequestMoreInformation = () => {
    if (!selectedAppForDocs || !infoRequestNoteText.trim()) return;

    const updatedApps = state.applications.map((app) =>
      app.id === selectedAppForDocs.id
        ? {
            ...app,
            status: "Information Requested" as const,
            infoRequested: true,
            infoRequestNote: infoRequestNoteText,
            auditNotes: `[Additional Information Requested: "${infoRequestNoteText}"]\n` + (app.auditNotes || "")
          }
        : app
    );

    setSelectedAppForDocs({
      ...selectedAppForDocs,
      status: "Information Requested",
      infoRequested: true,
      infoRequestNote: infoRequestNoteText
    });

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "INFO_REQUESTED",
      details: `Requested supplemental information for ${selectedAppForDocs.stageOrRegName}: "${infoRequestNoteText}"`
    };

    saveState({
      ...state,
      applications: updatedApps,
      auditLogs: [newLog, ...state.auditLogs]
    });

    setAuditNotifyMsg("Information request dispatched and logged in audit log!");
    setShowInfoRequestInput(false);
    setTimeout(() => setAuditNotifyMsg(""), 5000);
  };

  const handleApproveApp = (appId: string) => {
    const app = state.applications.find((a) => a.id === appId);
    if (!app) return;

    // Approve application
    const updatedApps = state.applications.map((a) =>
      a.id === appId ? { ...a, status: "Approved" as const } : a
    );

    let updatedArtistProfiles = { ...state.artistProfiles };
    let updatedLabelProfiles = { ...state.labelProfiles };

    if (app.type === "artist") {
      updatedArtistProfiles[app.email] = {
        fullName: app.name,
        stageName: app.stageOrRegName,
        memberNumber: `ZAM-2526-${Math.floor(100 + Math.random() * 900)}`,
        membershipStatus: "Approved",
        nrcNumber: app.identifier,
        phone: app.phone,
        bankName: "ZANACO",
        bankBranch: "Main Civic Center",
        bankAccount: "Pending Profile Completion",
        mobileMoneyNumber: app.phone,
        createdAt: new Date().toISOString()
      };
    } else {
      updatedLabelProfiles[app.email] = {
        labelName: app.stageOrRegName,
        registrationNumber: app.identifier,
        representativeName: app.name,
        phone: app.phone,
        bankName: "FNB Zambia",
        bankAccount: "Pending PACRA Link",
        createdAt: new Date().toISOString()
      };
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "MEMBER_APPLICATION_APPROVED",
      details: `Approved ${app.type} membership application for ${app.stageOrRegName}`
    };

    saveState({
      ...state,
      applications: updatedApps,
      artistProfiles: updatedArtistProfiles,
      labelProfiles: updatedLabelProfiles,
      auditLogs: [newLog, ...state.auditLogs]
    });
  };

  const handleRejectApp = (appId: string) => {
    const app = state.applications.find((a) => a.id === appId);
    if (!app) return;

    const updatedApps = state.applications.map((a) =>
      a.id === appId ? { ...a, status: "Rejected" as const } : a
    );

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "MEMBER_APPLICATION_REJECTED",
      details: `Rejected ${app.type} membership application for ${app.stageOrRegName}`
    };

    saveState({
      ...state,
      applications: updatedApps,
      auditLogs: [newLog, ...state.auditLogs]
    });
  };

  const handleApproveWork = (workId: string) => {
    const work = state.works.find((w) => w.id === workId);
    if (!work) return;

    const updatedWorks = state.works.map((w) =>
      w.id === workId ? { ...w, status: "Approved" as const } : w
    );

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "WORK_APPROVED",
      details: `Approved track registry '${work.title}' for artist/publisher`
    };

    // Auto accrue a welcome broadcasting royalty stream to make the experience ultra realistic!
    const welcomeRoyalty: RoyaltyEarning = {
      id: `roy-${Date.now()}`,
      trackId: work.id,
      trackTitle: work.title,
      artistName: work.artistName,
      source: "Broadcasting",
      grossAmount: 10000,
      netAmount: 8500, // 15% society charge
      period: "Q2 2026 (Pending Release)",
      status: "Accrued",
      recipientEmail: work.submittedBy
    };

    saveState({
      ...state,
      works: updatedWorks,
      royalties: [welcomeRoyalty, ...state.royalties],
      auditLogs: [newLog, ...state.auditLogs]
    });
  };

  const handleRejectWork = (workId: string) => {
    const work = state.works.find((w) => w.id === workId);
    if (!work) return;

    const updatedWorks = state.works.map((w) =>
      w.id === workId ? { ...w, status: "Rejected" as const } : w
    );

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "WORK_REJECTED",
      details: `Rejected track registry '${work.title}'`
    };

    saveState({
      ...state,
      works: updatedWorks,
      auditLogs: [newLog, ...state.auditLogs]
    });
  };

  const pendingApps = state.applications.filter((a) => a.status === "Pending");
  const pendingWorks = state.works.filter((w) => w.status === "Pending");

  // Query matching filter lists
  const filteredApplications = state.applications.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.stageOrRegName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorks = state.works.filter(
    (work) =>
      work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.isrc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.submittedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allArtists = Object.values(state.artistProfiles);
  const filteredArtists = allArtists.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.memberNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allLabels = Object.values(state.labelProfiles);
  const filteredLabels = allLabels.filter(
    (l) =>
      l.labelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.representativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditLogs = state.auditLogs.filter(
    (log) =>
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Nav configurations
  const NAV_ITEMS = [
    { id: "applications", label: "Membership Apps", icon: UserCheck, count: pendingApps.length },
    { id: "works", label: "Works Audit", icon: Music, count: pendingWorks.length },
    { id: "members", label: "General Directory", icon: Users, count: 0 },
    { id: "audit", label: "Audit Registry", icon: FileText, count: 0 }
  ] as const;

  return (
    <div className="min-h-screen bg-[#F5F5F3] p-2 sm:p-4 md:p-8 flex justify-center">
      <div className="max-w-[1400px] w-full bg-white/40 backdrop-blur-xl rounded-[24px] sm:rounded-[40px] shadow-sm border border-white flex overflow-hidden relative min-h-[calc(100vh-16px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-64px)]">
        
        {/* Desk Sidebar */}
        <div className="hidden lg:flex w-24 flex-col items-center py-8 bg-[#FCFCFC] rounded-l-[32px] border-r border-gray-100/50 shrink-0 justify-between">
          <div className="flex flex-col items-center w-full">
            <div className="w-10 h-10 bg-zamcops-orange rounded-xl flex items-center justify-center mb-12 shadow-sm animate-pulse">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <div className="flex flex-col gap-6">
              {NAV_ITEMS.map(({ id, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                    activeTab === id
                      ? 'bg-[#111111] text-white shadow-md scale-105'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                  title={id}
                >
                  <Icon size={20} />
                  {!!count && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zamcops-orange text-white flex items-center justify-center text-[10px] font-black leading-none">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-12 h-12 rounded-2xl bg-pastel-pink hover:bg-red-200 text-[#111111] flex items-center justify-center transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto pb-28 lg:pb-12">
          
          {/* Top Bar Greeting */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-10 gap-4 mt-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Back-Office Desk Console</p>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#111111]">
                Admin Registry Audit
              </h1>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={
                    activeTab === "applications"
                      ? "Search applications by name or ID..."
                      : activeTab === "works"
                      ? "Search works by title, artist or ISRC..."
                      : activeTab === "members"
                      ? "Search members directory..."
                      : "Search audit logs..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pastel-mint w-full md:w-64 shadow-sm"
                />
              </div>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pastel-yellow flex items-center justify-center font-bold text-[#111111] shadow-sm shrink-0">
                AD
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* TAB 1: MEMBERSHIP APPLICATIONS */}
            {activeTab === "applications" && (
              <motion.div
                key="applications"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#111111]">Statutory membership applications</h3>
                      <p className="text-xs font-semibold text-gray-400 mt-1">Pending approval requests filed under CAP 138.</p>
                    </div>
                    <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end flex-wrap">
                      <button
                        onClick={handleExportApplicationsCSV}
                        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-[#EAEAE8] hover:bg-[#DCDCDA] border border-gray-150/70 text-gray-800 transition-all shadow-sm cursor-pointer shrink-0"
                        title="Export displayed applications list to CSV standard format"
                      >
                        <Download size={13} className="text-[#059669]" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={handleExportApplicationsExcel}
                        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-[#EAEAE8] hover:bg-[#DCDCDA] border border-gray-150/70 text-gray-800 transition-all shadow-sm cursor-pointer shrink-0"
                        title="Export detailed, formatted compliance report to Excel spreadsheet"
                      >
                        <FileSpreadsheet size={13} className="text-[#0284c7]" />
                        <span>Export to Excel</span>
                      </button>
                      <button
                        onClick={() => setShowBulkExportPanel(!showBulkExportPanel)}
                        className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full transition-all border shrink-0 ${
                          showBulkExportPanel 
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-inner" 
                            : "bg-[#F5F5F3] border-gray-150/70 hover:bg-[#EAEAE8] text-gray-700"
                        }`}
                      >
                        <FileDown size={13} className="text-[#f59e0b]" />
                        <span>Bulk Export Summary</span>
                      </button>
                      <span className="bg-pastel-pink text-xs font-extrabold px-3 py-1.5 rounded-full text-slate-800">
                        {pendingApps.length} Pending
                      </span>
                    </div>
                  </div>

                  {/* BULK EXPORT EXPANDABLE CONFIGURATION PANEL */}
                  {showBulkExportPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-5 bg-[#F5F5F3]/60 border border-gray-200/50 rounded-3xl overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 text-left">
                          {/* Start Date */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500">
                              Start Filing Date
                            </label>
                            <input
                              type="date"
                              value={bulkExportStart}
                              onChange={(e) => setBulkExportStart(e.target.value)}
                              className="w-full font-mono text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pastel-mint shadow-sm text-gray-800"
                            />
                          </div>

                          {/* End Date */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500">
                              End Filing Date
                            </label>
                            <input
                              type="date"
                              value={bulkExportEnd}
                              onChange={(e) => setBulkExportEnd(e.target.value)}
                              className="w-full font-mono text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pastel-mint shadow-sm text-gray-800"
                            />
                          </div>
                        </div>

                        {/* Export Trigger Action Button */}
                        <button
                          onClick={handleBulkExportPDF}
                          disabled={isBulkExporting}
                          className="w-full md:w-auto bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 uppercase tracking-widest leading-none h-[38px]"
                        >
                          {isBulkExporting ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Compiling PDF...</span>
                            </>
                          ) : (
                            <>
                              <Printer className="w-3.5 h-3.5" />
                              <span>Export Active Ledger</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display live preview of scope stats */}
                      <div className="mt-4 pt-3.5 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            Verified In Scope:{" "}
                            <span className="font-extrabold text-gray-800">
                              {
                                state.applications.filter((a) => {
                                  if (a.status !== "Approved") return false;
                                  if (!a.submittedAt) return false;
                                  const d = new Date(a.submittedAt);
                                  return (
                                    d >= new Date(bulkExportStart) &&
                                    d <= new Date(new Date(bulkExportEnd).setHours(23, 59, 59, 999))
                                  );
                                }).length
                              }
                            </span>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="font-medium">
                            Status criteria: <span className="font-bold underline">APPROVED</span>
                          </span>
                        </div>
                        <p className="italic font-medium text-gray-400">
                          Outputs high-fidelity legal summary sheets under CAP 138 rules.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-4">
                    {filteredApplications.map((app) => (
                      <div
                        key={app.id}
                        className="p-5 bg-[#F5F5F3]/50 hover:bg-[#F5F5F3] border border-gray-150/40 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 transition-colors"
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-3.5">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold ${
                              app.type === "artist" ? "bg-pastel-mint text-emerald-800" : "bg-pastel-lavender text-purple-800"
                            }`}>
                              {app.type === "artist" ? "A" : "P"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-base text-gray-900">{app.stageOrRegName}</p>
                              <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Legal: {app.name} • {app.type}</p>
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-gray-400">
                                <span>NRC/PACRA: {app.identifier}</span>
                                <span>Email: {app.email}</span>
                                <span>Tel: {app.phone}</span>
                              </div>
                              
                              {/* Attached document indicators */}
                              {app.nrcFileName && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="bg-gray-150/60 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-gray-200/30">
                                    <FileText size={11} className="text-zamcops-orange" />
                                    <span>{app.nrcFileName}</span>
                                  </span>
                                  <span className="bg-gray-150/60 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-gray-200/30">
                                    <FileText size={11} className="text-cyan-700" />
                                    <span>{app.contractFileName}</span>
                                  </span>
                                  {(app.idVerified || app.contractSigned || app.bylawsCompliant) && (
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-100">
                                      <CheckCircle size={11} className="text-emerald-500" />
                                      <span>Audited</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Visual Application Status Timeline */}
                          <div className="mt-2 border-t border-gray-150/30 pt-3.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Clock size={11} className="text-gray-400" />
                              <span>Application Status Timeline</span>
                            </p>
                            <ApplicationStatusTimeline app={app} variant="light" />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-200">
                          {app.status === "Pending" ? (
                            <>
                              <button
                                onClick={() => handleOpenDocViewer(app)}
                                className="bg-[#111111] hover:bg-zinc-800 text-white border border-transparent px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                              >
                                <FileText size={14} className="text-pastel-mint" />
                                <span>Review Docs</span>
                              </button>
                              <button
                                onClick={() => handleApproveApp(app.id)}
                                className="bg-pastel-mint hover:bg-emerald-300 text-emerald-950 border border-emerald-400/20 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
                              >
                                Approve Entry
                              </button>
                              <button
                                onClick={() => handleRejectApp(app.id)}
                                className="bg-pastel-pink hover:bg-red-300 text-red-950 border border-red-400/20 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenDocViewer(app)}
                                className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center gap-1"
                              >
                                <FileText size={12} className="text-gray-500" />
                                <span>Inspect Documents</span>
                              </button>
                              <span className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase font-mono ${
                                app.status === "Approved" ? "bg-pastel-mint text-emerald-800" : "bg-pastel-pink text-red-800"
                              }`}>
                                {app.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredApplications.length === 0 && (
                      <p className="text-center py-12 text-gray-400 italic text-sm">
                        {searchQuery ? "No applications matches the search criteria." : "No statutory membership registrations found."}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: WORKS AUDIT */}
            {activeTab === "works" && (
              <motion.div
                key="works"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#111111]">Intellectual track work registry audit</h3>
                      <p className="text-xs font-semibold text-gray-400 mt-1">Pending claims and author registrations awaiting back-office compliance clearance.</p>
                    </div>
                    <span className="bg-pastel-lavender text-xs font-extrabold px-3 py-1.5 rounded-full text-slate-800">
                      {pendingWorks.length} Pending
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {filteredWorks.map((work) => (
                      <div
                        key={work.id}
                        className="p-5 bg-[#F5F5F3]/50 hover:bg-[#F5F5F3] border border-gray-150/40 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-pastel-yellow font-extrabold flex items-center justify-center shrink-0">
                            {work.title.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-base text-gray-900">{work.title}</p>
                            <p className="text-xs text-gray-550 font-bold mt-1 uppercase">Stage: {work.artistName} • Share Split: {work.sharePercentage}%</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-gray-400">
                              <span>ISRC: {work.isrc}</span>
                              <span>Genre: {work.genre}</span>
                              <span>Year: {work.releaseYear}</span>
                              <span>Filer: {work.submittedBy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-200">
                          {work.status === "Pending" ? (
                            <>
                              <button
                                onClick={() => handleApproveWork(work.id)}
                                className="bg-pastel-mint hover:bg-emerald-300 text-emerald-900 border border-emerald-400/20 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
                              >
                                Approve Filer
                              </button>
                              <button
                                onClick={() => handleRejectWork(work.id)}
                                className="bg-pastel-pink hover:bg-red-300 text-red-900 border border-red-400/20 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase font-mono ${
                              work.status === "Approved" ? "bg-pastel-mint text-emerald-800" : "bg-pastel-pink text-red-800"
                            }`}>
                              {work.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredWorks.length === 0 && (
                      <p className="text-center py-12 text-gray-400 italic text-sm">
                        {searchQuery ? "No works match the search criteria." : "No music track registrations found."}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: MEMBER DIRECTORY */}
            {activeTab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                
                {/* List Approved Artists */}
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#EEEEEB]">
                  <h3 className="text-lg font-bold text-[#111111] mb-1 flex items-center gap-2">
                    <Users size={18} className="text-zamcops-orange" />
                    Verified Artists & Composers
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 pb-2 border-b border-gray-100 font-semibold">Statutory active writers portfolio indices.</p>

                  <div className="flex flex-col gap-3">
                    {filteredArtists.map((artist, i) => (
                      <div key={i} className="bg-[#F5F5F3]/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-extrabold text-gray-900">{artist.stageName}</p>
                          <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Legal: {artist.fullName}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-2 font-bold leading-none">ID: {artist.memberNumber} • National NRC: {artist.nrcNumber}</p>
                        </div>
                        <span className="bg-pastel-mint text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full">
                          {artist.membershipStatus || "Approved"}
                        </span>
                      </div>
                    ))}
                    {filteredArtists.length === 0 && (
                      <p className="text-center py-6 text-gray-400 italic text-xs font-medium">
                        No artists match the current query.
                      </p>
                    )}
                  </div>
                </div>

                {/* List Corporate Publishers */}
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#EEEEEB]">
                  <h3 className="text-lg font-bold text-[#111111] mb-1 flex items-center gap-2">
                    <Building size={18} className="text-cyan-700" />
                    Verified Recording Labels
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 pb-2 border-b border-gray-100 font-semibold">Statutory active publishers portfolio index.</p>

                  <div className="flex flex-col gap-3">
                    {filteredLabels.map((label, i) => (
                      <div key={i} className="bg-[#F5F5F3]/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-extrabold text-gray-900">{label.labelName}</p>
                          <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Executive: {label.representativeName}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-2 font-bold leading-none">PACRA Register Ref: {label.registrationNumber}</p>
                        </div>
                        <span className="bg-pastel-lavender text-indigo-800 text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full">
                          Publisher
                        </span>
                      </div>
                    ))}
                    {filteredLabels.length === 0 && (
                      <p className="text-center py-6 text-gray-400 italic text-xs font-medium">
                        No recording labels match the current query.
                      </p>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 4: AUDIT TRAIL LOGS */}
            {activeTab === "audit" && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-2">Statutory society audit register</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6">Irreversible cryptographic ledger tracking of auditing desk logins, track approvals, and distributions released.</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase font-mono tracking-wider">
                          <th className="py-3 px-2">Timestamp</th>
                          <th className="py-3 px-2">Authorized Officer</th>
                          <th className="py-3 px-2">Statutory Action</th>
                          <th className="py-3 px-2">Detailed parameters</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                        {filteredAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-2 text-gray-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="py-4 px-2 font-mono text-gray-900 font-bold">{log.actor}</td>
                            <td className="py-4 px-2">
                              <span className="bg-pastel-yellow border border-yellow-300/30 text-gray-800 px-2.5 py-0.5 rounded font-black font-mono text-[9px]">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-semibold text-gray-650 italic text-[11px] leading-relaxed">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredAuditLogs.length === 0 && (
                      <p className="text-center py-12 text-gray-400 italic text-sm">
                        No audit log records match the current query.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* IN-APP PDF / DOCUMENT COMPLIANCE AUDITOR BOARD */}
          <AnimatePresence>
            {selectedAppForDocs && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#070708]/85 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 text-white font-sans md:p-6"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="bg-[#121214] w-full max-w-7xl h-[92vh] rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-zinc-800/80"
                >
                  
                  {/* WORKSPACE VIEWPORT STAGE (LEFT: FILE READER BAR & DOCUMENT CONTAINER) */}
                  <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0f] relative overflow-hidden">
                    
                    {/* READER TOOLBAR */}
                    <div className="bg-[#121214]/90 p-4 border-b border-zinc-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
                          <FileText size={18} className="text-zamcops-orange animate-pulse" />
                        </div>
                        <div className="min-w-0 leading-tight border-r border-zinc-850 pr-4">
                          <p className="text-[9px] text-zinc-500 font-extrabold tracking-wider uppercase">Active Auditor Cap 138 Viewer</p>
                          <h4 className="text-xs font-black text-white truncate max-w-[200px] mt-0.5" title={
                            activeDocType === "nrc_front" ? selectedAppForDocs.nrcFrontFileName || "nrc_front.jpg" :
                            activeDocType === "nrc_back" ? selectedAppForDocs.nrcBackFileName || "nrc_back.jpg" :
                            activeDocType === "passport" ? selectedAppForDocs.passportPhotoFileName || "passport_photo.jpg" :
                            selectedAppForDocs.contractFileName || "membership_contract.pdf"
                          }>
                            {activeDocType === "nrc_front" ? selectedAppForDocs.nrcFrontFileName || "nrc_front.jpg" :
                             activeDocType === "nrc_back" ? selectedAppForDocs.nrcBackFileName || "nrc_back.jpg" :
                             activeDocType === "passport" ? selectedAppForDocs.passportPhotoFileName || "passport_photo.jpg" :
                             selectedAppForDocs.contractFileName || "contract.pdf"}
                          </h4>
                        </div>
                      </div>

                      {/* DOCUMENT SWITCHER & NAVIGATION GROUP */}
                      <div className="flex items-center gap-1.5 self-stretch xl:self-auto select-none">
                        {/* PREVIOUS DOCUMENT BUTTON */}
                        <button
                          type="button"
                          onClick={handlePrevDoc}
                          disabled={activeDocType === "nrc_front"}
                          className="h-8 w-8 rounded-xl bg-[#1b1b1f] border border-zinc-800/40 hover:border-zinc-700 hover:text-white text-zinc-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          title="Previous Document"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {/* DOCUMENT SWITCHER TABS - NRC front, NRC back, Passport photo, Contract agreement */}
                        <div className="flex bg-[#1b1b1f] p-1 rounded-xl flex-1 xl:flex-none overflow-x-auto gap-1">
                          <button
                            onClick={() => {
                              setActiveDocType("nrc_front");
                              setZoomLevel(100);
                              setRotation(0);
                            }}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              activeDocType === "nrc_front"
                                ? "bg-zamcops-orange text-white shadow font-extrabold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            NRC Front
                          </button>
                          <button
                            onClick={() => {
                              setActiveDocType("nrc_back");
                              setZoomLevel(100);
                              setRotation(0);
                            }}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              activeDocType === "nrc_back"
                                ? "bg-zamcops-orange text-white shadow font-extrabold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            NRC Back
                          </button>
                          <button
                            onClick={() => {
                              setActiveDocType("passport");
                              setZoomLevel(100);
                              setRotation(0);
                            }}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              activeDocType === "passport"
                                ? "bg-zamcops-orange text-white shadow font-extrabold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Passport
                          </button>
                          <button
                            onClick={() => {
                              setActiveDocType("contract");
                              setZoomLevel(100);
                              setRotation(0);
                            }}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              activeDocType === "contract"
                                ? "bg-zamcops-orange text-white shadow font-extrabold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Contract
                          </button>
                        </div>

                        {/* NEXT DOCUMENT BUTTON */}
                        <button
                          type="button"
                          onClick={handleNextDoc}
                          disabled={activeDocType === "contract"}
                          className="h-8 w-8 rounded-xl bg-[#1b1b1f] border border-zinc-800/40 hover:border-zinc-700 hover:text-white text-zinc-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          title="Next Document"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* STAGE ZOOM & ROTATION CONTROLS */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-[#1b1b1f] px-2 py-1 rounded-xl">
                        <button
                          onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                          disabled={zoomLevel <= 50}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 disabled:opacity-40 hover:text-white text-zinc-400 cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut size={15} />
                        </button>
                        <span className="text-[11px] font-mono font-bold text-center w-12 text-zinc-300">
                          {zoomLevel}%
                        </span>
                        <button
                          onClick={() => setZoomLevel(Math.min(175, zoomLevel + 25))}
                          disabled={zoomLevel >= 150}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 disabled:opacity-40 hover:text-white text-zinc-400 cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn size={15} />
                        </button>
                        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                        <button
                          onClick={() => setRotation((rotation + 90) % 360)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 hover:text-white text-zinc-400 cursor-pointer"
                          title="Rotate Document View"
                        >
                          <RotateCw size={15} />
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 hover:text-white text-zinc-400 cursor-pointer"
                          title="Print Document"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          disabled={isGeneratingPDF}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-wait hover:text-white text-zinc-400 cursor-pointer"
                          title="Download as PDF with Annotations"
                        >
                          {isGeneratingPDF ? (
                            <span className="w-3.5 h-3.5 border-2 border-zinc-550 border-t-amber-500 rounded-full animate-spin" />
                          ) : (
                            <FileDown size={15} />
                          )}
                        </button>
                        <button
                          onClick={handleExportAuditSummary}
                          disabled={isExportingAudit}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-wait hover:text-white text-zinc-400 cursor-pointer"
                          title="Export Formal 'Audit Summary' Report PDF"
                        >
                          {isExportingAudit ? (
                            <span className="w-3.5 h-3.5 border-2 border-zinc-550 border-t-amber-500 rounded-full animate-spin" />
                          ) : (
                            <ClipboardCheck size={15} />
                          )}
                        </button>
                        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                        <button
                          onClick={() => {
                            setAnnotationMode(!annotationMode);
                            setNewAnnCoord(null);
                          }}
                          className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                            annotationMode 
                              ? "bg-amber-500 text-slate-950 font-extrabold animate-pulse" 
                              : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                          }`}
                          title={annotationMode ? "Exit Annotation Mode" : "Enter Annotation Mode (Click to place comments on document)"}
                        >
                          <MessageSquarePlus size={14} />
                          <span>{annotationMode ? "Annotating" : "Annotate"}</span>
                        </button>
                      </div>
                    </div>

                    {/* ANNOTATION INSTRUCTIONS BANNER */}
                    {annotationMode && (
                      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-[11px] text-amber-200 font-sans select-none shrink-0 text-left">
                        <div className="flex items-center gap-2">
                          <Pin size={12} className="text-amber-500 animate-pulse" />
                          <span><strong>Annotation Workspace:</strong> Toggle between Pen, Marker, and Text Box modes on the floating stage toolbar below to audit the document.</span>
                        </div>
                        <button 
                          onClick={() => {
                            setAnnotationMode(false);
                            setNewAnnCoord(null);
                            setNewAnnDrawingPoints(null);
                          }} 
                          className="text-amber-500 hover:text-amber-400 font-bold uppercase text-[9px] bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1 rounded-lg cursor-pointer"
                        >
                          Exit Tools
                        </button>
                      </div>
                    )}

                    {/* INTERACTIVE COMPOSABLE CANVAS STAGE */}
                    <div className="flex-1 overflow-auto flex items-start justify-center p-6 md:p-12 relative scrollbar-thin">
                      
                      {/* FLOATING DRAWING TOOLBAR WITHIN THE VISUALIZER STAGE */}
                      {annotationMode && (
                        <div id="floating-draw-toolbar" className="absolute top-4 left-4 z-40 bg-[#121214]/95 backdrop-blur border border-zinc-800/80 p-1.5 rounded-2xl shadow-xl flex items-center gap-1 font-sans">
                          <div className="px-2 pr-2.5 border-r border-zinc-900 flex items-center gap-1.5 shrink-0 select-none">
                            <PenLine size={12} className="text-zamcops-orange animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-zinc-300 tracking-wider">Markup Stage</span>
                          </div>
                          <div className="flex bg-zinc-950/40 p-0.5 rounded-xl border border-zinc-900">
                            {/* PIN MODE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAnnotationTool("pin");
                                setNewAnnCoord(null);
                                setNewAnnDrawingPoints(null);
                              }}
                              className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                                annotationTool === "pin"
                                  ? "bg-amber-500 text-slate-950 shadow"
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                              }`}
                              title="Pin Comment: Click to drop a comment node"
                            >
                              <Pin size={11} fill={annotationTool === "pin" ? "currentColor" : "none"} />
                              <span>Pin</span>
                            </button>

                            {/* PEN MODE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAnnotationTool("pen");
                                setNewAnnCoord(null);
                                setNewAnnDrawingPoints(null);
                              }}
                              className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                                annotationTool === "pen"
                                  ? "bg-red-500 text-white shadow"
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                              }`}
                              title="Pen Mode: Draw thin red freehand highlights"
                            >
                              <PenLine size={11} />
                              <span>Pen</span>
                            </button>

                            {/* MARKER MODE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAnnotationTool("marker");
                                setNewAnnCoord(null);
                                setNewAnnDrawingPoints(null);
                              }}
                              className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                                annotationTool === "marker"
                                  ? "bg-[#eab308] text-slate-950 shadow font-extrabold"
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                              }`}
                              title="Marker Mode: Draw thick gold semi-transparent marker highlights"
                            >
                              <Highlighter size={11} />
                              <span>Marker</span>
                            </button>

                            {/* TEXT BOX MODE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAnnotationTool("textbox");
                                setNewAnnCoord(null);
                                setNewAnnDrawingPoints(null);
                              }}
                              className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                                annotationTool === "textbox"
                                  ? "bg-sky-500 text-slate-950 shadow"
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                              }`}
                              title="Text Box: Click document to place a direct text label overlay"
                            >
                              <Type size={11} />
                              <span>Text Box</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div
                        id="document-visualizer-stage"
                        style={{
                          transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                          transformOrigin: "top center"
                        }}
                        className={`transition-transform duration-200 shrink-0 relative ${
                          annotationMode 
                            ? "cursor-crosshair pointer-events-auto" 
                            : "select-none cursor-grab active:cursor-grabbing"
                        }`}
                        onClick={(e) => {
                          if (!annotationMode) return;
                          if (annotationTool !== "pin" && annotationTool !== "textbox") return;
                          
                          // Ensure we only trigger when clicking on document itself or children
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          setNewAnnCoord({ x, y });
                          setNewAnnDrawingPoints(null);
                        }}
                        onMouseDown={(e) => {
                          if (!annotationMode) return;
                          if (annotationTool !== "pen" && annotationTool !== "marker") return;
                          
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                          
                          setIsDrawing(true);
                          setCurrentPath([{ x, y }]);
                          setNewAnnDrawingPoints(null);
                          setNewAnnCoord(null);
                        }}
                        onMouseMove={(e) => {
                          if (!annotationMode || !isDrawing) return;
                          if (annotationTool !== "pen" && annotationTool !== "marker") return;
                          
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                          
                          const lastPoint = currentPath[currentPath.length - 1];
                          if (!lastPoint || Math.abs(lastPoint.x - x) > 0.3 || Math.abs(lastPoint.y - y) > 0.3) {
                            setCurrentPath((prev) => [...prev, { x, y }]);
                          }
                        }}
                        onMouseUp={(e) => {
                          if (!annotationMode || !isDrawing) return;
                          if (annotationTool !== "pen" && annotationTool !== "marker") return;
                          setIsDrawing(false);
                          
                          if (currentPath.length < 2) {
                            setCurrentPath([]);
                            return;
                          }
                          
                          // Compute center/midpoint coordinates for the placement of comment tooltip form
                          let sumX = 0;
                          let sumY = 0;
                          currentPath.forEach((p) => {
                            sumX += p.x;
                            sumY += p.y;
                          });
                          const avgX = sumX / currentPath.length;
                          const avgY = sumY / currentPath.length;
                          
                          setNewAnnDrawingPoints(currentPath);
                          setNewAnnCoord({ x: avgX, y: avgY });
                          setCurrentPath([]);
                        }}
                        onMouseLeave={() => {
                          if (isDrawing) {
                            setIsDrawing(false);
                            if (currentPath.length >= 2) {
                              let sumX = 0;
                              let sumY = 0;
                              currentPath.forEach((p) => {
                                sumX += p.x;
                                sumY += p.y;
                              });
                              setNewAnnDrawingPoints(currentPath);
                              setNewAnnCoord({ x: sumX / currentPath.length, y: sumY / currentPath.length });
                            }
                            setCurrentPath([]);
                          }
                        }}
                      >
                        {/* Live and Custom Saved SVG drawing overlays */}
                        <svg className="absolute inset-0 z-20 pointer-events-none w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {annotationMode && (annotationTool === "pen" || annotationTool === "marker") && isDrawing && currentPath.length > 0 && (
                            <path
                              d={pointsToSvgPath(currentPath)}
                              stroke={annotationTool === "marker" ? "#eab308" : "#ef4444"}
                              strokeWidth={annotationTool === "marker" ? "12" : "2.5"}
                              strokeOpacity={annotationTool === "marker" ? "0.45" : "1.0"}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {annotations
                            .filter((ann) => ann.docType === activeDocType && (ann.type === "draw" || ann.type === "pen" || ann.type === "marker") && ann.points)
                            .map((ann) => (
                              <path
                                key={ann.id}
                                d={pointsToSvgPath(ann.points)}
                                stroke={ann.type === "marker" ? "#eab308" : "#ef4444"}
                                strokeWidth={ann.type === "marker" ? "12" : "2.8"}
                                strokeOpacity={ann.type === "marker" ? "0.45" : "1.0"}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] transition-all duration-150 hover:stroke-yellow-400"
                              />
                            ))}
                        </svg>

                        {/* Render saved pins for the active doc type */}
                        {annotations
                          .filter((ann) => ann.docType === activeDocType)
                          .map((ann) => {
                            if (ann.type === "textbox") {
                              return (
                                <div
                                  key={ann.id}
                                  style={{
                                    left: `${ann.x}%`,
                                    top: `${ann.y}%`,
                                    transform: "translate(-50%, -50%)"
                                  }}
                                  className="absolute z-21 group pointer-events-auto"
                                  onMouseEnter={() => setHoveredAnnId(ann.id)}
                                  onMouseLeave={() => setHoveredAnnId(null)}
                                >
                                  {/* Yellow floating sticky markup sticker */}
                                  <div className="bg-[#fef08a] border border-yellow-400 shadow-md text-yellow-950 font-sans font-bold px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap leading-none flex items-center gap-1.5 hover:border-yellow-500 hover:scale-105 transition-all select-none">
                                    <Type size={11} className="text-yellow-700 shrink-0" />
                                    <span>{ann.text}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = annotations.filter((a) => a.id !== ann.id);
                                        setAnnotations(updated);
                                      }}
                                      className="hidden group-hover:flex w-3.5 h-3.5 rounded-full bg-red-500 text-white items-center justify-center text-[7.5px] font-black hover:bg-red-600 cursor-pointer ml-1 select-none"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* Small footer tooltip metadata on hover */}
                                  {hoveredAnnId === ann.id && (
                                    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 bg-zinc-950 text-white border border-zinc-900 px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap leading-none select-none pointer-events-none">
                                      by {ann.author.split("@")[0]}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={ann.id}
                                style={{
                                  left: `${ann.x}%`,
                                  top: `${ann.y}%`,
                                  transform: "translate(-50%, -50%)"
                                }}
                                className="absolute z-21 pointer-events-auto"
                                onMouseEnter={() => setHoveredAnnId(ann.id)}
                                onMouseLeave={() => setHoveredAnnId(null)}
                              >
                                {/* Glowing visual pulse ring around the pin */}
                                <span className={`absolute inline-flex h-6 w-6 rounded-full opacity-20 animate-ping -left-1/2 -top-1/2 ${
                                  ann.type === "draw" || ann.type === "pen" ? "bg-red-400" : ann.type === "marker" ? "bg-yellow-400" : "bg-amber-400"
                                }`} style={{ transform: "translate(25%, 25%)" }}></span>
                                
                                <div className={`w-5 h-5 rounded-full shadow-lg border-2 border-white flex items-center justify-center cursor-pointer transition-transform duration-100 hover:scale-115 relative z-10 ${
                                  ann.type === "draw" || ann.type === "pen" 
                                    ? "bg-red-500 hover:bg-red-400 text-white" 
                                    : ann.type === "marker" 
                                      ? "bg-yellow-500 hover:bg-yellow-400 text-slate-950" 
                                      : "bg-amber-500 hover:bg-amber-400 text-black"
                                }`}>
                                  {ann.type === "draw" || ann.type === "pen" ? (
                                    <PenLine size={10} strokeWidth={2.5} />
                                  ) : ann.type === "marker" ? (
                                    <Highlighter size={10} strokeWidth={2.5} />
                                  ) : (
                                    <Pin size={10} fill="currentColor" />
                                  )}
                                </div>

                                {/* Tooltip Comment Card */}
                                {hoveredAnnId === ann.id && (
                                  <div className="absolute left-1/2 bottom-6 -translate-x-1/2 mb-1.5 bg-zinc-950 text-white border border-zinc-800 p-2.5 rounded-lg shadow-2xl w-48 text-left z-30 pointer-events-none select-none">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1 font-sans text-[8px] font-bold text-amber-500 uppercase tracking-widest">
                                      <span>
                                        {ann.type === "draw" || ann.type === "pen" 
                                          ? "Drawing Mark" 
                                          : ann.type === "marker" 
                                            ? "Marker Highlight" 
                                            : "Pinned Comment"}
                                      </span>
                                      <span className="text-zinc-500">({ann.x}%, {ann.y}%)</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-150 font-sans leading-normal break-words">{ann.text}</p>
                                    <div className="text-[7px] text-zinc-500 font-mono mt-1 pt-0.5 border-t border-zinc-850 text-right">
                                      by {ann.author.split("@")[0]}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        {/* Interactive Placer form */}
                        {newAnnCoord && (
                          <div
                            data-html2canvas-ignore="true"
                            style={{
                              left: `${newAnnCoord.x}%`,
                              top: `${newAnnCoord.y}%`,
                              transform: "translate(-50%, -50%)"
                            }}
                            className="absolute z-40 bg-[#121214] text-white p-3.5 rounded-xl border border-amber-500 shadow-2xl w-56 text-left pointer-events-auto font-sans"
                            onClick={(e) => e.stopPropagation()} // Prevent clicking within form from registering new click
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                {annotationTool === "pen" ? (
                                  <>
                                    <PenLine size={10} className="text-red-500 animate-pulse" /> Attach Pen Annotation
                                  </>
                                ) : annotationTool === "marker" ? (
                                  <>
                                    <Highlighter size={10} className="text-yellow-500 animate-pulse" /> Attach Marker Highlight
                                  </>
                                ) : annotationTool === "textbox" ? (
                                  <>
                                    <Type size={10} className="text-sky-500 animate-pulse" /> Attach Text Box Content
                                  </>
                                ) : (
                                  <>
                                    <Pin size={10} className="text-amber-500 animate-pulse" /> Pin Comment Note
                                  </>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAnnCoord(null);
                                  setNewAnnDrawingPoints(null);
                                }}
                                className="w-4 h-4 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </div>

                            <textarea
                              value={newAnnText}
                              onChange={(e) => setNewAnnText(e.target.value)}
                              placeholder={
                                annotationTool === "pen" || annotationTool === "marker" 
                                  ? "Write remark for this drawing highlight..." 
                                  : annotationTool === "textbox" 
                                    ? "Type the text content to display on the document..." 
                                    : "Write remark/issue here (e.g. identity photo of poor clarity)..."
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-zinc-650 min-h-[55px] resize-none leading-normal text-left"
                              autoFocus
                            />

                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAnnCoord(null);
                                  setNewAnnDrawingPoints(null);
                                }}
                                className="px-2 py-1 text-[8px] font-bold text-zinc-400 bg-zinc-850 hover:bg-zinc-800 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newAnnText.trim()) return;
                                  const text = newAnnText.trim();
                                  const newAnn = {
                                    id: `ann-${Date.now()}`,
                                    docType: activeDocType,
                                    x: Math.round(newAnnCoord.x * 10) / 10,
                                    y: Math.round(newAnnCoord.y * 10) / 10,
                                    text,
                                    timestamp: new Date().toISOString(),
                                    author: user.email,
                                    type: annotationTool,
                                    points: newAnnDrawingPoints || undefined
                                  };
                                  const updated = [...annotations, newAnn];
                                  setAnnotations(updated);

                                  // Instantly append / attach to auditor compliance notes text state!
                                  const docLabel = 
                                    activeDocType === "nrc_front" ? "NRC Front" :
                                    activeDocType === "nrc_back" ? "NRC Back" :
                                    activeDocType === "passport" ? "Passport" : "Contract";
                                  
                                  let attachmentStr = "";
                                  if (newAnn.type === "pen") {
                                    attachmentStr = `[${docLabel} Pen Markup at (${newAnn.x}%, ${newAnn.y}%) with ${newAnnDrawingPoints?.length || 0} vertices]: "${text}"`;
                                  } else if (newAnn.type === "marker") {
                                    attachmentStr = `[${docLabel} Marker Highlight at (${newAnn.x}%, ${newAnn.y}%) with ${newAnnDrawingPoints?.length || 0} vertices]: "${text}"`;
                                  } else if (newAnn.type === "textbox") {
                                    attachmentStr = `[${docLabel} Text Box Overlay at (${newAnn.x}%, ${newAnn.y}%)]: "${text}"`;
                                  } else {
                                    attachmentStr = `[${docLabel} Pin Comment at (${newAnn.x}%, ${newAnn.y}%)]: "${text}"`;
                                  }
                                  
                                  setAuditNotes((prev) => {
                                    const cleanedPrev = prev.trim();
                                    return cleanedPrev ? `${cleanedPrev}\n${attachmentStr}` : attachmentStr;
                                  });

                                  setNewAnnCoord(null);
                                  setNewAnnDrawingPoints(null);
                                  setNewAnnText("");
                                }}
                                className="px-2.5 py-1 text-[8px] font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded uppercase cursor-pointer"
                              >
                                {annotationTool === "pen" || annotationTool === "marker" 
                                  ? "Attach Annotation" 
                                  : annotationTool === "textbox" 
                                    ? "Render Sticker" 
                                    : "Place Pin"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* NRC FRONT VIEWPORT */}
                        {activeDocType === "nrc_front" && (
                          <div className="flex flex-col gap-6 w-[560px] bg-[#dcead1] p-6 rounded-[22px] border-4 border-emerald-800/40 text-[#122b15] shadow-xl relative overflow-hidden font-mono text-xs">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.03)_10%,transparent_10.5%)] bg-[size:16px_16px] pointer-events-none" />
                            <div className="flex justify-between items-start border-b border-emerald-900/10 pb-3 z-10">
                              <div className="text-[10px] uppercase font-black text-emerald-950">REPUBLIC OF ZAMBIA</div>
                              <div className="text-right text-[9px] font-black tracking-widest text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded leading-none">ID-FRONT</div>
                            </div>

                            <div className="grid grid-cols-12 gap-5 z-10 md:p-1">
                              {/* Left Column stats */}
                              <div className="col-span-8 flex flex-col gap-3.5 pr-1">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-emerald-900/70 uppercase">Registration No:</span>
                                  <span className="font-extrabold text-xs text-emerald-950 font-sans tracking-wide leading-none">{selectedAppForDocs.identifier}</span>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-emerald-900/70 uppercase">Full Legal Name:</span>
                                  <span className="font-black text-gray-900 font-sans text-xs leading-none uppercase">{selectedAppForDocs.name}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] text-emerald-900/70 uppercase">Sex:</span>
                                    <span className="font-bold text-gray-800 uppercase">CONFIRMED</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] text-emerald-900/70 uppercase">District:</span>
                                    <span className="font-bold text-gray-800 uppercase text-xs">LUSAKA</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-0.5 border-t border-emerald-905/10 mt-1 pt-1.5Col">
                                  <span className="text-[7px] text-emerald-900/60 leading-none mb-1">HOLDER SIGNATURE & OATH:</span>
                                  <span className="text-sm font-semibold italic text-blue-800 font-sans tracking-wide pl-1 select-none filter drop-shadow">
                                    {selectedAppForDocs.stageOrRegName}
                                  </span>
                                </div>
                              </div>

                              {/* Right Portrait Box */}
                              <div className="col-span-4 flex flex-col items-center justify-between">
                                <div className="w-[120px] h-[145px] bg-[#cbdcc0] border-2 border-emerald-950/20 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0 shadow-inner">
                                  {/* User Portrait Icon Replicate */}
                                  <div className="w-14 h-14 bg-emerald-800/20 rounded-full flex items-center justify-center text-emerald-950 font-black text-base shadow border border-emerald-800/10">
                                    {selectedAppForDocs.stageOrRegName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="mt-3 text-center leading-none">
                                    <p className="text-[8px] font-sans font-black tracking-tight text-emerald-950 uppercase">OFFICIAL</p>
                                    <p className="text-[7px] text-emerald-800/80 font-mono mt-0.5 uppercase">PASS PORTRAIT</p>
                                  </div>
                                  <div className="absolute inset-0 bg-linear-to-tr from-emerald-900/5 via-transparent to-emerald-950/5 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                            <div className="text-[7px] text-emerald-900/40 text-center uppercase tracking-wide border-t border-emerald-900/5 pt-1 font-sans">
                              National Registry System • Republic of Zambia Under Act Cap 313
                            </div>
                          </div>
                        )}

                        {/* NRC BACK VIEWPORT */}
                        {activeDocType === "nrc_back" && (
                          <div className="flex flex-col gap-6 w-[560px] bg-[#dcead1] p-6 rounded-[22px] border-4 border-emerald-800/40 text-[#122b15] shadow-xl relative overflow-hidden font-mono text-xs">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.03)_10%,transparent_10.5%)] bg-[size:16px_16px] pointer-events-none" />
                            
                            {/* Blue stamp overlay */}
                            <div className="absolute right-[20%] top-[25%] w-24 h-24 rounded-full border-4 border-blue-600/20 border-dashed flex items-center justify-center text-center text-blue-600/30 text-[9px] font-bold uppercase tracking-widest rotate-12 pointer-events-none select-none">
                              <span>DEPT REGISTRY<br/>ZAMBIA APPROVED</span>
                            </div>

                            <div className="flex justify-between items-start border-b border-emerald-900/10 pb-3 z-10">
                              <div className="text-[10px] uppercase font-black text-emerald-950">FORM IV (REG. 6) BACK COPY</div>
                              <div className="text-right text-[9px] font-black tracking-widest text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded leading-none">ID-BACK</div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 z-10">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-emerald-900/70 uppercase">Division or Chief Name:</span>
                                  <span className="font-bold text-gray-800 uppercase">CHELSTON SECTION 14</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-emerald-900/70 uppercase">Village / Residence Address:</span>
                                  <span className="font-bold text-gray-800 uppercase">PLOT 9010 LUSAKA METRO</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] text-emerald-900/70 uppercase">Date of Registration:</span>
                                  <span className="font-bold text-gray-800">12/10/2016</span>
                                </div>
                              </div>

                              <div className="flex flex-col justify-between items-end border-l border-emerald-900/15 pl-4">
                                <span className="text-[8px] text-emerald-900/70 uppercase font-black tracking-tight self-start">RIGHT THUMB IMPRESS:</span>
                                
                                <div className="w-[100px] h-[100px] bg-slate-50 rounded-xl border border-emerald-950/20 shadow-inner flex items-center justify-center opacity-70 mt-3 relative select-none">
                                  {/* Fingerprint line design */}
                                  <svg viewBox="0 0 100 100" className="w-16 h-16 text-emerald-950/80" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M50 15 C 30 30, 35 60, 50 85" />
                                    <path d="M40 20 C 20 35, 25 65, 40 80" />
                                    <path d="M60 20 C 80 35, 75 65, 60 81" />
                                    <path d="M50 30 C 40 40, 41 55, 50 70" />
                                    <path d="M45 42 C 48 45, 49 50, 45 58" />
                                    <path d="M55 42 C 51 45, 52 50, 55 58" />
                                  </svg>
                                  <div className="absolute bottom-1 right-2 text-[7px] font-sans uppercase font-black tracking-wide text-emerald-800 select-none">Ink Stamp</div>
                                </div>
                              </div>
                            </div>

                            <div className="text-[7px] text-stone-500 font-mono text-center border-t border-emerald-900/10 pt-2 flex justify-between select-none">
                              <span>SERIAL NO: BC-9023412-Z</span>
                              <span>SECURITY MATRIX CODE ACTIVE</span>
                            </div>
                          </div>
                        )}

                        {/* PASSPORT PORTRAIT VIEWPORT */}
                        {activeDocType === "passport" && (
                          <div className="w-[480px] bg-[#1d3557] p-6 rounded-[24px] border-4 border-[#e9c46a]/30 text-white shadow-xl relative overflow-hidden font-sans">
                            {/* Gold biometric header decoration */}
                            <div className="absolute right-4 top-4 w-10 h-10 select-none opacity-20">
                              {/* Passport RFID emblem pattern */}
                              <div className="w-8 h-6 border-2 border-white rounded mt-2 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full" />
                              </div>
                            </div>

                            <div className="text-center flex flex-col items-center gap-1.5 mb-6 border-b border-white/10 pb-4">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-350">Republic of Zambia</span>
                              <h3 className="text-xs font-black tracking-widest text-[#e9c46a] uppercase">PASSPORT PHOTO / BIOMETRIC PAGE</h3>
                            </div>

                            <div className="grid grid-cols-12 gap-5">
                              {/* Left Columns - portrait face picture with realistic blue gradient background */}
                              <div className="col-span-5 flex flex-col items-center">
                                <div className="w-[140px] h-[170px] bg-sky-950/40 rounded-xl border border-white/20 relative overflow-hidden flex flex-col items-center justify-center shadow-lg p-2 shrink-0">
                                  {/* Glowing biometrical facial recognition lines */}
                                  <div className="absolute inset-x-2 top-1/4 h-[1px] bg-red-500/60 animate-bounce" />
                                  <div className="w-16 h-16 bg-sky-900/50 rounded-full border border-sky-400/20 flex items-center justify-center text-white font-serif font-black text-lg shadow">
                                    {selectedAppForDocs.stageOrRegName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-[8px] text-sky-300 tracking-wider font-mono mt-4 font-bold uppercase">Biometric Read</span>
                                </div>
                              </div>

                              {/* Right Columns - core biometric data */}
                              <div className="col-span-7 flex flex-col justify-between font-mono text-[9px] text-zinc-300">
                                <div className="space-y-2.5">
                                  <div>
                                    <span className="text-[7px] text-zinc-400 uppercase font-black leading-none">Document Surname:</span>
                                    <p className="font-extrabold text-white uppercase text-xs leading-none mt-1">{selectedAppForDocs.name.split(" ").slice(-1)[0] || "ZAMBA"}</p>
                                  </div>
                                  <div>
                                    <span className="text-[7px] text-zinc-400 uppercase font-black leading-none">Given Names:</span>
                                    <p className="font-extrabold text-white uppercase text-xs leading-none mt-1">{selectedAppForDocs.name.split(" ").slice(0, -1).join(" ") || "APPLICANT"}</p>
                                  </div>
                                  <div>
                                    <span className="text-[7px] text-zinc-400 uppercase font-black leading-none">Nationality / Authority:</span>
                                    <p className="font-bold text-white uppercase leading-none mt-1">ZAMBIAN • PASSPORT OFFICE LUSAKA</p>
                                  </div>
                                  <div>
                                    <span className="text-[7px] text-zinc-400 uppercase font-black leading-none">Identifier Checked:</span>
                                    <p className="font-bold text-[#e9c46a] text-xs leading-none mt-1">{selectedAppForDocs.identifier}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-white/10 flex justify-between items-center text-[8px] font-mono text-zinc-400">
                              <span>P&lt;ZAM&lt;&lt;{selectedAppForDocs.name.replace(/\s+/g,"&lt;").toUpperCase()}</span>
                              <span className="text-zinc-500 font-extrabold">PASSED SCANNED VALIDATION</span>
                            </div>
                          </div>
                        )}

                        {/* COMPLIANCE DEED VIEWPORT */}
                        {activeDocType === "contract" && (
                          <div className="w-[660px] bg-amber-50/95 p-8 sm:p-12 rounded-[20px] border border-stone-250 text-stone-900 shadow-2xl relative flex flex-col leading-relaxed font-sans max-h-[1200px]">
                            
                            {/* Watermark Crest */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-[35%] w-72 h-72 rounded-full border border-[#111111]/30 opacity-[0.03] flex items-center justify-center rotate-12 pointer-events-none select-none">
                              <span className="p-4 leading-none text-center font-black uppercase text-[15px] tracking-widest leading-none">CUSTODIAN OF LAWS RIGHTS OF SOCIETY</span>
                            </div>

                            <div className="text-center flex flex-col items-center border-b border-stone-250 pb-6 mb-6">
                              <span className="text-[10px] font-black tracking-widest text-[#111111] uppercase select-none">ESTABLISHED STATUTORY INSTRUMENT</span>
                              <h2 className="text-base font-black tracking-tight text-center text-stone-950 mt-1.5 font-serif uppercase">
                                ZAMCOPS CAP 138 ROYALTY ASSIGNMENT DEED
                              </h2>
                              <p className="text-[10px] text-stone-500 font-medium font-mono mt-2 uppercase tracking-wide">
                                Contract ID: TX-ASSIGN-{selectedAppForDocs.id.toUpperCase()}-2026
                              </p>
                            </div>

                            <div className="space-y-4 text-stone-800 text-[11px] leading-relaxed select-text font-serif max-h-[380px] overflow-y-auto pr-3 border-b border-stone-150 pb-5 mb-5 scrollbar-thin">
                              <p className="font-bold text-[12px] text-stone-950 mb-3 uppercase">1. PARTIES & DECLARATION</p>
                              <p>
                                THIS COMPLIANCE ASSIGNMENT is executed between <span className="font-bold uppercase font-sans text-[10px] bg-stone-100 px-1">{selectedAppForDocs.name}</span>, operating professionally as <span className="font-bold uppercase font-sans text-[10px] bg-stone-100 px-1">{selectedAppForDocs.stageOrRegName}</span> (hereinafter referred to as the <span className="font-bold">&quot;Assignor&quot;</span> or <span className="font-bold">&quot;Author&quot;</span>) and the <span className="font-bold">Zambian Music Copyright Protection Society</span>, Cap 138 (hereinafter called the <span className="font-bold">&quot;Society&quot;</span> or <span className="font-bold">&quot;Caretaker&quot;</span>).
                              </p>

                              <p className="font-bold text-[12px] text-stone-950 mt-4 mb-2 uppercase">2. MUTUAL COVENANTS & LEGISLATION</p>
                              <p className="indent-6 text-justify">
                                Subject to the terms outlined, the Assignor hereby transfers and assigns unto the Society, for the full duration of copyright protections under the laws of Zambia, all broadcasting rights, public performance rights, and mechanical reproduction levies in his/her musical compositions and arrangements (representing <span className="font-semibold">{selectedAppForDocs.type === "artist" ? "100%" : "Publisher catalog weight"}</span> split allocation) created past, present, or pending future registry filings.
                              </p>

                              <p className="font-bold text-[12px] text-stone-950 mt-4 mb-2 uppercase">3. OPERATIONAL DEDUCTION AND DISTRIBUTION</p>
                              <p className="indent-6 text-justify">
                                The Society shall collect net royalties from licensing networks, including broadcasting houses, digital libraries, and live venues within Zambia. The Society retains a standard statutory operating charge of <span className="font-bold">15% (fifteen percent)</span> from gross receipts strictly to clear executive overheads, and covenants to distribute the residual <span className="font-bold">85% (eighty-five percent)</span> quarterly directly into the designated bank accounts of the Assignor.
                              </p>

                              <p className="font-bold text-[12px] text-stone-950 mt-4 mb-2 uppercase">4. IRREVOCABILITY AND ASSIGNED LAWS</p>
                              <p className="indent-6 text-justify">
                                This statutory assignment holds irreversible authority upon active back-office registry clearance, and is bound strictly under the legislative jurisdiction of <span className="font-bold">Cap 138 of the statutory laws of the Republic of Zambia</span>.
                              </p>
                            </div>

                            {/* Signatures block */}
                            <div className="grid grid-cols-2 gap-10 mt-8 pt-4 text-[10px] font-sans">
                              {/* Member ink */}
                              <div className="flex flex-col gap-1 pr-2">
                                <span className="text-[8px] text-stone-400 uppercase font-black font-semibold">ASSIGNOR AUTHORIZED OUTLINE:</span>
                                
                                <div className="h-16 border-b border-stone-300 flex flex-col justify-end pb-1.5 select-none relative">
                                  <span className="text-[14px] font-sans italic text-blue-800 font-bold tracking-widest filter drop-shadow-sm select-none">
                                    {selectedAppForDocs.stageOrRegName}
                                  </span>
                                  {/* Signature Date stamp */}
                                  <span className="absolute right-1 bottom-1 text-[8px] font-mono text-stone-400 select-none">
                                    Signed: {new Date(selectedAppForDocs.submittedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[9px] font-bold text-[#111111] mt-1.5">Applicant Digital Handshake</p>
                                <span className="text-[8px] text-stone-450 leading-none">Verified National ID: {selectedAppForDocs.identifier}</span>
                              </div>

                              {/* Secretary ink */}
                              <div className="flex flex-col gap-1 pl-2">
                                <span className="text-[8px] text-stone-400 uppercase font-black font-semibold">ZAMCOPS EXECUTIVE SEAL:</span>
                                
                                <div className="h-16 border-b border-stone-300 flex flex-col justify-end pb-1.5 select-none relative">
                                  {selectedAppForDocs.status === "Approved" ? (
                                    <>
                                      <span className="text-[13px] font-serif uppercase tracking-widest text-[#111111]/80 font-black italic select-none leading-none pl-1 filter drop-shadow">
                                        ZAMCOPS REGISTRY
                                      </span>
                                      <span className="absolute right-1 bottom-1 text-[8px] font-mono text-emerald-600 font-extrabold select-none">
                                        SEALED & CLEAR
                                      </span>
                                      <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-red-500/10 bg-red-500/5 rotate-12 flex items-center justify-center p-1 font-mono text-[7px] text-red-500/25 font-black uppercase text-center tracking-tight leading-none">
                                        ZAMCOPS PASSED
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[9px] italic text-amber-600 font-bold select-none pb-1">
                                      AWAITING COMPLIANCE STAMP
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-bold text-[#111111] mt-1.5">ZAMCOPS Back-Office Seal</p>
                                <span className="text-[8px] text-stone-450 leading-none">Official Stamp Under Cap 138</span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* STATUS BAR INFRASTRUCTURE INFO */}
                    <div className="bg-[#121214] py-3.5 px-6 border-t border-zinc-900 text-[10px] font-mono text-zinc-500 flex justify-between select-none">
                      <span>SECURE READER SHA256 LOGGED IN WORKSPACE</span>
                      <span className="text-zinc-600 font-bold uppercase">PAGE 1 OF 1 • CAP 138 TRUST</span>
                    </div>

                  </div>

                  {/* AUDITOR DECISION DESK & COMPLIANCE PANEL (RIGHT SIDEBAR) */}
                  <div className="w-full md:w-85 bg-[#17171a] flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 shrink-0 select-none text-zinc-300 font-sans p-6 overflow-y-auto">
                    
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-zamcops-orange shrink-0" size={18} />
                        <div>
                          <h3 className="text-sm font-extrabold text-white leading-none">Compliance Desk</h3>
                          <p className="text-[10px] text-zinc-500 font-semibold mt-1">Lodge Statutory Checkpoints</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedAppForDocs(null)}
                        className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Close Viewer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* ERROR OR SUCCESS NOTIFICATIONS */}
                    {auditNotifyMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 bg-[#e2f0d9]/10 border border-emerald-500/20 text-[#a2e0a2] p-4 rounded-xl text-xs font-semibold leading-relaxed"
                      >
                        {auditNotifyMsg}
                      </motion.div>
                    )}

                    {/* KEYBOARD SHORTCUTS QUICK GUIDE */}
                    <div className="mt-4 p-3 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex flex-col gap-1.5 text-[9.5px]">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-extrabold pb-1 border-b border-zinc-900/60 uppercase text-[8px] tracking-wider">
                        <Keyboard size={12} className="text-zamcops-orange shrink-0 animate-pulse" />
                        <span>Compliance Keyboard Shortcuts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1 select-none font-mono text-zinc-400 leading-none">
                        <div className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9.5px] font-bold text-white shadow-sm">V</kbd>
                          <span>Approve Entry</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9.5px] font-bold text-white shadow-sm">R</kbd>
                          <span>Decline Entry</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2 border-t border-zinc-900/40 pt-1.5">
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9.5px] font-bold text-white shadow-sm">1 - 4</kbd>
                          <span>Tabs (Front/Back/Pass/Cont)</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9.5px] font-bold text-white shadow-sm">← / →</kbd>
                          <span>Next/Previous Doc</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9.5px] font-bold text-white shadow-sm">Esc</kbd>
                          <span>Close Viewer</span>
                        </div>
                      </div>
                    </div>

                    {/* APPLICANT METADATA BLOCK */}
                    <div className="mt-5 p-4 bg-[#1e1e22]/50 border border-zinc-800/60 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">APPLICANT SUMMARY</p>
                      <h5 className="font-extrabold text-sm text-white mt-1.5 leading-none">{selectedAppForDocs.stageOrRegName}</h5>
                      <p className="text-xs font-bold text-gray-400 mt-1">Legal: {selectedAppForDocs.name}</p>
                      <div className="mt-3 space-y-1.5 font-mono text-[10px] text-zinc-400 border-t border-zinc-800 pt-2.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-bold uppercase">Tax Ref:</span>
                          <span className="font-bold text-zinc-300">{selectedAppForDocs.identifier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-bold uppercase">Registration:</span>
                          <span className="font-bold text-zinc-300 uppercase">{selectedAppForDocs.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-bold uppercase">Status:</span>
                          <span className={`font-black uppercase ${selectedAppForDocs.status === "Pending" ? "text-amber-500" : selectedAppForDocs.status === "Approved" ? "text-emerald-500" : "text-rose-500"}`}>{selectedAppForDocs.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* VISUAL APPLICATION STATUS TIMELINE */}
                    <div className="mt-5 p-4 bg-[#1e1e22]/50 border border-zinc-800/60 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <History size={12} className="text-amber-500" />
                        APPLICATION STATUS TIMELINE
                      </p>
                      <ApplicationStatusTimeline app={selectedAppForDocs} variant="dark" showDetails={true} />
                    </div>

                    {/* PAST AUDIT HISTORY & REJECTIONS (SPECIFIC TO ACTIVE DOC TYPE) */}
                    <div className="mt-5 p-4 bg-[#1e1e22]/50 border border-zinc-800/60 rounded-2xl flex flex-col gap-3 font-sans">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History size={12} className="text-amber-500" /> Past Session Remarks
                        </span>
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                          {activeDocType === "nrc_front" ? "NRC Front" :
                           activeDocType === "nrc_back" ? "NRC Back" :
                           activeDocType === "passport" ? "Passport" : "Contract"}
                        </span>
                      </div>

                      {(() => {
                        const historyForDoc = (selectedAppForDocs.historicalAudits || []).filter(
                          (h) => h.docType === activeDocType
                        );

                        if (historyForDoc.length === 0) {
                          return (
                            <p className="text-[10px] text-zinc-550 italic font-medium leading-relaxed bg-[#121214]/50 p-2.5 rounded-xl border border-dashed border-zinc-800/40 text-left">
                              No previous comments or rejections recorded for this document.
                            </p>
                          );
                        }

                        return (
                          <div id="past-audits-list" className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 text-left">
                            {historyForDoc.map((audit) => (
                              <div
                                id={`past-audit-item-${audit.id}`}
                                key={audit.id}
                                className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                                  audit.status === "rejection"
                                    ? "bg-red-500/10 border-red-500/20 text-red-200"
                                    : "bg-blue-500/10 border-blue-500/20 text-sky-200"
                                }`}
                              >
                                <div className="flex justify-between items-center text-[8px] font-mono leading-none select-none">
                                  <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[7px] ${
                                    audit.status === "rejection" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-sky-400 border border-blue-500/30"
                                  }`}>
                                    {audit.status}
                                  </span>
                                  <span className="text-zinc-500 font-semibold">
                                    {new Date(audit.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[10px] mt-1 font-sans leading-relaxed text-zinc-200 break-words font-medium">
                                  {audit.message}
                                </p>
                                <div className="text-[7.5px] text-zinc-500 font-semibold font-mono text-right mt-1.5 border-t border-zinc-850 pt-1">
                                  by {audit.auditor.split("@")[0]} • Session #{audit.sessionNo}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* RECORD DOCUMENT CONTENT ANNOTATION NOTES */}
                    <div className="mt-4 p-4 bg-[#1e1e22]/50 border border-zinc-805 rounded-2xl flex flex-col gap-3 font-sans">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquarePlus size={12} className="text-amber-500 animate-pulse" /> Record Document Annotation
                        </span>
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase">
                          {activeDocType === "nrc_front" ? "NRC Front" :
                           activeDocType === "nrc_back" ? "NRC Back" :
                           activeDocType === "passport" ? "Passport" : "Contract"} Note
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <textarea
                          id="doc-content-annotation-textarea"
                          value={docGeneralAnnotationNote}
                          onChange={(e) => setDocGeneralAnnotationNote(e.target.value)}
                          placeholder={`Inscribe specific annotation note regarding the content/quality of this ${
                            activeDocType === "nrc_front" ? "NRC Front page" :
                            activeDocType === "nrc_back" ? "NRC Back page" :
                            activeDocType === "passport" ? "Passport photo page" : "Membership assignment deed"
                          } (e.g. Barcode verified, sign matches)...`}
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-505 focus:border-amber-500 placeholder-zinc-600 min-h-[70px] resize-none leading-relaxed text-left"
                        />

                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-zinc-500 font-medium">
                            Attaches to the live audit thread
                          </span>
                          <button
                            type="button"
                            id="btn-attach-annotation-note"
                            onClick={() => {
                              if (!docGeneralAnnotationNote.trim()) return;
                              const text = docGeneralAnnotationNote.trim();

                              const newAuditEntry = {
                                id: `ha-${Date.now()}`,
                                docType: activeDocType,
                                timestamp: new Date().toISOString(),
                                auditor: user.email,
                                status: "comment" as const,
                                message: text,
                                sessionNo: (selectedAppForDocs.historicalAudits || []).reduce((max: number, h: any) => Math.max(max, h.sessionNo), 0) + 1
                              };

                              const updatedHistoricalAudits = [
                                ...(selectedAppForDocs.historicalAudits || []),
                                newAuditEntry
                              ];

                              // 1. Update active document view state
                              setSelectedAppForDocs({
                                ...selectedAppForDocs,
                                historicalAudits: updatedHistoricalAudits
                              });

                              // 2. Update state list of applications
                              const updatedApps = state.applications.map((app) =>
                                app.id === selectedAppForDocs.id
                                  ? {
                                      ...app,
                                      historicalAudits: updatedHistoricalAudits
                                    }
                                  : app
                              );

                              // 3. Save to storage
                              saveState({
                                ...state,
                                applications: updatedApps
                              });

                              // 4. Reset comment input
                              setDocGeneralAnnotationNote("");

                              // 5. Briefly show compliance feedback
                              setAuditNotifyMsg("Annotation successfully attached to the document audit thread!");
                              setTimeout(() => setAuditNotifyMsg(""), 4000);
                            }}
                            disabled={!docGeneralAnnotationNote.trim()}
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 transition-all flex items-center gap-1.5 cursor-pointer select-none border border-transparent shadow-md"
                          >
                            <MessageSquarePlus size={12} />
                            <span>Attach Annotation</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VERIFICATION CHECKLIST SECTION */}
                    <div className="mt-6 flex flex-col gap-4 font-sans text-stone-250">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">COMPLIANCE CRITERIA</p>
                      
                      <div className="flex flex-col gap-2.5">
                        {/* Box 1 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={idVerified}
                            onChange={(e) => setIdVerified(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">National Register Matches</p>
                            <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 inline-block">ID check against Ministry records is clean.</span>
                          </div>
                        </label>

                        {/* Box 2 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={contractSigned}
                            onChange={(e) => setContractSigned(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">Binding Ink Signatures</p>
                            <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 inline-block">Deed of copyright assignment is signed.</span>
                          </div>
                        </label>

                        {/* Box 3 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={bylawsCompliant}
                            onChange={(e) => setBylawsCompliant(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">Bylaws Compliance Check</p>
                            <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 inline-block">Complies with licensing provisions of Cap 138.</span>
                          </div>
                        </label>

                        {/* Box 4 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={credentialsValid}
                            onChange={(e) => setCredentialsValid(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">Legal Accounts Active</p>
                            <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 inline-block">Bank details match registered applicant legal name.</span>
                          </div>
                        </label>

                        {/* Divider */}
                        <div className="h-[1px] bg-zinc-800 my-1" />

                        {/* Granular Box 1 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={nrcFrontVerified}
                            onChange={(e) => setNrcFrontVerified(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">NRC Front side Verified</p>
                            <span className="text-[9px] text-zinc-450 font-semibold mt-0.5 inline-block">Valid Photo Identity & Name matched.</span>
                          </div>
                        </label>

                        {/* Granular Box 2 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={nrcBackVerified}
                            onChange={(e) => setNrcBackVerified(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">NRC Back side Verified</p>
                            <span className="text-[9px] text-zinc-450 font-semibold mt-0.5 inline-block font-sans">Zambian back registry signature valid.</span>
                          </div>
                        </label>

                        {/* Granular Box 3 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={passportPhotoVerified}
                            onChange={(e) => setPassportPhotoVerified(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">Passport Photo Verified</p>
                            <span className="text-[9px] text-zinc-450 font-semibold mt-0.5 inline-block font-sans">High-fidelity portrait picture validated.</span>
                          </div>
                        </label>

                        {/* Granular Box 4 */}
                        <label className="flex items-start gap-3 bg-[#1e1e22]/30 p-2.5 rounded-xl hover:bg-[#1e1e22]/60 cursor-pointer transition-colors border border-zinc-850">
                          <input
                            type="checkbox"
                            checked={contractVerified}
                            onChange={(e) => setContractVerified(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-zamcops-orange focus:ring-zamcops-orange cursor-pointer w-4 h-4"
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-extrabold text-zinc-200">Assignment Agreement Verified</p>
                            <span className="text-[9px] text-zinc-450 font-semibold mt-0.5 inline-block font-sans">Binding Statutory deed complete.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* LIVE DOCUMENT ANNOTATIONS LIST */}
                    <div className="mt-5 flex flex-col gap-2 font-sans text-stone-250 border-t border-zinc-805 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">LIVE DOCUMENT ANNOTATIONS</label>
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wide font-sans">
                          {annotations.length} Active
                        </span>
                      </div>
                      
                      {annotations.length === 0 ? (
                        <p className="text-[10px] text-zinc-500 italic font-medium leading-normal bg-zinc-900/40 p-3 rounded-xl border border-dashed border-zinc-800/60 text-left">
                          No comment annotations placed yet. Click the &quot;Annotate&quot; button above and click on any document to pin comments.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 text-left">
                          {annotations.map((ann) => {
                            const docLabel = 
                              ann.docType === "nrc_front" ? "NRC Front" :
                              ann.docType === "nrc_back" ? "NRC Back" :
                              ann.docType === "passport" ? "Passport" : "Contract";
                            return (
                              <div 
                                key={ann.id}
                                className="bg-[#1e1e22]/50 hover:bg-[#1e1e22] p-2.5 rounded-xl border border-zinc-800/80 flex justify-between items-start gap-2.5 group transition-colors text-left"
                              >
                                <div className="leading-tight min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 select-none">
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-sans tracking-wide flex items-center gap-1 leading-none ${
                                      ann.type === "draw"
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-amber-500/10 text-amber-500"
                                    }`}>
                                      {ann.type === "draw" ? (
                                        <PenLine size={8} className="stroke-[3]" />
                                      ) : (
                                        <Pin size={8} />
                                      )}
                                      {docLabel}
                                    </span>
                                    <span className="text-[8px] text-zinc-500 font-mono font-semibold">
                                      ({ann.x}%, {ann.y}%)
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-200 line-clamp-2 break-words leading-relaxed font-sans">{ann.text}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = annotations.filter((a) => a.id !== ann.id);
                                    setAnnotations(updated);
                                    // Append removed indicator to logs.
                                    setAuditNotes(prev => {
                                      const trimmed = prev.trim();
                                      return trimmed ? `${trimmed}\n[Annotation Removed on ${docLabel}]: "${ann.text}"` : `[Annotation Removed on ${docLabel}]: "${ann.text}"`;
                                    });
                                  }}
                                  className="text-zinc-550 hover:text-red-400 p-1 rounded-md hover:bg-zinc-800/60 shrink-0 cursor-pointer self-center transition-colors"
                                  title="Remove comment annotation"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* DECISION NOTES AND TEXT AREA */}
                    <div className="mt-5 flex flex-col gap-2 font-sans text-stone-250 border-t border-zinc-805 pt-4">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider text-left">AUDITOR COMPLIANCE NOTES</label>
                      <textarea
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        placeholder="Inscribe details of the document review check here (e.g. Verified NRC signature matches deed)..."
                        className="bg-[#1e1e22] text-xs py-3 px-4 rounded-xl border border-zinc-800 text-zinc-200 focus:ring-2 focus:ring-zamcops-orange focus:outline-none h-24 placeholder-zinc-650 font-sans leading-relaxed text-left"
                      />
                    </div>

                    {/* REQUEST SUPPLEMENTAL INFORMATION SECTION */}
                    <div className="mt-4 pt-4 border-t border-zinc-800/60 font-sans">
                      {!showInfoRequestInput ? (
                        <button
                          onClick={() => {
                            setShowInfoRequestInput(true);
                            setInfoRequestNoteText("");
                          }}
                          className="bg-[#242428] hover:bg-zinc-800 text-amber-500 hover:text-amber-400 border border-amber-500/10 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-full flex items-center justify-center gap-1.5"
                        >
                          <Info size={14} className="shrink-0" />
                          Request Supplemental Info
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/15">
                          <span className="text-[10px] font-black text-amber-500 uppercase">Specify Supplemental Info Required:</span>
                          <textarea
                            value={infoRequestNoteText}
                            onChange={(e) => setInfoRequestNoteText(e.target.value)}
                            placeholder="e.g., Back NRC copy is blurry, please re-upload Front/Back NRC assets."
                            className="bg-[#1e1e22] text-xs py-2 px-3 rounded-lg border border-zinc-800 text-zinc-205 focus:outline-none placeholder-zinc-500 h-20 leading-relaxed text-left"
                          />
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              onClick={handleRequestMoreInformation}
                              disabled={!infoRequestNoteText.trim()}
                              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-2 rounded-lg text-[10px] uppercase cursor-pointer"
                            >
                              Send Request
                            </button>
                            <button
                              onClick={() => {
                                setShowInfoRequestInput(false);
                                setInfoRequestNoteText("");
                              }}
                              className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold py-2 rounded-lg text-[10px] uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COMPLIANCE STATUS STAMP */}
                    <div className="mt-6 pt-5 border-t border-zinc-800 text-center flex flex-col gap-3">
                      {idVerified && contractSigned && bylawsCompliant && credentialsValid && nrcFrontVerified && nrcBackVerified && passportPhotoVerified && contractVerified ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-emerald-400">
                          <ThumbsUp size={14} className="animate-bounce" />
                          <span className="text-xs font-black uppercase tracking-wider">ALL ASSIGNMENTS VALID</span>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-amber-400">
                          <AlertCircle size={14} />
                          <span className="text-xs font-black uppercase tracking-wider">COMPLIANCE PENDING</span>
                        </div>
                      )}

                      <button
                        onClick={handleSaveDocAudit}
                        className="bg-zamcops-orange text-white px-5 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider hover:scale-103 transition-transform cursor-pointer w-full shadow-lg"
                      >
                        SAVE COMPLIANCE DECISION
                      </button>

                      {selectedAppForDocs.status === "Pending" && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            onClick={() => {
                              handleSaveDocAudit();
                              handleApproveApp(selectedAppForDocs.id);
                              setSelectedAppForDocs(null);
                            }}
                            disabled={!(idVerified && contractSigned && bylawsCompliant && credentialsValid && nrcFrontVerified && nrcBackVerified && passportPhotoVerified && contractVerified)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-3 rounded-2xl text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed select-none"
                            title="Ticked verification checkpoints required for automatic approval."
                          >
                            Approve Entry
                          </button>
                          <button
                            onClick={() => {
                              handleRejectApp(selectedAppForDocs.id);
                              setSelectedAppForDocs(null);
                            }}
                            className="bg-pastel-pink hover:bg-rose-200 text-red-950 font-black px-3 py-3 rounded-2xl text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            Decline Profile
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Dynamic Mobile Navigator bottom bar */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100 flex justify-around items-center p-2 z-50">
          {NAV_ITEMS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                activeTab === id ? 'text-[#111111]' : 'text-gray-400 hover:text-gray-850'
              }`}
            >
              {activeTab === id && (
                <div className="absolute inset-1 bg-pastel-mint rounded-full -z-10" />
              )}
              <Icon size={18} />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

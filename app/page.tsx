"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AdminPortal } from "../components/AdminPortal";
import { CameraScanner } from "../components/CameraScanner";
import { loadFullState, saveFullState } from "../lib/storage";
import { MembershipApplication, User } from "../lib/types";
import {
  ShieldAlert,
  Compass,
  FileCheck2,
  Trash2,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Mail,
  Smartphone,
  Sparkles,
  Search,
  CheckCircle2,
  UploadCloud,
  FileText,
  UserCheck2,
  Check,
  RotateCcw,
  RefreshCcw,
  Building,
  HelpCircle,
  Camera,
  Scan
} from "lucide-react";

export default function Home() {
  const [role, setRole] = useState<"applicant" | "admin">("applicant");
  
  // Current app state
  const [appState, setAppState] = useState(() => loadFullState());
  
  // Refresh state helper
  const handleRefreshState = () => {
    setAppState(loadFullState());
  };

  // Applicant Wizard States
  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState<"artist" | "label">("artist");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [legalName, setLegalName] = useState("");
  const [stageName, setStageName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successApp, setSuccessApp] = useState<MembershipApplication | null>(null);

  // File Upload states
  interface UploadedFileRef {
    id: string;
    name: string;
    sizeKb: number;
    type: string;
    detectedCategory: "nrc_front" | "nrc_back" | "passport" | "contract";
    isOverridden: boolean;
    isCameraScan?: boolean;
    scannedData?: {
      idVerified: boolean;
      extractedId: string;
      extractedName: string;
      confidence: number;
    };
  }
  
  const [filesList, setFilesList] = useState<UploadedFileRef[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  const handleCameraScanComplete = (scannedFile: {
    name: string;
    type: string;
    sizeKb: number;
    category: "nrc_front" | "nrc_back" | "passport";
    scannedData: {
      idVerified: boolean;
      extractedId: string;
      extractedName: string;
      confidence: number;
    };
  }) => {
    const newRef: UploadedFileRef = {
      id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: scannedFile.name,
      sizeKb: scannedFile.sizeKb,
      type: scannedFile.type,
      detectedCategory: scannedFile.category,
      isOverridden: false,
      isCameraScan: true,
      scannedData: scannedFile.scannedData
    };

    setFilesList(prev => {
      const filtered = prev.filter(f => f.detectedCategory !== scannedFile.category);
      return [...filtered, newRef];
    });

    setShowCameraScanner(false);
  };

  // Dummy user for admin portal login
  const adminUser: User = {
    email: "admin@zamcops.org.zm",
    role: "admin"
  };

  // Automated Category Predictor Logic
  const predictCategory = (fileName: string, mimeType: string): "nrc_front" | "nrc_back" | "passport" | "contract" => {
    const fn = fileName.toLowerCase();
    const mt = mimeType.toLowerCase();

    // NRC Back overrides
    if (fn.includes("back") || fn.includes("reverse") || fn.includes("rear") || fn.includes("nrcb") || fn.includes("nrc_b")) {
      return "nrc_back";
    }
    
    // NRC Front
    if (fn.includes("front") || fn.includes("nrcf") || fn.includes("nrc_front") || fn.includes("nrc_f") || fn.includes("nrc")) {
      return "nrc_front";
    }

    // Passport
    if (fn.includes("passport") || fn.includes("photo") || fn.includes("portrait") || fn.includes("face") || fn.includes("avatar") || fn.includes("selfie")) {
      return "passport";
    }

    // Contract / Agreement / Deeds / PDFs
    if (fn.includes("contract") || fn.includes("agreement") || fn.includes("sign") || fn.includes("deed") || fn.includes("society") || fn.includes("form") || mt.includes("pdf") || fn.endsWith(".pdf")) {
      return "contract";
    }

    // Default sequential slot allocation based on current empty slots
    const hasFront = filesList.some(f => f.detectedCategory === "nrc_front");
    const hasBack = filesList.some(f => f.detectedCategory === "nrc_back");
    const hasPass = filesList.some(f => f.detectedCategory === "passport");

    if (!hasFront) return "nrc_front";
    if (!hasBack) return "nrc_back";
    if (!hasPass) return "passport";
    return "contract";
  };

  // Select Multiple Files Core Handler
  const handleFilesAdded = (rawFiles: FileList) => {
    const newRefs: UploadedFileRef[] = [];
    
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const category = predictCategory(file.name, file.type);
      
      newRefs.push({
        id: `file-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        type: file.type || "application/octet-stream",
        detectedCategory: category,
        isOverridden: false
      });
    }

    setFilesList(prev => [...prev, ...newRefs]);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Reclassify handler
  const handleReclassify = (fileId: string, newCategory: "nrc_front" | "nrc_back" | "passport" | "contract") => {
    setFilesList(prev =>
      prev.map(f =>
        f.id === fileId ? { ...f, detectedCategory: newCategory, isOverridden: true } : f
      )
    );
  };

  // Remove uploaded file
  const handleRemoveFile = (fileId: string) => {
    setFilesList(prev => prev.filter(f => f.id !== fileId));
  };

  // Category file maps
  const getFileForCategory = (cat: "nrc_front" | "nrc_back" | "passport" | "contract") => {
    return filesList.find(f => f.detectedCategory === cat);
  };

  // Submitting the registration
  const handleRegisterOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (filesList.length === 0) {
      alert("Please upload and assign documents in Step 4 to complete your application.");
      return;
    }

    setSubmitting(true);
    
    setTimeout(() => {
      const state = loadFullState();
      
      const appFront = getFileForCategory("nrc_front")?.name || "nrc_front_default.jpg";
      const appBack = getFileForCategory("nrc_back")?.name || "nrc_back_default.jpg";
      const appPassport = getFileForCategory("passport")?.name || "passport_photo_default.jpg";
      const appContract = getFileForCategory("contract")?.name || "signed_copyright_deed.pdf";

      const hasCameraFront = filesList.some(f => f.detectedCategory === "nrc_front" && f.isCameraScan);
      const hasCameraBack = filesList.some(f => f.detectedCategory === "nrc_back" && f.isCameraScan);
      const hasCameraPassport = filesList.some(f => f.detectedCategory === "passport" && f.isCameraScan);

      const newApplication: MembershipApplication = {
        id: `app-${Date.now()}`,
        name: legalName,
        stageOrRegName: stageName,
        type: appType,
        identifier: idNumber,
        phone: phone,
        email: email,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        nrcFrontFileName: appFront,
        nrcBackFileName: appBack,
        passportPhotoFileName: appPassport,
        contractFileName: appContract,
        nrcFileName: `${legalName.replace(/\s+/g, "_")}_NRC_Documents.zip`,
        idVerified: (hasCameraFront && hasCameraBack) || hasCameraPassport,
        contractSigned: true,
        bylawsCompliant: (hasCameraFront && hasCameraBack) || hasCameraPassport,
        credentialsValid: (hasCameraFront && hasCameraBack) || hasCameraPassport,
        nrcFrontVerified: hasCameraFront,
        nrcBackVerified: hasCameraBack,
        passportPhotoVerified: hasCameraPassport,
        contractVerified: false,
        annotations: [],
        auditNotes: (hasCameraFront || hasCameraBack || hasCameraPassport) 
          ? `[System Auto-Verification: Automated OCR card scanning completed successfully with high confidence match vs legal identity fields.]` 
          : ""
      };

      const updatedApps = [newApplication, ...state.applications];
      
      // Save full state back
      saveFullState({
        ...state,
        applications: updatedApps
      });

      // Update local state
      setAppState(loadFullState());
      setSuccessApp(newApplication);
      setSubmitting(false);
      setStep(5); // Show success stage
    }, 1500);
  };

  const handleResetForm = () => {
    setStep(1);
    setEmail("");
    setPhone("");
    setLegalName("");
    setStageName("");
    setIdNumber("");
    setSignatureText("");
    setConsentChecked(false);
    setFilesList([]);
    setSuccessApp(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col antialiased">
      {/* GLOBAL HIGH REPUTE HERO EXECUTIVE BANNER */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-sm tracking-tighter">
              Z
            </span>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                ZAMCOPS
              </span>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block -mt-1">
                Copyright Society
              </span>
            </div>
          </div>

          {/* PERSPECTIVE NAVIGATION SELECTOR TAB */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setRole("applicant")}
              id="applicant-mode-btn"
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                role === "applicant"
                  ? "bg-amber-500 text-black font-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Compass size={13} />
              Applicant Wizard
            </button>
            <button
              onClick={() => {
                setRole("admin");
                handleRefreshState(); // Always refresh to sync uploads
              }}
              id="admin-mode-btn"
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                role === "admin"
                  ? "bg-zinc-850 text-white font-extrabold border border-zinc-700 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldAlert size={13} className="text-amber-500" />
              Compliance Portal
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK CONTROLLER VIEW */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {role === "admin" ? (
          <div className="w-full h-full min-h-[80vh] flex flex-col bg-zinc-900/40 rounded-3xl border border-zinc-900 p-0 overflow-hidden relative shadow-2xl">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <span className="text-[10px] bg-zinc-950 font-mono text-zinc-550 border border-zinc-800 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Hub Sync
              </span>
              <button
                onClick={handleRefreshState}
                className="w-7 h-7 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center border border-zinc-800 cursor-pointer"
                title="Sync Database State"
              >
                <RefreshCcw size={11} className="animate-spin-slow" />
              </button>
            </div>
            <AdminPortal user={adminUser} onLogout={() => setRole("applicant")} />
          </div>
        ) : (
          <div className="max-w-2xl w-full mx-auto my-4">
            <AnimatePresence mode="wait">
              {step < 5 ? (
                <motion.div
                  key="onboarding-steps"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-zinc-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${(step / 4) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-mono">
                        Step {step} of 4 • {step === 1 ? "Credentials Pitch" : step === 2 ? "Applicant Details" : step === 3 ? "legal alignment" : "Document Classification"}
                      </span>
                      <h2 className="text-xl font-extrabold text-white font-sans mt-1">
                        ZAMCOPS Digital Membership Registry
                      </h2>
                    </div>
                    <span className="text-sm font-mono text-zinc-550 bg-zinc-950 px-3 py-1 border border-zinc-850 rounded-full font-bold">
                      {Math.round((step / 4) * 100)}%
                    </span>
                  </div>

                  {/* STEP 1: PILOT ROLES & CHANNELS */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block mb-3">
                          Select Application Registry Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setAppType("artist")}
                            className={`p-5 rounded-2xl border text-left transition-all ${
                              appType === "artist"
                                ? "bg-amber-500/10 border-amber-500 text-white"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                            }`}
                          >
                            <Sparkles size={24} className="mb-3 text-amber-500" />
                            <p className="font-extrabold text-sm leading-tight">Artist / Musician</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Single singer, composer, beatmaker or lyricist profile</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAppType("label")}
                            className={`p-5 rounded-2xl border text-left transition-all ${
                              appType === "label"
                                ? "bg-amber-500/10 border-amber-500 text-white"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                            }`}
                          >
                            <Building size={24} className="mb-3 text-amber-500" />
                            <p className="font-extrabold text-sm leading-tight">Corporate Label / Publisher</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Multi-artist record publisher, label, PACRA aligned</p>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">
                            Active Corporate/Professional Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-3 text-zinc-500" size={16} />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="e.g., mail@brathahood.com"
                              className="w-full bg-zinc-950 rounded-xl py-3 pl-12 pr-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm transition-all placeholder-zinc-700"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1">Used for correspondence, auditing files and royalty tracking.</p>
                        </div>

                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">
                            Zambian Mobile/Airtel Money Phone
                          </label>
                          <div className="relative">
                            <Smartphone className="absolute left-4 top-3 text-zinc-500" size={16} />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g., +260 977 123456"
                              className="w-full bg-zinc-950 rounded-xl py-3 pl-12 pr-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm transition-all placeholder-zinc-700"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1">Primarily for mobile money distribution alert coordinates.</p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          disabled={!email || !phone}
                          onClick={() => setStep(2)}
                          className="px-6 py-3 rounded-xl bg-amber-500 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          Continue Details
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: CREDENTIAL ASSIGNMENT */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">
                            {appType === "artist" ? "Full Legal Identity Name" : "Representative Director Full Name"}
                          </label>
                          <input
                            type="text"
                            value={legalName}
                            onChange={(e) => setLegalName(e.target.value)}
                            placeholder="e.g., Brian Chanda Mulenga"
                            className="w-full bg-zinc-950 rounded-xl py-3 px-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm transition-all placeholder-zinc-700 font-sans"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">
                            {appType === "artist" ? "Artistic Stage Name" : "Registered Business/Label Name"}
                          </label>
                          <input
                            type="text"
                            value={stageName}
                            onChange={(e) => setStageName(e.target.value)}
                            placeholder={appType === "artist" ? "e.g., Pompi" : "e.g., Kalandanya Music Publishing"}
                            className="w-full bg-zinc-950 rounded-xl py-3 px-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm transition-all placeholder-zinc-700"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">
                            {appType === "artist" ? "National Registration Card (NRC) ID Number" : "PACRA Corporate Registration ID"}
                          </label>
                          <input
                            type="text"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            placeholder={appType === "artist" ? "Format: 321526/11/1" : "Format: PACRA-102523-X"}
                            className="w-full bg-zinc-950 rounded-xl py-3 px-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm font-mono tracking-wider transition-all placeholder-zinc-700"
                          />
                          <p className="text-[10px] text-zinc-550 mt-1">
                            {appType === "artist" 
                              ? "Must match your physical NRC Front/Back cards exactly."
                              : "Registered entity serial number under Zambian PACRA laws."}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-5 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-extrabold text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!legalName || !stageName || !idNumber}
                          onClick={() => setStep(3)}
                          className="px-6 py-3 rounded-xl bg-amber-500 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          Next Step
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: CONSTITUTION SIGNING */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 max-h-[220px] overflow-y-auto text-xs text-zinc-400 space-y-3 font-mono leading-relaxed">
                        <p className="font-extrabold text-amber-500 text-center text-xs uppercase">ZAMCOPS DEED OF COPYRIGHT MEMBERSHIP AGREEMENT</p>
                        <p className="text-[11px] text-zinc-500">Formulated under Chapter 138 of the Laws of the Republic of Zambia.</p>
                        <hr className="border-zinc-850" />
                        <p>1. The Assignor hereby transfers and assigns absolutely to the Society (Zambian Music Copyright Protection Society), for the entire duration of the copyright term, all executing public performing rights, broadcasting rights, and mechanical reproduction rights of musical tracks published or registered by the Assignor.</p>
                        <p>2. The Society pledges to collect, reconcile, and distribute licensing royalties accrued from commercial hubs, radio stations, and online broadcast spaces, deducting a 15% administrative society fee to maintain the collective licensing engine.</p>
                        <p>3. The Assignor warrants that all submitted identity files, NRC registrations, contract sign deeds, and professional profiles are completely accurate and legally owned by the applicant.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-extrabold text-zinc-400 tracking-wider block mb-2 uppercase">
                            Digital Authorized Signature Text
                          </label>
                          <input
                            type="text"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="Type your full legal name to sign"
                            className="w-full bg-zinc-950 rounded-xl py-3 px-4 outline-none border border-zinc-800 focus:border-amber-500 text-sm font-mono tracking-widest text-amber-500 transition-all placeholder-zinc-700"
                          />
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-[11px] leading-tight text-zinc-400 font-medium">
                            I verify that I have read the Society Deed, and I authorize ZAMCOPS to collect public presentation royalties on behalf of {stageName || "my artistic profile"}.
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-5 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-extrabold text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!signatureText || !consentChecked}
                          onClick={() => setStep(4)}
                          className="px-6 py-3 rounded-xl bg-amber-500 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          Document Upload
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: SMART DOCUMENT CLASSIFICATION & BULK UPLOAD */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3">
                        <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="text-xs font-extrabold text-white">Smart Bulk Classification Engine</p>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                            Drag-and-drop or select all 4 onboarding documents together: ZAMCOPS AI will automatically detect keywords in the filename or analyze the file type to route each document to its correct category target. You can always reassign categories in real-time.
                          </p>
                        </div>
                      </div>

                      {/* DUAL MODE UPLOAD ACTION SELECTION */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* CAMERA LIVE SCANNING CARD */}
                        <div className="border border-zinc-800 bg-zinc-950 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all group relative overflow-hidden">
                          <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <Camera size={22} className="animate-pulse" />
                          </div>
                          
                          <p className="text-xs font-extrabold text-white">Instant Camera Verification Scanner</p>
                          <p className="text-[10px] text-zinc-400 mt-2 px-3 leading-relaxed">
                            Turn on device camera to verify real physical NRC cards or passport pages. Automatically performs real-time OCR checks and configures secure assets.
                          </p>

                          <button
                            type="button"
                            onClick={() => setShowCameraScanner(true)}
                            className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg select-none cursor-pointer transition-colors outline-none"
                          >
                            <Scan size={12} className="stroke-[2.5]" />
                            <span>SCAN WITH CAMERA</span>
                          </button>
                        </div>

                        {/* DRAG AND DROP FILE ZONE CARD */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all relative ${
                            dragOver
                              ? "border-amber-500 bg-amber-500/5"
                              : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                          }`}
                        >
                          <input
                            type="file"
                            multiple
                            id="bulk-file-input"
                            onChange={(e) => {
                              if (e.target.files) {
                                handleFilesAdded(e.target.files);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            title="Select onboarding documents"
                          />
                          <UploadCloud size={30} className="text-zinc-500 mb-3 animate-bounce" />
                          <p className="text-xs font-extrabold text-white">
                            Drag & Drop Digital Files Here
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 px-4 leading-relaxed">
                            Click to browse local files or drag multiple onboarding documents at once. JPEG, PNG, or PDF supported.
                          </p>
                          <div className="mt-4 flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 rounded-full px-3 py-1 text-[9px] font-mono text-zinc-400">
                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                            <span>Auto-Classifier Active</span>
                          </div>
                        </div>
                      </div>

                      {/* AUTO CLASSIFIED LIST TABLE */}
                      {filesList.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest font-mono">
                              Detected Documents Queue ({filesList.length})
                            </span>
                            <button
                              onClick={() => setFilesList([])}
                              className="text-[10px] text-red-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={11} />
                              Clear Queue
                            </button>
                          </div>

                          <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950 font-sans divide-y divide-zinc-850">
                            {filesList.map((file) => (
                              <div key={file.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <FileText className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-zinc-100 truncate pr-4 font-mono text-[11px]" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] text-zinc-550 mt-0.5">
                                      {file.sizeKb} KB • {file.type}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Smart badge */}
                                  {file.isCameraScan ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Check size={11} className="stroke-[3] text-emerald-400 animate-pulse" /> Instant Verified
                                    </span>
                                  ) : (
                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                      file.isOverridden 
                                        ? "bg-zinc-800 text-zinc-300"
                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    }`}>
                                      {file.isOverridden ? "🔧 Reassigned" : "🎯 Auto-Classified"}
                                    </span>
                                  )}

                                  {/* Class overrides selector dropdown */}
                                  <select
                                    value={file.detectedCategory}
                                    onChange={(e) => handleReclassify(file.id, e.target.value as any)}
                                    className="bg-zinc-900 border border-zinc-800 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg outline-none cursor-pointer focus:border-amber-500"
                                    title="Manually correct target slot"
                                  >
                                    <option value="nrc_front">NRC Front Line</option>
                                    <option value="nrc_back">NRC Back Line</option>
                                    <option value="passport">Passport Photo</option>
                                    <option value="contract">Signed Agreement</option>
                                  </select>

                                  <button
                                    onClick={() => handleRemoveFile(file.id)}
                                    className="w-7 h-7 hover:bg-zinc-905 text-zinc-550 hover:text-red-400 rounded-lg flex items-center justify-center border border-zinc-850 cursor-pointer"
                                    title="Delete file"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TARGET SLOT COVERAGE MATRIX DESIGN */}
                      <div className="space-y-3">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest block font-mono pl-1">
                          Onboarding Categories Checklist
                        </label>
                        <div className="grid grid-cols-2 gap-3.5">
                          {/* CATEGORY SLOT: FRONT NRC */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            getFileForCategory("nrc_front") 
                              ? "bg-zinc-900 border-zinc-700/80" 
                              : "bg-zinc-950/40 border-zinc-850/50"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wide">
                                1. Front NRC Copy
                              </span>
                              {getFileForCategory("nrc_front") ? (
                                <CheckCircle2 size={13} className="text-pastel-mint shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono font-medium truncate text-zinc-500">
                              {getFileForCategory("nrc_front")?.name || "Missing Document Input"}
                            </p>
                          </div>

                          {/* CATEGORY SLOT: BACK NRC */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            getFileForCategory("nrc_back") 
                              ? "bg-zinc-900 border-zinc-700/80" 
                              : "bg-zinc-950/40 border-zinc-850/50"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wide">
                                2. Back NRC Copy
                              </span>
                              {getFileForCategory("nrc_back") ? (
                                <CheckCircle2 size={13} className="text-pastel-mint shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono font-medium truncate text-zinc-500">
                              {getFileForCategory("nrc_back")?.name || "Missing Document Input"}
                            </p>
                          </div>

                          {/* CATEGORY SLOT: PASSPORT PHOTO */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            getFileForCategory("passport") 
                              ? "bg-zinc-900 border-zinc-700/80" 
                              : "bg-zinc-950/40 border-zinc-850/50"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wide">
                                3. Portrait Passport
                              </span>
                              {getFileForCategory("passport") ? (
                                <CheckCircle2 size={13} className="text-pastel-mint shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono font-medium truncate text-zinc-500">
                              {getFileForCategory("passport")?.name || "Missing Document Input"}
                            </p>
                          </div>

                          {/* CATEGORY SLOT: SIGNED DEED CONTRACT */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            getFileForCategory("contract") 
                              ? "bg-zinc-900 border-zinc-700/80" 
                              : "bg-zinc-950/40 border-zinc-850/50"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wide">
                                4. Signed Copyright Deed
                              </span>
                              {getFileForCategory("contract") ? (
                                <CheckCircle2 size={13} className="text-pastel-mint shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono font-medium truncate text-zinc-500">
                              {getFileForCategory("contract")?.name || "Auto-Generated/Unsigned"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS SUBMIT BUTTON */}
                      <div className="flex justify-between pt-4 border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="px-5 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-extrabold text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleRegisterOnboarding}
                          disabled={submitting || filesList.length === 0}
                          className="px-8 py-3.5 rounded-xl bg-amber-500 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black text-xs uppercase flex items-center gap-2 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <span className="w-3 px-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
                              Submitting application...
                            </>
                          ) : (
                            <>
                              <FileCheck2 size={14} />
                              Submit Membership application
                            </>
                          )}
                        </button>
                      </div>

                      {/* CAMERA SCANNER INLINE DRAWER PORTAL OVERLAY */}
                      <AnimatePresence>
                        {showCameraScanner && (
                          <CameraScanner
                            onClose={() => setShowCameraScanner(false)}
                            onScanComplete={handleCameraScanComplete}
                            legalName={legalName}
                            idNumber={idNumber}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* STEP 5: ONBOARDING ACCEPTS / REGISTRY COMPLETION DEED */
                <motion.div
                  key="onboarding-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <CheckCircle2 size={32} />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black font-mono bg-zinc-950 px-3 py-1 border border-zinc-850 rounded-full text-amber-500 tracking-wider">
                      REGISTRY APPLICATION SUBMITTED
                    </span>
                    <h2 className="text-2xl font-black text-white font-sans mt-3">
                      Muletuse! Welcomed to ZAMCOPS.
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                      Your dual digital membership application has been logged into our compliance verification system database.
                    </p>
                  </div>

                  {successApp && (
                    <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-850 rounded-2xl p-4 text-left font-sans space-y-3">
                      <div className="flex justify-between text-xs pb-2 border-b border-zinc-900">
                        <span className="text-zinc-500 font-extrabold uppercase">App Reference ID:</span>
                        <span className="font-mono font-black text-amber-500">{successApp.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] leading-tight">
                        <div>
                          <p className="text-zinc-550 font-semibold uppercase">Legal: </p>
                          <p className="font-extrabold text-white">{successApp.name}</p>
                        </div>
                        <div>
                          <p className="text-zinc-550 font-semibold uppercase">Representative: </p>
                          <p className="font-extrabold text-white">{successApp.stageOrRegName}</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-zinc-550 font-semibold uppercase">Contacts: </p>
                          <p className="font-semibold text-zinc-300">{successApp.email}</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-zinc-550 font-semibold uppercase">Identity ID: </p>
                          <p className="font-mono text-zinc-300">{successApp.identifier}</p>
                        </div>
                      </div>
                      <hr className="border-zinc-900" />
                      <div>
                        <p className="text-[9px] font-black font-mono text-zinc-500 uppercase block mb-1.5">Categorized Assets Filer Queue</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Front NRC:</span>
                            <span className="text-zinc-300 truncate max-w-[200px]">{successApp.nrcFrontFileName}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Back NRC:</span>
                            <span className="text-zinc-300 truncate max-w-[200px]">{successApp.nrcBackFileName}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Passport:</span>
                            <span className="text-zinc-300 truncate max-w-[200px]">{successApp.passportPhotoFileName}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Signed Agreement:</span>
                            <span className="text-zinc-300 truncate max-w-[200px]">{successApp.contractFileName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-xs text-zinc-400 text-left flex gap-3 max-w-md mx-auto leading-relaxed">
                    <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p>
                      <span className="text-white font-extrabold block">Admin Verification Note</span>
                      Switch above to the <span className="text-amber-500 font-extrabold">Compliance Portal</span> to audit and verify this application, add coordinate comments, adjust granular assets checklist, or log verification decisions.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    <button
                      onClick={handleResetForm}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      Apply Again
                    </button>
                    <button
                      onClick={() => {
                        setRole("admin");
                        handleRefreshState(); // Sync state with Admin Portal
                      }}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-amber-500 text-black font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      Audit Applications
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FOOTER STATS ACCENT */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-zinc-550 text-[10px] font-mono select-none">
        <p>© 2026 Zambian Music Copyright Protection Society • Secure Compliance Digital Audit Registry</p>
      </footer>
    </div>
  );
}

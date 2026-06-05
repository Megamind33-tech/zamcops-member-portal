"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArtistProfile,
  TrackWork,
  RoyaltyEarning,
  User
} from "../lib/types";
import { loadFullState, saveFullState } from "../lib/storage";
import {
  LogOut,
  Music,
  CreditCard,
  PlusCircle,
  FileCheck2,
  TrendingUp,
  Award,
  BookOpen,
  UserCheck,
  Edit,
  Save,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  LayoutDashboard,
  Banknote,
  Calendar as CalendarIcon,
  BadgeCheck,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Building2,
  Receipt,
  Users,
  Mic2,
  FileText,
  Upload,
  FileAudio,
  FileImage,
  Trash2,
  Camera
} from "lucide-react";

interface ArtistPortalProps {
  user: User;
  onLogout: () => void;
}

export function ArtistPortal({ user, onLogout }: ArtistPortalProps) {
  const [state, setState] = useState(() => loadFullState());
  const [activeTab, setActiveTab] = useState<"dashboard" | "works" | "royalties" | "schedule" | "membership" | "payouts">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [worksFilter, setWorksFilter] = useState("All");

  // Load and sync state
  useEffect(() => {
    setState(loadFullState());
  }, []);

  const saveState = (updatedState: typeof state) => {
    setState(updatedState);
    saveFullState(updatedState);
  };

  const artistProfile = state.artistProfiles[user.email] || {
    fullName: "Samson Chansa",
    stageName: "Sam Joy",
    memberNumber: "ZAM-2026-894",
    membershipStatus: "Approved",
    nrcNumber: "948293/11/1",
    phone: "+260 971 234 567",
    bankName: "Zambia National Commercial Bank (ZANACO)",
    bankBranch: "Lusaka Civic Centre",
    bankAccount: "5674839201948",
    mobileMoneyNumber: "0971234567",
    createdAt: "2026-01-10T08:30:00Z"
  };

  const {
    fullName,
    stageName,
    phone,
    nrcNumber,
    bankName,
    bankAccount,
    mobileMoneyNumber
  } = artistProfile;

  // Payout / profile edit form states
  const [editFullName, setEditFullName] = useState(fullName);
  const [editStageName, setEditStageName] = useState(stageName);
  const [editPhone, setEditPhone] = useState(phone);
  const [editNrc, setEditNrc] = useState(nrcNumber);
  const [editBank, setEditBank] = useState(bankName || "ZANACO");
  const [editAccount, setEditAccount] = useState(bankAccount || "5674839201948");
  const [editMomo, setEditMomo] = useState(mobileMoneyNumber || "0971234567");
  const [payoutChannel, setPayoutChannel] = useState<"bank" | "momo" | "cheque">("bank");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Track submission state
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Afro-Pop");
  const [newYear, setNewYear] = useState<number>(2026);
  const [newShare, setNewShare] = useState<number>(100);
  const [newIsrc, setNewIsrc] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // File state variables for Android-native picker
  const [audioFile, setAudioFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const [artworkFile, setArtworkFile] = useState<{ name: string; size: string; type: string; preview: string } | null>(null);
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [artworkProgress, setArtworkProgress] = useState(0);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUploading(true);
      setAudioProgress(0);
      setAudioFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: file.type || "audio/mpeg"
      });

      let prog = 0;
      const interval = setInterval(() => {
        prog += 20;
        setAudioProgress(prog);
        if (prog >= 100) {
          clearInterval(interval);
          setAudioUploading(false);
        }
      }, 150);
    }
  };

  const handleArtworkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArtworkUploading(true);
      setArtworkProgress(0);
      
      const fileData = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type || "image/png",
        preview: ""
      };

      const reader = new FileReader();
      reader.onloadend = () => {
        fileData.preview = reader.result as string;
        setArtworkFile(fileData);
      };
      reader.readAsDataURL(file);

      let prog = 0;
      const interval = setInterval(() => {
        prog += 25;
        setArtworkProgress(prog);
        if (prog >= 100) {
          clearInterval(interval);
          setArtworkUploading(false);
        }
      }, 100);
    }
  };

  const clearAudioFile = () => {
    setAudioFile(null);
    setAudioProgress(0);
    setAudioUploading(false);
  };

  const clearArtworkFile = () => {
    setArtworkFile(null);
    setArtworkProgress(0);
    setArtworkUploading(false);
  };

  // Sync profile edits if profile changes in db
  useEffect(() => {
    setEditFullName(fullName || "Samson Chansa");
    setEditStageName(stageName || "Sam Joy");
    setEditPhone(phone || "+260 971 234 567");
    setEditNrc(nrcNumber || "948293/11/1");
    setEditBank(bankName || "ZANACO");
    setEditAccount(bankAccount || "5674839201948");
    setEditMomo(mobileMoneyNumber || "0971234567");
  }, [
    fullName,
    stageName,
    phone,
    nrcNumber,
    bankName,
    bankAccount,
    mobileMoneyNumber
  ]);

  const myWorks = state.works.filter(
    (w) => w.submittedBy === user.email || w.artistName.toLowerCase() === artistProfile.stageName.toLowerCase()
  );

  const myEarnings = state.royalties.filter((r) => r.recipientEmail === user.email);
  const totalAccruedValue = myEarnings.reduce((sum, curr) => sum + curr.netAmount, 0);
  const totalPaidValue = myEarnings.filter((r) => r.status === "Paid").reduce((sum, curr) => sum + curr.netAmount, 0);
  const totalPendingValue = myEarnings.filter((r) => r.status === "Accrued").reduce((sum, curr) => sum + curr.netAmount, 0);

  // Form Handlers
  const handleRegisterWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const generatedIsrc = newIsrc || `ZM-948-26-${Math.floor(10000 + Math.random() * 90000)}`;
    const newWork: TrackWork = {
      id: `work-${Date.now()}`,
      title: newTitle,
      artistName: artistProfile.stageName,
      isrc: generatedIsrc,
      genre: newGenre,
      releaseYear: Number(newYear),
      sharePercentage: Number(newShare),
      status: "Pending",
      submittedBy: user.email,
      submittedAt: new Date().toISOString().split("T")[0],
      audioName: audioFile?.name,
      audioSize: audioFile?.size,
      artworkName: artworkFile?.name,
      artworkSize: artworkFile?.size
    };

    const updatedWorks = [newWork, ...state.works];
    const newAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "WORK_REGISTERED",
      details: `Registered music track '${newTitle}' with ${newShare}% copyright share (ISRC: ${generatedIsrc}). Files attached: Audio (${audioFile?.name || "None"}), Cover Art (${artworkFile?.name || "None"})`
    };

    saveState({
      ...state,
      works: updatedWorks,
      auditLogs: [newAuditLog, ...state.auditLogs]
    });

    setNewTitle("");
    setNewIsrc("");
    clearAudioFile();
    clearArtworkFile();
    setFormSuccess("Track submitted successfully! Pending ZAMCOPS back-office verification.");
    setTimeout(() => setFormSuccess(""), 5000);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfiles = {
      ...state.artistProfiles,
      [user.email]: {
        ...artistProfile,
        fullName: editFullName,
        stageName: editStageName,
        phone: editPhone,
        nrcNumber: editNrc,
        bankName: editBank,
        bankAccount: editAccount,
        mobileMoneyNumber: editMomo
      }
    };

    const auditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "PROFILE_UPDATED",
      details: `Updated personal bio details and preferred banking settlement protocols.`
    };

    saveState({
      ...state,
      artistProfiles: updatedProfiles,
      auditLogs: [auditLog, ...state.auditLogs]
    });

    setProfileSuccess("Identity & account profile preferences saved securely!");
    setTimeout(() => setProfileSuccess(""), 5000);
  };

  // Nav config
  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "works", label: "Registered Works", icon: Music },
    { id: "royalties", label: "Royalties", icon: Banknote },
    { id: "schedule", label: "Schedule", icon: CalendarIcon },
    { id: "membership", label: "Membership", icon: BadgeCheck },
    { id: "payouts", label: "Payout Preferences", icon: Settings }
  ] as const;

  // Calendar dates july 2024
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dates = [
    { date: 30, type: 'prev' },
    { date: 1, type: 'current' },
    { date: 2, type: 'current' },
    { date: 3, type: 'today' },
    { date: 4, type: 'current' },
    { date: 5, type: 'current' },
    { date: 6, type: 'current' },
    { date: 7, type: 'current' },
    { date: 8, type: 'current' },
    { date: 9, type: 'mint' },
    { date: 10, type: 'current' },
    { date: 11, type: 'current' },
    { date: 12, type: 'mint' },
    { date: 13, type: 'current' },
    { date: 14, type: 'current' },
    { date: 15, type: 'current' },
    { date: 16, type: 'selected' },
    { date: 17, type: 'selected' },
    { date: 18, type: 'current' },
    { date: 19, type: 'current' },
    { date: 20, type: 'current' },
    { date: 21, type: 'current' },
    { date: 22, type: 'current' },
    { date: 23, type: 'current' },
    { date: 24, type: 'current' },
    { date: 25, type: 'current' },
    { date: 26, type: 'current' },
    { date: 27, type: 'current' },
    { date: 28, type: 'mint' },
    { date: 29, type: 'mint' },
    { date: 30, type: 'mint' },
    { date: 31, type: 'mint' },
    { date: 1, type: 'next' },
    { date: 2, type: 'next' },
    { date: 3, type: 'next-dashed' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F3] p-2 sm:p-4 md:p-8 flex justify-center">
      <div className="max-w-[1400px] w-full bg-white/40 backdrop-blur-xl rounded-[24px] sm:rounded-[40px] shadow-sm border border-white flex overflow-hidden relative min-h-[calc(100vh-16px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-64px)]">
        
        {/* Desk Sidebar */}
        <div className="hidden lg:flex w-24 flex-col items-center py-8 bg-[#FCFCFC] rounded-l-[32px] border-r border-gray-100/50 shrink-0 justify-between">
          <div className="flex flex-col items-center w-full">
            <div className="w-10 h-10 bg-zamcops-orange rounded-xl flex items-center justify-center mb-12 shadow-sm">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <div className="flex flex-col gap-6">
              {NAV_ITEMS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === id
                      ? 'bg-[#111111] text-white shadow-md scale-105'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                  title={id}
                >
                  <Icon size={20} />
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

        {/* Scrollable Content Body */}
        <div className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto pb-28 lg:pb-12">
          
          {/* TopBar with Greeting */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-10 gap-4 mt-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Rightsholder Dashboard</p>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#111111]">
                Hello, {artistProfile.stageName}{' '}
                <span className="inline-block animate-wave origin-bottom-right">👋</span>
              </h1>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search works, earnings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pastel-mint w-full md:w-64 shadow-sm"
                />
              </div>

              {/* Profile Bubble */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pastel-pink flex items-center justify-center font-bold text-[#111111] shadow-sm shrink-0 cursor-pointer" title="Artist Profile Info">
                {artistProfile.stageName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-11"
              >
                {/* Left Column */}
                <div className="lg:col-span-7 flex flex-col gap-8 lg:gap-11">
                  
                  {/* High Density Quick Action Grid */}
                  <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#111111]">Quick Operational Actions</h3>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5">ZAMCOPS rightsholder self-service operations</p>
                      </div>
                      <span className="bg-zamcops-orange/10 text-zamcops-orange text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full">
                        Secure Session
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* Action 1 */}
                      <button
                        onClick={() => setActiveTab("works")}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <Music size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Register Track
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          File copyright split sheets & ISRC details
                        </span>
                      </button>

                      {/* Action 2 */}
                      <button
                        onClick={() => setActiveTab("royalties")}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <CreditCard size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Request Payout
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          Settle accrued statutory values
                        </span>
                      </button>

                      {/* Action 3 */}
                      <button
                        onClick={() => setActiveTab("payouts")}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <Settings size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Routing Settings
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          Configure Bank and MOMO routes
                        </span>
                      </button>

                      {/* Action 4 */}
                      <button
                        onClick={() => {
                          alert("Performance logging system online. Direct performance auditing claim sheet downloaded to memory!");
                        }}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <Mic2 size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Live Claims
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          Track performance details of live shows
                        </span>
                      </button>

                      {/* Action 5 */}
                      <button
                        onClick={() => setActiveTab("schedule")}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <CalendarIcon size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Royalty Schedule
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          Check upcoming ZAMCOPS payouts
                        </span>
                      </button>

                      {/* Action 6 */}
                      <button
                        onClick={() => setActiveTab("membership")}
                        className="flex flex-col items-start p-4 bg-white hover:bg-zamcops-orange/5 border border-gray-100 hover:border-zamcops-orange rounded-2xl transition-all group text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-zamcops-orange/10 group-hover:bg-zamcops-orange text-zamcops-orange group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition-colors">
                          <BadgeCheck size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-tight group-hover:text-zamcops-orange">
                          Membership Certificate
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">
                          Verify credentials & statutory registry status
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Royalty Earnings Ledger Summary */}
                  <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 shadow-sm flex flex-col gap-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#111111]">Royalty Earnings Ledger</h3>
                      <p className="text-xs font-semibold text-gray-400 mt-0.5">Audited statutory rightsholder financial standing</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Main Card: Accrued Available */}
                      <div className="bg-gradient-to-br from-orange-50/70 to-amber-50/50 border border-zamcops-orange/20 rounded-2xl p-6 flex flex-col justify-between h-44 relative overflow-hidden">
                        <div className="absolute right-[-24px] top-[-24px] w-24 h-24 bg-zamcops-orange/5 rounded-full" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-zamcops-orange animate-ping" />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#111111]">
                              Accrued Balance (Ready)
                            </span>
                          </div>
                          <h2 className="text-3xl sm:text-4xl font-extrabold text-zamcops-orange mt-2 tracking-tight">
                            ZMW {totalPendingValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-[10px] text-gray-500 font-semibold">
                            Pending August Settlement Run
                          </span>
                          <button
                            onClick={() => setActiveTab("royalties")}
                            className="bg-zamcops-orange hover:bg-zamcops-orange/90 text-white text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-full transition-transform hover:scale-105 cursor-pointer shadow-sm"
                          >
                            Settle Funds
                          </button>
                        </div>
                      </div>

                      {/* Total Settled */}
                      <div className="bg-[#111111] text-white rounded-2xl p-6 flex flex-col justify-between h-44 relative overflow-hidden">
                        <div className="absolute right-[-24px] top-[-24px] w-24 h-24 bg-white/5 rounded-full" />
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                            Total Settled (YTD)
                          </span>
                          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#FCFCFC] mt-2 tracking-tight">
                            ZMW {totalPaidValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                        <div className="flex justify-between items-center mt-4 border-t border-white/10 pt-3">
                          <span className="text-[10px] text-gray-400 font-semibold">
                            Disbursed onto preferred channel
                          </span>
                          <div className="flex items-center gap-1.5 text-pastel-mint font-mono">
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-extrabold uppercase tracking-wide">Approved</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Distribution Analytics stats */}
                    <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Works Value</span>
                        <span className="text-base sm:text-lg font-extrabold text-gray-800">
                          ZMW {(totalPendingValue + totalPaidValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Licence Type</span>
                        <span className="text-base sm:text-lg font-extrabold text-gray-800">
                          ZAMCOPS Split
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Statutory Levy (15%)</span>
                        <span className="text-base sm:text-lg font-extrabold text-gray-800">
                          ZMW {((totalPendingValue + totalPaidValue) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pending Work Approvals */}
                  <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 shadow-sm flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#111111]">Pending Work Approvals</h3>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5">Song registrations undergoing back-office split sheet & metadata audit</p>
                      </div>
                      <span className="bg-amber-55/15 text-amber-900 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full border border-amber-200 font-mono">
                        {myWorks.filter((w) => w.status === "Pending").length} Under audit
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {myWorks
                        .filter((w) => w.status === "Pending")
                        .map((work) => (
                          <div
                            key={work.id}
                            className="bg-[#F5F5F3]/40 border border-[#F5F5F3] hover:border-zamcops-orange/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold bg-zamcops-orange/10 text-zamcops-orange text-sm font-mono">
                                {work.title.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-[#111111] leading-none">
                                    {work.title}
                                  </h4>
                                  <span className="bg-amber-100 text-amber-800 border border-amber-200/50 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none">
                                    {work.genre}
                                  </span>
                                </div>
                                <div className="flex gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-gray-500 font-semibold font-mono">
                                  <span>ISRC: {work.isrc}</span>
                                  <span>Split Share: {work.sharePercentage}%</span>
                                  <span>Submitted: {work.submittedAt}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 border-gray-200/40 pt-3 sm:pt-0 justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-amber-650 animate-pulse shrink-0" />
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 font-mono">
                                  In Auditing
                                </span>
                              </div>
                              <div className="text-right text-[10px] text-gray-400 font-bold leading-tight font-mono">
                                EST. 48H CLEARWAY
                              </div>
                            </div>
                          </div>
                        ))}

                      {myWorks.filter((w) => w.status === "Pending").length === 0 && (
                        <div className="border border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-[#FCFCFC] border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mb-3">
                            <FileCheck2 size={24} />
                          </div>
                          <h4 className="text-sm font-bold text-gray-700">All Registrations Cleared</h4>
                          <p className="text-xs text-gray-400 mt-1 max-w-sm">
                            Every submitted song has completed split sheet assessment. New works will show up here during ledger verification.
                          </p>
                          <button
                            onClick={() => setActiveTab("works")}
                            className="bg-zamcops-orange hover:bg-zamcops-orange/90 text-white text-[11px] font-extrabold uppercase tracking-widest px-5 py-2.5 rounded-full mt-4 transition-transform hover:scale-105 cursor-pointer shadow-xs"
                          >
                            Register New Track
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column */}
                <div className="lg:col-span-5 flex flex-col gap-8 lg:gap-10">
                  <section>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                      Distribution schedule
                    </h2>
                    
                    {/* Render Calendar */}
                    <div className="bg-white rounded-[32px] p-5 sm:p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold">July 2024</h3>
                        <div className="flex gap-2 text-gray-400">
                          <button className="hover:text-[#111111] transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50">
                            <ChevronLeft size={20} />
                          </button>
                          <button className="hover:text-[#111111] transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-y-4 sm:gap-y-6 gap-x-1 sm:gap-x-2 text-center mb-2 sm:mb-4">
                        {days.map((day) => (
                          <div key={day} className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-wider">
                            {day}
                          </div>
                        ))}

                        {dates.map((d, i) => {
                          let className = 'w-8 h-8 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors cursor-pointer ';
                          if (d.type === 'prev' || d.type === 'next') className += 'text-gray-300';
                          else if (d.type === 'current') className += 'text-[#111111] hover:bg-gray-100';
                          else if (d.type === 'today') className += 'text-[#111111] border-2 border-dashed border-gray-300';
                          else if (d.type === 'next-dashed') className += 'text-gray-300 border-2 border-dashed border-gray-200';
                          else if (d.type === 'mint') className += 'bg-pastel-mint text-[#111111]';
                          else if (d.type === 'selected') className += 'bg-[#111111] text-white';
                          
                          return (
                            <div key={i} className={className}>
                              {d.date}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Schedule Items */}
                  <section className="flex flex-col gap-3 sm:gap-4">
                    <h3 className="text-lg font-bold text-[#111111]">Today&apos;s Events</h3>
                    
                    <div className="bg-pastel-mint/40 hover:bg-pastel-mint/70 rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <BookOpen size={18} className="text-[#111111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Workshop</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">How to register works effectively?</div>
                      </div>
                    </div>

                    <div className="bg-pastel-pink/40 hover:bg-pastel-pink/70 rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Users size={18} className="text-[#111111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Seminar Session</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">Understanding split sheets and metadata</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("schedule")}
                      className="text-xs font-bold uppercase tracking-wider text-zamcops-orange hover:underline text-left pl-2 cursor-pointer"
                    >
                      View full institutional schedule →
                    </button>
                  </section>
                </div>
              </motion.div>
            )}

            {/* TAB 2: REGISTERED WORKS */}
            {activeTab === "works" && (
              <motion.div
                key="works"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                {/* Filters and trigger */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                  <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
                    {['All', 'Approved', 'Pending', 'Rejected', 'Afro-Pop', 'Gospel', 'Kalindula', 'Hip Hop'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setWorksFilter(filter)}
                        className={`px-5 py-2.5 rounded-full text-sm font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                          worksFilter === filter ? 'bg-[#111111] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Register New Work Form */}
                  <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-2">Register track work</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6">File statutory copyright split sheets directly to ZAMCOPS auditing desks.</p>

                    {formSuccess && (
                      <div className="mb-4 bg-pastel-mint/80 border border-emerald-500/10 text-emerald-900 p-4 rounded-2xl text-xs font-bold">
                        {formSuccess}
                      </div>
                    )}

                    <form onSubmit={handleRegisterWork} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Track/Song Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lusaka Nights"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Genre</label>
                          <select
                            value={newGenre}
                            onChange={(e) => setNewGenre(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none appearance-none cursor-pointer"
                          >
                            <option value="Afro-Pop">Afro-Pop</option>
                            <option value="Gospel">Gospel</option>
                            <option value="Kalindula">Kalindula</option>
                            <option value="Zed Beats">Zed Beats</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Classical">Classical</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Release Year</label>
                          <input
                            type="number"
                            required
                            value={newYear}
                            onChange={(e) => setNewYear(Number(e.target.value))}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Split Share (%)</label>
                          <select
                            value={newShare}
                            onChange={(e) => setNewShare(Number(e.target.value))}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none appearance-none cursor-pointer"
                          >
                            <option value="100">100% (Sole Author)</option>
                            <option value="75">75% Share</option>
                            <option value="50">50% Share</option>
                            <option value="25">25% Share</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">ISRC Code (Optional)</label>
                          <input
                            type="text"
                            placeholder="ZM-100-26-XXXXX"
                            value={newIsrc}
                            onChange={(e) => setNewIsrc(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Android-Native Media Picker */}
                      <div className="border border-[#F5F5F3] bg-[#FCFCFA]/80 p-5 rounded-2xl flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <div>
                            <span className="text-xs font-bold text-gray-750 block">Android Repository Split Integration</span>
                            <span className="text-[10px] text-gray-400 font-semibold">Direct upload of master files under Android SAF</span>
                          </div>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                            Device SAF Online
                          </span>
                        </div>

                        {/* Audio File Picker Slot */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Sound Master Track (.MP3 / .WAV) *</label>
                          <input
                            id="android-audio-file"
                            type="file"
                            accept="audio/*"
                            onChange={handleAudioUpload}
                            className="hidden"
                          />
                          
                          {audioUploading ? (
                            <div className="bg-orange-50/50 border border-orange-200/50 rounded-xl p-3 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-zamcops-orange animate-pulse flex items-center gap-1.5">
                                  <Clock size={12} className="animate-spin" />
                                  Simulating Android system verification...
                                </span>
                                <span className="text-xs font-semibold font-mono text-zamcops-orange">{audioProgress}%</span>
                              </div>
                              <div className="w-full bg-orange-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-zamcops-orange h-full transition-all duration-150" style={{ width: `${audioProgress}%` }} />
                              </div>
                            </div>
                          ) : audioFile ? (
                            <div className="bg-[#F5F5F3] border border-gray-200/50 rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 bg-zamcops-orange/10 text-zamcops-orange rounded-lg flex items-center justify-center shrink-0">
                                  <FileAudio size={18} />
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className="text-xs font-bold text-gray-800 truncate leading-tight">{audioFile.name}</h4>
                                  <p className="text-[10px] text-gray-400 font-semibold font-mono mt-0.5">{audioFile.size} • {audioFile.type.split("/")[1]?.toUpperCase() || "MP3"}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={clearAudioFile}
                                className="w-7 h-7 hover:bg-rose-100/50 hover:text-rose-600 text-gray-400 rounded-lg flex items-center justify-center transition-colors shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => document.getElementById("android-audio-file")?.click()}
                              className="border-2 border-dashed border-gray-200 hover:border-zamcops-orange/50 bg-[#FCFCFC] hover:bg-zamcops-orange/5 rounded-xl py-4.5 px-4 flex flex-col items-center justify-center cursor-pointer transition-all group text-center"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-zamcops-orange/10 text-gray-400 group-hover:text-zamcops-orange flex items-center justify-center mb-1.5 transition-colors">
                                <Upload size={14} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 group-hover:text-zamcops-orange transition-colors">Select Audio Master</span>
                              <span className="text-[10px] text-gray-400 font-medium mt-0.5">MP3 or WAV files up to 25MB</span>
                            </div>
                          )}
                        </div>

                        {/* Cover Art Image Picker Slot */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cover Art Booklet (.PNG / .JPG) *</label>
                          <input
                            id="android-artwork-file"
                            type="file"
                            accept="image/*"
                            onChange={handleArtworkUpload}
                            className="hidden"
                          />
                          
                          {artworkUploading ? (
                            <div className="bg-orange-50/50 border border-orange-200/50 rounded-xl p-3 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-zamcops-orange animate-pulse flex items-center gap-1.5">
                                  <Clock size={12} className="animate-spin" />
                                  Compiling metadata parameters...
                                </span>
                                <span className="text-xs font-semibold font-mono text-zamcops-orange">{artworkProgress}%</span>
                              </div>
                              <div className="w-full bg-orange-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-zamcops-orange h-full transition-all duration-100" style={{ width: `${artworkProgress}%` }} />
                              </div>
                            </div>
                          ) : artworkFile ? (
                            <div className="bg-[#F5F5F3] border border-gray-200/50 rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 overflow-hidden">
                                {artworkFile.preview ? (
                                  <img src={artworkFile.preview} alt="Art Preview" className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                                ) : (
                                  <div className="w-9 h-9 bg-zamcops-orange/10 text-zamcops-orange rounded-lg flex items-center justify-center shrink-0">
                                    <FileImage size={18} />
                                  </div>
                                )}
                                <div className="overflow-hidden">
                                  <h4 className="text-xs font-bold text-gray-800 truncate leading-tight">{artworkFile.name}</h4>
                                  <p className="text-[10px] text-gray-400 font-semibold font-mono mt-0.5">{artworkFile.size} • PNG/JPG Preview active</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={clearArtworkFile}
                                className="w-7 h-7 hover:bg-rose-100/50 hover:text-rose-600 text-gray-400 rounded-lg flex items-center justify-center transition-colors shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => document.getElementById("android-artwork-file")?.click()}
                              className="border-2 border-dashed border-gray-200 hover:border-zamcops-orange/50 bg-[#FCFCFC] hover:bg-zamcops-orange/5 rounded-xl py-4.5 px-4 flex flex-col items-center justify-center cursor-pointer transition-all group text-center"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-zamcops-orange/10 text-gray-400 group-hover:text-zamcops-orange flex items-center justify-center mb-1.5 transition-colors">
                                <Camera size={14} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 group-hover:text-zamcops-orange transition-colors">Select Visual Cover Art</span>
                              <span className="text-[10px] text-gray-400 font-medium mt-0.5">Square high-res JPEG/PNG images</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="bg-zamcops-orange text-white px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-sm"
                      >
                        <PlusCircle size={16} />
                        <span>Publish Statutory Registry</span>
                      </button>
                    </form>
                  </div>

                  {/* Works Ledger List - High-Density Work Registration Tracker */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                        <div>
                          <h3 className="text-xl font-bold text-[#111111] tracking-tight">Work Registration Tracker</h3>
                          <p className="text-xs font-semibold text-gray-400 mt-1">Real-time status loops & statutory copyright split auditing</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle size={10} className="shrink-0 text-emerald-650" />
                            {myWorks.filter(w => w.status === "Approved").length} Active
                          </span>
                          <span className="bg-orange-50 text-zamcops-orange border border-zamcops-orange/20 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <Clock size={10} className="shrink-0 text-zamcops-orange animate-pulse" />
                            {myWorks.filter(w => w.status === "Pending").length} Pending
                          </span>
                          <span className="bg-rose-50 text-rose-800 border border-rose-200/50 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <XCircle size={10} className="shrink-0 text-rose-650" />
                            {myWorks.filter(w => w.status === "Rejected").length} Rejected
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3.5">
                        {myWorks
                          .filter((w) => {
                            if (worksFilter === "All") return true;
                            if (worksFilter === "Pending") return w.status === "Pending";
                            if (worksFilter === "Approved") return w.status === "Approved";
                            if (worksFilter === "Rejected") return w.status === "Rejected";
                            return w.genre.toLowerCase() === worksFilter.toLowerCase();
                          })
                          .filter((w) => w.title.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((work) => {
                            // Determine statuses and colors
                            let statusColor = "";
                            let avatarTheme = "";
                            let StatusIcon = Clock;
                            let statusLabel = "";

                            if (work.status === "Approved") {
                              statusColor = "bg-emerald-50 text-emerald-800 border-emerald-200/60";
                              avatarTheme = "bg-emerald-50 text-emerald-700 border-emerald-100";
                              StatusIcon = CheckCircle;
                              statusLabel = "Approved";
                            } else if (work.status === "Rejected") {
                              statusColor = "bg-rose-50 text-rose-800 border-rose-200/60";
                              avatarTheme = "bg-rose-50 text-rose-700 border-rose-100";
                              StatusIcon = XCircle;
                              statusLabel = "Rejected";
                            } else {
                              // Pending
                              statusColor = "bg-orange-50 text-zamcops-orange border-zamcops-orange/20";
                              avatarTheme = "bg-orange-50/70 text-zamcops-orange border-orange-100/50";
                              StatusIcon = Clock;
                              statusLabel = "Pending Audit";
                            }

                            return (
                              <div
                                key={work.id}
                                onClick={() => {
                                  alert(`Song Ledger Entry: ${work.title}\nStatus: ${statusLabel}\nISRC: ${work.isrc}\nAuthor Share: ${work.sharePercentage}%\nGenre: ${work.genre}\nRegistered By: ${work.submittedBy}`);
                                }}
                                className="bg-[#F5F5F3]/40 hover:bg-[#F5F5F3]/70 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group transition-all border border-gray-150/40 hover:border-zamcops-orange/30 cursor-pointer"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-bold font-mono text-sm border ${avatarTheme}`}>
                                    {work.title.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-base font-bold text-[#111111] leading-none group-hover:text-zamcops-orange transition-colors">
                                        {work.title}
                                      </h4>
                                      <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md leading-none font-mono">
                                        {work.genre}
                                      </span>
                                    </div>
                                    <div className="flex gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-gray-400 font-semibold font-mono">
                                      <span className="text-gray-500 font-bold">Split: {work.sharePercentage}%</span>
                                      <span>Year: {work.releaseYear}</span>
                                      <span>Filed: {work.submittedAt || "2026-05-25"}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-1 sm:mt-0 font-mono">
                                  <div className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                                    {work.isrc}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`border text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full flex items-center gap-1 ${statusColor}`}>
                                      <StatusIcon size={12} className="shrink-0" />
                                      {statusLabel}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-xs group-hover:bg-zamcops-orange group-hover:text-white group-hover:border-zamcops-orange transition-colors shrink-0">
                                      <ArrowUpRight size={14} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        {myWorks.length === 0 && (
                          <div className="text-center py-12 text-gray-400 italic text-sm">
                            No tracks found matching the criteria. Use the form to submit one!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 3: ROYALTIES */}
            {activeTab === "royalties" && (
              <motion.div
                key="royalties"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                {/* Hero Accrued */}
                <div className="bg-pastel-yellow rounded-[32px] p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative overflow-hidden">
                  <div className="absolute right-[-20px] top-[-20px] w-48 h-48 rounded-full bg-black/5 -z-10" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">
                      Available for payout (Net ZMW)
                    </p>
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-[#111111] mb-2 font-sans">
                      ZMW {totalAccruedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-xs font-bold text-gray-500">
                      Next statutory distribution cycle: August 15, 2026
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (totalPendingValue > 0) {
                        alert("Payout request logged successfully with ZAMCOPS Treasury. Clearance initiated!");
                      } else {
                        alert("Payout successfully queued for bank transfer batch processing!");
                      }
                    }}
                    className="bg-[#111111] text-white px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform w-full sm:w-auto cursor-pointer shadow-md"
                  >
                    Request Instant Payout
                  </button>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-pastel-mint rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">YTD Earnings</span>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">ZMW {totalPaidValue.toLocaleString()}</span>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                        <ArrowUpRight size={16} className="text-[#111111]" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-pastel-lavender rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">Lifetime Earnings</span>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">ZMW {(totalPaidValue + 42000).toLocaleString()}</span>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                        <ArrowUpRight size={16} className="text-[#111111]" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-pastel-pink rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">Accruing Hold</span>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">ZMW {totalPendingValue.toLocaleString()}</span>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                        <ArrowUpRight size={16} className="text-[#111111]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings List & breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column */}
                  <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-2">Earnings by collection source</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6">Audited split weights of distribution channels.</p>

                    <div className="flex flex-col gap-6">
                      {[
                        { label: 'Broadcast (Radio/TV)', percent: 65, amount: 'ZMW 30,680', color: 'bg-pastel-mint' },
                        { label: 'Live Performance', percent: 20, amount: 'ZMW 9,440', color: 'bg-pastel-yellow' },
                        { label: 'Digital Streaming', percent: 10, amount: 'ZMW 4,720', color: 'bg-pastel-pink' },
                        { label: 'Sync & Video Licensing', percent: 5, amount: 'ZMW 2,360', color: 'bg-pastel-lavender' },
                      ].map((source, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-bold text-gray-800 mb-2">
                            <span>{source.label}</span>
                            <span>{source.amount}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-150 rounded-full overflow-hidden">
                            <div className={`h-full ${source.color} rounded-full`} style={{ width: `${source.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column (Transactions) */}
                  <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-2">Accrual ledger entries</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6">Verified statutory distributions release audit checks.</p>

                    <div className="flex flex-col gap-3">
                      {myEarnings.map((tx, i) => (
                        <div key={tx.id} className="bg-[#F5F5F3]/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-pastel-mint px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase shrink-0">
                              {tx.period}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#111111]">{tx.trackTitle}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{tx.source}</p>
                            </div>
                          </div>
                          <div className="text-sm font-black text-gray-900 font-mono text-right">
                            + ZMW {tx.netAmount.toLocaleString()}
                            <p className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5">{tx.status}</p>
                          </div>
                        </div>
                      ))}

                      {myEarnings.length === 0 && (
                        <div className="text-center py-12 text-gray-400 italic text-sm">
                          No royalty payments logged in database ledger yet. Approving tracks will automatically generate earnings.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: SCHEDULE */}
            {activeTab === "schedule" && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
              >
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-[32px] p-5 sm:p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                      <h3 className="text-xl sm:text-2xl font-bold">July 2024</h3>
                      <div className="flex gap-2 text-gray-400">
                        <button className="hover:text-[#111111] transition-colors cursor-pointer p-1 rounded-full">
                          <ChevronLeft size={20} />
                        </button>
                        <button className="hover:text-[#111111] transition-colors cursor-pointer p-1 rounded-full">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-y-4 sm:gap-y-6 gap-x-1 sm:gap-x-2 text-center mb-2">
                      {days.map((day) => (
                        <div key={day} className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-wider">
                          {day}
                        </div>
                      ))}

                      {dates.map((d, i) => {
                        let className = 'w-8 h-8 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors cursor-pointer ';
                        if (d.type === 'prev' || d.type === 'next') className += 'text-gray-300';
                        else if (d.type === 'current') className += 'text-[#111111] hover:bg-gray-100';
                        else if (d.type === 'today') className += 'text-[#111111] border-2 border-dashed border-gray-300';
                        else if (d.type === 'mint') className += 'bg-pastel-mint text-[#111111]';
                        else if (d.type === 'selected') className += 'bg-[#111111] text-white';
                        
                        return (
                          <div key={i} className={className}>
                            {d.date}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                  <h2 className="text-xl sm:text-2xl font-bold px-2">Upcoming society events</h2>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="bg-pastel-yellow/50 hover:bg-pastel-yellow rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Banknote size={18} className="text-[#111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Aug 15 • 09:00 AM</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">Q3 Royalty Distribution Release</div>
                      </div>
                    </div>

                    <div className="bg-pastel-mint/50 hover:bg-pastel-mint rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Users size={18} className="text-[#111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Aug 22 • 14:00 PM</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">Songwriter Workshop: Split Sheets</div>
                      </div>
                    </div>

                    <div className="bg-pastel-pink/50 hover:bg-pastel-pink rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Mic2 size={18} className="text-[#111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Sep 05 • 10:00 AM</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">Live Performance Claim Deadline</div>
                      </div>
                    </div>

                    <div className="bg-pastel-lavender/50 hover:bg-pastel-lavender rounded-3xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Users size={18} className="text-[#111]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-0.5">Sep 20 • 09:00 AM</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">ZAMCOPS AGM 2026</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: MEMBERSHIP */}
            {activeTab === "membership" && (
              <motion.div
                key="membership"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                {/* Hero profile */}
                <div className="bg-pastel-mint rounded-[32px] p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left relative overflow-hidden">
                  <div className="absolute right-[-30px] bottom-[-30px] w-48 h-48 rounded-full bg-black/5 -z-10" />
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256"
                    alt="profile"
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-sm object-cover shrink-0"
                  />
                  <div className="flex flex-col justify-center h-full pt-1.5 ">
                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111111]">
                      {artistProfile.fullName}
                    </h2>
                    <p className="text-lg sm:text-xl font-bold text-gray-650 mt-1">
                      Stage Name: {artistProfile.stageName}
                    </p>
                    <div className="bg-[#111111] text-white px-4 py-2 rounded-full text-xs font-extrabold inline-flex items-center gap-2 w-fit mx-auto sm:mx-0 mt-4 shadow-sm font-mono">
                      <ShieldCheck size={16} className="text-pastel-mint" />
                      Class A Statutory Rightsholder
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Bio details card */}
                  <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-2">Member legal credentials</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6 font-semibold">Bylaw status details for statutory voting rights.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Rightsholder Number</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111] font-mono">{artistProfile.memberNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Registrar Since</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111]">{new Date(artistProfile.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">ZAMCOPS Class Code</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111]">Class A (Full Voting Rights)</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">StatutorySpecialization</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111]">Composer • Author • Lyricist</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Identity National Code</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111] font-mono">{artistProfile.nrcNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Contact Office line</p>
                        <p className="text-sm sm:text-base font-extrabold text-[#111111] font-mono">{artistProfile.phone || "+260 971 234 567"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents Column */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div>
                      <h3 className="text-lg font-bold px-2 mb-4">Statutory benefits</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-pastel-mint rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 h-26">
                          <Users size={20} className="text-[#111]" />
                          <span className="text-[10px] font-bold leading-tight uppercase tracking-wider text-gray-800">Full voting rights</span>
                        </div>
                        <div className="bg-pastel-yellow rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 h-26">
                          <TrendingUp size={20} className="text-[#111]" />
                          <span className="text-[10px] font-bold leading-tight uppercase tracking-wider text-gray-800">Priority release</span>
                        </div>
                        <div className="bg-pastel-lavender rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 h-26">
                          <ShieldCheck size={20} className="text-[#111]" />
                          <span className="text-[10px] font-bold leading-tight uppercase tracking-wider text-gray-800">Legal support</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold px-2 mb-4">Verification documents</h3>
                      <div className="flex flex-col gap-3">
                        <div className="bg-white hover:bg-gray-50 border border-gray-150/40 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                          <div className="w-10 h-10 bg-pastel-mint rounded-xl flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-emerald-800" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#111111]">CAP 138 Certificate</h4>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Authorised Society Registration • Active</p>
                          </div>
                        </div>

                        <div className="bg-white hover:bg-gray-50 border border-gray-150/40 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors">
                          <div className="w-10 h-10 bg-pastel-yellow rounded-xl flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-yellow-800" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#111111]">Tax Clearance Certificate</h4>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Year 2026 Statutory Release • Active</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 6: PAYOUT PREFERENCES */}
            {activeTab === "payouts" && (
              <motion.div
                key="payouts"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto flex flex-col gap-8 w-full"
              >
                {profileSuccess && (
                  <div className="bg-pastel-mint text-emerald-900 border border-emerald-500/10 p-5 rounded-[24px] text-xs font-bold leading-relaxed">
                    {profileSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                  {/* Identity Bio Section */}
                  <section>
                    <h2 className="text-xl font-bold mb-4 px-2">Personal rights identity</h2>
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 flex flex-col gap-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Legal Representative Name</label>
                          <input
                            type="text"
                            required
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Stage Name / Brand Registration</label>
                          <input
                            type="text"
                            required
                            value={editStageName}
                            onChange={(e) => setEditStageName(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">NRC National ID Number</label>
                          <input
                            type="text"
                            required
                            value={editNrc}
                            onChange={(e) => setEditNrc(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Active Office Phone</label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Settlements section */}
                  <section>
                    <h2 className="text-xl font-bold mb-4 px-2">Settlement bank credentials</h2>
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40 flex flex-col gap-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1 font-semibold">Zambian Settlement Bank Partner</label>
                          <select
                            value={editBank}
                            onChange={(e) => setEditBank(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none appearance-none cursor-pointer text-gray-800"
                          >
                            <option value="Zambia National Commercial Bank (ZANACO)">ZANACO</option>
                            <option value="Stanbic Bank Zambia">Stanbic Bank</option>
                            <option value="Absa Bank Zambia">Absa Bank Zambia</option>
                            <option value="Standard Chartered Bank">Standard Chartered</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Settlement Bank Account Number</label>
                          <input
                            type="text"
                            required
                            value={editAccount}
                            onChange={(e) => setEditAccount(e.target.value)}
                            className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1 font-semibold">Mobile Money Number (Alternative/Backup)</label>
                        <input
                          type="text"
                          value={editMomo}
                          onChange={(e) => setEditMomo(e.target.value)}
                          className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Preferred Channel */}
                  <section>
                    <h2 className="text-xl font-bold mb-4 px-2">Preferred statutory payout channel</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Bank selection */}
                      <div
                        onClick={() => setPayoutChannel("bank")}
                        className={`rounded-[32px] p-5 cursor-pointer relative border-2 transition-all hover-translate ${
                          payoutChannel === "bank"
                            ? "bg-pastel-mint border-[#111111]"
                            : "bg-white border-transparent"
                        }`}
                      >
                        {payoutChannel === "bank" && (
                          <div className="absolute top-4 right-4 w-5 h-5 bg-[#111111] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                        <Building2 size={28} className="mb-4 text-[#111111]" />
                        <h4 className="font-extrabold mb-1">Bank Transfer</h4>
                        <p className="text-[11px] font-bold text-[#111111]/70 leading-relaxed">
                          Direct clearance dispatch to your {editBank === "ZANACO" ? "ZANACO" : editBank} account (2-3 days).
                        </p>
                      </div>

                      {/* MOMO selection */}
                      <div
                        onClick={() => setPayoutChannel("momo")}
                        className={`rounded-[32px] p-5 cursor-pointer relative border-2 transition-all hover-translate ${
                          payoutChannel === "momo"
                            ? "bg-pastel-pink border-[#111111]"
                            : "bg-white border-transparent"
                        }`}
                      >
                        {payoutChannel === "momo" && (
                          <div className="absolute top-4 right-4 w-5 h-5 bg-[#111111] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                        <Smartphone size={28} className="mb-4 text-[#111111]" />
                        <h4 className="font-extrabold mb-1">Mobile Money</h4>
                        <p className="text-[11px] font-bold text-[#111111]/70 leading-relaxed">
                          Instant transfer of monthly micro-royalties to MTN/Airtel pools.
                        </p>
                      </div>

                      {/* Cheque selection */}
                      <div
                        onClick={() => setPayoutChannel("cheque")}
                        className={`rounded-[32px] p-5 cursor-pointer relative border-2 transition-all hover-translate ${
                          payoutChannel === "cheque"
                            ? "bg-pastel-lavender border-[#111111]"
                            : "bg-white border-transparent"
                        }`}
                      >
                        {payoutChannel === "cheque" && (
                          <div className="absolute top-4 right-4 w-5 h-5 bg-[#111111] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                        <Receipt size={28} className="mb-4 text-[#111111]" />
                        <h4 className="font-extrabold mb-1">Physical Cheque</h4>
                        <p className="text-[11px] font-bold text-[#111111]/70 leading-relaxed">
                          Handheld draft collected physically at ZAMCOPS corporate office in Lusaka.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Security Clearance block */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-4 pb-4">
                    <div className="bg-pastel-yellow rounded-2xl p-4 flex items-center gap-3 w-full sm:w-auto">
                      <ShieldCheck size={24} className="text-[#111111] shrink-0" />
                      <p className="text-xs font-bold text-[#111111]/85 leading-relaxed">
                        Your treasury preferences are verified with CAP 138 statutory security routers.<br/>Identity alignment checked.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="bg-[#111111] text-white px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform w-full sm:w-auto shrink-0 shadow-md cursor-pointer"
                    >
                      Save Payout Preferences
                    </button>
                  </div>
                </form>
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

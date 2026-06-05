"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LabelProfile,
  TrackWork,
  RoyaltyEarning,
  User,
  ArtistProfile
} from "../lib/types";
import { loadFullState, saveFullState } from "../lib/storage";
import {
  LogOut,
  Building2,
  Users,
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
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Receipt,
  FileText
} from "lucide-react";

interface LabelPortalProps {
  user: User;
  onLogout: () => void;
}

export function LabelPortal({ user, onLogout }: LabelPortalProps) {
  const [state, setState] = useState(() => loadFullState());
  const [activeTab, setActiveTab] = useState<"dashboard" | "artists" | "catalog" | "royalties">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [worksFilter, setWorksFilter] = useState("All");

  useEffect(() => {
    setState(loadFullState());
  }, []);

  const saveState = (updatedState: typeof state) => {
    setState(updatedState);
    saveFullState(updatedState);
  };

  const labelProfile = state.labelProfiles[user.email] || {
    labelName: user.email.split("@")[0].toUpperCase() + " Record Label",
    registrationNumber: "PACRA-LREG-948301",
    representativeName: "Executive Representative",
    phone: "+260 977 444 333",
    bankName: "First National Bank (FNB)",
    bankAccount: "62739485012",
    createdAt: new Date().toISOString()
  };

  // State forms
  const [newTitle, setNewTitle] = useState("");
  const [newArtistName, setNewArtistName] = useState("");
  const [newGenre, setNewGenre] = useState("Afro-Pop");
  const [newYear, setNewYear] = useState<number>(2026);
  const [newIsrc, setNewIsrc] = useState("");
  const [newShare, setNewShare] = useState<number>(50);
  const [workSuccess, setWorkSuccess] = useState("");

  const [newRosterName, setNewRosterName] = useState("");
  const [newRosterNrc, setNewRosterNrc] = useState("");
  const [newRosterMomo, setNewRosterMomo] = useState("");
  const [rosterSuccess, setRosterSuccess] = useState("");

  // Get works published by this publisher account
  const myCatalog = state.works.filter(
    (w) => w.submittedBy === user.email
  );

  // Roster is list of artists who are associated with label
  const catalogArtistNames = Array.from(new Set(myCatalog.map((c) => c.artistName)));
  const customRoster = Object.values(state.artistProfiles).filter(
    (p) => catalogArtistNames.includes(p.stageName) || p.phone.includes("Roster")
  );

  const myRoyalties = state.royalties.filter((r) => r.recipientEmail === user.email);
  const totalAccruedValue = myRoyalties.reduce((sum, curr) => sum + curr.netAmount, 0);
  const totalPaidValue = myRoyalties.filter((r) => r.status === "Paid").reduce((sum, curr) => sum + curr.netAmount, 0);
  const totalPendingValue = myRoyalties.filter((r) => r.status === "Accrued").reduce((sum, curr) => sum + curr.netAmount, 0);

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newArtistName) return;

    const generatedIsrc = newIsrc || `ZM-PUB-26-${Math.floor(10000 + Math.random() * 90000)}`;
    const newTrack: TrackWork = {
      id: `work-${Date.now()}`,
      title: newTitle,
      artistName: newArtistName,
      isrc: generatedIsrc,
      genre: newGenre,
      releaseYear: Number(newYear),
      sharePercentage: Number(newShare),
      status: "Pending",
      submittedBy: user.email,
      submittedAt: new Date().toISOString().split("T")[0]
    };

    const updatedWorks = [newTrack, ...state.works];
    const auditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "WORK_REGISTERED",
      details: `Publisher registered track '${newTitle}' by artist '${newArtistName}' with ${newShare}% share`
    };

    saveState({
      ...state,
      works: updatedWorks,
      auditLogs: [auditLog, ...state.auditLogs]
    });

    setNewTitle("");
    setNewArtistName("");
    setNewIsrc("");
    setWorkSuccess("Catalog release registered successfully and sent to auditing console.");
    setTimeout(() => setWorkSuccess(""), 5000);
  };

  const handleAddRosterArtist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRosterName) return;

    const emailKey = `${newRosterName.toLowerCase().replace(/\s+/g, "")}@roster.zamcops.zm`;
    const newArtistProfile: ArtistProfile = {
      fullName: newRosterName + " (Roster Legal)",
      stageName: newRosterName,
      memberNumber: `ZAM-RST-${Math.floor(100 + Math.random() * 900)}`,
      membershipStatus: "Approved",
      nrcNumber: newRosterNrc || "000000/00/1",
      phone: `${newRosterMomo || "+260"} (Roster)`,
      bankName: labelProfile.bankName,
      bankBranch: "Publisher Consolidated Account",
      bankAccount: labelProfile.bankAccount,
      mobileMoneyNumber: newRosterMomo,
      createdAt: new Date().toISOString()
    };

    const updatedProfiles = {
      ...state.artistProfiles,
      [emailKey]: newArtistProfile
    };

    const auditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "ROSTER_ARTIST_ADDED",
      details: `Added '${newRosterName}' to publisher managed portfolio`
    };

    saveState({
      ...state,
      artistProfiles: updatedProfiles,
      auditLogs: [auditLog, ...state.auditLogs]
    });

    setNewRosterName("");
    setNewRosterNrc("");
    setNewRosterMomo("");
    setRosterSuccess("Roster artist bound to publisher authority successfully.");
    setTimeout(() => setRosterSuccess(""), 4000);
  };

  // Nav configurations
  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: Building2 },
    { id: "artists", label: "Roster Artists", icon: Users },
    { id: "catalog", label: "Music Catalog", icon: Music },
    { id: "royalties", label: "Publisher Royalties", icon: CreditCard }
  ] as const;

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

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto pb-28 lg:pb-12">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-10 gap-4 mt-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Publisher Workspace</p>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#111111]">
                {labelProfile.labelName}
              </h1>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Review catalog artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pastel-mint w-full md:w-64 shadow-sm"
                />
              </div>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pastel-lavender flex items-center justify-center font-bold text-[#111111] shadow-sm shrink-0">
                PB
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
                {/* Left Column stats */}
                <div className="lg:col-span-7 flex flex-col gap-8 lg:gap-10">
                  <section>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Distribution Overview</h2>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div
                        onClick={() => setActiveTab("catalog")}
                        className="bg-pastel-mint rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-36 relative group cursor-pointer transition-transform hover:-translate-y-1"
                      >
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">Catalog Tracks</span>
                        <div className="flex justify-between items-end">
                          <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">{myCatalog.length}</span>
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                            <ArrowUpRight size={16} className="text-[#111111]" />
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab("artists")}
                        className="bg-pastel-pink rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-36 relative group cursor-pointer transition-transform hover:-translate-y-1"
                      >
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">Roster Artists</span>
                        <div className="flex justify-between items-end">
                          <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">{customRoster.length}</span>
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                            <ArrowUpRight size={16} className="text-[#111111]" />
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab("royalties")}
                        className="bg-pastel-yellow rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-36 relative group cursor-pointer transition-transform hover:-translate-y-1"
                      >
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">Total Unpaid</span>
                        <div className="flex justify-between items-end">
                          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#111111]">ZMW {totalPendingValue.toLocaleString()}</span>
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                            <ArrowUpRight size={16} className="text-[#111111]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Visual source charts */}
                  <section className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-2">Publisher earnings streams</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6">Aggregate collections weight by ZAMCOPS licensing channels.</p>

                    <div className="flex flex-col gap-5">
                      {[
                        { label: 'Broadcasting & TV Plays', percent: 65, amount: 'ZMW 302,680', color: 'bg-pastel-mint' },
                        { label: 'Collective Physical Venues (Bar/Retail)', percent: 20, amount: 'ZMW 93,440', color: 'bg-pastel-pink' },
                        { label: 'Digital Mechanical Synchronization', percent: 15, amount: 'ZMW 70,050', color: 'bg-pastel-yellow' },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span>{item.label}</span>
                            <span>{item.amount}</span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-150 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column roster summary */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-white rounded-[32px] p-6 border border-gray-150/40">
                    <h3 className="text-lg font-bold text-[#111111] mb-4">Top roster performers</h3>
                    
                    <div className="flex flex-col gap-3">
                      {customRoster.slice(0, 4).map((artist, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-[#F5F5F3]/50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pastel-pink flex items-center justify-center font-bold">
                              {artist.stageName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 leading-none">{artist.stageName}</p>
                              <p className="text-[10px] font-mono text-gray-400 mt-1">{artist.memberNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="bg-pastel-mint text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full font-mono">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}

                      {customRoster.length === 0 && (
                        <div className="text-center py-6 text-gray-400 italic text-sm">
                          No roster artists linked yet. Add one in the &quot;Roster Artists&quot; tab!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: ROSTER ARTISTS */}
            {activeTab === "artists" && (
              <motion.div
                key="artists"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                
                {/* Form to bind managed artist */}
                <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Bind roster artist</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6">Bind new creative artists or songwriters to publisher administration accounts.</p>

                  {rosterSuccess && (
                     <div className="bg-pastel-mint text-emerald-950 p-4 rounded-2xl text-xs font-bold mb-4">
                       {rosterSuccess}
                     </div>
                  )}

                  <form onSubmit={handleAddRosterArtist} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Artist Stage Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mampi"
                        value={newRosterName}
                        onChange={(e) => setNewRosterName(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">National Registration ID (NRC)</label>
                      <input
                        type="text"
                        placeholder="e.g. 102938/11/1"
                        value={newRosterNrc}
                        onChange={(e) => setNewRosterNrc(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Associated Momo Number (For payout router)</label>
                      <input
                        type="text"
                        placeholder="e.g. 0976111222"
                        value={newRosterMomo}
                        onChange={(e) => setNewRosterMomo(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-[#111111] text-white px-6 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-sm"
                    >
                      <PlusCircle size={16} />
                      <span>Bind Managed Artist</span>
                    </button>
                  </form>
                </div>

                {/* Managed list table */}
                <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Publisher controlled catalog roster</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 font-semibold">Verified rightsholders in your statutory portfolio list.</p>

                  <div className="flex flex-col gap-3">
                    {customRoster
                      .filter((p) => p.stageName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((artist, idx) => (
                        <div key={idx} className="bg-[#F5F5F3]/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-pastel-yellow font-extrabold flex items-center justify-center text-sm font-sans shrink-0">
                              {artist.stageName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-800 leading-none">{artist.stageName}</p>
                              <p className="text-xs text-gray-500 font-bold mt-1.5 uppercase font-mono">{artist.memberNumber}</p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <p className="text-xs font-extrabold text-[#111111]">{artist.nrcNumber}</p>
                            <span className="mt-1 block text-[10px] text-gray-400 font-semibold">{artist.phone}</span>
                          </div>
                        </div>
                      ))}

                    {customRoster.length === 0 && (
                      <div className="text-center py-12 text-gray-400 italic text-sm">
                        No active managed rightsholders registered yet.
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: MUSIC CATALOG */}
            {activeTab === "catalog" && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Form to publish releases */}
                <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Catalog Register</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6">File new rightsholder works under publishing contracts.</p>

                  {workSuccess && (
                    <div className="bg-pastel-mint text-emerald-955 p-4 rounded-2xl text-xs font-bold mb-4">
                      {workSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddTrack} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Track/Song Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Siniya"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Artist Stage Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Yo Maps"
                        value={newArtistName}
                        onChange={(e) => setNewArtistName(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Publisher Share (%)</label>
                        <select
                          value={newShare}
                          onChange={(e) => setNewShare(Number(e.target.value))}
                          className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none appearance-none cursor-pointer text-gray-800"
                        >
                          <option value="50">50% Share (Standard)</option>
                          <option value="40">40% Share</option>
                          <option value="30">30% Share</option>
                          <option value="100">100% (Publishing Own)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">ISRC Code (Optional)</label>
                      <input
                        type="text"
                        placeholder="ZM-PUB-XXXX-XXXX"
                        value={newIsrc}
                        onChange={(e) => setNewIsrc(e.target.value)}
                        className="bg-pastel-cream/50 px-4 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-mint border-none outline-none font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-[#111111] text-white px-6 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-sm"
                    >
                      <PlusCircle size={16} />
                      <span>Publish Catalog release</span>
                    </button>
                  </form>
                </div>

                {/* Catalog list right column */}
                <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Catalog releases ledger</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 font-semibold">Submitted tracks listed securely with rightsholder split sheets.</p>

                  <div className="flex flex-col gap-3">
                    {myCatalog
                      .filter((w) => w.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((track, i) => (
                        <div key={track.id} className="bg-[#F5F5F3]/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-pastel-lavender font-extrabold flex items-center justify-center text-sm tracking-tight shrink-0">
                              {track.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-800 leading-none">{track.title}</p>
                              <p className="text-xs text-gray-500 font-bold mt-1.5 uppercase font-mono">
                                Owner: {track.artistName} • Share: {track.sharePercentage}%
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <p className="text-xs font-bold text-gray-400">{track.isrc}</p>
                            <span className={`inline-block mt-1.5 text-[10px] uppercase font-mono font-extrabold px-2.5 py-0.5 rounded-full ${
                              track.status === "Approved" ? "bg-pastel-mint text-emerald-800" : "bg-pastel-pink text-red-800"
                            }`}>
                              {track.status}
                            </span>
                          </div>
                        </div>
                      ))}

                    {myCatalog.length === 0 && (
                      <div className="text-center py-12 text-gray-400 italic text-sm">
                        No tracks added under Publisher catalog yet.
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 4: PUBLISHER ROYALTIES */}
            {activeTab === "royalties" && (
              <motion.div
                key="royalties"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                {/* Hero card */}
                <div className="bg-pastel-yellow rounded-[32px] p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative overflow-hidden">
                  <div className="absolute right-[-10px] top-[-10px] w-48 h-48 rounded-full bg-black/5 -z-10" />
                  <div>
                    <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#111111]/70 mb-1">Publisher Available Accrued Earnings (Net)</h2>
                    <h1 className="text-4xl sm:text-6xl font-black text-[#111111] mb-2 font-mono">
                      ZMW {totalAccruedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h1>
                    <p className="text-xs font-bold text-[#111111]/60">
                      Next statutory distribution automatic payout window opens in August 15, 2026.
                    </p>
                  </div>
                  <button
                    onClick={() => alert("Publisher disbursement clearance logged with ZAMCOPS auditing desks successfully.")}
                    className="bg-[#111111] text-white px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform shrink-0 cursor-pointer shadow-md"
                  >
                    Request Payout Transfer
                  </button>
                </div>

                {/* Royalties details list */}
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Aggregated collection ledger</h3>
                  <p className="text-xs font-semibold text-[#111111]/60 mb-6 font-semibold">Licences release audits checking incoming publishers streams.</p>

                  <div className="flex flex-col gap-3">
                    {myRoyalties.map((roy) => (
                      <div key={roy.id} className="bg-[#F5F5F3]/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-pastel-pink px-3 py-1.5 rounded-full text-[10px] font-extrabold font-mono uppercase">
                            {roy.period}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-[#111111]">{roy.trackTitle}</p>
                            <span className="text-xs font-bold text-gray-500 uppercase">{roy.source} ({roy.artistName})</span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <p className="text-sm font-black text-[#111111]">+ ZMW {roy.netAmount.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded-full bg-pastel-mint mt-1 block w-fit ml-auto">
                            {roy.status}
                          </span>
                        </div>
                      </div>
                    ))}

                    {myRoyalties.length === 0 && (
                      <div className="text-center py-12 text-gray-400 italic text-sm">
                        No direct publisher mechanical or performance transactions found.
                      </div>
                    )}
                  </div>
                </div>

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

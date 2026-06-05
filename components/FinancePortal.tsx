"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RoyaltyEarning,
  PaymentBatch,
  AuditLog,
  User
} from "../lib/types";
import { loadFullState, saveFullState } from "../lib/storage";
import {
  LogOut,
  TrendingUp,
  CreditCard,
  Layers,
  Banknote,
  CheckCircle,
  FileSpreadsheet,
  Users,
  Briefcase,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Receipt,
  FileText
} from "lucide-react";

interface FinancePortalProps {
  user: User;
  onLogout: () => void;
}

export function FinancePortal({ user, onLogout }: FinancePortalProps) {
  const [state, setState] = useState(() => loadFullState());
  const [activeTab, setActiveTab] = useState<"overview" | "distribute" | "history">("overview");
  const [payoutSuccess, setPayoutSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setState(loadFullState());
  }, []);

  const saveState = (updatedState: typeof state) => {
    setState(updatedState);
    saveFullState(updatedState);
  };

  const pendingEligibleEarnings = state.royalties.filter((r) => r.status === "Accrued");
  const totalPendingRoyalties = pendingEligibleEarnings.reduce((sum, curr) => sum + curr.netAmount, 0);
  const batches = state.batches;

  // Aggregate collections by source for visual charts
  const allRoyalties = state.royalties;
  const totalCollectedGross = allRoyalties.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalDisbursedNet = allRoyalties.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.netAmount, 0);
  
  // ZAMCOPS retains 15% charge for operations
  const totalOperationalSurplus = allRoyalties.reduce((sum, r) => sum + (r.grossAmount - r.netAmount), 0);

  // Search filtering logic for lists
  const filteredPendingEarnings = pendingEligibleEarnings.filter(
    (earning) =>
      earning.trackTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      earning.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (earning.recipientEmail && earning.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      earning.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBatches = batches.filter(
    (batch) =>
      batch.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.authorizedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentPayoutLogs = state.auditLogs.filter((l) => l.action.includes("BATCH") || l.action.includes("PAYMENT"));
  const filteredRecentPayoutLogs = recentPayoutLogs.filter(
    (log) =>
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAuthorizeBatchPayout = () => {
    if (pendingEligibleEarnings.length === 0) return;

    // Disburse pending to paid status
    const updatedRoyalties = state.royalties.map((r) =>
      r.status === "Accrued" ? { ...r, status: "Paid" as const } : r
    );

    const batchId = `batch-${Date.now()}`;
    const newBatch: PaymentBatch = {
      id: batchId,
      period: "Semi-Annual Music Royalty Distribution Run",
      distributedAt: new Date().toISOString(),
      totalPaid: totalPendingRoyalties,
      itemCount: pendingEligibleEarnings.length,
      status: "Completed",
      authorizedBy: user.email
    };

    const newAuditLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email,
      action: "BATCH_PAYMENT_AUTHORIZED",
      details: `Disbursed and processed batch ${batchId} paying out net ZMW ${totalPendingRoyalties.toLocaleString()} across ${pendingEligibleEarnings.length} rightsholder ledgers.`
    };

    saveState({
      ...state,
      royalties: updatedRoyalties,
      batches: [newBatch, ...state.batches],
      auditLogs: [newAuditLog, ...state.auditLogs]
    });

    setPayoutSuccess(`STATUTORY RUN SUCCESSFUL: ZMW ${totalPendingRoyalties.toLocaleString()} net royalty funds released to commercial bank routers and mobile money corridors!`);
    setTimeout(() => setPayoutSuccess(""), 8000);
  };

  // Nav configurations
  const NAV_ITEMS = [
    { id: "overview", label: "Collections", icon: FileSpreadsheet, count: 0 },
    { id: "distribute", label: "Statutory Run", icon: Banknote, count: pendingEligibleEarnings.length },
    { id: "history", label: "Distribution History", icon: Layers, count: 0 }
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
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Treasury & Finance Registry</p>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#111111]">
                Treasury Payout Desk
              </h1>
            </div>

             <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={
                    activeTab === "overview"
                      ? "Search payout audit logs..."
                      : activeTab === "distribute"
                      ? "Search waitlist by track or artist..."
                      : "Search batches by name or ID..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pastel-mint w-full md:w-64 shadow-sm"
                />
              </div>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pastel-mint flex items-center justify-center font-bold text-[#111111] shadow-sm shrink-0">
                FT
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Left metrics column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    <div className="bg-pastel-yellow rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-550 uppercase tracking-wider leading-tight">Gross Collected</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl sm:text-2xl font-black text-[#111111]">ZMW {totalCollectedGross.toLocaleString()}</span>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                          <ArrowUpRight size={16} className="text-[#111111]" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-pastel-mint rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-550 uppercase tracking-wider leading-tight">Net Disbursed</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl sm:text-2xl font-black text-emerald-800">ZMW {totalDisbursedNet.toLocaleString()}</span>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                          <ArrowUpRight size={16} className="text-emerald-800" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-pastel-lavender rounded-3xl p-5 flex flex-col justify-between h-28 relative group cursor-pointer transition-transform hover:-translate-y-1">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-550 uppercase tracking-wider leading-tight">Society Retained</span>
                      <div className="flex justify-between items-end">
                        <span className="text-xl sm:text-2xl font-black text-purple-850">ZMW {totalOperationalSurplus.toLocaleString()}</span>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                          <ArrowUpRight size={16} className="text-purple-850" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Operational breakdown graphic */}
                  <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#EEEEEB]">
                    <h3 className="text-lg font-bold text-[#111111] mb-1">Operational budget structure</h3>
                    <p className="text-xs font-semibold text-gray-400 mb-6">Society operates on a statutory 15% operations charge deduction.</p>

                    <div className="flex flex-col gap-6">
                      {[
                        { label: 'Rightsholder Net Distributions Pool (85%)', percent: 85, color: 'bg-pastel-mint', value: `ZMW ${(totalCollectedGross * 0.85).toLocaleString()}` },
                        { label: 'Society Overhead and Regional Registrar Costs (15%)', percent: 15, color: 'bg-pastel-pink', value: `ZMW ${(totalCollectedGross * 0.15).toLocaleString()}` },
                      ].map((bar, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-bold mb-2 text-gray-700">
                            <span>{bar.label}</span>
                            <span>{bar.value}</span>
                          </div>
                          <div className="h-3.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                            <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right logs column */}
                <div className="lg:col-span-5 bg-white rounded-[32px] p-6 border border-[#EEEEEB]">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Recent payouts audit check</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 font-semibold">Verified mechanical payments checks.</p>

                  <div className="flex flex-col gap-3">
                    {filteredRecentPayoutLogs.slice(0, 4).map((log) => (
                      <div key={log.id} className="p-4 bg-[#F5F5F3]/50 rounded-2xl border border-gray-100 font-mono text-xs">
                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                          <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                          <span className="text-zamcops-orange uppercase font-sans">Authorized</span>
                        </div>
                        <p className="mt-2 text-[#111111] font-semibold leading-relaxed font-sans">{log.details}</p>
                      </div>
                    ))}
                    {filteredRecentPayoutLogs.length === 0 && (
                      <p className="text-center py-6 text-gray-400 italic text-xs">
                        No matching payout audit logs found.
                      </p>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: DISTRIBUTE PAYMENTS RUN */}
            {activeTab === "distribute" && (
              <motion.div
                key="distribute"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-8"
              >
                
                {/* Authorization Hero box */}
                <div className="bg-pastel-pink rounded-[32px] p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative overflow-hidden text-gray-900 border border-red-200">
                  <div className="absolute right-[-20px] top-[-20px] w-48 h-48 rounded-full bg-black/5 -z-10" />
                  <div>
                    <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#111111]/70 mb-1">Statutory Distribution Run Pending</h2>
                    <h1 className="text-4xl sm:text-6xl font-black text-[#111111] mb-2 font-mono">
                      ZMW {totalPendingRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h1>
                    <p className="text-xs font-bold text-[#111111]/60">
                      Release cycle encompasses {pendingEligibleEarnings.length} awaiting verified creator split sheets in database ledger pool.
                    </p>
                  </div>
                  <button
                    onClick={handleAuthorizeBatchPayout}
                    disabled={pendingEligibleEarnings.length === 0}
                    className="bg-[#111111] text-white px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-md"
                  >
                    Authorize statutory run release
                  </button>
                </div>

                {payoutSuccess && (
                  <div className="bg-pastel-mint text-emerald-950 p-6 rounded-[24px] text-xs font-bold leading-relaxed border border-emerald-400/20 shadow-xs">
                    {payoutSuccess}
                  </div>
                )}

                {/* Waitlist files lists */}
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-2">Rightsholder waitlist ledger files</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6">Split sheets calculations waiting for Treasury release clearances.</p>

                  <div className="flex flex-col gap-3">
                    {filteredPendingEarnings.map((earning) => (
                      <div key={earning.id} className="bg-[#F5F5F3]/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pastel-yellow font-extrabold flex items-center justify-center text-sm rounded-xl shrink-0">
                            {earning.trackTitle.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-[#111111]">{earning.trackTitle}</p>
                            <span className="text-xs font-bold text-gray-500 uppercase">{earning.artistName} • {earning.source}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <p className="text-sm font-black text-[#111111]">ZMW {earning.netAmount.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-slate-800 uppercase px-2.5 py-0.5 rounded-full bg-pastel-pink mt-1 block w-fit ml-auto">
                            Awaiting
                          </span>
                        </div>
                      </div>
                    ))}

                    {filteredPendingEarnings.length === 0 && (
                      <div className="text-center py-12 text-gray-405 italic text-sm font-medium">
                        {searchQuery ? "No waitlist file matches the current query." : "Waitlist is fully cleared! No rightsholder works are currently in pending distribution status."}
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: DISTRIBUTION HISTORY */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-gray-150/40">
                  <h3 className="text-lg font-bold text-[#111111] mb-1">Treasury batch runs history</h3>
                  <p className="text-xs font-semibold text-gray-400 mb-6 font-semibold">Released statutory payments logged with auditing offices.</p>

                  <div className="flex flex-col gap-4">
                    {filteredBatches.map((batch) => (
                      <div key={batch.id} className="p-5 bg-[#F5F5F3]/50 hover:bg-[#F5F5F3] border border-gray-100 rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-pastel-mint rounded-2xl flex items-center justify-center font-extrabold shrink-0">
                            BT
                          </div>
                          <div>
                            <p className="font-extrabold text-base text-gray-900">{batch.period}</p>
                            <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Batch ID: {batch.id} • Filer: {batch.authorizedBy}</p>
                            <span className="mt-2 block text-[10px] text-gray-450 font-mono font-bold leading-none">{new Date(batch.distributedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-right border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 font-mono">
                          <p className="text-[#111111] font-black text-lg">ZMW {batch.totalPaid.toLocaleString()}</p>
                          <span className="inline-block mt-1 bg-pastel-mint text-emerald-800 font-extrabold uppercase px-2.5 py-0.5 rounded-full text-[10px]">
                            {batch.itemCount} ledger fields released
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredBatches.length === 0 && (
                      <p className="text-center py-12 text-gray-400 italic text-sm">
                        {searchQuery ? "No payout batch matches the search criteria." : "No treasury batch runs history found."}
                      </p>
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

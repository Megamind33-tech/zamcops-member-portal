"use client";

import React, { useState } from "react";
import { User, dbEngine } from "@/lib/db";
import { Shield, Music, Activity, Building2, UserCheck, AlertTriangle, ArrowUpRight } from "lucide-react";

interface PublicPortalProps {
  onLoginSuccess: (user: User) => void;
}

export default function PublicPortal({ onLoginSuccess }: PublicPortalProps) {
  const [activeSegment, setActiveSegment] = useState<"welcome" | "signin" | "signup">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"Artist" | "Label" | "Publisher">("Artist");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    // Check credentials against our dbEngine active dataset
    const users = dbEngine.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!user) {
      setErrorMsg("Invalid credentials. Please verify your email or use Sandbox Quick Access.");
      return;
    }
    
    if (user.passwordHash !== password) {
      setErrorMsg("Invalid password. Please try again.");
      return;
    }

    setSuccessMsg("Welcome to ZAMCOPS Portal. Loading profile...");
    setTimeout(() => {
      onLoginSuccess(user);
    }, 800);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !phone || !password) {
      setErrorMsg("All required fields must be completed.");
      return;
    }

    try {
      const newUser = dbEngine.registerUser(email, phone, password, role);
      setSuccessMsg(`Account successfully generated for ${email}! Redirecting to login...`);
      setTimeout(() => {
        setActiveSegment("signin");
        setEmail(newUser.email);
        setPassword("");
        setSuccessMsg("");
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || "An account with this email already exists.");
    }
  };

  // Quick Sandbox Credentials
  const triggerSandboxLogin = (emailStr: string, passStr: string) => {
    setErrorMsg("");
    const users = dbEngine.getUsers();
    const matchedUser = users.find(u => u.email === emailStr);
    if (matchedUser) {
      setSuccessMsg(`Logging in as ${matchedUser.role} (${matchedUser.email})...`);
      setTimeout(() => {
        onLoginSuccess(matchedUser);
      }, 500);
    }
  };

  return (
    <div id="zamcops-public-portal" className="min-h-screen bg-zinc-50 flex flex-col justify-between">
      {/* Official Government/Agency Header */}
      <header className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F58220] flex items-center justify-center rounded">
              <span className="text-white text-xl font-extrabold tracking-wider font-sans">ZCO</span>
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-zinc-900 leading-none">
                ZAMCOPS
              </h1>
              <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mt-1">
                Zambian Music Copyright Society
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSegment("signin")}
              className="px-4 py-2 text-zinc-700 font-sans font-medium text-xs hover:text-zinc-950 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveSegment("signup")}
              className="bg-[#F58220] hover:bg-[#e0751b] text-white px-4 py-2 rounded text-xs font-sans font-medium transition-colors"
            >
              Apply / Register
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded shadow-sm overflow-hidden flex flex-col md:flex-row">
          
          {/* Welcome Area left section */}
          <div className="flex-1 p-8 bg-zinc-50/50 border-b md:border-b-0 md:border-r border-zinc-200">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-1.5 bg-orange-50 text-[#F58220] border border-orange-100 rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider mb-6">
                <Shield className="w-3 h-3" />
                Statutory Copyright Regulator
              </div>
              <h2 className="font-sans font-extrabold text-2xl tracking-tight text-zinc-900 leading-tight">
                Zambian Intellectual Property & Royalties System
              </h2>
              <p className="text-zinc-600 text-xs mt-4 leading-relaxed font-sans">
                ZAMCOPS operates under the Zambian copyright law to collect broadcast public performance license fees and distribute them as royalty assets back to musicians, authors, composers, and publishers across Zambia.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center text-[#F58220] shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-zinc-900">Official Membership Registration</h4>
                    <p className="font-sans text-[11px] text-zinc-500">Apply online, upload identity files (NRC/Passport), and receive your unique member number.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center text-[#F58220] shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-zinc-900">Works Declaration & SPLIT Checks</h4>
                    <p className="font-sans text-[11px] text-zinc-500">Register tracks, list contributors, configure transparent ownership splits, and export certificates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center text-[#F58220] shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-zinc-900">Finance & Royalty Distributing</h4>
                    <p className="font-sans text-[11px] text-zinc-500">Track airplay logs, view statements, download financial files, and distribute payment batches directly.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-zinc-200 pt-6">
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono text-[10px] uppercase tracking-wider">ZAMCOPS Core Engine Online</span>
                </div>
                <p className="font-sans text-[10px] text-zinc-400 mt-1">Official Licensing Portal • Government of Zambia Act No. 24 of 1994</p>
              </div>
            </div>
          </div>

          {/* Form Area / Segment Controller Right Section */}
          <div className="flex-1 p-8 flex flex-col justify-center">
            {activeSegment === "welcome" && (
              <div className="space-y-6">
                <h3 className="font-sans font-bold text-lg text-zinc-900">Access the Portal</h3>
                <p className="font-sans text-xs text-zinc-500">Select one of the actions below to register your catalogs or manage existing memberships.</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setActiveSegment("signin")}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer group"
                  >
                    <div>
                      <span className="font-sans font-bold text-xs text-zinc-950 block">Registered Portal Log In</span>
                      <span className="font-sans text-[11px] text-zinc-400">Artists, Publishers, Admins & Finance Officers</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#F58220] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveSegment("signup")}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer group"
                  >
                    <div>
                      <span className="font-sans font-bold text-xs text-[#F58220] block">New Membership Application</span>
                      <span className="font-sans text-[11px] text-zinc-400">Apply as Independent Artist, Label, or Publisher</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#F58220] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded p-4 text-center mt-6">
                  <span className="font-mono text-[11px] text-zinc-500 block font-semibold mb-1">ZAMCOPS Information Desk</span>
                  <span className="font-sans text-[10px] text-zinc-400">Members pay a statutory registration fee of K100 upon application. For enquiries, call the support team.</span>
                </div>
              </div>
            )}

            {/* SIGN IN FORM */}
            {activeSegment === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="font-sans font-bold text-base text-zinc-900">Sign In to Dashboard</h3>
                  <button
                    type="button"
                    onClick={() => setActiveSegment("welcome")}
                    className="font-mono text-[10px] text-zinc-400 hover:text-zinc-800 uppercase"
                  >
                    Back to Info
                  </button>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] p-2.5 rounded font-sans">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] p-2.5 rounded font-sans">
                    {successMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-bold text-zinc-700 block" htmlFor="signin-email">Official Email Address</label>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    placeholder="name@zamcops.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-zinc-200 rounded px-3 py-1.5 focus:border-[#F58220] outline-none text-xs font-sans text-zinc-850"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-[11px] font-bold text-zinc-700 block" htmlFor="signin-password">Security Password</label>
                    <button
                      type="button"
                      onClick={() => alert("Prototype recovery instructions: Contact ZAMCOPS technical administrator or log in using Sandbox console below.")}
                      className="font-sans text-[10px] text-[#F58220] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-zinc-200 rounded px-3 py-1.5 focus:border-[#F58220] outline-none text-xs font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#F58220] hover:bg-[#e0751b] text-white py-2 rounded text-xs font-sans font-bold transition-colors shadow-sm uppercase cursor-pointer"
                >
                  Verify and Log In
                </button>

                <p className="font-sans text-[11px] text-zinc-500 text-center mt-3">
                  Need an account?{" "}
                  <button type="button" onClick={() => setActiveSegment("signup")} className="text-[#F58220] font-bold hover:underline">
                    Apply here
                  </button>
                </p>
              </form>
            )}

            {/* SIGN UP FORM */}
            {activeSegment === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="font-sans font-bold text-base text-zinc-900">New Membership Register</h3>
                  <button
                    type="button"
                    onClick={() => setActiveSegment("welcome")}
                    className="font-mono text-[10px] text-zinc-400 hover:text-zinc-800 uppercase"
                  >
                    Back to Info
                  </button>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] p-2.5 rounded font-sans">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] p-2.5 rounded font-sans">
                    {successMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-bold text-zinc-700 block">Select Registration Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Artist", "Label", "Publisher"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-1.5 px-2 border text-[11px] font-sans font-medium rounded transition-all text-center ${
                          role === r
                            ? "border-[#F58220] bg-orange-50/50 text-[#F58220]"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-bold text-zinc-700 block" htmlFor="signup-email">Active Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="you@domain.co.zm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-zinc-200 rounded px-3 py-1.5 focus:border-[#F58220] outline-none text-xs font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-bold text-zinc-700 block" htmlFor="signup-phone">Zambian Mobile Phone</label>
                    <input
                      id="signup-phone"
                      type="tel"
                      required
                      placeholder="+26097XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-zinc-200 rounded px-3 py-1.5 focus:border-[#F58220] outline-none text-xs font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-bold text-zinc-700 block" htmlFor="signup-password">Choose Password</label>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-zinc-200 rounded px-3 py-1.5 focus:border-[#F58220] outline-none text-xs font-sans"
                    />
                  </div>
                </div>

                <div className="bg-zinc-50 rounded p-3 text-[10px] text-zinc-400 font-sans border border-zinc-200 leading-normal">
                  By clicking submit, you acknowledge your intent to register as a rights holder under ZAMCOPS. All uploaded claims statement assets represent true declarations of ownership splits.
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#F58220] hover:bg-[#e0751b] text-white py-2 rounded text-xs font-sans font-bold transition-colors shadow-sm uppercase cursor-pointer"
                >
                  Create Secure Profile
                </button>

                <p className="font-sans text-[11px] text-zinc-500 text-center mt-3">
                  Have an account?{" "}
                  <button type="button" onClick={() => setActiveSegment("signin")} className="text-[#F58220] font-bold hover:underline">
                    Log in here
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Sandbox Access Console */}
        <div className="w-full max-w-4xl bg-orange-50/40 border border-[#F58220]/20 rounded p-6 shadow-sm mt-6">
          <div className="flex items-center gap-2 text-[#F58220] font-sans font-bold text-xs uppercase tracking-wider mb-3">
            <Building2 className="w-4 h-4 text-[#F58220]" />
            ZAMCOPS Authority - Testing Console Sandbox
          </div>
          <p className="font-sans text-[11px] text-zinc-600 mb-4">
            Below is the high-integrity authority login board designed to skip manual credential entries. Tap any test role to immediately enter each respective portal setup in active memory.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            <button
              onClick={() => triggerSandboxLogin("artist@zamcops.org", "password")}
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Chef Mwansa
              </div>
              <span className="font-mono text-[9px] text-zinc-400 block mt-0.5">Approved Artist (Member ZCP-2025-0045)</span>
            </button>

            <button
              onClick={() => triggerSandboxLogin("pending@zamcops.org", "password")}
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Sister Chileshe
              </div>
              <span className="font-mono text-[9px] text-zinc-400 block mt-0.5">Pending Application (Reviewable)</span>
            </button>

            <button
              onClick={() => triggerSandboxLogin("info@zedbeats.co.zm", "password")}
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                ZedBeats Record
              </div>
              <span className="font-mono text-[9px] text-zinc-400 block mt-0.5 font-sans">Label Portal (Multi-Artist)</span>
            </button>

            <button
              onClick={() => triggerSandboxLogin("admin@zamcops.org", "admin123")}
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Admin Staff
              </div>
              <span className="font-mono text-[9px] text-zinc-400 block mt-0.5">Approve applications & songs</span>
            </button>

            <button
              onClick={() => triggerSandboxLogin("finance@zamcops.org", "finance123")}
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                Finance Audit
              </div>
              <span className="font-mono text-[9px] text-zinc-400 block mt-0.5">Create batched payments & reports</span>
            </button>
          </div>
        </div>
      </main>

      {/* Institutional Legal Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-[11px] text-zinc-500">
          <div>
            &copy; 2026 ZAMCOPS — Zambian Music Copyright Protection Society. All rights reserved. Registered Society #129.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-800 transition-colors">Zambian PACRA Regulated Org</span>
            <span>•</span>
            <span className="hover:text-zinc-800 transition-colors">Statutory Copyright Unit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Send, 
  Info, 
  History,
  AlertTriangle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Plus,
  X,
  Search,
  CheckCircle,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ClassificationResult {
  classification: "spam" | "ham";
  confidence: number;
  analysis: string;
  indicators: string[];
}

interface HistoryItem extends ClassificationResult {
  message: string;
  timestamp: number;
}

export default function App() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"none" | "accurate" | "incorrect">("none");
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, message, type }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchRules();
    const onboarded = localStorage.getItem("sentinel_onboarded");
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("sentinel_onboarded", "true");
    setShowOnboarding(false);
  };

  const steps = [
    {
      title: "Neural Scanning",
      description: "Welcome to SENTINEL SMS. Use this terminal to decrypt and analyze suspicious messages for potential phishing or spam threats.",
      icon: <ShieldAlert className="w-12 h-12 text-emerald-500" />,
      target: "Input Terminal"
    },
    {
      title: "The Watchlist",
      description: "Add specific keywords or phrases to the Watchlist Rules. Our local engine prioritizes these markers during classification.",
      icon: <Search className="w-12 h-12 text-emerald-500" />,
      target: "Watchlist Rules"
    },
    {
      title: "Real-time Feedback",
      description: "Submit classification feedback to improve the local heuristic engine. Your data stays private and local.",
      icon: <ThumbsUp className="w-12 h-12 text-emerald-500" />,
      target: "Diagnostic Analysis"
    }
  ];

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setCustomRules(data.rules);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) return;
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule: newRule.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      const data = await res.json();
      setCustomRules(data.rules);
      setNewRule("");
      notify("Neural node pattern added to watchlist.", "success");
    } catch (err) {
      console.error("Failed to add rule:", err);
      notify("Failed to update watchlist buffer.", "error");
    }
  };

  const removeRule = async (rule: string) => {
    try {
      const res = await fetch("/api/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule }),
      });
      if (!res.ok) throw new Error("Failed to remove rule");
      const data = await res.json();
      setCustomRules(data.rules);
      notify("Rule purged from watchlist.", "info");
    } catch (err) {
      console.error("Failed to remove rule:", err);
      notify("Buffer purge execution failed.", "error");
    }
  };

  const classifyMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setFeedbackStatus("none");
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || "Classification failed.";
        throw new Error(msg);
      }

      const data: ClassificationResult = await response.json();
      setResult(data);
      notify(`Classification complete: ${data.classification.toUpperCase()}`, data.classification === "spam" ? "info" : "success");
      
      const newHistoryItem: HistoryItem = {
        ...data,
        message,
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isCorrect: boolean) => {
    if (!result) return;
    setFeedbackStatus(isCorrect ? "accurate" : "incorrect");
    notify("Feedback integrated into local node.", "info");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          classification: result.classification,
          isCorrect,
          timestamp: Date.now()
        }),
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const examples = [
    { text: "Your card ending in 4059 has been suspended. Log in here to verify: https://sec-api-verify.com/login", label: "Example: Phishing" },
    { text: "URGENT: Package delivery for user 3829 is held at our warehouse. Action required to avoid return: http://bit.ly/ship-9102", label: "Example: Delivery" },
    { text: "Hey! Just checking if you received my email about the project update. Let me know.", label: "Example: Normal" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-emerald-500/30 overflow-x-hidden">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[200] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]" />
      
      {/* Custom Notification Center */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 min-w-[280px] ${
                n.type === "success" 
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                  : n.type === "error" 
                  ? "bg-red-950/20 border-red-500/30 text-red-400" 
                  : "bg-blue-950/20 border-blue-500/30 text-blue-400"
              }`}
            >
              <div className="shrink-0">
                {n.type === "success" ? <CheckCircle size={18} /> : n.type === "error" ? <AlertTriangle size={18} /> : <Bell size={18} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System Notification</span>
                <span className="text-[11px] font-mono leading-tight">{n.message}</span>
              </div>
              <motion.div 
                className={`absolute bottom-0 left-0 h-[2px] ${
                  n.type === "success" ? "bg-emerald-500" : n.type === "error" ? "bg-red-500" : "bg-blue-500"
                }`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-[#0b1121] border border-emerald-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-900">
                <motion.div 
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>

              <div className="flex flex-col items-center text-center gap-6 mt-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  {steps[currentStep].icon}
                </div>
                
                <div>
                  <h3 className="text-2xl font-extrabold italic uppercase tracking-tighter text-emerald-500 mb-2 font-display">
                    {steps[currentStep].title}
                  </h3>
                  <p className="text-sm text-slate-400 font-mono leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </div>

                <div className="w-full flex gap-3">
                  {currentStep > 0 && (
                    <button 
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-emerald-500 transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (currentStep < steps.length - 1) {
                        setCurrentStep(prev => prev + 1);
                      } else {
                        completeOnboarding();
                      }
                    }}
                    className="flex-[2] py-3 px-4 bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500 transition-all"
                  >
                    {currentStep < steps.length - 1 ? "Next Protocol" : "Initialize System"}
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                        i === currentStep ? "bg-emerald-500 w-4" : "bg-slate-800"
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-emerald-500/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-2 bg-emerald-500 rounded-xl blur-lg opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-lg scale-110 rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-emerald-500/10 rounded-lg -scale-90 -rotate-12 group-hover:-rotate-90 transition-transform duration-700"></div>
                <div className="relative w-12 h-12 bg-slate-900 border-2 border-emerald-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <ShieldAlert className="text-emerald-500 w-7 h-7" />
                  <motion.div 
                    className="absolute inset-0 border-2 border-emerald-400 rounded-xl"
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center">
                <h1 className="text-3xl font-extrabold italic tracking-tighter font-display bg-gradient-to-r from-white via-emerald-400 to-white bg-[length:200%_auto] animate-[shimmer_4s_infinite] bg-clip-text text-transparent text-glow-white">
                  SENTINEL
                </h1>
                <span className="ml-1 text-3xl font-extrabold italic tracking-tighter font-display text-emerald-500 text-glow-emerald">SMS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/60 font-mono font-bold">Neural Security Node</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-[9px] font-mono text-emerald-500/40">S-NODE-01</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]"></div>
              <span className="text-[11px] font-mono text-emerald-500/80 uppercase">System: Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Console */}
          <div className="lg:col-span-8 space-y-8">
            <section className="relative p-[1px] bg-gradient-to-br from-emerald-500/40 via-emerald-500/5 to-transparent rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)]">
              <div className="bg-[#0b1121] rounded-[15px] p-6 border border-emerald-500/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Input Terminal
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Wait_for_input...</span>
                </div>
                
                <div className="relative group">
                  <textarea
                    className="w-full h-48 px-6 py-5 bg-[#cdeddf] border border-emerald-500/10 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] focus:border-emerald-500/50 transition-all text-slate-900 placeholder:text-slate-500 outline-none font-mono text-sm leading-relaxed"
                    placeholder="Enter message to scan for threats..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <ShieldCheck className="w-12 h-12 text-emerald-500" />
                  </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setMessage(ex.text)}
                        className="text-[10px] px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all uppercase tracking-wider font-mono"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={loading || !message.trim()}
                    onClick={classifyMessage}
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {loading ? "Decrypting..." : "Scan Buffer"}
                  </button>
                </div>
              </div>
            </section>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-mono"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  ERROR: {error}
                </motion.div>
              )}

              {result && (
                <motion.div
                  key={`${result.classification}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className={`relative overflow-hidden rounded-2xl border ${
                    result.classification === "spam" 
                      ? "bg-red-950/10 border-red-500/20" 
                      : "bg-emerald-950/10 border-emerald-500/20"
                  } p-8`}>
                    {/* Animated Scanning Line */}
                    <motion.div 
                      className={`absolute top-0 left-0 w-full h-[2px] ${
                        result.classification === "spam" ? "bg-red-500" : "bg-emerald-500"
                      } blur-sm z-10`}
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center border ${
                            result.classification === "spam" ? "border-red-500/50 bg-red-500/10 text-red-500" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                          }`}>
                            {result.classification === "spam" ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
                          </div>
                          <div>
                            <p className={`text-[11px] font-mono uppercase tracking-[0.3em] font-bold ${
                              result.classification === "spam" ? "text-red-500" : "text-emerald-500"
                            }`}>
                              Classification Result
                            </p>
                            <h3 className="text-3xl font-black italic uppercase tracking-tight font-display">
                              {result.classification === "spam" ? "Buffer_Insecure" : "Buffer_Cleared"}
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Info className="w-3 h-3 text-emerald-500" />
                            Diagnostic Analysis
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-mono">
                            {result.analysis}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata Indicators</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.indicators.map((tag, i) => (
                              <span 
                                key={i} 
                                className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                                  result.classification === "spam" 
                                    ? "bg-red-500/5 text-red-400 border-red-500/20" 
                                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                &gt; {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="md:w-56 shrink-0 flex flex-col gap-4">
                        <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-xl text-center space-y-2">
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Confidence</p>
                          <div className="flex items-baseline justify-center gap-1 font-mono">
                            <span className={`text-5xl font-black ${
                              result.classification === "spam" ? "text-red-500" : "text-emerald-500 text-glow"
                            }`}>{(result.confidence * 100).toFixed(0)}</span>
                            <span className="text-xl font-bold text-slate-600">%</span>
                          </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                          <p className="text-[9px] font-mono text-center text-slate-500 uppercase">Correct Output?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleFeedback(true)}
                              className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-all ${
                                feedbackStatus === "accurate" ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-emerald-500 hover:text-emerald-500"
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFeedback(false)}
                              className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-all ${
                                feedbackStatus === "incorrect" ? "bg-red-500 text-slate-950 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-red-500 hover:text-red-500"
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side Panels */}
          <div className="lg:col-span-4 space-y-8 uppercase font-mono">
            
            {/* Rules Module */}
            <section className="bg-slate-950 border border-emerald-500/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-emerald-500/5 px-6 py-4 border-b border-emerald-500/10 flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[11px] font-bold tracking-widest text-slate-300">WATCHLIST_RULES</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRule()}
                    placeholder="TAG_PATTERN..."
                    className="flex-1 px-3 py-2 text-[10px] bg-[#baedc0] border border-slate-800 rounded-md focus:border-emerald-500/50 outline-none text-slate-950 placeholder:text-slate-600 font-bold"
                  />
                  <button
                    onClick={addRule}
                    className="p-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-md hover:bg-emerald-600 hover:text-slate-950 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {customRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-md group"
                    >
                      <span className="text-[10px] text-slate-400">{rule}</span>
                      <button
                        onClick={() => removeRule(rule)}
                        className="text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customRules.length === 0 && <p className="text-[10px] text-slate-600 italic">No custom nodes defined.</p>}
                </div>
              </div>
            </section>

            {/* History Node */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                <History className="w-3 h-3" />
                CACHE_LOGS [10]
              </h3>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl text-slate-700">
                    <p className="text-[10px]">Zero_Entries_Found</p>
                  </div>
                ) : (
                  history.map((item, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i}
                      className="p-4 bg-slate-950 border border-slate-900 rounded-xl hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-black tracking-widest py-0.5 px-2 rounded-sm ${
                          item.classification === "spam" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {item.classification === "spam" ? "THREAT" : "SAFE"}
                        </span>
                        <span className="text-[8px] text-slate-600 font-mono">#{Date.now().toString(16).slice(-4)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 italic font-mono lowercase">
                        &gt; {item.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </section>

            {/* Methodology Node */}
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-[11px] font-bold text-emerald-500 tracking-widest">LAYER_DEFAULTS</h3>
              <ul className="space-y-3">
                {[
                  "PATTERN_MATCH [TF-IDF]",
                  "URL_ENTROPY_ALGO",
                  "SEMANTIC_VIBE_CHECK",
                  "METADATA_SENSITIVITY",
                  "PHISH_HEX_ANALYSIS"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-[10px] text-slate-400">
                    <ChevronRight className="w-3 h-3 text-emerald-500 opacity-50" />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          </div>

        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-16 text-center space-y-4 relative z-10">
        <div className="flex items-center justify-center gap-4 text-emerald-500/20">
          <div className="h-px bg-current flex-1"></div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-current"></div>)}
          </div>
          <div className="h-px bg-current flex-1"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.4em] font-mono font-bold">
            Sentinel Node v4.0.2 // Core SMS Node
          </p>
          <p className="text-[10px] text-slate-700 tracking-wider font-mono">
            &copy; 1999-2026 CYBER_DEFENSE_LABS. ALL_SYSTEMS_MONITORED.
          </p>
        </div>
      </footer>
    </div>
  );
}

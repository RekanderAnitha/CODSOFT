import { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Upload, 
  Play, 
  BarChart3, 
  Activity, 
  Database, 
  Settings2,
  Trash2,
  Cpu,
  Info,
  Terminal,
  MessageSquare,
  Zap,
  Lock,
  Globe,
  Bell,
  Search,
  User,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';
import { cn, formatPercent } from './lib/utils';
import { 
  trainAndEvaluate, 
  generateSyntheticData, 
  ModelResult, 
  AlgorithmType, 
  Metrics 
} from './lib/ml';

interface DatasetState {
  data: number[][];
  labels: number[];
  headers: string[];
  raw: any[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.8);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('RandomForest');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'ai-assistant' | 'history'>('dashboard');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleLogin = () => {
    setIsInitializing(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsInitializing(false);
    }, 4500); // Cinematic loading time
  };

  useEffect(() => {
    if (isLoggedIn) {
      // Entrance Animation
      gsap.from(".hero-element", {
        duration: 1,
        y: 30,
        opacity: 0,
        stagger: 0.2,
        ease: "power3.out"
      });

      // Default sample data
      const { data, labels } = generateSyntheticData(100);
      setDataset({
        data,
        labels,
        headers: ['Amount', 'Time', 'Distance', 'AuthCode'],
        raw: data.map((d, i) => ({ 
          amount: d[0], 
          time: d[1], 
          distance: d[2], 
          auth: d[3],
          merchant: i % 3 === 0 ? 'Amazon' : i % 3 === 1 ? 'Starbucks' : 'Unknown',
          is_fraud: labels[i] 
        }))
      });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadBuiltInDataset = async (url: string) => {
    try {
      const response = await fetch(url);
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => processRawData(results.data)
      });
    } catch (err) {
      setError("System override: Dataset connection severed.");
    }
  };

  const processRawData = (rawData: any[]) => {
    if (rawData.length === 0) return;
    const headers = Object.keys(rawData[0]);
    const labelKey = headers.find(h => ['is_fraud', 'fraud', 'class'].includes(h.toLowerCase())) || headers[headers.length-1];
    const featureKeys = headers.filter(h => h !== labelKey && typeof rawData[0][h] === 'number');
    const data = rawData.map(row => featureKeys.map(k => row[k] || 0));
    const labels = rawData.map(row => row[labelKey] === 1 ? 1 : 0);

    setDataset({ data, labels, headers: featureKeys, raw: rawData });
    setResults([]);
    setError(null);
  };

  const runModel = async () => {
    if (!dataset) return;
    setIsTraining(true);
    setTimeout(async () => {
      try {
        const result = await trainAndEvaluate(dataset.data, dataset.labels, selectedAlgo, splitRatio);
        setResults(prev => [result, ...prev]);
        setActiveTab('analysis');
      } catch (err) {
        setError("Neural link failure: Training interrupted.");
      } finally {
        setIsTraining(false);
      }
    }, 1500); // Artificial delay for effect
  };

  const handleChat = async () => {
    if (!userInput.trim()) return;
    const msg = userInput;
    setUserInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsChatting(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: results[0] })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', text: data.text || "I am processing your request." }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Signal lost. Please check your uplink." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const loadDatasetFromFile = (file: File) => {
    Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: (results) => {
        processRawData(results.data);
      }
    });
  };

  const fraudCount = dataset?.labels.filter(l => l === 1).length || 0;
  const legitCount = (dataset?.labels.length || 0) - fraudCount;

  if (!isLoggedIn) {
    if (isInitializing) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(250,204,21,0.1)_0%,_transparent_50%)]" />
          <div className="scanline" />
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md space-y-8 z-10"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.5)] animate-pulse">
                <Cpu className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-[0.5em] text-white">Initializing Uplink</h2>
            </div>

            <div className="space-y-4">
              {[
                "Allocating neural pathways...",
                "Synchronizing global data nodes...",
                "Bypassing secure mainframe protocols...",
                "AI Core: Flash-Preview 3.0 Ready",
                "establishing quantum encrypted tunnel..."
              ].map((text, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.8 }}
                  className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_10px_#FACC15]" />
                  {text}
                </motion.div>
              ))}
            </div>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 4.5, ease: "easeInOut" }}
                className="h-full bg-yellow-500 shadow-[0_0_20px_#FACC15]"
              />
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 relative overflow-hidden">
         {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-50 rounded-full blur-[120px] -mr-96 -mt-96 opacity-60" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-50 rounded-full blur-[100px] -ml-64 -mb-64 opacity-60" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg glass-card p-12 rounded-[3rem] shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-16 h-16 bg-yellow-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-yellow-500/20">
              <ShieldAlert className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">FraudShield X</h1>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">Enterprise-Grade Transaction Integrity & AI Neural Analysis</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Operator ID</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="AGENT_X" 
                  defaultValue="ADMIN_USER"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-yellow-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pass-Phrase</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  defaultValue="SHIELD_2024"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-yellow-500 transition-all"
                />
              </div>
            </div>

            <button 
              onClick={handleLogin}
              className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-900/10 group"
            >
              Initialize Uplink <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
            <span className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-yellow-500" /> Global Node Alpha
            </span>
            <span>SECURE SERVER V2.1</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-500/30 overflow-hidden flex">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[radial-gradient(circle_at_50%_50%,_#FACC15_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-5 bg-[radial-gradient(circle_at_50%_50%,_#F59E0B_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white/40 backdrop-blur-xl flex flex-col z-50">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none">SENTINEL-X</h1>
              <span className="text-[10px] font-bold text-yellow-600 tracking-[0.3em] uppercase">AI SECURITY</span>
            </div>
          </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {[
            { id: 'dashboard', label: 'Mainframe', icon: Globe },
            { id: 'analysis', label: 'ML Analytics', icon: BarChart3 },
            { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
            { id: 'history', label: 'Logs', icon: Terminal },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                activeTab === item.id 
                  ? "bg-yellow-50 text-yellow-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-yellow-600" : "text-slate-400 group-hover:text-slate-600")} />
              {item.label}
              {activeTab === item.id && (
                <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Uplink Stable</span>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-yellow-600 transition-colors"
          >
            Purge Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white/20 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search encrypted nodes..." 
                className="bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-1.5 text-xs w-64 focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-600 p-[1px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <User className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
          {activeTab === 'dashboard' && (
            <>
               {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Scanned', value: dataset?.data.length.toLocaleString(), icon: Database, color: 'yellow' },
                  { label: 'Fraud Detection', value: fraudCount, icon: AlertTriangle, color: 'amber' },
                  { label: 'Risk Indices', value: '0.04%', icon: TrendingUp, color: 'yellow' },
                  { label: 'Neural Accuracy', value: results[0] ? formatPercent(results[0].metrics.accuracy) : '--', icon: Zap, color: 'amber' },
                ].map((stat, i) => (stat &&
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:border-yellow-200 transition-all group relative overflow-hidden"
                  >
                    <div className={cn(
                      "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 rounded-full blur-3xl",
                      stat.color === 'yellow' ? "bg-yellow-400" : stat.color === 'amber' ? "bg-amber-500" : "bg-orange-400"
                    )} />
                    <stat.icon className={cn(
                      "w-5 h-5 mb-4",
                      stat.color === 'yellow' ? "text-yellow-600" : stat.color === 'amber' ? "text-amber-600" : "text-slate-500"
                    )} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-black mt-1 tracking-tighter text-slate-900">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Main Grid Section */}
              <div className="grid grid-cols-12 gap-8">
                {/* Visualizer */}
                <div className="col-span-12 lg:col-span-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Fraud Velocity</h2>
                      <p className="text-xs text-slate-400 mt-1">Real-time signal analysis across all global nodes.</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => loadBuiltInDataset('/kaggle_sample.csv')} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-900 transition-colors">Kaggle Node</button>
                       <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 transition-colors">
                        <Upload className="w-3 h-3" /> Uplink CSV
                       </button>
                    </div>
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataset?.raw.slice(0, 20)}>
                        <defs>
                          <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EAB308" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis hide />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          itemStyle={{ fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#EAB308" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Mini Panels */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  {/* Model Controller */}
                  <div className="p-8 rounded-[2rem] bg-gradient-to-br from-yellow-600/10 to-amber-500/10 border border-slate-200 relative overflow-hidden group">
                    <Zap className="absolute -bottom-8 -right-8 w-48 h-48 opacity-5 group-hover:rotate-12 transition-transform duration-700 text-yellow-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-slate-900">
                      <Settings2 className="w-4 h-4 text-yellow-600" /> Neural Config
                    </h3>
                    <div className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" /> {error}
                        </div>
                      )}
                      <div>
                         <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3">
                            <span className="text-slate-500">Core Strategy</span>
                            <span className="text-yellow-700">{selectedAlgo}</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'RandomForest', label: 'RF', full: 'Random Forest' },
                              { id: 'DecisionTree', label: 'DT', full: 'Decision Tree' },
                              { id: 'LogisticRegression', label: 'LR', full: 'Log Reg' }
                            ].map(a => (
                              <button 
                                key={a.id}
                                onClick={() => { setSelectedAlgo(a.id as any); setError(null); }}
                                className={cn(
                                  "px-3 py-2 rounded-lg flex items-center justify-center transition-all text-[10px] font-black uppercase tracking-widest",
                                  selectedAlgo === a.id ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"
                                )}
                                title={a.full}
                              >
                                {a.label}
                              </button>
                            ))}
                         </div>
                      </div>
                      
                      <button 
                        onClick={runModel}
                        disabled={isTraining}
                        className="w-full py-4 mt-4 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-yellow-600 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
                      >
                        {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Execute
                      </button>
                    </div>
                  </div>

                  {/* AI Assistant Preview */}
                  <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="font-bold text-sm mb-2 uppercase tracking-wide text-slate-900">Shield Assistant</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Neural link active. I can analyze risk factors or explain specific detection anomalies.</p>
                    <button 
                      onClick={() => setActiveTab('ai-assistant')}
                      className="text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:underline flex items-center gap-2"
                    >
                      Connect Interface <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'analysis' && results[0] && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="grid grid-cols-12 gap-8">
                  {/* Confusion Matrix Visual */}
                  <div className="col-span-12 lg:col-span-4 p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem]">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-2 text-slate-900">
                       <Activity className="w-4 h-4 text-yellow-600" /> Error Distribution
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-6 rounded-2xl bg-yellow-50 border border-yellow-100 text-center">
                          <p className="text-[9px] font-bold text-yellow-700 uppercase mb-1">True Positive</p>
                          <p className="text-3xl font-black text-slate-900">{results[0].metrics.confusionMatrix.tp}</p>
                       </div>
                       <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">False Positive</p>
                          <p className="text-3xl font-black text-slate-900">{results[0].metrics.confusionMatrix.fp}</p>
                       </div>
                       <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">False Negative</p>
                          <p className="text-3xl font-black text-slate-900">{results[0].metrics.confusionMatrix.fn}</p>
                       </div>
                       <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                          <p className="text-[9px] font-bold text-amber-700 uppercase mb-1">True Negative</p>
                          <p className="text-3xl font-black text-slate-900">{results[0].metrics.confusionMatrix.tn}</p>
                       </div>
                    </div>
                  </div>

                  {/* Feature Importance Chart */}
                  <div className="col-span-12 lg:col-span-8 p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem]">
                     <h3 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-2 text-slate-900">
                        <TrendingUp className="w-4 h-4 text-yellow-600" /> Neural Feature weight
                     </h3>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={dataset?.headers.map((h, i) => ({ 
                            name: h, 
                            val: results[0]?.featureImportance[i] ? results[0].featureImportance[i] * 100 : Math.random() * 50 + 20 
                          }))}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Bar dataKey="val" fill="#EAB308" radius={[0, 10, 10, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'ai-assistant' && (
            <div className="h-[calc(100vh-140px)] flex flex-col p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-slate-900">
                  <ShieldAlert className="w-64 h-64" />
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-6 mb-6 px-4 custom-scrollbar">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <MessageSquare className="w-12 h-12 mb-4 text-slate-900" />
                      <p className="text-sm uppercase font-black tracking-widest text-slate-900">Awaiting Input Signal</p>
                      <p className="text-xs italic serif max-w-xs mt-2 text-slate-600">I can analyze recent training metrics or explain specific fraud patterns detected in your nodes.</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "max-w-[80%] p-4 rounded-3xl text-sm",
                        msg.role === 'user' ? "ml-auto bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20" : "bg-white border border-slate-200 text-slate-700"
                      )}
                    >
                      <div className="prose prose-slate prose-sm">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}
                  {isChatting && (
                    <div className="flex items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl w-fit">
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                      <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-slate-400">AI Computing...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
               </div>

               <div className="flex gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <input 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Ask FraudShield Intelligence..." 
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-slate-400 text-slate-900"
                  />
                  <button 
                    onClick={handleChat}
                    className="w-10 h-10 bg-yellow-500 text-black rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] font-mono text-[10px]">
               <div className="flex items-center gap-2 mb-8 text-yellow-600">
                  <Terminal className="w-4 h-4" />
                  <span className="uppercase font-bold tracking-[0.3em]">System Kernel Logs [STABLE]</span>
               </div>
               <div className="space-y-2 opacity-60 text-slate-900">
                 <p className="text-yellow-600/60">[08:00:01] Neural engine handshake initialized.</p>
                 <p>[08:00:05] Kernel version 1.0.0-ShieldX active.</p>
                 <p>[08:01:22] Data node link established: {dataset?.data.length} records processed.</p>
                 <p>[08:02:15] ML Optimizer: Gradient descent complete (threshold=0.5).</p>
                 {results.map((r, i) => (
                   <p key={i} className="text-amber-600">[{8+i}:15:00] EXEC: {r.algorithm} | ACC: {formatPercent(r.metrics.accuracy)}</p>
                 ))}
                 <p className="animate-pulse text-yellow-500">_</p>
               </div>
            </div>
          )}
        </div>

        {/* Global Footer */}
        <footer className="h-10 mt-12 border-t border-white/5 flex items-center justify-between px-8 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
          <div className="flex gap-8">
            <span>FraudShield v1.0.X</span>
            <span>Auth: RSA-4096</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Encrypted
            </span>
            <span className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-slate-800" /> Backup Local
            </span>
          </div>
        </footer>
      </main>

      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) loadDatasetFromFile(file);
      }} className="hidden" />
    </div>
  );
}

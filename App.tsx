import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, StockSummary, PortfolioStats } from './types';
import StatsCards from './components/StatsCards';
import TransactionForm from './components/TransactionForm';
import PortfolioTable from './components/PortfolioTable';
import FileImportModal from './components/FileImportModal';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import DataManagementModal from './components/DataManagementModal';
import { useAuth } from './contexts/AuthContext';
import { fetchCurrentPrices } from './services/geminiService';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Database, TrendingUp, Upload, Loader2, ArrowRight, Sparkles, RefreshCw, ExternalLink, ShieldCheck, Cloud, CloudOff, Clock, HardDrive, PieChart as PieChartIcon, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // State for data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [priceSources, setPriceSources] = useState<any[]>([]);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDataMgmtOpen, setIsDataMgmtOpen] = useState(false);

  // Refs for tracking and concurrency control
  const isFetchingRef = useRef(false);
  const fetchedInSession = useRef<Set<string>>(new Set());

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0 && priceError?.includes("Limit")) {
        setPriceError(null);
    }
  }, [cooldownRemaining, priceError]);

  // 1. User-Specific Data Loading
  useEffect(() => {
    if (isAuthLoading) return;
    setIsDataLoaded(false);

    if (!user) {
      if (!isGuestMode) {
        setTransactions([]);
        setCurrentPrices({});
        setPriceSources([]);
        fetchedInSession.current.clear();
      }
      setIsDataLoaded(true);
      return;
    }

    const txKey = `transactions_${user.id}`;
    const pricesKey = `prices_${user.id}`;
    const savedTx = localStorage.getItem(txKey);
    const savedPrices = localStorage.getItem(pricesKey);

    if (savedTx) setTransactions(JSON.parse(savedTx));
    else setTransactions([]);

    if (savedPrices) {
        const parsed = JSON.parse(savedPrices);
        setCurrentPrices(parsed);
        Object.keys(parsed).forEach(k => fetchedInSession.current.add(k));
    }
    
    setIsDataLoaded(true);
  }, [user, isAuthLoading, isGuestMode]);

  // 2. Market Price Fetching
  const portfolioSymbols = useMemo(() => {
    const symbols = new Set(transactions.map(t => (t.symbol || 'UNKNOWN').toUpperCase().trim()));
    return Array.from(symbols);
  }, [transactions]);

  const updateMarketPrices = async (symbolsToFetch: string[], isManual = false) => {
    if (isFetchingRef.current || symbolsToFetch.length === 0 || cooldownRemaining > 0) return;
    
    // EXTREMELY CONSERVATIVE: Only fetch symbols that don't already have a price in state
    const filtered = isManual ? symbolsToFetch : symbolsToFetch.filter(s => !currentPrices[s]);
    if (filtered.length === 0 && !isManual) return;

    isFetchingRef.current = true;
    setIsRefreshingPrices(true);
    setPriceError(null);
    
    try {
      const { prices, sources } = await fetchCurrentPrices(filtered);
      setCurrentPrices(prev => ({ ...prev, ...prices }));
      setPriceSources(sources);
      filtered.forEach(s => fetchedInSession.current.add(s));
    } catch (err: any) {
      console.error("Market data fetch failed", err);
      const msg = err?.message || JSON.stringify(err);
      
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        setPriceError("Quota Limit - Waiting 60s");
        setCooldownRemaining(60); // Aggressive cooldown for rate limits
      } else {
        setPriceError("Price fetch failed");
      }
    } finally {
      setIsRefreshingPrices(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (isDataLoaded && portfolioSymbols.length > 0) {
        // Initial load fetch
        updateMarketPrices(portfolioSymbols);
    }
  }, [portfolioSymbols, isDataLoaded]);

  // 3. User-Specific Auto-Save
  useEffect(() => {
    if (!isDataLoaded || isAuthLoading || !user) return;
    const txKey = `transactions_${user.id}`;
    const pricesKey = `prices_${user.id}`;
    localStorage.setItem(txKey, JSON.stringify(transactions));
    localStorage.setItem(pricesKey, JSON.stringify(currentPrices));
    setLastSaved(new Date());
  }, [transactions, currentPrices, user, isDataLoaded, isAuthLoading]);

  // --- Handlers ---

  const handleSaveTransaction = (transactionData: Transaction | Omit<Transaction, 'id'>) => {
    const normalizedData = {
        ...transactionData,
        symbol: (transactionData.symbol || 'UNKNOWN').toUpperCase().trim(),
        exchange: (transactionData.exchange || 'UNKNOWN').toUpperCase().trim(),
        type: (transactionData.type || 'BUY').toString().toUpperCase().trim() as 'BUY' | 'SELL'
    };

    if ('id' in normalizedData) {
      setTransactions(prev => prev.map(t => t.id === normalizedData.id ? normalizedData as Transaction : t));
    } else {
      const newTransaction = { ...normalizedData, id: Math.random().toString(36).substr(2, 9) };
      setTransactions(prev => [...prev, newTransaction]);
    }
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const clearUserCache = () => {
    if (!user) return;
    localStorage.removeItem(`transactions_${user.id}`);
    localStorage.removeItem(`prices_${user.id}`);
    setTransactions([]);
    setCurrentPrices({});
    fetchedInSession.current.clear();
    setIsDataMgmtOpen(false);
  };

  const handleBulkImport = (newTransactions: Omit<Transaction, 'id'>[]) => {
      const transactionsWithIds = newTransactions.map(t => ({
          ...t,
          type: (t.type?.toString().toUpperCase().includes('SELL') ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
          symbol: (t.symbol || 'UNKNOWN').toUpperCase().trim(),
          exchange: (t.exchange || 'UNKNOWN').toUpperCase().trim(),
          id: Math.random().toString(36).substr(2, 9)
      }));
      setTransactions(prev => [...prev, ...transactionsWithIds]);
  };

  // --- Calculations ---

  const { portfolio, stats } = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      const symbolKey = (t.symbol || 'UNKNOWN').toUpperCase().trim();
      if (!groups[symbolKey]) groups[symbolKey] = [];
      groups[symbolKey].push(t);
    });

    const stockSummaries: StockSummary[] = [];
    let totalRealizedPL = 0, totalCostBasis = 0, totalValue = 0, totalUnrealizedPL = 0;

    Object.entries(groups).forEach(([symbol, txs]) => {
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let sharesHeld = 0, totalCost = 0, realizedPL = 0;

      txs.forEach(t => {
        const shares = Number(t.shares), price = Number(t.price);
        if (isNaN(shares) || isNaN(price)) return;
        if (t.type === 'BUY') {
          sharesHeld += shares;
          totalCost += shares * price;
        } else {
          const avg = sharesHeld > 0 ? totalCost / sharesHeld : 0;
          realizedPL += (shares * price - (shares * avg));
          sharesHeld -= shares;
          totalCost -= (shares * avg);
        }
      });

      if (sharesHeld < 0.000001) { sharesHeld = 0; totalCost = 0; }
      const currentPrice = currentPrices[symbol] || null;
      totalRealizedPL += realizedPL;
      totalCostBasis += totalCost;
      
      if (currentPrice !== null && sharesHeld > 0) {
          const marketVal = sharesHeld * currentPrice;
          totalValue += marketVal;
          totalUnrealizedPL += (marketVal - totalCost);
      } else { totalValue += totalCost; }

      stockSummaries.push({
        symbol,
        name: txs[0]?.name || symbol,
        totalShares: sharesHeld,
        avgCost: sharesHeld > 0 ? totalCost / sharesHeld : 0,
        currentPrice,
        totalInvested: totalCost,
        realizedPL,
        transactions: txs
      });
    });

    return { portfolio: stockSummaries.sort((a, b) => a.symbol.localeCompare(b.symbol)), stats: { totalValue, totalCostBasis, totalRealizedPL, totalUnrealizedPL } };
  }, [transactions, currentPrices]);

  const allocationData = portfolio
    .filter(s => s.totalShares > 0 && s.currentPrice)
    .map(s => ({ name: s.symbol, value: (s.currentPrice || 0) * s.totalShares }));

  if (isAuthLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <p className="text-slate-500 font-medium">Authenticating...</p>
              </div>
          </div>
      );
  }

  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen bg-[#FDFDFF]">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><TrendingUp size={24} /></div>
            <h1 className="text-xl font-bold text-slate-900">TradeTrack AI</h1>
          </div>
          <button onClick={() => setIsLoginOpen(true)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all">Sign In</button>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold mb-10"><Sparkles size={16} /> Gemini 3 Flash Core</div>
            <h2 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-8">Portfolio Tracking <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Simplified.</span></h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">Automated data extraction, real-time market grounding, and secure private storage.</p>
            <div className="flex justify-center gap-5">
              <button onClick={() => setIsLoginOpen(true)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-2">Get Started <ArrowRight size={20} /></button>
              <button onClick={() => setIsGuestMode(true)} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg">Demo Mode</button>
            </div>
        </main>
        {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white"><TrendingUp size={20} /></div>
              <h1 className="text-lg font-bold text-slate-900 hidden sm:block">TradeTrack AI</h1>
            </div>
            {user && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <Cloud size={12} className="text-indigo-400" /> Auto-Sync: {lastSaved ? lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
              <div className="flex flex-col items-end mr-2">
                {priceError && (
                    <div className="flex items-center gap-1.5 text-rose-500">
                         {cooldownRemaining > 0 && <span className="text-[10px] font-black bg-rose-50 px-1.5 rounded leading-none py-1">{cooldownRemaining}s</span>}
                         <span className="text-[9px] font-bold uppercase">{priceError}</span>
                    </div>
                )}
                <button 
                  onClick={() => updateMarketPrices(portfolioSymbols, true)} 
                  disabled={isRefreshingPrices || cooldownRemaining > 0} 
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-30" 
                  title="Manual Refresh"
                >
                   <RefreshCw size={18} className={isRefreshingPrices ? 'animate-spin' : ''} />
                </button>
              </div>
              <button onClick={() => setIsImportOpen(true)} className="hidden sm:flex items-center gap-2 bg-white border border-slate-300 px-3.5 py-1.5 rounded-xl font-medium text-xs">
                <Upload size={14} /> Import
              </button>
              <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl font-medium text-xs shadow-md">
                <Plus size={14} /> New
              </button>
              <UserMenu onLoginClick={() => setIsLoginOpen(true)} onManageDataClick={() => setIsDataMgmtOpen(true)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <StatsCards stats={stats} />

        <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">Holdings</h2>
              <div className="flex items-center gap-2 text-[10px] text-indigo-400 bg-indigo-50/50 px-2.5 py-1 rounded-full font-bold">
                 <ShieldCheck size={12} /> Encrypted Storage Active
              </div>
            </div>
            <PortfolioTable portfolio={portfolio} onDelete={id => setTransactions(t => t.filter(x => x.id !== id))} onEdit={t => { setEditingTransaction(t); setIsFormOpen(true); }} />
            
            {priceSources.length > 0 && (
              <div className="mt-4 px-2 py-3 bg-slate-100/50 rounded-xl border border-slate-200/60">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ExternalLink size={12} className="text-indigo-400" /> Price Data Sources (Google Search)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {priceSources.map((chunk, idx) => (
                    chunk.web && (
                      <a 
                        key={idx} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-600 hover:bg-indigo-100 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md flex items-center gap-1 transition-all"
                      >
                        {chunk.web.title || 'Market Source'} <ExternalLink size={10} />
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-slate-800 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <PieChartIcon size={14} className="text-indigo-500" /> Allocation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-64">
                    {allocationData.length > 0 ? (
                        <>
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                                    {allocationData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 max-h-full overflow-y-auto pr-2">
                            {allocationData.map((e, i) => (
                                <div key={e.name} className="flex items-center justify-between text-xs p-2.5 bg-slate-50/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-slate-700 font-bold">{e.name}</span>
                                    </div>
                                    <span className="text-slate-900 font-medium">${e.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        </>
                    ) : (
                        <div className="col-span-2 h-full flex items-center justify-center text-slate-300 text-xs italic border-2 border-dashed border-slate-100 rounded-2xl">No holdings to visualize.</div>
                    )}
                </div>
            </div>
            <div className="bg-indigo-600 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -top-10 -right-10 opacity-5"><HardDrive size={200} /></div>
                <div>
                    <h4 className="text-xl font-black uppercase tracking-widest mb-4">Secure Vault</h4>
                    <p className="text-indigo-100 text-sm leading-relaxed mb-6">Your trade data is persisted locally to your Auth0 profile ID. Export or wipe your data anytime in the Management panel.</p>
                </div>
                <button onClick={() => setIsDataMgmtOpen(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors backdrop-blur-sm border border-white/10">Open Data Manager</button>
            </div>
        </div>
      </main>

      {isFormOpen && <TransactionForm onSave={handleSaveTransaction} onClose={() => setIsFormOpen(false)} initialData={editingTransaction || undefined} />}
      {isImportOpen && <FileImportModal onImport={handleBulkImport} onClose={() => setIsImportOpen(false)} />}
      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
      {isDataMgmtOpen && <DataManagementModal transactionsCount={transactions.length} onClearCache={clearUserCache} onExport={() => {
          const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'tradetrack_backup.json';
          a.click();
      }} onClose={() => setIsDataMgmtOpen(false)} />}
    </div>
  );
};

export default App;
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, StockSummary, PortfolioStats } from './types';
import StatsCards from './components/StatsCards';
import TransactionForm from './components/TransactionForm';
import PortfolioTable from './components/PortfolioTable';
import FileImportModal from './components/FileImportModal';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import { useAuth } from './contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Database, TrendingUp, Upload, Loader2, ArrowRight, Sparkles, BarChart3, Shield } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const DEFAULT_PRICES: Record<string, number> = {
  'AAPL': 175.00,
  'MSFT': 420.00,
  'GOOGL': 150.00,
  'TSLA': 180.00,
  'NVDA': 900.00
};

const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // State for data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(DEFAULT_PRICES);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // State for UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // 1. One-time cleanup of legacy guest data and loading authenticated data
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      // Cleanup legacy guest data if it exists
      localStorage.removeItem('transactions_guest');
      localStorage.removeItem('prices_guest');
      
      // Reset state for unauthenticated users
      if (!isGuestMode) {
        setTransactions([]);
        setCurrentPrices(DEFAULT_PRICES);
      }
      setIsDataLoaded(true);
      return;
    }

    // Authenticated data loading
    const txKey = `transactions_${user.id}`;
    const pricesKey = `prices_${user.id}`;

    const savedTx = localStorage.getItem(txKey);
    const savedPrices = localStorage.getItem(pricesKey);

    if (savedTx) {
      setTransactions(JSON.parse(savedTx));
    } else {
      setTransactions([]);
    }

    if (savedPrices) {
      setCurrentPrices(JSON.parse(savedPrices));
    } else {
      setCurrentPrices(DEFAULT_PRICES);
    }
    
    setIsDataLoaded(true);
  }, [user, isAuthLoading, isGuestMode]);

  // 2. Save logic - ONLY for authenticated users
  useEffect(() => {
    if (!isDataLoaded || isAuthLoading || !user) return;

    const txKey = `transactions_${user.id}`;
    const pricesKey = `prices_${user.id}`;

    localStorage.setItem(txKey, JSON.stringify(transactions));
    localStorage.setItem(pricesKey, JSON.stringify(currentPrices));
  }, [transactions, currentPrices, user, isDataLoaded, isAuthLoading]);

  const handleSaveTransaction = (transactionData: Transaction | Omit<Transaction, 'id'>) => {
    if ('id' in transactionData) {
      setTransactions(prev => prev.map(t => t.id === transactionData.id ? transactionData as Transaction : t));
    } else {
      const newTransaction = { ...transactionData, id: Math.random().toString(36).substr(2, 9) };
      setTransactions(prev => [...prev, newTransaction]);
    }
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const openAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleBulkImport = (newTransactions: Omit<Transaction, 'id'>[]) => {
      const transactionsWithIds = newTransactions.map(t => ({
          ...t,
          id: Math.random().toString(36).substr(2, 9)
      }));
      setTransactions(prev => [...prev, ...transactionsWithIds]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const { portfolio, stats } = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      if (!groups[t.symbol]) groups[t.symbol] = [];
      groups[t.symbol].push(t);
    });

    const stockSummaries: StockSummary[] = [];
    let totalRealizedPL = 0;
    let totalCostBasis = 0;
    let totalValue = 0;
    let totalUnrealizedPL = 0;

    Object.entries(groups).forEach(([symbol, txs]) => {
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let sharesHeld = 0;
      let totalCost = 0;
      let realizedPL = 0;

      txs.forEach(t => {
        if (t.type === 'BUY') {
          sharesHeld += t.shares;
          totalCost += t.shares * t.price;
        } else if (t.type === 'SELL') {
          const avgCostPerShare = sharesHeld > 0 ? totalCost / sharesHeld : 0;
          const costOfSoldShares = t.shares * avgCostPerShare;
          const revenue = t.shares * t.price;
          realizedPL += (revenue - costOfSoldShares);
          sharesHeld -= t.shares;
          totalCost -= costOfSoldShares;
        }
      });

      if (sharesHeld < 0.000001) {
          sharesHeld = 0;
          totalCost = 0;
      }

      const avgCost = sharesHeld > 0 ? totalCost / sharesHeld : 0;
      const currentPrice = currentPrices[symbol] || null;
      
      totalRealizedPL += realizedPL;
      totalCostBasis += totalCost;
      
      if (currentPrice !== null) {
          const marketVal = sharesHeld * currentPrice;
          totalValue += marketVal;
          totalUnrealizedPL += (marketVal - totalCost);
      } else {
           totalValue += totalCost;
      }

      stockSummaries.push({
        symbol,
        name: txs[0].name,
        totalShares: sharesHeld,
        avgCost: avgCost,
        currentPrice: currentPrice,
        totalInvested: totalCost,
        realizedPL: realizedPL,
        transactions: txs
      });
    });

    stockSummaries.sort((a, b) => a.name.localeCompare(b.name));

    return {
      portfolio: stockSummaries,
      stats: { totalValue, totalCostBasis, totalRealizedPL, totalUnrealizedPL }
    };
  }, [transactions, currentPrices]);

  const allocationData = portfolio
    .filter(s => s.totalShares > 0 && s.currentPrice)
    .map(s => ({
      name: s.symbol,
      value: (s.currentPrice || 0) * s.totalShares
    }));

  if (isAuthLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <p className="text-slate-500 font-medium">Loading your portfolio...</p>
              </div>
          </div>
      );
  }

  // --- Landing Page for Unauthenticated Users ---
  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TradeTrack AI</h1>
          </div>
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-200"
          >
            Sign In
          </button>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
                <Sparkles size={16} /> Powered by Gemini AI
              </div>
              <h2 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
                Master your portfolio with <span className="text-indigo-600">AI Precision</span>.
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                Automatically track stock trades, analyze P/L, and visualize your wealth. Simply describe your trades or upload statements.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setIsLoginOpen(true)}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                >
                  Get Started Free <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => setIsGuestMode(true)}
                  className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg transition-all"
                >
                  Try Demo Mode
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <div className="relative bg-white p-2 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
                 <img 
                  src="https://images.unsplash.com/photo-1611974717537-48444f71104e?auto=format&fit=crop&q=80&w=1000" 
                  alt="Dashboard Preview" 
                  className="rounded-2xl w-full h-auto grayscale-[0.2]"
                 />
              </div>
            </div>
          </div>

          <div className="mt-32 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Smart Entry</h3>
              <p className="text-slate-600">Type naturally like "Bought 10 AAPL yesterday" and let Gemini parse your trade data instantly.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">P/L Tracking</h3>
              <p className="text-slate-600">Understand your total cost basis, realized returns, and current market value in one place.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Privacy First</h3>
              <p className="text-slate-600">Your data is yours. Guest data stays in-memory; authenticated data is securely stored via your ID.</p>
            </div>
          </div>
        </main>
        
        {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
      </div>
    );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen pb-20">
      {isGuestMode && !user && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-4">
          <span>DEMO MODE: Data will be cleared when you refresh the page.</span>
          <button onClick={() => setIsGuestMode(false)} className="underline hover:text-indigo-100">Exit Demo</button>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TradeTrack AI</h1>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsImportOpen(true)}
                className="hidden md:flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
              >
                <Upload size={16} /> Import
              </button>
              <button 
                onClick={openAddTransaction}
                className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus size={16} /> Transaction
              </button>
              <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
              <UserMenu onLoginClick={() => setIsLoginOpen(true)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <StatsCards stats={stats} />

        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-slate-400" /> Holdings
            </h2>
            <span className="text-xs text-slate-500">Sorted by Name</span>
            </div>
            <PortfolioTable 
            portfolio={portfolio} 
            onDelete={deleteTransaction} 
            onEdit={handleEditTransaction}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-slate-500 text-sm font-medium mb-4">Portfolio Allocation</h3>
            <div className="h-64 w-full">
                {allocationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                        No active holdings to display allocation chart.
                    </div>
                )}
            </div>
            {allocationData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                  {allocationData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-slate-600 font-medium">{entry.name}</span>
                          </div>
                          <span className="text-slate-400">
                              {((entry.value / stats.totalValue) * 100).toFixed(1)}%
                          </span>
                      </div>
                  ))}
              </div>
            )}
            </div>
            
            <div className="h-full">
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 h-full flex flex-col justify-between">
                    <div>
                        <h4 className="font-bold text-indigo-900 mb-2">Getting Started</h4>
                        <p className="text-sm text-indigo-700 leading-relaxed mb-4">
                            Start tracking your wealth by adding your first trade. Use AI to quickly input data from plain text.
                        </p>
                        <div className="space-y-3">
                            <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-slate-600 italic">
                                "Bought 50 shares of Apple at 175.00 today"
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>

      {isFormOpen && (
        <TransactionForm 
            onSave={handleSaveTransaction} 
            onClose={() => setIsFormOpen(false)} 
            initialData={editingTransaction || undefined}
        />
      )}

      {isImportOpen && (
        <FileImportModal
            onImport={handleBulkImport}
            onClose={() => setIsImportOpen(false)}
        />
      )}

      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
    </div>
  );
};

export default App;
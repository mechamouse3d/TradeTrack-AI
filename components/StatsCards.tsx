
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { PortfolioStats, CurrencyStats } from '../types';

interface StatsCardsProps {
  stats: PortfolioStats;
}

const CurrencyStatRow: React.FC<{ 
  label: string, 
  value: number, 
  currency: string, 
  className?: string,
  percent?: number
}> = ({ label, value, currency, className = "", percent }) => {
  const symbol = currency === 'CAD' ? 'C$' : '$';
  return (
    <div className={`flex justify-between items-baseline gap-2 ${className}`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{currency}</span>
      <div className="text-right">
        <span className="text-lg font-bold">
          {value >= 0 ? '' : '-'}{symbol}{Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {percent !== undefined && (
          <span className={`text-[10px] ml-1.5 font-bold ${percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {percent >= 0 ? '+' : ''}{percent.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const { USD, CAD } = stats;
  
  const usdUnrealizedPercent = USD.totalCostBasis > 0 ? (USD.totalUnrealizedPL / USD.totalCostBasis) * 100 : 0;
  const cadUnrealizedPercent = CAD.totalCostBasis > 0 ? (CAD.totalUnrealizedPL / CAD.totalCostBasis) * 100 : 0;

  const hasUSD = USD.totalValue !== 0 || USD.totalRealizedPL !== 0 || USD.totalCostBasis !== 0;
  const hasCAD = CAD.totalValue !== 0 || CAD.totalRealizedPL !== 0 || CAD.totalCostBasis !== 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Portfolio Value */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">Portfolio Value</h3>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={16} /></div>
        </div>
        <div className="space-y-1">
          {hasUSD && <CurrencyStatRow currency="USD" value={USD.totalValue} label="Value" />}
          {hasCAD && <CurrencyStatRow currency="CAD" value={CAD.totalValue} label="Value" />}
          {!hasUSD && !hasCAD && <div className="text-lg font-bold text-slate-300">$0.00</div>}
        </div>
      </div>

      {/* Unrealized P/L */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">Unrealized P/L</h3>
          <div className={`p-1.5 rounded-lg ${(USD.totalUnrealizedPL + CAD.totalUnrealizedPL) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="space-y-1">
          {hasUSD && <CurrencyStatRow currency="USD" value={USD.totalUnrealizedPL} label="P/L" percent={usdUnrealizedPercent} />}
          {hasCAD && <CurrencyStatRow currency="CAD" value={CAD.totalUnrealizedPL} label="P/L" percent={cadUnrealizedPercent} />}
          {!hasUSD && !hasCAD && <div className="text-lg font-bold text-slate-300">$0.00</div>}
        </div>
      </div>

      {/* Realized Profit */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">Realized Profit</h3>
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><DollarSign size={16} /></div>
        </div>
        <div className="space-y-1">
          {hasUSD && <CurrencyStatRow currency="USD" value={USD.totalRealizedPL} label="Profit" />}
          {hasCAD && <CurrencyStatRow currency="CAD" value={CAD.totalRealizedPL} label="Profit" />}
          {!hasUSD && !hasCAD && <div className="text-lg font-bold text-slate-300">$0.00</div>}
        </div>
      </div>

      {/* Total Cost Basis */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">Cost Basis</h3>
          <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><DollarSign size={16} /></div>
        </div>
        <div className="space-y-1">
          {hasUSD && <CurrencyStatRow currency="USD" value={USD.totalCostBasis} label="Cost" />}
          {hasCAD && <CurrencyStatRow currency="CAD" value={CAD.totalCostBasis} label="Cost" />}
          {!hasUSD && !hasCAD && <div className="text-lg font-bold text-slate-300">$0.00</div>}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;

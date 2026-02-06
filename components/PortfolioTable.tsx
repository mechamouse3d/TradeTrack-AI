
import React, { useState } from 'react';
import { Transaction, StockSummary } from '../types';
import { ChevronDown, ChevronRight, Edit2, Trash2, CheckCircle2, Globe } from 'lucide-react';

interface PortfolioTableProps {
  portfolio: StockSummary[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({ portfolio, onDelete, onEdit }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    portfolio.reduce((acc, stock) => ({ ...acc, [`${stock.symbol}_${stock.currency}`]: true }), {})
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCurrencySymbol = (cur: string) => cur === 'CAD' ? 'C$' : '$';

  if (portfolio.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
        <p className="text-slate-500">No transactions found. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left table-fixed min-w-[1100px]">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-4 w-12"></th>
              <th className="px-4 py-4 w-[12%]">Symbol</th>
              <th className="px-4 py-4 w-[18%]">Stock Name</th>
              <th className="px-4 py-4 text-right w-[8%]">Shares</th>
              <th className="px-4 py-4 text-right w-[10%]">Avg Price</th>
              <th className="px-4 py-4 text-right w-[10%]">Total Cost</th>
              <th className="px-4 py-4 text-right w-[10%]">Current Price</th>
              <th className="px-4 py-4 text-right w-[10%]">Market Value</th>
              <th className="px-4 py-4 text-right w-[11%]">Unrealized P/L</th>
              <th className="px-4 py-4 text-right w-[11%]">Realized Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {portfolio.map((stock) => {
              const groupKey = `${stock.symbol}_${stock.currency}`;
              const isExpanded = expandedGroups[groupKey];
              const isClosed = stock.totalShares <= 0;
              const curSym = getCurrencySymbol(stock.currency);
              
              const unrealizedPL = !isClosed && stock.currentPrice 
                ? (stock.currentPrice - stock.avgCost) * stock.totalShares 
                : 0;
              const marketValue = !isClosed && stock.currentPrice 
                ? stock.currentPrice * stock.totalShares
                : 0;

              return (
                <React.Fragment key={groupKey}>
                  {/* Summary Row */}
                  <tr className={`transition-colors ${isClosed ? 'bg-slate-50/40 hover:bg-slate-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-4 text-center cursor-pointer" onClick={() => toggleGroup(groupKey)}>
                      {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${isClosed ? 'text-slate-400' : 'text-slate-900'}`}>{stock.symbol}</span>
                          <span className="text-[9px] font-black px-1 rounded bg-slate-100 text-slate-500">{stock.currency}</span>
                        </div>
                        {isClosed && (
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter flex items-center gap-1">
                            <CheckCircle2 size={10} /> Closed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-4 font-medium truncate ${isClosed ? 'text-slate-400' : 'text-slate-700'}`}>
                      {stock.name}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${isClosed ? 'text-slate-400' : 'text-slate-900'}`}>
                      {stock.totalShares.toLocaleString()}
                    </td>
                    <td className={`px-4 py-4 text-right ${isClosed ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isClosed ? '-' : `${curSym}${stock.avgCost.toFixed(2)}`}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${isClosed ? 'text-slate-400' : 'text-slate-800'}`}>
                      {isClosed ? '-' : `${curSym}${stock.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className={`px-4 py-4 text-right ${isClosed ? 'text-slate-300 italic' : 'text-slate-600'}`}>
                        {isClosed ? 'Finalized' : stock.currentPrice ? `${curSym}${stock.currentPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${isClosed ? 'text-slate-300 italic' : 'text-slate-800'}`}>
                        {isClosed ? 'Finalized' : stock.currentPrice ? `${curSym}${marketValue.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                    </td>
                    <td className={`px-4 py-4 text-right font-bold ${isClosed ? 'text-slate-300' : unrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {isClosed ? 'N/A' : stock.currentPrice ? `${unrealizedPL >= 0 ? '+' : ''}${curSym}${Math.abs(unrealizedPL).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                    </td>
                    <td className={`px-4 py-4 text-right font-black ${stock.realizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${isClosed ? 'bg-indigo-50/30' : ''}`}>
                      <div className="flex flex-col">
                        <span>{stock.realizedPL >= 0 ? '+' : '-'}{curSym}{Math.abs(stock.realizedPL).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        {isClosed && <span className="text-[9px] uppercase opacity-60">Total Profit</span>}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Rows */}
                  {isExpanded && (
                    <tr className="bg-white">
                      <td colSpan={10} className="p-0">
                        <div className="border-b border-slate-100 bg-slate-50/20">
                           <table className="w-full text-xs">
                               <thead className="text-slate-400 bg-slate-50">
                                   <tr>
                                       <th className="px-8 py-3 text-left w-[12%]">Date</th>
                                       <th className="px-4 py-3 text-left w-[8%]">Type</th>
                                       <th className="px-4 py-3 text-left w-[12%]">Account</th>
                                       <th className="px-4 py-3 text-left w-[10%]">Exchange</th>
                                       <th className="px-4 py-3 text-right w-[10%]">Shares</th>
                                       <th className="px-4 py-3 text-right w-[10%]">Price</th>
                                       <th className="px-4 py-3 text-right w-[10%]">Cost/Basis</th>
                                       <th className="px-4 py-3 text-right w-[13%]">Cur. Value</th>
                                       <th className="px-4 py-3 text-right w-[15%]">Actions</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                   {stock.transactions.map(t => {
                                       const currentTxValue = !isClosed && stock.currentPrice ? t.shares * stock.currentPrice : null;
                                       return (
                                       <tr key={t.id} className="hover:bg-slate-50">
                                           <td className="px-8 py-2.5 text-slate-500">{t.date}</td>
                                           <td className={`px-4 py-2.5 font-bold ${t.type === 'BUY' ? 'text-blue-600' : 'text-amber-600'}`}>
                                               {t.type}
                                           </td>
                                           <td className="px-4 py-2.5 text-slate-500 flex items-center gap-1">
                                              <span className="uppercase font-medium">{t.account}</span>
                                              <span className="text-[9px] font-bold bg-slate-100 px-1 rounded">{t.currency}</span>
                                           </td>
                                           <td className="px-4 py-2.5 text-slate-400">{t.exchange}</td>
                                           <td className="px-4 py-2.5 text-right font-medium text-slate-700">{t.shares.toLocaleString()}</td>
                                           <td className="px-4 py-2.5 text-right text-slate-600">{curSym}{t.price.toFixed(2)}</td>
                                           <td className="px-4 py-2.5 text-right text-slate-600">{curSym}{(t.shares * t.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                           <td className="px-4 py-2.5 text-right font-medium text-slate-400">
                                               {currentTxValue !== null ? `${curSym}${currentTxValue.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                                           </td>
                                           <td className="px-4 py-2.5 text-right flex items-center justify-end gap-1">
                                               <button onClick={() => onEdit(t)} className="text-slate-300 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50">
                                                   <Edit2 size={14} />
                                               </button>
                                               <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50">
                                                   <Trash2 size={14} />
                                               </button>
                                           </td>
                                       </tr>
                                   )})}
                               </tbody>
                           </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortfolioTable;

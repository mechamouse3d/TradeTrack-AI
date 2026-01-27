import React from 'react';
import { X, Database, Download, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DataManagementModalProps {
  transactionsCount: number;
  onClearCache: () => void;
  onExport: () => void;
  onClose: () => void;
}

const DataManagementModal: React.FC<DataManagementModalProps> = ({ transactionsCount, onClearCache, onExport, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
            <X size={20} />
        </button>

        <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Database size={24} className="text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">Data & Cache</h2>
                    <p className="text-xs text-slate-500 font-medium">Manage your private portfolio storage</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Stats Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Local Cache Status</span>
                        <ShieldCheck size={14} className="text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800">{transactionsCount}</span>
                        <span className="text-sm text-slate-500 font-medium">Transactions Cached</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Data is isolated to your current Auth0 login and stored in your browser's LocalStorage.</p>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <button 
                        onClick={onExport}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                <Download size={18} className="text-slate-600 group-hover:text-indigo-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-800">Export Backup</p>
                                <p className="text-[10px] text-slate-500">Download cache as .json file</p>
                            </div>
                        </div>
                    </button>

                    <div className="relative group">
                        <button 
                            onClick={() => {
                                if (window.confirm("Are you sure you want to wipe all cached transactions for this account? This cannot be undone.")) {
                                    onClearCache();
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50/30 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-rose-100 transition-colors">
                                    <Trash2 size={18} className="text-slate-600 group-hover:text-rose-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-800">Clear Account Cache</p>
                                    <p className="text-[10px] text-slate-500">Remove all data from this browser</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 leading-normal font-medium">
                        Your portfolio data is not stored on a central server. Clearing your browser cache or using a different browser will hide your history until you re-import your backup.
                    </p>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagementModal;
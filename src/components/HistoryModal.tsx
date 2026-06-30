import { useEffect, useState } from 'react';
import { X, Clock, User, ArrowRight } from 'lucide-react';

interface HistoryEntry {
  timestamp: string;
  user: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  oldResp?: string;
  newResp?: string;
  oldLoc?: string;
  newLoc?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber: string;
  modelName: string;
}

export default function HistoryModal({ isOpen, onClose, serialNumber, modelName }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !serialNumber) return;

    setLoading(true);
    setError(null);
    setHistory([]);

    try {
      (window as any).google.script.run
        .withSuccessHandler((res: any) => {
          setHistory(res || []);
          setLoading(false);
        })
        .withFailureHandler((err: Error) => {
          setError(err.message);
          setLoading(false);
        })
        .getAssetHistory(serialNumber);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [isOpen, serialNumber]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-neutral-500" />
              Histórico de Rastreabilidade
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {modelName} <span className="font-mono">({serialNumber})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-800 bg-white rounded-full p-1.5 shadow-sm border border-neutral-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-neutral-50/30 flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-neutral-200 border-t-black rounded-full animate-spin mb-3"></div>
              <p className="text-neutral-500 text-sm font-medium">Buscando rastreabilidade...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
              Erro ao carregar histórico: {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              Nenhuma movimentação registrada para este equipamento.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="relative border-l-2 border-neutral-200 ml-3 pl-6 py-2 space-y-6">
              {history.map((entry, index) => (
                <div key={index} className="relative">
                  {/* Point Indicator */}
                  <span className="absolute -left-[31px] top-1.5 bg-neutral-900 border-4 border-white w-4.5 h-4.5 rounded-full shadow-sm"></span>

                  {/* Log Card */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                      <span className="font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
                        {entry.action}
                      </span>
                      <span className="text-neutral-400 font-mono">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-sm text-neutral-600 mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Executado por: <span className="font-medium text-neutral-800">{entry.user}</span></span>
                    </div>

                    {/* Transition details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                      {/* Status Transition */}
                      {(entry.oldStatus || entry.newStatus) && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Status</span>
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-500 line-through truncate max-w-[80px]">{entry.oldStatus || '-'}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span className="font-bold text-neutral-800 truncate">{entry.newStatus || '-'}</span>
                          </div>
                        </div>
                      )}

                      {/* Responsible Transition */}
                      {(entry.oldResp || entry.newResp) && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Responsável</span>
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-500 line-through truncate max-w-[80px]">{entry.oldResp || '-'}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span className="font-bold text-neutral-800 truncate">{entry.newResp || '-'}</span>
                          </div>
                        </div>
                      )}

                      {/* Location Transition */}
                      {(entry.oldLoc || entry.newLoc) && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Localização</span>
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-500 line-through truncate max-w-[80px]">{entry.oldLoc || '-'}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span className="font-bold text-neutral-800 truncate">{entry.newLoc || '-'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

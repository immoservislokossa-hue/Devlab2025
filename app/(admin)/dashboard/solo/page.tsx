'use client';

import { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Wallet, 
  RefreshCcw, 
  Receipt, 
  Hash 
} from 'lucide-react';

interface TransferResponse {
  status: string;
  mode: string;
  details: {
    amount: number;
    currency: string;
    id_value: string;
    name: string;
    status: string;
    transfer_id: string;
    bulk_id: string;
    error: string;
  };
}

export default function TransferPage() {
  const [formData, setFormData] = useState({ id: '22912345678', amount: '5000' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<TransferResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setResult(null);

    try {
      const response = await fetch('/api/transfer', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: formData.id, amount: parseFloat(formData.amount) }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'PROCESSED' && data.details?.status === 'SUCCESS') {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (error) {
      setStatus('error');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setFormData({ id: '', amount: '' });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header FinTech */}
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-10 rotate-12">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              MOJALOOP PAY
            </h1>
            <p className="text-blue-200 text-sm mt-2 ml-1">
              Transfert unitaire instantané
            </p>
          </div>
        </div>

        <div className="p-8">
          {status !== 'success' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider ml-1">
                  Bénéficiaire (ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-blue-600 focus:border-blue-700 focus:bg-white outline-none transition-all font-mono text-lg"
                    placeholder="22912345678"
                    required
                  />
                  <Hash className="w-5 h-5 text-blue-300 absolute left-4 top-4.5" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider ml-1">
                  Montant
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-4 pr-16 py-4 rounded-xl bg-slate-50 border-2 border-blue-600 focus:border-blue-700 focus:bg-white outline-none transition-all font-bold text-2xl text-blue-600"
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-4 top-4 font-bold text-blue-300 bg-white px-2 py-1 rounded-md text-sm border border-blue-200">
                    XOF
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-80 disabled:cursor-wait mt-4"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Traitement...
                  </>
                ) : (
                  <>
                    Envoyer maintenant <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                  <CheckCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-blue-600">Transfert Réussi !</h2>
                <p className="text-blue-400 mt-1">Fonds envoyés avec succès</p>
              </div>

              {result?.details && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-blue-200 space-y-4 relative">
                  <div className="absolute -top-2 left-0 w-full h-4 bg-white rounded-[50%]"></div>

                  <div className="flex justify-between items-end pb-4 border-b border-dashed border-blue-300">
                    <span className="text-blue-400 text-sm font-medium">Montant Total</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {result.details.amount.toLocaleString()} <span className="text-lg text-blue-300">XOF</span>
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-400">Bénéficiaire</span>
                      <span className="font-semibold text-blue-800">{result.details.id_value}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-400">Nom</span>
                      <span className="font-semibold text-blue-800">{result.details.name}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-blue-400">Transaction ID</span>
                      <span className="font-mono text-xs bg-white border border-blue-200 px-2 py-1 rounded text-blue-600 truncate max-w-[150px]">
                        {result.details.transfer_id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-blue-400">Batch ID</span>
                      <span className="font-mono text-xs text-blue-300 truncate max-w-[150px]">
                        {result.details.bulk_id}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={resetForm}
                className="w-full mt-6 bg-white text-blue-600 border-2 border-blue-600 font-bold py-3.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> Faire un autre virement
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 bg-blue-100 border-l-4 border-blue-600 p-4 rounded-r-xl animate-in slide-in-from-bottom-2">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-600">Échec de la transaction</h3>
                  <p className="text-sm text-blue-600/80 mt-1">
                    {result?.details?.error || "Le serveur a refusé la demande. Vérifiez les fonds ou l'ID."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
